import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { join } from "node:path";
import type { Result } from "./contract.ts";
import {
  validateCiAcceptanceEvidence,
  type CiAcceptanceEvidence,
  type CiModelCheckRunEvidence,
} from "./ci-model-check-domain.ts";
import { FIXED_DOCKER_IMAGE } from "./tlc-spawn-planner.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  MAX_TLC_STREAM_BYTES,
} from "./tlc-toolchain.ts";

interface ArtifactEntry {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

interface ManifestRecord {
  readonly schema: string;
  readonly runId: string;
  readonly outcome: string;
  readonly exitCode: number;
  readonly expectedArtifacts: readonly string[];
  readonly artifacts: readonly ArtifactEntry[];
  readonly partial: boolean;
  readonly errorCode: unknown;
}

const EXPECTED_ARTIFACTS = [
  "env-receipt.json",
  "tlc-stdout.bin",
  "tlc-stderr.bin",
  "completion-marker.json",
] as const;

function failed(detail: string): Result<never, string> {
  return { ok: false, error: detail };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJson(path: string): Result<unknown, string> {
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, "utf8")) };
  } catch {
    return failed(`JSON artifact could not be read: ${path}`);
  }
}

function containedPath(root: string, candidate: string): Result<string, string> {
  const resolved = join(root, candidate);
  try {
    if (!lstatSync(resolved).isDirectory() || realpathSync(resolved) !== resolved) {
      return failed(`artifact directory is not a canonical directory: ${candidate}`);
    }
  } catch {
    return failed(`artifact directory is unavailable: ${candidate}`);
  }
  return { ok: true, value: resolved };
}

function parseEntry(value: unknown): ArtifactEntry | null {
  if (
    !isRecord(value)
    || typeof value.path !== "string"
    || typeof value.sha256 !== "string"
    || typeof value.bytes !== "number"
  ) {
    return null;
  }
  return { path: value.path, sha256: value.sha256, bytes: value.bytes };
}

function parseManifest(value: unknown): ManifestRecord | null {
  if (
    !isRecord(value)
    || typeof value.schema !== "string"
    || typeof value.runId !== "string"
    || typeof value.outcome !== "string"
    || typeof value.exitCode !== "number"
    || !Array.isArray(value.expectedArtifacts)
    || !value.expectedArtifacts.every((item) => typeof item === "string")
    || !Array.isArray(value.artifacts)
    || typeof value.partial !== "boolean"
  ) {
    return null;
  }
  const artifacts = value.artifacts.map(parseEntry);
  if (artifacts.some((entry) => entry === null)) return null;
  return {
    schema: value.schema,
    runId: value.runId,
    outcome: value.outcome,
    exitCode: value.exitCode,
    expectedArtifacts: value.expectedArtifacts as string[],
    artifacts: artifacts as ArtifactEntry[],
    partial: value.partial,
    errorCode: value.errorCode,
  };
}

