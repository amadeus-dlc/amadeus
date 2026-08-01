import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import type { Stats } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalIdentity } from "./canonical.ts";
import type { Result } from "./contract.ts";
import {
  type ModelLoadError,
  type ModelLoadErrorCode,
  type ModelMap,
  TLA_CFG_PATH,
  TLA_MODEL_MAP_PATH,
  TLA_MODEL_PATH,
  parseTlaModelMap,
} from "./tla-model-map.ts";

export type { ModelLoadError, ModelLoadErrorCode, ModelMap } from "./tla-model-map.ts";

export interface VerifiedTlaSource {
  readonly moduleBytes: Uint8Array;
  readonly cfgBytes: Uint8Array;
  readonly moduleSource: string;
  readonly cfgSource: string;
  readonly moduleIdentity: string;
  readonly cfgIdentity: string;
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

interface VerifiedAssetPaths {
  readonly repositoryRoot: string;
  readonly modulePath: string;
  readonly cfgPath: string;
  readonly mapPath: string;
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

function findRepositoryRoot(moduleUrl: string, fs: TlaFileSystem): Result<string, ModelLoadError> {
  let current = dirname(fileURLToPath(moduleUrl));
  while (true) {
    if (
      fs.exists(join(current, ".git"))
      && fs.exists(join(current, "package.json"))
      && fs.exists(join(current, "specs", "tla"))
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
  const assetRoot = resolve(repositoryRoot, "specs", "tla");
  if (!isContained(assetRoot, realPath)) {
    return loadError(codeFor(kind, "UNREADABLE"), relativePath, "asset resolves outside specs/tla");
  }
  return { ok: true, value: realPath };
}

function locateAssets(moduleUrl: string, fs: TlaFileSystem): Result<VerifiedAssetPaths, ModelLoadError> {
  const root = findRepositoryRoot(moduleUrl, fs);
  if (!root.ok) return root;
  const modulePath = verifyAssetPath(root.value, TLA_MODEL_PATH, "MODEL", fs);
  if (!modulePath.ok) return modulePath;
  const cfgPath = verifyAssetPath(root.value, TLA_CFG_PATH, "CFG", fs);
  if (!cfgPath.ok) return cfgPath;
  const mapPath = verifyAssetPath(root.value, TLA_MODEL_MAP_PATH, "MODEL_MAP", fs);
  if (!mapPath.ok) return mapPath;
  return {
    ok: true,
    value: {
      repositoryRoot: root.value,
      modulePath: modulePath.value,
      cfgPath: cfgPath.value,
      mapPath: mapPath.value,
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
  const implementationRoot = resolve(repositoryRoot, "packages", "framework", "core", "tools");
  for (const entry of modelMap.entries) {
    const absolutePath = resolve(repositoryRoot, entry.implPath);
    let linkStat: Stats;
    let realPath: string;
    try {
      linkStat = fs.lstat(absolutePath);
      realPath = fs.realpath(absolutePath);
      if (linkStat.isSymbolicLink() || !fs.stat(realPath).isFile() || !isContained(implementationRoot, realPath)) {
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
    if (sha256 !== entry.sha256) return drift(entry.implPath, "implementation entry hash differs from model map");
  }
  return { ok: true, value: undefined };
}

// Internal/test-only seam. Production callers must use the no-argument wrapper
// in tla-model-loader.ts so runtime input cannot select a root or filesystem.
export function loadVerifiedTlaSourceInternal(
  moduleUrl: string,
  fs: TlaFileSystem = NODE_FILE_SYSTEM,
): Result<VerifiedTlaSource, TlaModelPipelineError> {
  const paths = locateAssets(moduleUrl, fs);
  if (!paths.ok) return paths;
  const moduleBytes = readAsset(paths.value.modulePath, TLA_MODEL_PATH, "MODEL", fs);
  if (!moduleBytes.ok) return moduleBytes;
  const cfgBytes = readAsset(paths.value.cfgPath, TLA_CFG_PATH, "CFG", fs);
  if (!cfgBytes.ok) return cfgBytes;
  const mapBytes = readAsset(paths.value.mapPath, TLA_MODEL_MAP_PATH, "MODEL_MAP", fs);
  if (!mapBytes.ok) return mapBytes;
  const modelMap = parseTlaModelMap(mapBytes.value);
  if (!modelMap.ok) return modelMap;

  const moduleIdentity = sourceIdentity(
    moduleBytes.value,
    TLA_MODEL_PATH,
    "amadeus.formal-verif.tla.module.v1",
  );
  if (!moduleIdentity.ok) return moduleIdentity;
  const cfgIdentity = sourceIdentity(
    cfgBytes.value,
    TLA_CFG_PATH,
    "amadeus.formal-verif.tla.cfg.v1",
  );
  if (!cfgIdentity.ok) return cfgIdentity;
  if (moduleIdentity.value.identity !== modelMap.value.model.identity) {
    return drift(TLA_MODEL_PATH, "module identity differs from model map");
  }
  if (cfgIdentity.value.identity !== modelMap.value.cfg.identity) {
    return drift(TLA_CFG_PATH, "cfg identity differs from model map");
  }
  const implementationEntries = verifyImplementationEntries(paths.value.repositoryRoot, modelMap.value, fs);
  if (!implementationEntries.ok) return implementationEntries;

  return {
    ok: true,
    value: {
      moduleBytes: moduleBytes.value,
      cfgBytes: cfgBytes.value,
      moduleSource: moduleIdentity.value.source,
      cfgSource: cfgIdentity.value.source,
      moduleIdentity: moduleIdentity.value.identity,
      cfgIdentity: cfgIdentity.value.identity,
      modelMap: modelMap.value,
    },
  };
}
