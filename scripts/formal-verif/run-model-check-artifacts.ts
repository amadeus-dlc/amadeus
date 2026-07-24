import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import type { Result } from "./contract.ts";
import type {
  EnvReceipt,
  ModelCheckOutcome,
} from "./run-model-check-domain.ts";

export interface ArtifactWorkspace {
  readonly runId: string;
  readonly requestedOutDir: string;
  readonly temporaryDir: string;
  readonly scratchRoot: string;
}

export interface ModelCheckArtifactInput {
  readonly workspace: ArtifactWorkspace;
  readonly outcome: ModelCheckOutcome;
  readonly exitCode: 0 | 1 | 2;
  readonly environmentReceipt: EnvReceipt;
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
  readonly startedAt: string;
  readonly finishedAt: string;
}

export interface ModelCheckArtifactEntry {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

export interface ModelCheckManifest {
  readonly schema: "amadeus.model-check-manifest.v1";
  readonly runId: string;
  readonly outcome: ModelCheckOutcome["kind"];
  readonly exitCode: 0 | 1 | 2;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly expectedArtifacts: readonly string[];
  readonly artifacts: readonly ModelCheckArtifactEntry[];
  readonly partial: boolean;
  readonly errorCode: string | null;
}

export interface PublishedModelCheckArtifacts {
  readonly directory: string;
  readonly manifest: ModelCheckManifest;
}

export interface ArtifactPublishError {
  readonly kind: "ARTIFACT_PUBLISH";
  readonly code: "OUT_CONFLICT" | "OUT_PATH" | "WRITE" | "RENAME";
  readonly detail: string;
}

function failure(
  code: ArtifactPublishError["code"],
  detail: string,
): Result<never, ArtifactPublishError> {
  return { ok: false, error: { kind: "ARTIFACT_PUBLISH", code, detail } };
}

function isContained(parent: string, child: string): boolean {
  const childRelative = relative(parent, child);
  return childRelative === ""
    || (childRelative !== ".."
      && !childRelative.startsWith("../")
      && !childRelative.startsWith("..\\"));
}

function writeDurable(path: string, bytes: Uint8Array): void {
  const fd = openSync(path, "wx", 0o600);
  try {
    let offset = 0;
    while (offset < bytes.byteLength) {
      offset += writeSync(fd, bytes, offset, bytes.byteLength - offset, offset);
    }
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function jsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
}

function entry(root: string, path: string): ModelCheckArtifactEntry {
  const data = new Uint8Array(readFileSync(path));
  return {
    path: relative(root, path),
    sha256: createHash("sha256").update(data).digest("hex"),
    bytes: data.byteLength,
  };
}

function syncDirectory(path: string): void {
  const fd = openSync(path, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

export function beginModelCheckArtifacts(
  outDir: string,
  runId: string,
): Result<ArtifactWorkspace, ArtifactPublishError> {
  if (!/^[0-9a-f-]{36}$/.test(runId) || outDir.includes("\0")) {
    return failure("OUT_PATH", "run ID or output path is invalid");
  }
  const resolvedOutDir = resolve(outDir);
  const parent = dirname(resolvedOutDir);
  try {
    if (!existsSync(parent) || !lstatSync(parent).isDirectory()) {
      return failure("OUT_PATH", "output parent must be an existing directory");
    }
    const canonicalParent = realpathSync(parent);
    const requestedOutDir = join(canonicalParent, basename(resolvedOutDir));
    if (existsSync(requestedOutDir)) {
      return failure("OUT_CONFLICT", "output directory already exists");
    }
    const temporaryDir = `${requestedOutDir}.tmp-${runId}`;
    const failureDir = `${requestedOutDir}.failure-${runId}`;
    if (existsSync(temporaryDir) || existsSync(failureDir)) {
      return failure("OUT_CONFLICT", "run-specific output directory already exists");
    }
    mkdirSync(temporaryDir, { mode: 0o700 });
    const scratchRoot = join(temporaryDir, ".scratch");
    mkdirSync(scratchRoot, { mode: 0o700 });
    return {
      ok: true,
      value: Object.freeze({
        runId,
        requestedOutDir,
        temporaryDir,
        scratchRoot,
      }),
    };
  } catch (cause) {
    return failure("OUT_PATH", `output directory could not be reserved: ${String(cause)}`);
  }
}

export function publishModelCheckArtifacts(
  input: ModelCheckArtifactInput,
): Result<PublishedModelCheckArtifacts, ArtifactPublishError> {
  const { workspace } = input;
  try {
    if (
      realpathSync(workspace.temporaryDir) !== workspace.temporaryDir
      || !lstatSync(workspace.temporaryDir).isDirectory()
      || !isContained(workspace.temporaryDir, realpathSync(workspace.scratchRoot))
    ) {
      return failure("OUT_PATH", "artifact workspace changed before publish");
    }
    rmSync(workspace.scratchRoot, { recursive: true, force: false });
    const paths = {
      receipt: join(workspace.temporaryDir, "env-receipt.json"),
      stdout: join(workspace.temporaryDir, "tlc-stdout.bin"),
      stderr: join(workspace.temporaryDir, "tlc-stderr.bin"),
    };
    writeDurable(paths.receipt, jsonBytes(input.environmentReceipt));
    writeDurable(paths.stdout, input.stdout);
    writeDurable(paths.stderr, input.stderr);

    const expected = ["env-receipt.json", "tlc-stdout.bin", "tlc-stderr.bin"];
    if (input.outcome.kind === "NOT_DETECTED") {
      const marker = join(workspace.temporaryDir, "completion-marker.json");
      writeDurable(marker, jsonBytes({ complete: true, runId: workspace.runId }));
      expected.push(basename(marker));
    } else if (input.outcome.kind === "DETECTED") {
      const counterexample = join(workspace.temporaryDir, "counterexample.json");
      writeDurable(counterexample, jsonBytes({
        runId: workspace.runId,
        counterexampleIdentity: input.outcome.counterexampleIdentity,
      }));
      expected.push(basename(counterexample));
    }
    const artifacts = expected.map((name) => entry(
      workspace.temporaryDir,
      join(workspace.temporaryDir, name),
    ));
    const manifest: ModelCheckManifest = {
      schema: "amadeus.model-check-manifest.v1",
      runId: workspace.runId,
      outcome: input.outcome.kind,
      exitCode: input.exitCode,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      expectedArtifacts: expected,
      artifacts,
      partial: input.outcome.kind === "HARNESS_ERROR",
      errorCode: input.outcome.kind === "HARNESS_ERROR" ? input.outcome.code : null,
    };
    writeDurable(
      join(workspace.temporaryDir, "manifest.json"),
      jsonBytes(manifest),
    );
    syncDirectory(workspace.temporaryDir);

    const destination = input.outcome.kind === "HARNESS_ERROR"
      ? `${workspace.requestedOutDir}.failure-${workspace.runId}`
      : workspace.requestedOutDir;
    try {
      renameSync(workspace.temporaryDir, destination);
    } catch (cause) {
      return failure("RENAME", `terminal artifact publish failed: ${String(cause)}`);
    }
    return { ok: true, value: { directory: destination, manifest } };
  } catch (cause) {
    return failure("WRITE", `artifact write failed: ${String(cause)}`);
  }
}
