import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import type { Stats } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalIdentity } from "./canonical.ts";
import type { Result } from "./contract.ts";
import {
  compareModuleDeclarations,
  type ModuleDepsError,
  resolveAuxiliaryModules,
} from "./tla-module-deps.ts";
import {
  IMPL_ONLY_UPDATE_HINT,
  LegacySpecError,
  type ModelLoadError,
  type ModelLoadErrorCode,
  type ModelMap,
  type ModelMapAssetIdentity,
  type ModelMapModel,
  TLA_EXECUTION_MODEL_NAME,
  TLA_MODEL_MAP_PATH,
  evaluateTlaModelReadiness,
  isCanonicalImplementationPath,
  resolveSpecRoots,
  tlaModelMapPath,
  tlaSpecDirPath,
} from "./tla-model-map.ts";

export type { ModelLoadError, ModelLoadErrorCode, ModelMap, ModelMapModel } from "./tla-model-map.ts";
export type { ModuleDepsError } from "./tla-module-deps.ts";

// Time-boxed compatibility type (BR-S4): kept only so the singular shim can
// project the multi-model pipeline onto the pre-u2 shape. u3 removes it once
// run-model-check-source.ts and tla-arm.ts move to the plural API.
export interface VerifiedTlaSource {
  readonly moduleBytes: Uint8Array;
  readonly cfgBytes: Uint8Array;
  readonly moduleSource: string;
  readonly cfgSource: string;
  readonly moduleIdentity: string;
  readonly cfgIdentity: string;
  readonly modelMap: ModelMap;
  readonly executionModel: ModelMapModel;
  readonly auxIdentities: readonly ModelMapAssetIdentity[];
}

export interface VerifiedModelSource {
  readonly model: ModelMapModel;
  readonly moduleBytes: Uint8Array;
  readonly cfgBytes: Uint8Array;
  readonly moduleSource: string;
  readonly cfgSource: string;
  readonly moduleIdentity: string;
  readonly cfgIdentity: string;
  // Measured aux identities, verified equal to the declaration (empty when the
  // model declares no auxiliaries).
  readonly auxIdentities: readonly ModelMapAssetIdentity[];
}

export interface VerifiedTlaSources {
  // Declaration order, which the parser pins to unique name-ascending, so the
  // array is deterministic without any loader-side sort.
  readonly models: readonly VerifiedModelSource[];
  readonly modelMap: ModelMap;
}

export interface SourceDriftError {
  readonly kind: "SOURCE_DRIFT";
  readonly code: "SOURCE_DRIFT";
  readonly relativePath: string;
  readonly detail: string;
}

export type TlaModelPipelineError = ModelLoadError | SourceDriftError;

export interface TlaFileSystem {
  readonly exists: (path: string) => boolean;
  readonly lstat: (path: string) => Stats;
  readonly readFile: (path: string) => Uint8Array;
  readonly realpath: (path: string) => string;
  readonly stat: (path: string) => Stats;
}

const NODE_FILE_SYSTEM: TlaFileSystem = {
  exists: existsSync,
  lstat: lstatSync,
  readFile: (path) => readFileSync(path),
  realpath: realpathSync,
  stat: statSync,
};

const TLA_MODULE_DOMAIN = "amadeus.formal-verif.tla.module.v1";
const TLA_CFG_DOMAIN = "amadeus.formal-verif.tla.cfg.v1";

interface VerifiedAssetPaths {
  readonly repositoryRoot: string;
  readonly mapPath: string;
  // The map's repo-relative canonical location, handed to the readiness parse
  // so a map declaring assets outside its own space is rejected (the parse
  // must see the non-realpath'd form: a symlinked intermediate component is a
  // legitimate layout and realpath would rewrite the space-carrying tail).
  readonly mapRel: string;
  // The canonical spec directory (repo-relative and absolute forms) from the
  // shared spec root resolver — the boundary every TLA asset verifies against.
  readonly specDirRel: string;
  readonly specDirAbs: string;
}

type AssetKind = "MODEL" | "CFG" | "MODEL_MAP";

function loadError(
  code: ModelLoadErrorCode,
  relativePath: string,
  detail: string,
  cause?: unknown,
): Result<never, ModelLoadError> {
  return {
    ok: false,
    error: { kind: "MODEL_LOAD", code, relativePath, detail, ...(cause === undefined ? {} : { cause }) },
  };
}

