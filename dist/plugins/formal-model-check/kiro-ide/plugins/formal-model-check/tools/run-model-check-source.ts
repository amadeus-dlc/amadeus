import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import type { Result } from "./contract.ts";
import {
  createFrozenTlaModelReceipt,
  generateFrozenTlaModel,
  type FrozenTlaModelReceipt,
} from "./tla-arm.ts";
import {
  loadVerifiedTlaSource,
  type ModelLoadError,
  type SourceDriftError,
  type TlaModelPipelineError,
  type VerifiedTlaSource,
} from "./tla-model-loader.ts";

export interface RunModelCheckSource {
  readonly source: VerifiedTlaSource;
  readonly modelReceipt: FrozenTlaModelReceipt;
  readonly modelPath: string;
  readonly cfgPath: string;
  readonly workspaceRoot: string;
  readonly moduleName: string;
}

export interface RunModelCheckSourceDependencies {
  readonly readBytes: (path: string) => Uint8Array;
}

const DEFAULT_SOURCE_DEPENDENCIES: RunModelCheckSourceDependencies = {
  readBytes: (path) => new Uint8Array(readFileSync(path)),
};

function unreadable(
  code: "MODEL_UNREADABLE" | "CFG_UNREADABLE",
  path: string,
  detail: string,
  cause?: unknown,
): Result<never, ModelLoadError> {
  return {
    ok: false,
    error: {
      kind: "MODEL_LOAD",
      code,
      relativePath: path,
      detail,
      ...(cause === undefined ? {} : { cause }),
    },
  };
}

function sourceDrift(path: string, detail: string): Result<never, SourceDriftError> {
  return {
    ok: false,
    error: { kind: "SOURCE_DRIFT", code: "SOURCE_DRIFT", relativePath: path, detail },
  };
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength
    && left.every((byte, index) => byte === right[index]);
}

function verifiedPath(
  requestedPath: string,
  extension: ".tla" | ".cfg",
  code: "MODEL_UNREADABLE" | "CFG_UNREADABLE",
): Result<string, ModelLoadError> {
  if (requestedPath.includes("\0") || extname(requestedPath) !== extension) {
    return unreadable(code, requestedPath, `path must name a ${extension} file`);
  }
  const absolutePath = resolve(requestedPath);
  try {
    const link = lstatSync(absolutePath);
    if (link.isSymbolicLink() || !link.isFile()) {
      return unreadable(code, requestedPath, "path must be a non-symlink regular file");
    }
    const canonical = realpathSync(absolutePath);
    return { ok: true, value: canonical };
  } catch (cause) {
    return unreadable(code, requestedPath, "path could not be verified", cause);
  }
}

export function loadRunModelCheckSource(
  modelPath: string,
  cfgPath: string,
  dependencies: RunModelCheckSourceDependencies = DEFAULT_SOURCE_DEPENDENCIES,
): Result<RunModelCheckSource, TlaModelPipelineError> {
  const canonical = loadVerifiedTlaSource();
  if (!canonical.ok) return canonical;
  const model = verifiedPath(modelPath, ".tla", "MODEL_UNREADABLE");
  if (!model.ok) return model;
  const cfg = verifiedPath(cfgPath, ".cfg", "CFG_UNREADABLE");
  if (!cfg.ok) return cfg;
  if (dirname(model.value) !== dirname(cfg.value)) {
    return unreadable(
      "CFG_UNREADABLE",
      cfgPath,
      "model and cfg must share one closed workspace",
    );
  }

  let modelBytes: Uint8Array;
  let cfgBytes: Uint8Array;
  try {
    modelBytes = dependencies.readBytes(model.value);
    cfgBytes = dependencies.readBytes(cfg.value);
  } catch (cause) {
    return unreadable(
      "MODEL_UNREADABLE",
      modelPath,
      "model or cfg bytes could not be read",
      cause,
    );
  }
  if (!sameBytes(modelBytes, canonical.value.moduleBytes)) {
    return sourceDrift(modelPath, "model bytes differ from the verified U1 source");
  }
  if (!sameBytes(cfgBytes, canonical.value.cfgBytes)) {
    return sourceDrift(cfgPath, "cfg bytes differ from the verified U1 source");
  }

  const publicContractIdentity = createHash("sha256")
    .update(canonical.value.modelMap.entries.map(({ sha256 }) => sha256).join("\n"))
    .digest("hex");
  const bundle = generateFrozenTlaModel({ publicContractIdentity });
  return {
    ok: true,
    value: {
      source: canonical.value,
      modelReceipt: createFrozenTlaModelReceipt(bundle),
      modelPath: model.value,
      cfgPath: cfg.value,
      workspaceRoot: dirname(model.value),
      moduleName: basename(model.value, ".tla"),
    },
  };
}
