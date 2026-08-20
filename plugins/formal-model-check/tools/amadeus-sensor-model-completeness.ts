import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import {
  canonicalIdentity,
  diffModelMap,
  IMPL_ONLY_UPDATE_HINT,
  LegacySpecError,
  parseTlaModelMap,
  resolveSpecRoots,
  TLA_MODEL_MAP_SCHEMA_VERSION,
  tlaModelMapPath,
  type ModelMap,
  type ModelMapAssetIdentity,
  type ModelMapEntry,
  type ModelMapDrift,
  type ModelMapModel,
} from "./amadeus-formal-verif-model-map.ts";
import {
  compareModuleDeclarations,
  type ModuleDeclarationDrift,
  type ModuleDepsError,
  resolveAuxiliaryModules,
} from "./tla-module-deps.ts";

// The default-space canonical map location. Used ONLY as a failure-reporting
// fallback label; the live map path is resolved per call through the shared
// spec root resolver (BR-1).
const DEFAULT_MODEL_MAP_RELATIVE_PATH = tlaModelMapPath();

// The repo-relative model-map path for the workspace's active space, resolved
// through the single spec-root path (E-1). Throws LegacySpecError when the
// pre-relocation specs/tla layout still holds specs (fail-closed, BR-4).
function modelMapRelativePath(projectRoot: string): string {
  return tlaModelMapPath(resolveSpecRoots(projectRoot).space);
}
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const DEFAULT_DEADLINE_MS = 9_000;
const IMPL_ONLY_HASH_PREFIX = 12;
const IMPL_ONLY_FLAG = "--impl-only";

type FindingReason =
  | "changed"
  | "missing"
  | "unreadable"
  | "outside-root"
  | "symlink"
  | "not-regular"
  | "identity-changed"
  | "file-too-large"
  | "total-too-large"
  | "timeout"
  | "declaration-drift"
  | "declaration-unresolved";

type UpdateFailureReason =
  | FindingReason
  | "invalid-path"
  | "model-unchanged"
  | "publish-failed";

export interface CompletenessFinding {
  readonly path: string;
  readonly reason: FindingReason;
}

export type CompletenessVerdict =
  | {
      readonly pass: true;
      readonly findings_count: 0;
      readonly findings: readonly [];
    }
  | {
      readonly pass: false;
      readonly reason: "drift" | "map-missing" | "map-malformed" | "timeout";
      readonly findings_count: number;
      readonly findings: readonly CompletenessFinding[];
    };

export interface ImplOnlyChange {
  readonly implPath: string;
  readonly from: string;
  readonly to: string;
}

export type UpdateModelMapResult =
  | { readonly ok: true; readonly entries: number; readonly map: string }
  | {
      readonly ok: true;
      readonly code: "IMPL_ONLY_UPDATED";
      readonly declared: "impl-only";
      readonly changed: readonly ImplOnlyChange[];
      readonly map: string;
    }
  | {
      readonly ok: false;
      readonly code:
        | "MAP_MISSING"
        | "MAP_MALFORMED"
        | "MODEL_UNCHANGED"
        | "LOCKED"
        | "UPDATE_FAILED"
        | "INVALID_ARGUMENT";
      readonly detail: string;
    };

interface CanonicalModelMapModule {
  readonly parseTlaModelMap: typeof parseTlaModelMap;
  readonly canonicalIdentity: typeof canonicalIdentity;
  readonly diffModelMap: (
    model: ModelMapModel,
    currentEntries: readonly ModelMapEntry[],
  ) => readonly ModelMapDrift[];
}

interface FileIdentity {
  readonly dev: number;
  readonly ino: number;
}

interface SafeReadOutcome {
  readonly content?: Uint8Array;
  readonly finding?: CompletenessFinding;
  readonly bytes: number;
  readonly identity?: FileIdentity;
}

interface CompletenessDependencies {
  readonly now: () => number;
  readonly loadCanonical: (projectRoot: string) => Promise<CanonicalModelMapModule>;
  readonly readFile: (
    rootReal: string,
    relativePath: string,
    totalBefore: number,
  ) => SafeReadOutcome;
  readonly publish: (
    rootReal: string,
    mapRelativePath: string,
    expectedIdentity: FileIdentity,
    body: string,
  ) => void;
}

export interface CheckModelCompletenessOptions {
  readonly projectRoot?: string;
  readonly deadlineMs?: number;
  readonly dependencies?: Partial<CompletenessDependencies>;
}

export interface UpdateModelMapOptions {
  readonly projectRoot?: string;
  readonly implOnly?: boolean;
  readonly dependencies?: Partial<CompletenessDependencies>;
}

interface InternalOptions {
  readonly projectRoot?: string;
  readonly mapRelativePath: string;
  readonly deadlineMs?: number;
  readonly implOnly?: boolean;
  readonly dependencies?: Partial<CompletenessDependencies>;
}

interface LoadedMap {
  readonly canonical: CanonicalModelMapModule;
  readonly map: ModelMap;
  readonly rootReal: string;
  readonly mapIdentity: FileIdentity;
  readonly totalBytes: number;
}