function drift(relativePath: string, detail: string): Result<never, SourceDriftError> {
  return {
    ok: false,
    error: { kind: "SOURCE_DRIFT", code: "SOURCE_DRIFT", relativePath, detail },
  };
}

function codeFor(kind: AssetKind, failure: "MISSING" | "EMPTY" | "UNREADABLE"): ModelLoadErrorCode {
  if (kind === "MODEL_MAP") return `MODEL_MAP_${failure}`;
  return `${kind}_${failure}`;
}

function isContained(parent: string, child: string): boolean {
  const childRelative = relative(parent, child);
  return childRelative === "" || (!childRelative.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
    && childRelative !== ".."
    && !isAbsolute(childRelative));
}

// The root condition is the workspace shape alone (`.git` + `package.json`);
// the spec directory is NOT part of it — spec resolution is delegated to the
// shared resolver once the root is found (L-4), so user workspaces without an
// `amadeus/` tree still resolve the root and keep their not-found behaviour.
function findRepositoryRoot(moduleUrl: string, fs: TlaFileSystem): Result<string, ModelLoadError> {
  let current = dirname(fileURLToPath(moduleUrl));
  while (true) {
    if (
      fs.exists(join(current, ".git"))
      && fs.exists(join(current, "package.json"))
    ) {
      try {
        return { ok: true, value: fs.realpath(current) };
      } catch (cause) {
        return loadError("MODEL_MAP_INVALID", TLA_MODEL_MAP_PATH, "repository root could not be canonicalized", cause);
      }
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return loadError("MODEL_MAP_INVALID", TLA_MODEL_MAP_PATH, "repository root could not be resolved from module URL");
}

function verifyAssetPath(
  repositoryRoot: string,
  relativePath: string,
  kind: AssetKind,
  fs: TlaFileSystem,
  specDirAbs: string,
): Result<string, ModelLoadError> {
  const absolutePath = resolve(repositoryRoot, relativePath);
  let linkStat: Stats;
  try {
    linkStat = fs.lstat(absolutePath);
  } catch (cause) {
    const code = typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT"
      ? codeFor(kind, "MISSING")
      : codeFor(kind, "UNREADABLE");
    return loadError(code, relativePath, "asset metadata could not be read", cause);
  }
  if (linkStat.isSymbolicLink()) {
    return loadError(codeFor(kind, "UNREADABLE"), relativePath, "symbolic links are not allowed");
  }

  let realPath: string;
  try {
    realPath = fs.realpath(absolutePath);
    if (!fs.stat(realPath).isFile()) {
      return loadError(codeFor(kind, "UNREADABLE"), relativePath, "asset must be a regular file");
    }
  } catch (cause) {
    return loadError(codeFor(kind, "UNREADABLE"), relativePath, "asset path could not be verified", cause);
  }
  if (!isContained(specDirAbs, realPath)) {
    return loadError(codeFor(kind, "UNREADABLE"), relativePath, "asset resolves outside the canonical spec directory");
  }
  return { ok: true, value: realPath };
}

// The containment boundary must be canonical like the asset paths it is
// compared against: an intermediate symlinked component (a symlinked
// `amadeus/` dir, or a macOS /var→/private/var fixture root) otherwise makes
// isContained misjudge a legitimate asset as an escape. A spec directory that
// does not exist yet keeps the resolved literal path — the map read below
// then fails closed with its own missing/unreadable classification.
function realpathIfExists(path: string, fs: TlaFileSystem): string {
  try {
    return fs.realpath(path);
  } catch {
    return path;
  }
}

// The multi-model pipeline needs only the repository root and the map path up
// front: every model/cfg/aux path is declared per model in the map and is
// verified inside the per-model loop. The map location and the asset boundary
// come from the shared spec root resolver (BR-1); a legacy specs/tla layout
// stops fail-closed with the resolver's migration instructions (BR-4).
function locateAssets(moduleUrl: string, fs: TlaFileSystem): Result<VerifiedAssetPaths, ModelLoadError> {
  const root = findRepositoryRoot(moduleUrl, fs);
  if (!root.ok) return root;
  let specDirRel: string;
  let mapRel: string;
  try {
    const roots = resolveSpecRoots(root.value);
    specDirRel = tlaSpecDirPath(roots.space);
    mapRel = tlaModelMapPath(roots.space);
  } catch (cause) {
    if (cause instanceof LegacySpecError) {
      return loadError("MODEL_MAP_INVALID", tlaModelMapPath(cause.space), cause.message);
    }
    throw cause;
  }
  const specDirAbs = realpathIfExists(resolve(root.value, specDirRel), fs);
  const mapPath = verifyAssetPath(root.value, mapRel, "MODEL_MAP", fs, specDirAbs);
  if (!mapPath.ok) return mapPath;
  return {
    ok: true,
    value: {
      repositoryRoot: root.value,
      mapPath: mapPath.value,
      mapRel,
      specDirRel,
      specDirAbs,
    },
  };
}

function readAsset(
  absolutePath: string,
  relativePath: string,
  kind: AssetKind,
  fs: TlaFileSystem,
): Result<Uint8Array, ModelLoadError> {
  let bytes: Uint8Array;
  try {
    bytes = fs.readFile(absolutePath);
  } catch (cause) {
    return loadError(codeFor(kind, "UNREADABLE"), relativePath, "asset bytes could not be read", cause);
  }
  if (bytes.byteLength === 0) return loadError(codeFor(kind, "EMPTY"), relativePath, "asset must not be empty");
  return { ok: true, value: bytes };
}

function sourceIdentity(
  bytes: Uint8Array,
  relativePath: string,
  domain: string,
): Result<{ source: string; identity: string }, SourceDriftError> {
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: { source, identity: canonicalIdentity(source, domain).sha256 } };
  } catch {
    return drift(relativePath, "source is not valid UTF-8");
  }
}

