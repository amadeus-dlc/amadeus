// Closed formal-evidence contract for the Pi M1-M10 conformance journey.

import { readFileSync } from "node:fs";

export const PI_MILESTONE_IDS = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10"] as const;
export type PiMilestoneId = (typeof PI_MILESTONE_IDS)[number];

export interface PiFormalRun {
  readonly platform: "darwin" | "linux";
  readonly piVersion: string;
  readonly providerId: string;
  readonly executedAt: string;
  readonly rpc: {
    readonly status: "passed";
    readonly driverTerminal: "succeeded";
    readonly humanTurnCount: 0;
    readonly gateApprovedCount: 0;
    readonly outputDigest: string;
  };
  readonly tui: {
    readonly status: "passed";
    readonly humanTurnCount: number;
    readonly gateApprovedCount: number;
    readonly transcriptDigest: string;
  };
  readonly assertions: Readonly<Record<PiMilestoneId, true>>;
}

export interface PiFormalEvidence {
  readonly schemaVersion: 1;
  readonly candidate: {
    readonly verificationCommit: string;
    readonly catalogDigest: string;
  };
  readonly runs: readonly PiFormalRun[];
  readonly windowsNegative: {
    readonly platform: "win32";
    readonly doctorCheckId: "pi.os";
    readonly rejected: true;
  };
}

export type PiFormalEvidenceResult =
  | { readonly status: "green"; readonly evidence: PiFormalEvidence }
  | { readonly status: "invalid"; readonly problems: readonly string[] };

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isFullCommit(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

export function isSupportedPiVersion(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/.exec(value);
  if (match === null) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  const prerelease = value.includes("-");
  return major > 0 || minor > 83 || (minor === 83 && (patch > 0 || !prerelease));
}

function isProviderId(value: unknown): value is string {
  return typeof value === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value)
    && !value.includes("://");
}

function validateAssertions(value: unknown, path: string, problems: string[]): value is Record<PiMilestoneId, true> {
  const assertions = record(value);
  if (assertions === null || !exactKeys(assertions, PI_MILESTONE_IDS)) {
    problems.push(`${path}.assertions must contain exactly M1-M10`);
    return false;
  }
  for (const id of PI_MILESTONE_IDS) {
    if (assertions[id] !== true) problems.push(`${path}.assertions.${id} must be true`);
  }
  return problems.length === 0;
}

function validateRunIdentity(run: Record<string, unknown>, path: string, problems: string[]): void {
  if (run.platform !== "darwin" && run.platform !== "linux") problems.push(`${path}.platform is unsupported`);
  if (!isSupportedPiVersion(run.piVersion)) problems.push(`${path}.piVersion must be >= 0.83.0`);
  if (!isProviderId(run.providerId)) problems.push(`${path}.providerId is invalid or credential-like`);
  if (!isIsoTimestamp(run.executedAt)) problems.push(`${path}.executedAt must be an ISO timestamp`);
}

function validateRpc(value: unknown, path: string, problems: string[]): void {
  const rpc = record(value);
  if (rpc === null || !exactKeys(rpc, ["driverTerminal", "gateApprovedCount", "humanTurnCount", "outputDigest", "status"])) {
    problems.push(`${path}.rpc has an invalid closed shape`);
    return;
  }
  if (rpc.status !== "passed" || rpc.driverTerminal !== "succeeded") problems.push(`${path}.rpc did not pass`);
  if (rpc.humanTurnCount !== 0) problems.push(`${path}.rpc.humanTurnCount must be 0`);
  if (rpc.gateApprovedCount !== 0) problems.push(`${path}.rpc.gateApprovedCount must be 0`);
  if (!isDigest(rpc.outputDigest)) problems.push(`${path}.rpc.outputDigest must be sha256`);
}