type LoadMapResult =
  | { readonly ok: true; readonly loaded: LoadedMap }
  | { readonly ok: false; readonly verdict: CompletenessVerdict };

interface EvaluatedEntries {
  readonly currentEntries: readonly ModelMapEntry[];
  readonly findings: readonly CompletenessFinding[];
  readonly timedOut: boolean;
  readonly totalBytes: number;
}

interface ModelAssetIdentities {
  readonly name: string;
  readonly modelIdentity?: string;
  readonly cfgIdentity?: string;
  readonly auxIdentities?: readonly (string | undefined)[];
  readonly moduleSources: ReadonlyMap<string, string>;
}

interface AssetEvaluation {
  readonly findings: readonly CompletenessFinding[];
  readonly models: readonly ModelAssetIdentities[];
  readonly totalBytes: number;
}

interface DeclarationEvaluation {
  readonly drifts: readonly ModuleDeclarationDrift[];
  readonly findings: readonly CompletenessFinding[];
  readonly resolvedByModel: ReadonlyMap<string, readonly string[]>;
  readonly sourcesByModel: ReadonlyMap<string, ReadonlyMap<string, string>>;
  readonly timedOut: boolean;
  readonly totalBytes: number;
}

class SafeReadFailure extends Error {
  constructor(readonly reason: FindingReason) {
    super(reason);
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// Models may pin the same implementation file; the file is read once and the
// resulting hash serves every model that records it.
function registeredEntries(map: ModelMap): readonly ModelMapEntry[] {
  const seen = new Map<string, ModelMapEntry>();
  for (const entry of map.models.flatMap((model) => model.entries)) {
    if (!seen.has(entry.implPath)) seen.set(entry.implPath, entry);
  }
  return [...seen.values()];
}

function canonicalRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    !isAbsolute(path) &&
    !path.includes("\\") &&
    posix.normalize(path) === path &&
    path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

function displayPath(path: string): string {
  return canonicalRelativePath(path) ? path : DEFAULT_MODEL_MAP_RELATIVE_PATH;
}

function rootContains(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function targetFor(rootReal: string, relativePath: string): string {
  if (!canonicalRelativePath(relativePath)) throw new SafeReadFailure("outside-root");
  const target = resolve(rootReal, relativePath);
  if (!rootContains(rootReal, target)) throw new SafeReadFailure("outside-root");
  return target;
}

function hasSymlinkAncestor(rootReal: string, target: string): boolean {
  const rel = relative(rootReal, target);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return true;
  let cursor = rootReal;
  for (const segment of rel.split(sep)) {
    cursor = join(cursor, segment);
    if (lstatSync(cursor).isSymbolicLink()) return true;
  }
  return false;
}

function reasonForReadError(error: unknown): FindingReason {
  if (error instanceof SafeReadFailure) return error.reason;
  const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
  return code === "ENOENT" ? "missing" : code === "ELOOP" ? "symlink" : "unreadable";
}

function identityChanged(before: FileIdentity, after: FileIdentity): boolean {
  return after.dev !== before.dev || after.ino !== before.ino;
}

function assertStableIdentity(before: FileIdentity, after: FileIdentity): void {
  if (identityChanged(before, after)) throw new SafeReadFailure("identity-changed");
}

function sizeReason(fileBytes: number, totalBefore: number): FindingReason | undefined {
  if (fileBytes > MAX_FILE_BYTES) return "file-too-large";
  if (totalBefore + fileBytes > MAX_TOTAL_BYTES) return "total-too-large";
  return undefined;
}

function safeReadFile(
  rootReal: string,
  relativePath: string,
  totalBefore: number,
): SafeReadOutcome {
  let fd: number | undefined;
  try {
    const target = targetFor(rootReal, relativePath);
    if (hasSymlinkAncestor(rootReal, target)) throw new SafeReadFailure("symlink");
    const targetReal = realpathSync(target);
    if (!rootContains(rootReal, targetReal)) throw new SafeReadFailure("outside-root");
    const before = lstatSync(target);
    if (!before.isFile()) throw new SafeReadFailure("not-regular");
    const preOpenReason = sizeReason(before.size, totalBefore);
    if (preOpenReason) throw new SafeReadFailure(preOpenReason);

    fd = openSync(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(fd);
    if (!opened.isFile()) throw new SafeReadFailure("identity-changed");
    assertStableIdentity(before, opened);
    const content = readFileSync(fd);
    const after = fstatSync(fd);
    assertStableIdentity(opened, after);
    const postReadReason = sizeReason(content.byteLength, totalBefore);
    if (postReadReason) throw new SafeReadFailure(postReadReason);
    return {
      content,
      bytes: content.byteLength,
      identity: { dev: opened.dev, ino: opened.ino },
    };
  } catch (error) {
    return {
      finding: { path: relativePath, reason: reasonForReadError(error) },
      bytes: 0,
    };
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

async function loadCanonicalFromProject(
  _projectRoot: string,
): Promise<CanonicalModelMapModule> {
  return {
    parseTlaModelMap,
    diffModelMap,
    canonicalIdentity,
  };
}

function dependencies(
  overrides: Partial<CompletenessDependencies> | undefined,
): CompletenessDependencies {
  return {
    now: overrides?.now ?? Date.now,
    loadCanonical: overrides?.loadCanonical ?? loadCanonicalFromProject,
    readFile: overrides?.readFile ?? safeReadFile,
    publish: overrides?.publish ?? publishAtomic,
  };
}

function mapFailure(
  reason: "map-missing" | "map-malformed",
  findingReason: FindingReason = reason === "map-missing" ? "missing" : "unreadable",
  mapRelativePath = DEFAULT_MODEL_MAP_RELATIVE_PATH,
): CompletenessVerdict {
  return {
    pass: false,
    reason,
    findings_count: 1,
    findings: [{ path: displayPath(mapRelativePath), reason: findingReason }],
  };
}

async function loadMap(
  projectRoot: string,
  rootReal: string,
  mapRelativePath: string,
  deps: CompletenessDependencies,
): Promise<LoadMapResult> {
  const outcome = deps.readFile(rootReal, mapRelativePath, 0);
  if (!outcome.content || !outcome.identity) {
    const findingReason = outcome.finding?.reason ?? "unreadable";
    const reason = findingReason === "missing" ? "map-missing" : "map-malformed";
    return {
      ok: false,
      verdict: mapFailure(reason, findingReason, mapRelativePath),
    };
  }
  try {
    const canonical = await deps.loadCanonical(projectRoot);
    // mapRelativePath is the location actually read, so a map declaring
    // assets outside its own space fails closed as map-malformed here.
    const parsed = canonical.parseTlaModelMap(outcome.content, mapRelativePath);
    if (!parsed.ok) {
      return {
        ok: false,
        verdict: mapFailure("map-malformed", "unreadable", mapRelativePath),
      };
    }
    return {
      ok: true,
      loaded: {
        canonical,
        map: parsed.value,
        rootReal,
        mapIdentity: outcome.identity,
        totalBytes: outcome.bytes,
      },
    };
  } catch {
    return {
      ok: false,
      verdict: mapFailure("map-malformed", "unreadable", mapRelativePath),
    };
  }
}

interface DecodedIdentity {
  readonly identity?: string;
  readonly source?: string;
  readonly finding?: CompletenessFinding;
}

function decodeIdentity(
  outcome: SafeReadOutcome,
  path: string,
  domain: string,
  identity: typeof canonicalIdentity,
): DecodedIdentity {
  if (!outcome.content) {
    return { finding: outcome.finding ?? { path, reason: "unreadable" } };
  }
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(outcome.content);
    return { identity: identity(source, domain).sha256, source };
  } catch {
    return { finding: { path, reason: "unreadable" } };
  }
}

function evaluateAssets(
  rootReal: string,
  map: ModelMap,
  canonical: CanonicalModelMapModule,
  deps: CompletenessDependencies,
  totalBefore: number,
): AssetEvaluation {
  const findings: CompletenessFinding[] = [];
  const models: ModelAssetIdentities[] = [];
  let totalBytes = totalBefore;
  for (const model of map.models) {
    let modelIdentity: string | undefined;
    let cfgIdentity: string | undefined;
    const auxIdentities: (string | undefined)[] = [];
    const moduleSources = new Map<string, string>();
    for (const asset of [
      {
        moduleName: model.name,
        path: model.model.path,
        domain: "amadeus.formal-verif.tla.module.v1",
        recorded: model.model.identity,
        assign: (value: string): void => {
          modelIdentity = value;
        },
      },
      {
        moduleName: undefined,
        path: model.cfg.path,
        domain: "amadeus.formal-verif.tla.cfg.v1",
        recorded: model.cfg.identity,
        assign: (value: string): void => {
          cfgIdentity = value;
        },
      },
      ...(model.auxiliaries ?? []).map((aux, index) => ({
        moduleName: basename(aux.path, ".tla"),
        path: aux.path,
        domain: "amadeus.formal-verif.tla.module.v1",
        recorded: aux.identity,
        assign: (value: string): void => {
          auxIdentities[index] = value;
        },
      })),
    ]) {
      const outcome = deps.readFile(rootReal, asset.path, totalBytes);
      totalBytes += outcome.bytes;
      const decoded = decodeIdentity(
        outcome,
        asset.path,
        asset.domain,
        canonical.canonicalIdentity,
      );
      if (decoded.finding) {
        findings.push(decoded.finding);
        continue;
      }
      const current = decoded.identity as string;
      asset.assign(current);
      if (asset.moduleName && decoded.source !== undefined) {
        moduleSources.set(asset.moduleName, decoded.source);
      }
      if (current !== asset.recorded) findings.push({ path: asset.path, reason: "changed" });
    }
    models.push({
      name: model.name,
      modelIdentity,
      cfgIdentity,
      ...(model.auxiliaries ? { auxIdentities } : {}),
      moduleSources,
    });
  }
  return { findings, models, totalBytes };
}

function moduleDepsFailure(
  tlaDir: string,
  moduleName: string,
  detail: string,
): { readonly ok: false; readonly error: ModuleDepsError } {
  return {
    ok: false,
    error: {
      kind: "MODULE_DEPS",
      code: "MODULE_DEP_UNRESOLVED",
      relativePath: `${tlaDir}/${moduleName}.tla`,
      detail,
    },
  };
}

function evaluateDeclarations(
  rootReal: string,
  map: ModelMap,
  assets: AssetEvaluation,
  deadline: number,
  deps: CompletenessDependencies,
): DeclarationEvaluation {
  const drifts: ModuleDeclarationDrift[] = [];
  const findings: CompletenessFinding[] = [];
  const resolvedByModel = new Map<string, readonly string[]>();
  const sourcesByModel = new Map<string, ReadonlyMap<string, string>>();
  const measured = new Map(assets.models.map((model) => [model.name, model]));
  let totalBytes = assets.totalBytes;
  for (const model of map.models) {
    const modelAssets = measured.get(model.name);
    if (!modelAssets?.moduleSources.has(model.name)) continue;
    const declaredNames = (model.auxiliaries ?? []).map((aux) => basename(aux.path, ".tla"));
    if (declaredNames.some((name) => !modelAssets.moduleSources.has(name))) continue;
    const sources = new Map(modelAssets.moduleSources);
    // Auxiliary modules live in the same canonical spec directory as the model
    // (the map validator pins it), so the model's own declared path fixes the
    // directory auxiliary reads resolve against.
    const tlaDir = posix.dirname(model.model.path);
    const readModule = (name: string) => {
      const cached = sources.get(name);
      if (cached !== undefined) return { ok: true as const, value: cached };
      const relativePath = `${tlaDir}/${name}.tla`;
      const outcome = deps.readFile(rootReal, relativePath, totalBytes);
      totalBytes += outcome.bytes;
      if (!outcome.content) {
        return moduleDepsFailure(tlaDir, name, `${relativePath}: ${outcome.finding?.reason ?? "unreadable"}`);
      }
      try {
        const source = new TextDecoder("utf-8", { fatal: true }).decode(outcome.content);
        sources.set(name, source);
        return { ok: true as const, value: source };
      } catch {
        return moduleDepsFailure(tlaDir, name, `${relativePath}: unreadable`);
      }
    };
    const resolved = resolveAuxiliaryModules(model.name, readModule);
    if (!resolved.ok) {
      findings.push({ path: model.model.path, reason: "declaration-unresolved" });
      sourcesByModel.set(model.name, sources);
      continue;
    }
    if ((resolved.value.length > 0 || declaredNames.length > 0) && deps.now() >= deadline) {
      findings.push({ path: model.model.path, reason: "timeout" });
      return {
        drifts,
        findings,
        resolvedByModel,
        sourcesByModel,
        timedOut: true,
        totalBytes,
      };
    }
    resolvedByModel.set(model.name, resolved.value);
    sourcesByModel.set(model.name, sources);
    const drift = compareModuleDeclarations(model.name, declaredNames, resolved.value);
    if (drift.missing.length > 0 || drift.extra.length > 0) {
      drifts.push(drift);
      findings.push({ path: model.model.path, reason: "declaration-drift" });
    }
  }
  return {
    drifts,
    findings,
    resolvedByModel,
    sourcesByModel,
    timedOut: false,
    totalBytes,
  };
}

function evaluateEntries(
  rootReal: string,
  map: ModelMap,
  deadline: number,
  deps: CompletenessDependencies,
  totalBefore: number,
): EvaluatedEntries {
  const currentEntries: ModelMapEntry[] = [];
  const findings: CompletenessFinding[] = [];
  let totalBytes = totalBefore;
  for (const entry of registeredEntries(map)) {
    if (deps.now() >= deadline) {
      findings.push({ path: entry.implPath, reason: "timeout" });
      return { currentEntries, findings, timedOut: true, totalBytes };
    }
    const outcome = deps.readFile(rootReal, entry.implPath, totalBytes);
    totalBytes += outcome.bytes;
    if (outcome.content) {
      currentEntries.push({ implPath: entry.implPath, sha256: sha256(outcome.content) });
    } else {
      findings.push(outcome.finding ?? { path: entry.implPath, reason: "unreadable" });
    }
  }
  return {
    currentEntries,
    findings,
    timedOut: deps.now() >= deadline,
    totalBytes,
  };
}

async function checkModelCompletenessInternal(
  options: InternalOptions,
): Promise<CompletenessVerdict> {
  const projectRoot = resolve(options.projectRoot ?? process.cwd());
  let rootReal: string;
  try {
    rootReal = realpathSync(projectRoot);
    targetFor(rootReal, options.mapRelativePath);
  } catch {
    return mapFailure("map-malformed", "outside-root", options.mapRelativePath);
  }
  const deps = dependencies(options.dependencies);
  const deadline = deps.now() + (options.deadlineMs ?? DEFAULT_DEADLINE_MS);
  const loadedResult = await loadMap(
    projectRoot,
    rootReal,
    options.mapRelativePath,
    deps,
  );
  if (!loadedResult.ok) return loadedResult.verdict;
  const { loaded } = loadedResult;
  const assets = evaluateAssets(
    loaded.rootReal,
    loaded.map,
    loaded.canonical,
    deps,
    loaded.totalBytes,
  );
  const declarations = evaluateDeclarations(
    loaded.rootReal,
    loaded.map,
    assets,
    deadline,
    deps,
  );
  const evaluated = evaluateEntries(
    loaded.rootReal,
    loaded.map,
    deadline,
    deps,
    declarations.totalBytes,
  );
  const findings = [
    ...assets.findings,
    ...declarations.findings,
    ...evaluated.findings,
  ];
  if (declarations.timedOut || evaluated.timedOut) {
    if (!findings.some((finding) => finding.reason === "timeout")) {
      findings.push({ path: options.mapRelativePath, reason: "timeout" });
    }
    return {
      pass: false,
      reason: "timeout",
      findings_count: findings.length,
      findings,
    };
  }

  const unreadablePaths = new Set(findings.map((finding) => finding.path));
  const reported = new Set<string>();
  for (const model of loaded.map.models) {
    for (const drift of loaded.canonical.diffModelMap(model, evaluated.currentEntries)) {
      if (unreadablePaths.has(drift.implPath) || reported.has(drift.implPath)) continue;
      reported.add(drift.implPath);
      findings.push({ path: drift.implPath, reason: "changed" });
    }
  }
  if (findings.length === 0) {
    return { pass: true, findings_count: 0, findings: [] };
  }
  return {
    pass: false,
    reason: "drift",
    findings_count: findings.length,
    findings,
  };
}

export async function checkModelCompleteness(
  options: CheckModelCompletenessOptions = {},
): Promise<CompletenessVerdict> {
  let mapRelativePath: string;
  try {
    mapRelativePath = modelMapRelativePath(resolve(options.projectRoot ?? process.cwd()));
  } catch (err) {
    // The legacy layout fails closed as a verdict, never a rejection: the
    // check shape has no detail slot, so the finding names the errored
    // space's canonical map path — the migration target the LegacySpecError
    // message spells out for the update path below.
    if (err instanceof LegacySpecError) {
      return mapFailure("map-malformed", "unreadable", tlaModelMapPath(err.space));
    }
    throw err;
  }
  return checkModelCompletenessInternal({ ...options, mapRelativePath });
}

// The model keys canonicalRecord RECOMPUTES below. Everything else the parser
// preserved is carried across verbatim by carriedModelFields().
//
// Listing what is recomputed — rather than what is carried — is the point
// (#3331). The previous spelling enumerated the carried keys, so every optional
// key added to the schema after that list was written was silently dropped on
// the next rewrite: `evidenceBundle` had to be patched in once already, and
// `authoringProvenance` was lost the same way, erasing which intent authored a
// model on a refresh that only ever meant to restamp implementation hashes.
// Inverted, an unknown key is carried by default and only a deliberate edit
// here can drop one.
const RECOMPUTED_MODEL_KEYS: ReadonlySet<string> = new Set([
  "name",
  "model",
  "cfg",
  "auxiliaries",
  "entries",
]);

// The parser builds every model with the same key order, so the carried tail is
// deterministic and an unchanged record round-trips byte for byte.
function carriedModelFields(model: ModelMapModel): Record<string, unknown> {
  const carried: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(model)) {
    if (RECOMPUTED_MODEL_KEYS.has(key)) continue;
    carried[key] = value;
  }
  return carried;
}

function canonicalRecord(
  map: ModelMap,
  assets: AssetEvaluation,
  entries: readonly ModelMapEntry[],
  auxiliaryUpdates: ReadonlyMap<string, readonly ModelMapAssetIdentity[]> = new Map(),
): string {
  const currentEntry = new Map(entries.map((entry) => [entry.implPath, entry.sha256]));
  const identities = new Map(assets.models.map((model) => [model.name, model]));
  return `${JSON.stringify(
    {
      schemaVersion: TLA_MODEL_MAP_SCHEMA_VERSION,
      models: map.models.map((model) => {
        const measured = identities.get(model.name);
        const auxiliaries = auxiliaryUpdates.get(model.name)
          ?? model.auxiliaries?.map((aux, index) => ({
            path: aux.path,
            identity: measured?.auxIdentities?.[index] ?? aux.identity,
          }));
        return {
          name: model.name,
          model: {
            path: model.model.path,
            identity: measured?.modelIdentity ?? model.model.identity,
          },
          cfg: {
            path: model.cfg.path,
            identity: measured?.cfgIdentity ?? model.cfg.identity,
          },
          ...(auxiliaries && auxiliaries.length > 0 ? { auxiliaries } : {}),
          entries: model.entries.map((entry) => ({
            implPath: entry.implPath,
            sha256: currentEntry.get(entry.implPath) ?? entry.sha256,
          })),
          // An impl-only refresh rewrites the whole record, so vocabulary, the
          // registered evidence reference and the authoring provenance all have
          // to be carried across or they are silently lost (#3331).
          ...carriedModelFields(model),
        };
      }),
    },
    null,
    2,
  )}\n`;
}

function correctedAuxiliaries(
  declarations: DeclarationEvaluation,
  canonical: CanonicalModelMapModule,
  map: ModelMap,
): ReadonlyMap<string, readonly ModelMapAssetIdentity[]> {
  const updates = new Map<string, readonly ModelMapAssetIdentity[]>();
  for (const drift of declarations.drifts) {
    const resolved = declarations.resolvedByModel.get(drift.modelName) ?? [];
    const sources = declarations.sourcesByModel.get(drift.modelName);
    // Republished auxiliary paths keep the model's own canonical spec
    // directory (the validator pins model and auxiliaries to one directory).
    const model = map.models.find((entry) => entry.name === drift.modelName);
    if (model === undefined) throw new Error(`drifted model missing from map: ${drift.modelName}`);
    const tlaDir = posix.dirname(model.model.path);
    const auxiliaries = resolved.map((name) => {
      const source = sources?.get(name);
      if (source === undefined) throw new Error(`resolved module source missing: ${name}`);
      return {
        path: `${tlaDir}/${name}.tla`,
        identity: canonical.canonicalIdentity(
          source,
          "amadeus.formal-verif.tla.module.v1",
        ).sha256,
      };
    });
    updates.set(drift.modelName, auxiliaries);
  }
  return updates;
}

function validatePublishTarget(
  rootReal: string,
  mapRelativePath: string,
  expectedIdentity: FileIdentity,
): string {
  const mapPath = targetFor(rootReal, mapRelativePath);
  const parent = dirname(mapPath);
  const parentReal = realpathSync(parent);
  if (!rootContains(rootReal, parentReal)) throw new SafeReadFailure("outside-root");
  if (hasSymlinkAncestor(rootReal, parent)) throw new SafeReadFailure("symlink");
  const mapStat = lstatSync(mapPath);
  if (mapStat.isSymbolicLink()) throw new SafeReadFailure("symlink");
  if (!mapStat.isFile()) throw new SafeReadFailure("not-regular");
  assertStableIdentity(expectedIdentity, mapStat);
  return mapPath;
}

function publishAtomic(
  rootReal: string,
  mapRelativePath: string,
  expectedIdentity: FileIdentity,
  body: string,
): void {
  const mapPath = validatePublishTarget(rootReal, mapRelativePath, expectedIdentity);
  const parent = dirname(mapPath);
  const tempPath = join(
    parent,
    `.${mapRelativePath.split("/").at(-1)}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`,
  );
  let fd: number | undefined;
  let renamed = false;
  try {
    fd = openSync(tempPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o644);
    fchmodSync(fd, 0o644);
    writeFileSync(fd, body, "utf-8");
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    validatePublishTarget(rootReal, mapRelativePath, expectedIdentity);
    renameSync(tempPath, mapPath);
    renamed = true;
    const dirFd = openSync(parent, constants.O_RDONLY);
    try {
      fsyncSync(dirFd);
    } finally {
      closeSync(dirFd);
    }
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (!renamed) rmSync(tempPath, { force: true });
  }
}

function updateFailure(path: string, reason: UpdateFailureReason): UpdateModelMapResult {
  return {
    ok: false,
    code: "UPDATE_FAILED",
    detail: `${displayPath(path)}: ${reason}`,
  };
}

function mapUpdateFailure(
  verdict: CompletenessVerdict,
  mapRelativePath: string,
): UpdateModelMapResult {
  if (verdict.pass) return updateFailure(mapRelativePath, "unreadable");
  const finding = verdict.findings[0];
  return {
    ok: false,
    code: verdict.reason === "map-missing" ? "MAP_MISSING" : "MAP_MALFORMED",
    detail: `${mapRelativePath}: ${finding?.reason ?? "unreadable"}`,
  };
}

function updatedEntries(
  rootReal: string,
  previous: readonly ModelMapEntry[],
  deps: CompletenessDependencies,
  totalBefore: number,
): { readonly entries?: readonly ModelMapEntry[]; readonly failure?: CompletenessFinding } {
  const entries: ModelMapEntry[] = [];
  let totalBytes = totalBefore;
  for (const entry of previous) {
    const outcome = deps.readFile(rootReal, entry.implPath, totalBytes);
    if (!outcome.content) {
      return {
        failure: outcome.finding ?? { path: entry.implPath, reason: "unreadable" },
      };
    }
    entries.push({ implPath: entry.implPath, sha256: sha256(outcome.content) });
    totalBytes += outcome.bytes;
  }
  return { entries };
}

function implOnlyChanges(
  previous: readonly ModelMapEntry[],
  published: readonly ModelMapEntry[],
): readonly ImplOnlyChange[] {
  const recorded = new Map(previous.map((entry) => [entry.implPath, entry.sha256]));
  const changes: ImplOnlyChange[] = [];
  for (const entry of published) {
    const from = recorded.get(entry.implPath);
    if (from !== undefined && from !== entry.sha256) {
      changes.push({
        implPath: entry.implPath,
        from: from.slice(0, IMPL_ONLY_HASH_PREFIX),
        to: entry.sha256.slice(0, IMPL_ONLY_HASH_PREFIX),
      });
    }
  }
  return changes;
}

// Every registered model must be byte-identical to its published identity for
// the --impl-only declaration to hold; one drifted model falsifies it.
function assetsUnchanged(map: ModelMap, assets: AssetEvaluation): boolean {
  const measured = new Map(assets.models.map((model) => [model.name, model]));
  return map.models.every((model) => {
    const current = measured.get(model.name);
    return current?.modelIdentity === model.model.identity
      && current?.cfgIdentity === model.cfg.identity
      && (model.auxiliaries ?? []).every(
        (aux, index) => current?.auxIdentities?.[index] === aux.identity,
      );
  });
}

function performImplOnlyUpdate(
  loaded: LoadedMap,
  assets: AssetEvaluation,
  declarations: DeclarationEvaluation,
  mapRelativePath: string,
  deps: CompletenessDependencies,
): UpdateModelMapResult {
  // A single changed identity bit falsifies the --impl-only declaration.
  if (!assetsUnchanged(loaded.map, assets)) {
    return {
      ok: false,
      code: "INVALID_ARGUMENT",
      detail: `${mapRelativePath}: model-changed; --impl-only declares the model and configuration are unchanged - publish a model revision with updateModelMap and no flag`,
    };
  }
  if (declarations.findings.length > 0 || declarations.drifts.length > 0) {
    return {
      ok: false,
      code: "INVALID_ARGUMENT",
      detail: `${mapRelativePath}: declaration-drift; --impl-only cannot repair model declarations - publish the correction with updateModelMap and no flag`,
    };
  }
  // Drift is decided by the check path's own machinery so the two cannot disagree.
  const evaluated = evaluateEntries(
    loaded.rootReal,
    loaded.map,
    deps.now() + DEFAULT_DEADLINE_MS,
    deps,
    declarations.totalBytes,
  );
  if (evaluated.timedOut) return updateFailure(mapRelativePath, "timeout");
  const unreadable = evaluated.findings[0];
  if (unreadable) return updateFailure(unreadable.path, unreadable.reason);
  const drifted = loaded.map.models.some(
    (model) => loaded.canonical.diffModelMap(model, evaluated.currentEntries).length > 0,
  );
  if (!drifted) {
    return {
      ok: false,
      code: "MODEL_UNCHANGED",
      detail: `${mapRelativePath}: impl-unchanged`,
    };
  }
  const refreshed = updatedEntries(
    loaded.rootReal,
    registeredEntries(loaded.map),
    deps,
    evaluated.totalBytes,
  );
  if (refreshed.failure) {
    return updateFailure(refreshed.failure.path, refreshed.failure.reason);
  }
  const entries = refreshed.entries as readonly ModelMapEntry[];
  const body = canonicalRecord(loaded.map, assets, entries);
  try {
    deps.publish(loaded.rootReal, mapRelativePath, loaded.mapIdentity, body);
  } catch {
    return updateFailure(mapRelativePath, "publish-failed");
  }
  const changed = implOnlyChanges(registeredEntries(loaded.map), entries);
  const map = mapRelativePath;
  return { ok: true, code: "IMPL_ONLY_UPDATED", declared: "impl-only", changed, map };
}

async function performModelMapUpdate(
  projectRoot: string,
  rootReal: string,
  mapRelativePath: string,
  implOnly: boolean,
  deps: CompletenessDependencies,
): Promise<UpdateModelMapResult> {
  const loadedResult = await loadMap(projectRoot, rootReal, mapRelativePath, deps);
  if (!loadedResult.ok) return mapUpdateFailure(loadedResult.verdict, mapRelativePath);
  const { loaded } = loadedResult;
  const assets = evaluateAssets(
    loaded.rootReal,
    loaded.map,
    loaded.canonical,
    deps,
    loaded.totalBytes,
  );
  const assetFailure = assets.findings.find((finding) => finding.reason !== "changed");
  if (assetFailure) return updateFailure(assetFailure.path, assetFailure.reason);
  if (assets.models.some((model) => !model.modelIdentity || !model.cfgIdentity)) {
    return updateFailure(mapRelativePath, "unreadable");
  }
  const declarations = evaluateDeclarations(
    loaded.rootReal,
    loaded.map,
    assets,
    deps.now() + DEFAULT_DEADLINE_MS,
    deps,
  );
  const declarationFailure = declarations.findings.find(
    (finding) => finding.reason === "declaration-unresolved" || finding.reason === "timeout",
  );
  if (declarationFailure) {
    return updateFailure(declarationFailure.path, declarationFailure.reason);
  }
  if (implOnly) {
    return performImplOnlyUpdate(loaded, assets, declarations, mapRelativePath, deps);
  }
  if (assetsUnchanged(loaded.map, assets) && declarations.drifts.length === 0) {
    return {
      ok: false,
      code: "MODEL_UNCHANGED",
      detail: `${mapRelativePath}: model-unchanged; ${IMPL_ONLY_UPDATE_HINT}`,
    };
  }
  const refreshed = updatedEntries(
    loaded.rootReal,
    registeredEntries(loaded.map),
    deps,
    declarations.totalBytes,
  );
  if (refreshed.failure) {
    return updateFailure(refreshed.failure.path, refreshed.failure.reason);
  }
  let auxiliaryUpdates: ReadonlyMap<string, readonly ModelMapAssetIdentity[]>;
  try {
    auxiliaryUpdates = correctedAuxiliaries(declarations, loaded.canonical, loaded.map);
  } catch {
    return updateFailure(mapRelativePath, "declaration-unresolved");
  }
  try {
    deps.publish(
      loaded.rootReal,
      mapRelativePath,
      loaded.mapIdentity,
      canonicalRecord(
        loaded.map,
        assets,
        refreshed.entries as readonly ModelMapEntry[],
        auxiliaryUpdates,
      ),
    );
  } catch {
    return updateFailure(mapRelativePath, "publish-failed");
  }
  return {
    ok: true,
    entries: refreshed.entries?.length ?? 0,
    map: mapRelativePath,
  };
}

async function updateModelMapInternal(options: InternalOptions): Promise<UpdateModelMapResult> {
  const projectRoot = resolve(options.projectRoot ?? process.cwd());
  let rootReal: string;
  let mapPath: string;
  try {
    rootReal = realpathSync(projectRoot);
    mapPath = targetFor(rootReal, options.mapRelativePath);
    const parentReal = realpathSync(dirname(mapPath));
    if (!rootContains(rootReal, parentReal)) return updateFailure(options.mapRelativePath, "outside-root");
    if (hasSymlinkAncestor(rootReal, dirname(mapPath))) {
      return updateFailure(options.mapRelativePath, "symlink");
    }
  } catch {
    return updateFailure(options.mapRelativePath, "invalid-path");
  }
  const deps = dependencies(options.dependencies);
  const lockPath = `${mapPath}.lock`;
  try {
    mkdirSync(lockPath);
  } catch {
    return {
      ok: false,
      code: "LOCKED",
      detail: `${options.mapRelativePath}: locked`,
    };
  }
  try {
    return await performModelMapUpdate(
      projectRoot,
      rootReal,
      options.mapRelativePath,
      options.implOnly === true,
      deps,
    );
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}

export async function updateModelMap(
  options: UpdateModelMapOptions = {},
): Promise<UpdateModelMapResult> {
  let mapRelativePath: string;
  try {
    mapRelativePath = modelMapRelativePath(resolve(options.projectRoot ?? process.cwd()));
  } catch (err) {
    // Fail closed as a typed failure (never a rejected promise); the detail
    // carries the resolver's migration instructions verbatim.
    if (err instanceof LegacySpecError) {
      return { ok: false, code: "MAP_MALFORMED", detail: err.message };
    }
    throw err;
  }
  return updateModelMapInternal({ ...options, mapRelativePath });
}

function flagValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function supportedArguments(argv: readonly string[], allowImplOnly: boolean): boolean {
  const supported = new Set(["--project-dir", "--stage", "--output-path"]);
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === IMPL_ONLY_FLAG) {
      if (!allowImplOnly) return false;
      continue;
    }
    const value = argv[index + 1];
    if (!supported.has(argument) || !value || value.startsWith("--")) return false;
    index++;
  }
  return true;
}

export const modelCompletenessTestSeams = {
  assertStableIdentity,
  checkWithMapPath: checkModelCompletenessInternal,
  loadCanonicalFromProject,
  mapFailure,
  reasonForReadError,
  rootContains,
  safeReadFile,
  updateWithMapPath: updateModelMapInternal,
  validatePublishTarget,
};

interface MainOperations {
  readonly check: typeof checkModelCompleteness;
  readonly update: typeof updateModelMap;
}

export async function main(
  argv: string[] = process.argv.slice(2),
  operations: MainOperations = {
    check: checkModelCompleteness,
    update: updateModelMap,
  },
): Promise<number> {
  const command = argv[0] === "updateModelMap" ? "updateModelMap" : "check";
  const args = command === "updateModelMap" ? argv.slice(1) : argv;
  if (!supportedArguments(args, command === "updateModelMap")) {
    const result: UpdateModelMapResult = {
      ok: false,
      code: "INVALID_ARGUMENT",
      detail: "arguments: unsupported",
    };
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 2;
  }
  const projectRoot = flagValue(args, "--project-dir") ?? process.cwd();
  if (command === "updateModelMap") {
    const result = await operations.update({
      projectRoot,
      implOnly: args.includes(IMPL_ONLY_FLAG),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.ok ? 0 : 1;
  }

  const verdict = await operations.check({ projectRoot }).catch(
    () => mapFailure("map-malformed"),
  );
  process.stdout.write(`${JSON.stringify(verdict)}\n`);
  return 0;
}

if (import.meta.main) process.exitCode = await main();