function verifyImplementationEntries(
  repositoryRoot: string,
  modelMap: ModelMap,
  fs: TlaFileSystem,
): Result<void, SourceDriftError> {
  // The implementation boundary has ONE definition — the validator's
  // isCanonicalImplementationPath (#2929 FR-BND-2). The loader previously kept
  // a second, narrower one (a hardcoded packages/framework/core/tools root),
  // so a governed plugin entry parsed and then failed at read time.
  //
  // The base for the relative path is the repository root's REAL path, for the
  // same reason the spec-directory check realpaths its boundary first: a
  // symlinked checkout component would otherwise make an in-boundary entry look
  // like an escape. A realPath outside the root yields a `..`-prefixed or
  // absolute relative path, which the shared predicate rejects structurally.
  const rootReal = realpathIfExists(repositoryRoot, fs);
  for (const entry of modelMap.models.flatMap((model) => model.entries)) {
    const absolutePath = resolve(repositoryRoot, entry.implPath);
    let linkStat: Stats;
    let realPath: string;
    try {
      linkStat = fs.lstat(absolutePath);
      realPath = fs.realpath(absolutePath);
      const realRelative = relative(rootReal, realPath).split(sep).join("/");
      if (linkStat.isSymbolicLink() || !fs.stat(realPath).isFile() || !isCanonicalImplementationPath(realRelative)) {
        return drift(entry.implPath, "implementation entry is not a regular in-boundary file");
      }
    } catch {
      return drift(entry.implPath, "implementation entry could not be read");
    }
    let sha256: string;
    try {
      sha256 = createHash("sha256").update(fs.readFile(realPath)).digest("hex");
    } catch {
      return drift(entry.implPath, "implementation entry bytes could not be read");
    }
    if (sha256 !== entry.sha256) {
      return drift(
        entry.implPath,
        `implementation entry hash differs from model map; ${IMPL_ONLY_UPDATE_HINT}`,
      );
    }
  }
  return { ok: true, value: undefined };
}

interface VerifiedModelAssets {
  readonly verified: VerifiedModelSource;
  // Sources of every verified module asset (the model itself plus declared
  // auxiliaries), keyed by module name, so declaration resolution reuses the
  // identity-checked bytes instead of re-reading them (single-read rule).
  readonly moduleSources: ReadonlyMap<string, string>;
}

