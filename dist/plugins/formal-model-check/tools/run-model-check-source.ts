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
  loadVerifiedTlaSources,
  type ModelLoadError,
  type SourceDriftError,
  type TlaModelPipelineError,
  type VerifiedModelSource,
} from "./tla-model-loader.ts";
import { selectVerifiedModel } from "./tla-model-loader-internal.ts";
import { TLA_EXECUTION_MODEL_NAME } from "./tla-model-map.ts";
import { traceVocabularyFor, type TraceVocabulary } from "./tlc-toolchain.ts";

export interface RunModelCheckSource {
  readonly source: VerifiedModelSource;
  readonly vocabulary: TraceVocabulary;
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
  const canonical = loadVerifiedTlaSources();
  if (!canonical.ok) {
    // The requested-model byte-pin predates resolver errors, so a
    // ModuleDepsError is narrowed onto SOURCE_DRIFT here with its code and
    // detail preserved (u3 revisits this seam together with the shim removal).
    const error = canonical.error;
    if (error.kind === "MODULE_DEPS") {
      return sourceDrift(
        error.relativePath,
        `module dependency resolution failed (${error.code}): ${error.detail}`,
      );
    }
    return { ok: false, error };
  }
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

  // The byte-pin is selected by the requested model: the request must name a
  // registered model and its bytes must match that model's verified source.
  const requestedName = basename(model.value, ".tla");
  const selected = selectVerifiedModel(canonical.value, requestedName);
  if (!selected.ok) return selected;
  const frozen = selectVerifiedModel(canonical.value, TLA_EXECUTION_MODEL_NAME);
  if (!frozen.ok) return frozen;

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
  if (!sameBytes(modelBytes, selected.value.moduleBytes)) {
    return sourceDrift(modelPath, "model bytes differ from the verified U1 source");
  }
  if (!sameBytes(cfgBytes, selected.value.cfgBytes)) {
    return sourceDrift(cfgPath, "cfg bytes differ from the verified U1 source");
  }

  const publicContractIdentity = createHash("sha256")
    .update(frozen.value.model.entries.map(({ sha256 }) => sha256).join("\n"))
    .digest("hex");
  // The frozen receipt stays pinned to FormalElection (ADR-10) even though the
  // byte-pin above is model-selected.
  const bundle = generateFrozenTlaModel({ publicContractIdentity });
  const vocabulary = traceVocabularyFor(selected.value.model);
  if (!vocabulary.ok) return vocabulary;
  return {
    ok: true,
    value: {
      source: selected.value,
      vocabulary: vocabulary.value,
      modelReceipt: createFrozenTlaModelReceipt(bundle),
      modelPath: model.value,
      cfgPath: cfg.value,
      workspaceRoot: dirname(model.value),
      moduleName: requestedName,
    },
  };
}
