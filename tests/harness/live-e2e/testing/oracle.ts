import { codeMatchesStatus, type LiveCode, type LiveStatus } from "../contract.ts";
import type { ValidatedContractCase } from "./contract-case.ts";

export const CANONICAL_LIVE_CODES = [
  "AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN",
  "AMADEUS_LIVE_E2E:SKIP:OPT_IN_REQUIRED",
  "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING",
  "AMADEUS_LIVE_E2E:SKIP:VERSION_UNSUPPORTED",
  "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING",
  "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE",
  "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
  "AMADEUS_LIVE_E2E:TIMEOUT:JOURNEY_TIMEOUT",
  "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED",
  "AMADEUS_LIVE_E2E:FAIL:ASSERTION_FAILED",
  "AMADEUS_LIVE_E2E:PASS:SUCCESS",
] as const satisfies readonly LiveCode[];

export type AssertionId =
  | "TERMINAL_EXPECTATION"
  | "CLOSED_TAXONOMY"
  | "STATUS_CODE_MATCH"
  | "TRACE_ORDER"
  | "RUN_OWNERSHIP"
  | "SKIP_NO_SIDE_EFFECTS"
  | "ENV_ALLOW_LIST"
  | "SECRET_CANARY_ABSENT"
  | "CREDENTIAL_DESCENDANT_RELEASED"
  | "TIMEOUT_ABORT_REAP"
  | "OUTPUT_BOUNDED_DRAIN";

export interface BoundaryCall {
  readonly boundary: string;
  readonly ordinal: number;
  readonly runId: string;
}

export interface ResourceObservation {
  readonly id: string;
  readonly parentId?: string;
  readonly credentialBearing: boolean;
  readonly state: "planned" | "created" | "released";
  readonly escaped: boolean;
}

export interface OutputObservation {
  readonly stdoutBytes: number;
  readonly stderrBytes: number;
  readonly combinedBufferedBytes: number;
  readonly truncated: boolean;
  readonly aborted: boolean;
  readonly reaped: boolean;
}

export type ObservedTerminal =
  | Readonly<{ kind: "live-code"; status: LiveStatus; code: string }>
  | Readonly<{ kind: "run-error"; errorKind: string }>
  | Readonly<{ kind: "contract-error"; errorKind: string }>;

export interface ContractObservation {
  readonly runId: string;
  readonly terminal: ObservedTerminal;
  readonly trace: readonly BoundaryCall[];
  readonly childEnvironmentKeys: readonly string[];
  readonly observedCanaryIds: readonly string[];
  readonly resources: readonly ResourceObservation[];
  readonly output?: OutputObservation;
}

export type OracleResult =
  | Readonly<{ pass: true; violations: readonly [] }>
  | Readonly<{ pass: false; violations: readonly Readonly<{ assertionId: AssertionId }>[] }>;

const SKIP_SIDE_EFFECT_BOUNDARIES = new Set(["probe", "lease", "scratch", "spawn", "ledger"]);
const STDOUT_LIMIT = 1_048_576;
const STDERR_LIMIT = 262_144;
const COMBINED_LIMIT = 1_310_720;

function terminalMatches(expected: ValidatedContractCase["expectedTerminal"], observed: ObservedTerminal): boolean {
  if (expected.kind !== observed.kind) return false;
  if (expected.kind === "live-code" && observed.kind === "live-code") {
    return expected.status === observed.status && expected.code === observed.code;
  }
  if (expected.kind === "run-error" && observed.kind === "run-error") {
    return expected.errorKind === observed.errorKind;
  }
  return expected.kind === "contract-error" &&
    observed.kind === "contract-error" &&
    expected.errorKind === observed.errorKind;
}

function isOrderedSubsequence(required: readonly string[], actual: readonly string[]): boolean {
  let position = 0;
  for (const value of actual) {
    if (value === required[position]) position += 1;
  }
  return position === required.length;
}

