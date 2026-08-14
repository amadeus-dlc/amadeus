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
import {
  FIXED_TLC_VERSION_LINE,
  type TlcExploration,
} from "./tlc-toolchain.ts";

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
  readonly advisory?: AdvisoryArtifactCorrelation;
  readonly sourceProvenance?: ModelCheckSourceProvenance;
  readonly exploration?: TlcExploration;
}

export interface AdvisoryArtifactCorrelation {
  readonly target: string;
  readonly specIdentity: string;
  readonly instance: string;
}

export interface ModelCheckSourceProvenance {
  readonly modelPath: string;
  readonly cfgPath: string;
  readonly modelIdentity: string;
  readonly moduleIdentity: string;
  readonly cfgIdentity: string;
  readonly moduleSha256: string;
  readonly cfgSha256: string;
  readonly auxiliaries: readonly { readonly path: string; readonly identity: string }[];
  readonly implementations: readonly { readonly path: string; readonly identity: string }[];
  readonly constants: readonly string[];
  readonly sourceIdentity: string;
}

// The single extraction of the CONSTANTS a .cfg declares: the publisher records
// them into provenance, and advisory verification re-derives them from the same
// bytes to confirm a submitted manifest.
export function cfgConstants(source: string): readonly string[] {
  return source.split("\n").flatMap((line) => {
    const match = /^([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(line.trim());
    return match === null ? [] : [`${match[1]}=${match[2]}`];
  });
}

export interface ModelCheckVerification {
  readonly toolchainVersion: string;
  readonly constants: readonly string[];
  readonly completionMarker: string | null;
  readonly generatedStates: number | null;
  readonly distinctStates: number | null;
  readonly statesLeftOnQueue: number | null;
  readonly searchDepth: number | null;
  readonly sourceIdentity: string;
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
  readonly errorDetail: string | null;
  readonly advisory: AdvisoryArtifactCorrelation | null;
  readonly sourceProvenance: ModelCheckSourceProvenance | null;
  readonly verification: ModelCheckVerification | null;
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

function workspaceProblem(workspace: ArtifactWorkspace): string | null {
  if (
    realpathSync(workspace.temporaryDir) !== workspace.temporaryDir
    || !lstatSync(workspace.temporaryDir).isDirectory()
    || !isContained(workspace.temporaryDir, realpathSync(workspace.scratchRoot))
  ) return "artifact workspace changed before publish";
  return null;
}

// Provenance-carrying runs must present exploration evidence of the shape their
// outcome claims; runs without provenance predate that binding.
function explorationEvidenceProblem(input: ModelCheckArtifactInput): string | null {
  if (input.sourceProvenance === undefined) return null;
  if (input.outcome.kind === "NOT_DETECTED" && input.exploration?.kind !== "COMPLETE") {
    return "NOT_DETECTED requires complete TLC exploration evidence";
  }
  if (input.outcome.kind === "DETECTED" && input.exploration?.kind !== "COUNTEREXAMPLE") {
    return "DETECTED requires counterexample TLC exploration evidence";
  }
  return null;
}

function writeOutcomeArtifacts(input: ModelCheckArtifactInput): string[] {
  const { workspace } = input;
  writeDurable(join(workspace.temporaryDir, "env-receipt.json"), jsonBytes(input.environmentReceipt));
  writeDurable(join(workspace.temporaryDir, "tlc-stdout.bin"), input.stdout);
  writeDurable(join(workspace.temporaryDir, "tlc-stderr.bin"), input.stderr);
  const expected = ["env-receipt.json", "tlc-stdout.bin", "tlc-stderr.bin"];
  if (input.outcome.kind === "NOT_DETECTED") {
    const marker = join(workspace.temporaryDir, "completion-marker.json");
    writeDurable(marker, jsonBytes({
      complete: true,
      runId: workspace.runId,
      sourceIdentity: input.sourceProvenance?.sourceIdentity ?? null,
    }));
    expected.push(basename(marker));
  } else if (input.outcome.kind === "DETECTED") {
    const counterexample = join(workspace.temporaryDir, "counterexample.json");
    const exploration = input.exploration?.kind === "COUNTEREXAMPLE" ? input.exploration : null;
    writeDurable(counterexample, jsonBytes({
      runId: workspace.runId,
      counterexampleIdentity: input.outcome.counterexampleIdentity,
      invariant: exploration?.invariant ?? null,
      sourceLocation: exploration?.sourceLocation ?? null,
      trace: exploration?.trace ?? null,
    }));
    expected.push(basename(counterexample));
  }
  return expected;
}

function verificationOf(input: ModelCheckArtifactInput): ModelCheckVerification | null {
  const exploration = input.exploration;
  if (exploration?.kind !== "COMPLETE" && exploration?.kind !== "COUNTEREXAMPLE") return null;
  return {
    toolchainVersion: FIXED_TLC_VERSION_LINE,
    constants: input.sourceProvenance?.constants ?? [],
    completionMarker: exploration.kind === "COMPLETE" ? exploration.completionMarker : null,
    generatedStates: exploration.generatedStates,
    distinctStates: exploration.distinctStates,
    statesLeftOnQueue: exploration.statesLeftOnQueue,
    searchDepth: exploration.searchDepth,
    sourceIdentity: input.sourceProvenance?.sourceIdentity ?? "",
  };
}

function buildManifest(
  input: ModelCheckArtifactInput,
  expected: readonly string[],
  artifacts: readonly ModelCheckArtifactEntry[],
): ModelCheckManifest {
  const harnessError = input.outcome.kind === "HARNESS_ERROR" ? input.outcome : null;
  return {
    schema: "amadeus.model-check-manifest.v1",
    runId: input.workspace.runId,
    outcome: input.outcome.kind,
    exitCode: input.exitCode,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    expectedArtifacts: expected,
    artifacts,
    partial: harnessError !== null,
    errorCode: harnessError?.code ?? null,
    errorDetail: harnessError?.detail ?? null,
    advisory: input.advisory ?? null,
    sourceProvenance: input.sourceProvenance ?? null,
    verification: verificationOf(input),
  };
}

export function publishModelCheckArtifacts(
  input: ModelCheckArtifactInput,
): Result<PublishedModelCheckArtifacts, ArtifactPublishError> {
  const { workspace } = input;
  try {
    const pathProblem = workspaceProblem(workspace);
    if (pathProblem !== null) return failure("OUT_PATH", pathProblem);
    const evidenceProblem = explorationEvidenceProblem(input);
    if (evidenceProblem !== null) return failure("WRITE", evidenceProblem);
    rmSync(workspace.scratchRoot, { recursive: true, force: false });
    const expected = writeOutcomeArtifacts(input);
    const artifacts = expected.map((name) => entry(
      workspace.temporaryDir,
      join(workspace.temporaryDir, name),
    ));
    const manifest = buildManifest(input, expected, artifacts);
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