function validateTui(value: unknown, path: string, problems: string[]): void {
  const tui = record(value);
  if (tui === null || !exactKeys(tui, ["gateApprovedCount", "humanTurnCount", "status", "transcriptDigest"])) {
    problems.push(`${path}.tui has an invalid closed shape`);
    return;
  }
  if (tui.status !== "passed") problems.push(`${path}.tui did not pass`);
  if (typeof tui.humanTurnCount !== "number" || !Number.isSafeInteger(tui.humanTurnCount) || tui.humanTurnCount < 1) {
    problems.push(`${path}.tui.humanTurnCount must be positive`);
  }
  if (typeof tui.gateApprovedCount !== "number" || !Number.isSafeInteger(tui.gateApprovedCount) || tui.gateApprovedCount < 1) {
    problems.push(`${path}.tui.gateApprovedCount must be positive`);
  }
  if (!isDigest(tui.transcriptDigest)) problems.push(`${path}.tui.transcriptDigest must be sha256`);
}

function validateRun(value: unknown, index: number, problems: string[]): value is PiFormalRun {
  const path = `runs[${index}]`;
  const run = record(value);
  if (run === null || !exactKeys(run, ["assertions", "executedAt", "piVersion", "platform", "providerId", "rpc", "tui"])) {
    problems.push(`${path} has an invalid closed shape`);
    return false;
  }
  validateRunIdentity(run, path, problems);
  validateRpc(run.rpc, path, problems);
  validateTui(run.tui, path, problems);
  validateAssertions(run.assertions, path, problems);
  return problems.length === 0;
}

function validateCandidate(value: unknown, problems: string[]): void {
  const candidate = record(value);
  if (candidate === null || !exactKeys(candidate, ["catalogDigest", "verificationCommit"])) {
    problems.push("candidate has an invalid closed shape");
    return;
  }
  if (!isFullCommit(candidate.verificationCommit)) problems.push("candidate.verificationCommit must be a full commit");
  if (!isDigest(candidate.catalogDigest)) problems.push("candidate.catalogDigest must be sha256");
}

function validateRuns(value: unknown, problems: string[]): void {
  if (!Array.isArray(value)) {
    problems.push("runs must be an array");
    return;
  }
  value.forEach((run, index) => {
    validateRun(run, index, problems);
  });
  const platforms = value.map((run) => record(run)?.platform);
  if (platforms.length !== 2 || platforms.filter((platform) => platform === "darwin").length !== 1
    || platforms.filter((platform) => platform === "linux").length !== 1) {
    problems.push("runs must contain exactly one darwin and one linux formal run");
  }
}

function validateWindowsNegative(value: unknown, problems: string[]): void {
  const windows = record(value);
  if (windows === null || !exactKeys(windows, ["doctorCheckId", "platform", "rejected"])
    || windows.platform !== "win32" || windows.doctorCheckId !== "pi.os" || windows.rejected !== true) {
    problems.push("windowsNegative must record the native Windows pi.os rejection");
  }
}

/** A skip envelope is deliberately not accepted here: skipped live CI is never formal green evidence. */
export function validatePiFormalEvidence(value: unknown): PiFormalEvidenceResult {
  const problems: string[] = [];
  const evidence = record(value);
  if (evidence === null || !exactKeys(evidence, ["candidate", "runs", "schemaVersion", "windowsNegative"])) {
    return { status: "invalid", problems: ["evidence has an invalid closed shape"] };
  }
  if (evidence.schemaVersion !== 1) problems.push("schemaVersion must be 1");
  validateCandidate(evidence.candidate, problems);
  validateRuns(evidence.runs, problems);
  validateWindowsNegative(evidence.windowsNegative, problems);
  return problems.length === 0
    ? { status: "green", evidence: value as PiFormalEvidence }
    : { status: "invalid", problems };
}

function main(): void {
  const path = process.argv[2];
  if (path === undefined) {
    process.stdout.write(`${JSON.stringify({ status: "invalid", problems: ["usage: bun scripts/pi-conformance-evidence.ts <evidence.json>"] })}\n`);
    process.exitCode = 1;
    return;
  }
  try {
    const input: unknown = JSON.parse(readFileSync(path, "utf8"));
    const result = validatePiFormalEvidence(input);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.status === "green" ? 0 : 1;
  } catch {
    process.stdout.write(`${JSON.stringify({ status: "invalid", problems: ["evidence file is unreadable or invalid JSON"] })}\n`);
    process.exitCode = 1;
    return;
  }
}

if (import.meta.main) main();
