import {
  existsSync,
  mkdirSync,
  realpathSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import type { Result } from "./contract.ts";
import type {
  ModelCheckOutcome,
  RunModelCheckInput,
} from "./run-model-check-domain.ts";
import type { ArtifactWorkspace } from "./run-model-check-artifacts.ts";

type PathError = Extract<ModelCheckOutcome, { kind: "HARNESS_ERROR" }>;

export interface RunModelCheckFilesystemPort {
  readonly resolve: (path: string) => string;
  readonly dirname: (path: string) => string;
  readonly basename: (path: string) => string;
  readonly join: (...paths: string[]) => string;
  readonly relative: (from: string, to: string) => string;
  readonly isAbsolute: (path: string) => boolean;
  readonly exists: (path: string) => boolean;
  readonly realpath: (path: string) => string;
  readonly mkdir: (path: string) => void;
}

export const NODE_RUN_MODEL_CHECK_FILESYSTEM: RunModelCheckFilesystemPort = {
  resolve,
  dirname,
  basename,
  join,
  relative,
  isAbsolute,
  exists: existsSync,
  realpath: realpathSync,
  mkdir: (path) => { mkdirSync(path, { recursive: true, mode: 0o700 }); },
};

function pathFailure(code: string, detail: string): Result<never, PathError> {
  return { ok: false, error: { kind: "HARNESS_ERROR", code, detail } };
}

function pathInside(
  parent: string,
  child: string,
  filesystem: RunModelCheckFilesystemPort,
): boolean {
  const childRelative = filesystem.relative(parent, child);
  return childRelative === ""
    || (childRelative !== ".."
      && !childRelative.startsWith("../")
      && !childRelative.startsWith("..\\")
      && !filesystem.isAbsolute(childRelative));
}

export function validateModelCheckOutputPath(
  input: RunModelCheckInput,
  workspaceRoot: string,
  filesystem: RunModelCheckFilesystemPort = NODE_RUN_MODEL_CHECK_FILESYSTEM,
): Result<void, PathError> {
  try {
    const resolvedOut = filesystem.resolve(input.outDir);
    const parent = filesystem.dirname(resolvedOut);
    if (!filesystem.exists(parent)) {
      return pathFailure("OUT_PATH", "output parent does not exist");
    }
    const canonicalOut = filesystem.join(
      filesystem.realpath(parent),
      filesystem.basename(resolvedOut),
    );
    if (
      pathInside(workspaceRoot, canonicalOut, filesystem)
      || pathInside(canonicalOut, workspaceRoot, filesystem)
    ) {
      return pathFailure("OUT_CONFLICT", "output and model workspace must not overlap");
    }
    return { ok: true, value: undefined };
  } catch {
    return pathFailure("OUT_PATH", "output path could not be canonicalized");
  }
}

export function prepareModelCheckCache(
  workspace: ArtifactWorkspace,
  filesystem: RunModelCheckFilesystemPort = NODE_RUN_MODEL_CHECK_FILESYSTEM,
): Result<string, PathError> {
  const cacheRoot = filesystem.join(
    filesystem.dirname(workspace.requestedOutDir),
    ".amadeus-tlc-cache",
  );
  try {
    filesystem.mkdir(cacheRoot);
    return { ok: true, value: cacheRoot };
  } catch {
    return pathFailure("CACHE_RESERVATION", "TLC cache directory could not be reserved");
  }
}