// Every registered model is verified at the same depth: model, cfg, and every
// declared auxiliary all pass through the same boundary/read/identity path,
// and no model is exempt from the loop.
function verifyModelAssets(
  repositoryRoot: string,
  model: ModelMapModel,
  fs: TlaFileSystem,
  specDirAbs: string,
): Result<VerifiedModelAssets, TlaModelPipelineError> {
  const assets = [
    { recorded: model.model, kind: "MODEL" as const, domain: TLA_MODULE_DOMAIN },
    { recorded: model.cfg, kind: "CFG" as const, domain: TLA_CFG_DOMAIN },
    ...(model.auxiliaries ?? []).map((aux) => ({
      recorded: aux,
      kind: "MODEL" as const,
      domain: TLA_MODULE_DOMAIN,
    })),
  ];
  const bytesByPath = new Map<string, Uint8Array>();
  const sourceByPath = new Map<string, string>();
  for (const asset of assets) {
    const path = verifyAssetPath(repositoryRoot, asset.recorded.path, asset.kind, fs, specDirAbs);
    if (!path.ok) return path;
    const assetBytes = readAsset(path.value, asset.recorded.path, asset.kind, fs);
    if (!assetBytes.ok) return assetBytes;
    const identity = sourceIdentity(assetBytes.value, asset.recorded.path, asset.domain);
    if (!identity.ok) return identity;
    if (identity.value.identity !== asset.recorded.identity) {
      return drift(asset.recorded.path, "registered asset identity differs from model map");
    }
    bytesByPath.set(asset.recorded.path, assetBytes.value);
    sourceByPath.set(asset.recorded.path, identity.value.source);
  }
  const moduleSources = new Map<string, string>([[model.name, sourceByPath.get(model.model.path)!]]);
  for (const aux of model.auxiliaries ?? []) {
    moduleSources.set(basename(aux.path, ".tla"), sourceByPath.get(aux.path)!);
  }
  return {
    ok: true,
    value: {
      verified: {
        model,
        moduleBytes: bytesByPath.get(model.model.path)!,
        cfgBytes: bytesByPath.get(model.cfg.path)!,
        moduleSource: sourceByPath.get(model.model.path)!,
        cfgSource: sourceByPath.get(model.cfg.path)!,
        moduleIdentity: model.model.identity,
        cfgIdentity: model.cfg.identity,
        auxIdentities: model.auxiliaries ?? [],
      },
      moduleSources,
    },
  };
}

function moduleDepsFailure(
  code: ModuleDepsError["code"],
  specDirRel: string,
  moduleName: string,
  detail: string,
): Result<never, ModuleDepsError> {
  return {
    ok: false,
    error: {
      kind: "MODULE_DEPS",
      code,
      relativePath: `${specDirRel}/${moduleName}.tla`,
      detail,
    },
  };
}

// Declaration-vs-resolution check (RA Q2=A loader-side detection point). The
// comparison itself lives in tla-module-deps.ts (single implementation); this
// loader only adapts readModule onto the verified bytes and maps a two-sided
// mismatch to SOURCE_DRIFT. Resolver failures propagate as ModuleDepsError —
// a distinct defect class from declaration drift.
function verifyDeclaredAuxiliaries(
  repositoryRoot: string,
  model: ModelMapModel,
  assets: VerifiedModelAssets,
  fs: TlaFileSystem,
  specDirRel: string,
  specDirAbs: string,
): Result<void, TlaModelPipelineError | ModuleDepsError> {
  const readModule = (name: string): Result<string, ModuleDepsError> => {
    const alreadyVerified = assets.moduleSources.get(name);
    if (alreadyVerified !== undefined) return { ok: true, value: alreadyVerified };
    const relativePath = `${specDirRel}/${name}.tla`;
    const path = verifyAssetPath(repositoryRoot, relativePath, "MODEL", fs, specDirAbs);
    if (!path.ok) {
      return moduleDepsFailure("MODULE_DEP_UNRESOLVED", specDirRel, name, `module ${name} is not readable inside ${specDirRel}`);
    }
    const bytes = readAsset(path.value, relativePath, "MODEL", fs);
    if (!bytes.ok) {
      return moduleDepsFailure("MODULE_DEP_UNRESOLVED", specDirRel, name, `module ${name} is not readable inside ${specDirRel}`);
    }
    try {
      return { ok: true, value: new TextDecoder("utf-8", { fatal: true }).decode(bytes.value) };
    } catch {
      return moduleDepsFailure("MODULE_DEP_UNRESOLVED", specDirRel, name, `module ${name} is not valid UTF-8`);
    }
  };
  const resolved = resolveAuxiliaryModules(model.name, readModule);
  if (!resolved.ok) return resolved;
  const declared = (model.auxiliaries ?? []).map((aux) => basename(aux.path, ".tla"));
  const report = compareModuleDeclarations(model.name, declared, resolved.value);
  if (report.missing.length > 0 || report.extra.length > 0) {
    const list = (names: readonly string[]) => `[${names.join(", ")}]`;
    return drift(
      model.model.path,
      `declared auxiliaries drift for model ${model.name}; missing=${list(report.missing)}`
        + ` extra=${list(report.extra)} declared=${list(report.declared)} resolved=${list(report.resolved)}`,
    );
  }
  return { ok: true, value: undefined };
}

