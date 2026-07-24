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
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  ModelMap,
  ModelMapEntry,
  ModelMapDrift,
  parseTlaModelMap,
} from "../../../../scripts/formal-verif/tla-model-map.ts";
import type { canonicalIdentity } from "../../../../scripts/formal-verif/canonical.ts";

const MODEL_MAP_RELATIVE_PATH = "specs/tla/model-map.json";
const MODEL_RELATIVE_PATH = "specs/tla/FormalElection.tla";
const CFG_RELATIVE_PATH = "specs/tla/FormalElection.cfg";
const CANONICAL_MODULE_RELATIVE_PATH = "scripts/formal-verif/tla-model-map.ts";
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const DEFAULT_DEADLINE_MS = 9_000;

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
  | "timeout";

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

export type UpdateModelMapResult =
  | { readonly ok: true; readonly entries: number; readonly map: string }
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
    modelMap: ModelMap,
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
  readonly dependencies?: Partial<CompletenessDependencies>;
}

interface InternalOptions {
  readonly projectRoot?: string;
  readonly mapRelativePath: string;
  readonly deadlineMs?: number;
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

interface AssetEvaluation {
  readonly findings: readonly CompletenessFinding[];
  readonly modelIdentity?: string;
  readonly cfgIdentity?: string;
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
  return canonicalRelativePath(path) ? path : MODEL_MAP_RELATIVE_PATH;
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

async function loadCanonicalFromProject(projectRoot: string): Promise<CanonicalModelMapModule> {
  const modelMapPath = join(projectRoot, CANONICAL_MODULE_RELATIVE_PATH);
  const identityPath = join(projectRoot, "scripts/formal-verif/canonical.ts");
  const [modelMapModule, identityModule] = await Promise.all([
    import(pathToFileURL(modelMapPath).href),
    import(pathToFileURL(identityPath).href),
  ]);
  return {
    parseTlaModelMap: modelMapModule.parseTlaModelMap,
    diffModelMap: modelMapModule.diffModelMap,
    canonicalIdentity: identityModule.canonicalIdentity,
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
  mapRelativePath = MODEL_MAP_RELATIVE_PATH,
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
    const parsed = canonical.parseTlaModelMap(outcome.content);
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

function decodeIdentity(
  outcome: SafeReadOutcome,
  path: string,
  domain: string,
  identity: typeof canonicalIdentity,
): { readonly identity?: string; readonly finding?: CompletenessFinding } {
  if (!outcome.content) {
    return { finding: outcome.finding ?? { path, reason: "unreadable" } };
  }
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(outcome.content);
    return { identity: identity(source, domain).sha256 };
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
  let totalBytes = totalBefore;
  let modelIdentity: string | undefined;
  let cfgIdentity: string | undefined;
  for (const asset of [
    {
      path: MODEL_RELATIVE_PATH,
      domain: "amadeus.formal-verif.tla.module.v1",
      recorded: map.model.identity,
      assign: (value: string): void => {
        modelIdentity = value;
      },
    },
    {
      path: CFG_RELATIVE_PATH,
      domain: "amadeus.formal-verif.tla.cfg.v1",
      recorded: map.cfg.identity,
      assign: (value: string): void => {
        cfgIdentity = value;
      },
    },
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
    if (current !== asset.recorded) findings.push({ path: asset.path, reason: "changed" });
  }
  return { findings, modelIdentity, cfgIdentity, totalBytes };
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
  for (const entry of map.entries) {
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
  const evaluated = evaluateEntries(
    loaded.rootReal,
    loaded.map,
    deadline,
    deps,
    assets.totalBytes,
  );
  const findings = [...assets.findings, ...evaluated.findings];
  if (evaluated.timedOut) {
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
  for (const drift of loaded.canonical.diffModelMap(loaded.map, evaluated.currentEntries)) {
    if (!unreadablePaths.has(drift.implPath)) {
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
  return checkModelCompletenessInternal({
    ...options,
    mapRelativePath: MODEL_MAP_RELATIVE_PATH,
  });
}

function canonicalRecord(
  modelIdentity: string,
  cfgIdentity: string,
  entries: readonly ModelMapEntry[],
): string {
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      model: { path: MODEL_RELATIVE_PATH, identity: modelIdentity },
      cfg: { path: CFG_RELATIVE_PATH, identity: cfgIdentity },
      entries,
    },
    null,
    2,
  )}\n`;
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
    `.${MODEL_MAP_RELATIVE_PATH.split("/").at(-1)}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`,
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

async function performModelMapUpdate(
  projectRoot: string,
  rootReal: string,
  mapRelativePath: string,
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
  if (!assets.modelIdentity || !assets.cfgIdentity) {
    return updateFailure(MODEL_MAP_RELATIVE_PATH, "unreadable");
  }
  if (
    assets.modelIdentity === loaded.map.model.identity &&
    assets.cfgIdentity === loaded.map.cfg.identity
  ) {
    return {
      ok: false,
      code: "MODEL_UNCHANGED",
      detail: `${MODEL_MAP_RELATIVE_PATH}: model-unchanged`,
    };
  }
  const refreshed = updatedEntries(
    loaded.rootReal,
    loaded.map.entries,
    deps,
    assets.totalBytes,
  );
  if (refreshed.failure) {
    return updateFailure(refreshed.failure.path, refreshed.failure.reason);
  }
  try {
    deps.publish(
      loaded.rootReal,
      mapRelativePath,
      loaded.mapIdentity,
      canonicalRecord(
        assets.modelIdentity,
        assets.cfgIdentity,
        refreshed.entries as readonly ModelMapEntry[],
      ),
    );
  } catch {
    return updateFailure(mapRelativePath, "publish-failed");
  }
  return {
    ok: true,
    entries: refreshed.entries?.length ?? 0,
    map: MODEL_MAP_RELATIVE_PATH,
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
      detail: `${MODEL_MAP_RELATIVE_PATH}: locked`,
    };
  }
  try {
    return await performModelMapUpdate(
      projectRoot,
      rootReal,
      options.mapRelativePath,
      deps,
    );
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}

export async function updateModelMap(
  options: UpdateModelMapOptions = {},
): Promise<UpdateModelMapResult> {
  return updateModelMapInternal({
    ...options,
    mapRelativePath: MODEL_MAP_RELATIVE_PATH,
  });
}

function flagValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function supportedArguments(argv: readonly string[]): boolean {
  const supported = new Set(["--project-dir", "--stage", "--output-path"]);
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
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
  if (!supportedArguments(args)) {
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
    const result = await operations.update({ projectRoot });
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