function sameStrings(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function verifyArtifactEntries(
  directory: string,
  manifest: ManifestRecord,
): Result<void, string> {
  if (
    !sameStrings(manifest.expectedArtifacts, EXPECTED_ARTIFACTS)
    || manifest.artifacts.length !== EXPECTED_ARTIFACTS.length
  ) {
    return failed("manifest expectedArtifacts does not match the terminal success schema");
  }
  for (const expectedPath of EXPECTED_ARTIFACTS) {
    const entry = manifest.artifacts.find((candidate) => candidate.path === expectedPath);
    if (!entry || manifest.artifacts.filter((candidate) => candidate.path === expectedPath).length !== 1) {
      return failed(`manifest artifact entry is missing or duplicated: ${expectedPath}`);
    }
    const path = join(directory, expectedPath);
    try {
      if (!lstatSync(path).isFile()) return failed(`artifact is not a file: ${expectedPath}`);
      const bytes = readFileSync(path);
      const digest = createHash("sha256").update(bytes).digest("hex");
      if (bytes.byteLength !== entry.bytes || digest !== entry.sha256) {
        return failed(`artifact digest or size drifted: ${expectedPath}`);
      }
      const isStream = expectedPath === "tlc-stdout.bin" || expectedPath === "tlc-stderr.bin";
      if (isStream && bytes.byteLength > MAX_TLC_STREAM_BYTES) {
        return failed(`TLC stream exceeds its byte limit: ${expectedPath}`);
      }
      if (bytes.byteLength === 0 && expectedPath !== "tlc-stderr.bin") {
        return failed(`required artifact is empty: ${expectedPath}`);
      }
    } catch {
      return failed(`required artifact is unavailable: ${expectedPath}`);
    }
  }
  return { ok: true, value: undefined };
}

function verifyInspection(
  inspection: unknown,
  contract: readonly [string, "passed" | "not-applicable", string | null],
): Result<void, string> {
  if (!isRecord(inspection) || inspection.id !== contract[0] || inspection.status !== contract[1]) {
    return failed(`EnvReceipt inspection ${contract[0]} was not executed as required`);
  }
  if (contract[1] === "passed") {
    if (
      inspection.expected !== contract[2]
      || inspection.observed !== contract[2]
      || inspection.reason !== ""
    ) {
      return failed(`EnvReceipt passed inspection drifted: ${contract[0]}`);
    }
  } else if (
    inspection.expected !== null
    || inspection.observed !== null
    || typeof inspection.reason !== "string"
    || inspection.reason.length === 0
  ) {
    return failed(`EnvReceipt non-applicable reason is invalid: ${contract[0]}`);
  }
  return { ok: true, value: undefined };
}

function verifyReceipt(directory: string, runId: string): Result<void, string> {
  const parsed = readJson(join(directory, "env-receipt.json"));
  if (!parsed.ok || !isRecord(parsed.value) || !Array.isArray(parsed.value.inspections)) {
    return failed("EnvReceipt is malformed");
  }
  if (
    parsed.value.schema !== "amadeus.env-receipt.v1"
    || parsed.value.runId !== runId
    || typeof parsed.value.planner !== "string"
    || parsed.value.planner.length === 0
  ) {
    return failed("EnvReceipt identity is invalid");
  }
  const expected = [
    ["image-digest", "passed", FIXED_DOCKER_IMAGE],
    ["jar-sha256", "passed", FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256],
    ["network-deny", "passed", "--network=none"],
    ["jdk-snapshot", "not-applicable", null],
    ["sandbox-profile", "not-applicable", null],
  ] as const;
  if (parsed.value.inspections.length !== expected.length) {
    return failed("EnvReceipt inspection matrix length is invalid");
  }
  for (let index = 0; index < expected.length; index += 1) {
    const verified = verifyInspection(parsed.value.inspections[index], expected[index]!);
    if (!verified.ok) return verified;
  }
  return { ok: true, value: undefined };
}

function verifyRun(root: string, run: CiModelCheckRunEvidence): Result<void, string> {
  const directory = containedPath(root, run.artifactDirectory);
  if (!directory.ok) return directory;
  const parsedManifest = readJson(join(directory.value, "manifest.json"));
  if (!parsedManifest.ok) return parsedManifest;
  const manifest = parseManifest(parsedManifest.value);
  if (
    manifest?.schema !== "amadeus.model-check-manifest.v1"
    || manifest.runId !== run.runId
    || manifest.outcome !== "NOT_DETECTED"
    || manifest.exitCode !== 0
    || manifest.partial
    || manifest.errorCode !== null
  ) {
    return failed(`terminal manifest is invalid for run ${run.index}`);
  }
  const artifacts = verifyArtifactEntries(directory.value, manifest);
  if (!artifacts.ok) return artifacts;
  const marker = readJson(join(directory.value, "completion-marker.json"));
  if (
    !marker.ok
    || !isRecord(marker.value)
    || marker.value.complete !== true
    || marker.value.runId !== run.runId
  ) {
    return failed(`completion marker is invalid for run ${run.index}`);
  }
  return verifyReceipt(directory.value, run.runId);
}

export function verifyCiAcceptanceArtifacts(
  evidenceRoot: string,
): Result<CiAcceptanceEvidence, string> {
  let root: string;
  try {
    root = realpathSync(evidenceRoot);
  } catch {
    return failed("evidence root is unavailable");
  }
  const parsed = readJson(join(root, "acceptance.json"));
  if (!parsed.ok || !isRecord(parsed.value)) return failed("acceptance evidence is malformed");
  const evidence = parsed.value as unknown as CiAcceptanceEvidence;
  const domain = validateCiAcceptanceEvidence(evidence);
  if (!domain.ok) return domain;
  for (const run of evidence.runs) {
    const verified = verifyRun(root, run);
    if (!verified.ok) return verified;
  }
  return { ok: true, value: evidence };
}