export function selectVerifiedModel(
  sources: VerifiedTlaSources,
  name: string,
): Result<VerifiedModelSource, ModelLoadError> {
  const selected = sources.models.find((model) => model.model.name === name);
  if (!selected) {
    return loadError(
      "MODEL_MAP_INVALID",
      TLA_MODEL_MAP_PATH,
      `model map does not register the requested model ${name}`,
    );
  }
  return { ok: true, value: selected };
}

// Internal/test-only seam. Production callers must use the no-argument wrapper
// in tla-model-loader.ts so runtime input cannot select a root or filesystem.
export function loadVerifiedTlaSourcesInternal(
  moduleUrl: string,
  fs: TlaFileSystem = NODE_FILE_SYSTEM,
): Result<VerifiedTlaSources, TlaModelPipelineError | ModuleDepsError> {
  const paths = locateAssets(moduleUrl, fs);
  if (!paths.ok) return paths;
  const mapBytes = readAsset(paths.value.mapPath, TLA_MODEL_MAP_PATH, "MODEL_MAP", fs);
  if (!mapBytes.ok) return mapBytes;
  const modelMap = evaluateTlaModelReadiness(
    mapBytes.value,
    (relativePath) => fs.exists(resolve(paths.value.repositoryRoot, relativePath)),
    paths.value.mapRel,
  );
  if (!modelMap.ok) return modelMap;

  // Fail-fast order: (1) map parse above, (2) all-model identity verification,
  // (3) all-model declaration-vs-resolution checks, (4) implementation entries.
  const verifiedAssets: VerifiedModelAssets[] = [];
  for (const model of modelMap.value.models) {
    const assets = verifyModelAssets(paths.value.repositoryRoot, model, fs, paths.value.specDirAbs);
    if (!assets.ok) return assets;
    verifiedAssets.push(assets.value);
  }
  for (const [index, model] of modelMap.value.models.entries()) {
    const declarations = verifyDeclaredAuxiliaries(
      paths.value.repositoryRoot,
      model,
      verifiedAssets[index]!,
      fs,
      paths.value.specDirRel,
      paths.value.specDirAbs,
    );
    if (!declarations.ok) return declarations;
  }
  const implementationEntries = verifyImplementationEntries(paths.value.repositoryRoot, modelMap.value, fs);
  if (!implementationEntries.ok) return implementationEntries;

  return {
    ok: true,
    value: {
      models: verifiedAssets.map((assets) => assets.verified),
      modelMap: modelMap.value,
    },
  };
}

// Time-boxed compatibility shim (BR-S4): a thin projection that selects the
// execution model from the multi-model pipeline and narrows ModuleDepsError
// onto the pre-u2 error contract (the singular API never had resolver
// errors). u3 removes this once its callers move to the plural API.
function narrowForSingularShim(
  error: TlaModelPipelineError | ModuleDepsError,
): Result<never, TlaModelPipelineError> {
  if (error.kind === "MODULE_DEPS") {
    return drift(error.relativePath, `module dependency resolution failed (${error.code}): ${error.detail}`);
  }
  return { ok: false, error };
}

// Internal/test-only seam for the singular shim, mirroring the plural seam.
export function loadVerifiedTlaSourceInternal(
  moduleUrl: string,
  fs: TlaFileSystem = NODE_FILE_SYSTEM,
): Result<VerifiedTlaSource, TlaModelPipelineError> {
  const sources = loadVerifiedTlaSourcesInternal(moduleUrl, fs);
  if (!sources.ok) return narrowForSingularShim(sources.error);
  const selected = selectVerifiedModel(sources.value, TLA_EXECUTION_MODEL_NAME);
  if (!selected.ok) return selected;
  return {
    ok: true,
    value: {
      moduleBytes: selected.value.moduleBytes,
      cfgBytes: selected.value.cfgBytes,
      moduleSource: selected.value.moduleSource,
      cfgSource: selected.value.cfgSource,
      moduleIdentity: selected.value.moduleIdentity,
      cfgIdentity: selected.value.cfgIdentity,
      modelMap: sources.value.modelMap,
      executionModel: selected.value.model,
      auxIdentities: selected.value.auxIdentities,
    },
  };
}