function terminalFailures(
  contractCase: ValidatedContractCase,
  observation: ContractObservation,
): readonly AssertionId[] {
  const failed: AssertionId[] = [];
  if (!terminalMatches(contractCase.expectedTerminal, observation.terminal)) {
    failed.push("TERMINAL_EXPECTATION");
  }
  if (observation.terminal.kind !== "live-code") return failed;
  if (!CANONICAL_LIVE_CODES.includes(observation.terminal.code as LiveCode)) {
    failed.push("CLOSED_TAXONOMY");
  } else if (!codeMatchesStatus(observation.terminal.status, observation.terminal.code as LiveCode)) {
    failed.push("STATUS_CODE_MATCH");
  }
  return failed;
}

function traceFailures(
  contractCase: ValidatedContractCase,
  observation: ContractObservation,
  orderedTrace: readonly string[],
): readonly AssertionId[] {
  const failed: AssertionId[] = [];
  if (!isOrderedSubsequence(contractCase.requiredTrace ?? [], orderedTrace)) failed.push("TRACE_ORDER");
  if (observation.trace.some((call) => call.runId !== observation.runId)) failed.push("RUN_OWNERSHIP");
  const skipHasSideEffect = contractCase.expectedTerminal.kind === "live-code" &&
    contractCase.expectedTerminal.status === "skip" &&
    observation.trace.some((call) => SKIP_SIDE_EFFECT_BOUNDARIES.has(call.boundary));
  if (skipHasSideEffect) failed.push("SKIP_NO_SIDE_EFFECTS");
  const timeoutMissesCleanup = observation.terminal.kind === "live-code" &&
    observation.terminal.status === "timeout" &&
    !isOrderedSubsequence(["abort", "reap", "cleanup", "leak-scan"], orderedTrace);
  if (timeoutMissesCleanup) failed.push("TIMEOUT_ABORT_REAP");
  return failed;
}

function isolationFailures(
  contractCase: ValidatedContractCase,
  observation: ContractObservation,
): readonly AssertionId[] {
  const failed: AssertionId[] = [];
  const allowed = new Set(contractCase.allowedEnvironmentKeys ?? []);
  if (observation.childEnvironmentKeys.some((key) => !allowed.has(key))) failed.push("ENV_ALLOW_LIST");
  const forbidden = new Set(contractCase.forbiddenCanaryIds ?? []);
  if (observation.observedCanaryIds.some((id) => forbidden.has(id))) failed.push("SECRET_CANARY_ABSENT");
  const credentialEscape = observation.resources.some(
    (resource) => resource.credentialBearing && (resource.state !== "released" || resource.escaped),
  );
  if (credentialEscape) failed.push("CREDENTIAL_DESCENDANT_RELEASED");
  return failed;
}

function outputFailures(output: OutputObservation | undefined): readonly AssertionId[] {
  if (output === undefined) return [];
  const rawLimitExceeded = output.stdoutBytes > STDOUT_LIMIT || output.stderrBytes > STDERR_LIMIT;
  const unsafeTermination = !output.truncated || !output.aborted || !output.reaped;
  return (rawLimitExceeded && unsafeTermination) || output.combinedBufferedBytes > COMBINED_LIMIT
    ? ["OUTPUT_BOUNDED_DRAIN"]
    : [];
}

export function adjudicateContractCase(
  contractCase: ValidatedContractCase,
  observation: ContractObservation,
): OracleResult {
  const orderedTrace = [...observation.trace]
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((call) => call.boundary);
  const failed = new Set<AssertionId>([
    ...terminalFailures(contractCase, observation),
    ...traceFailures(contractCase, observation, orderedTrace),
    ...isolationFailures(contractCase, observation),
    ...outputFailures(observation.output),
  ]);
  const violations = [...failed].sort().map((assertionId) => ({ assertionId }));
  return violations.length === 0
    ? { pass: true, violations: [] }
    : { pass: false, violations };
}
