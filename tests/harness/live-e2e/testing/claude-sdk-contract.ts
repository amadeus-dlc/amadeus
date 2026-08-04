import type { AssertionId, OracleResult } from "./oracle.ts";
import {
  CLAUDE_BASE_ENVIRONMENT,
  CLAUDE_SIDE_EFFECT_CALLS,
  sameStringSet,
} from "./claude-contract-common.ts";

export interface ClaudeSdkContractObservation {
  readonly ciDenied: boolean;
  readonly boundaryCalls: readonly string[];
  readonly optInValue: string | undefined;
  readonly gateAllowed: boolean;
  readonly childEnvironmentKeys: readonly string[];
  readonly settingSources: readonly string[];
  readonly credentialFrameWrites: number;
  readonly credentialFrameReads: number;
  readonly credentialReplayed: boolean;
  readonly output: {
    readonly singleEventBytes: number;
    readonly totalBytes: number;
    readonly eventCount: number;
    readonly queueEvents: number;
    readonly queueBytes: number;
    readonly truncated: boolean;
    readonly aborted: boolean;
    readonly reaped: boolean;
  };
}

export function adjudicateClaudeSdkContract(observation: ClaudeSdkContractObservation): OracleResult {
  const failed = new Set<AssertionId>();
  if (observation.ciDenied && observation.boundaryCalls.some((call) => CLAUDE_SIDE_EFFECT_CALLS.has(call))) {
    failed.add("POLICY_CI_ZERO_CALLS");
  }
  if (observation.gateAllowed !== (observation.optInValue === "1")) {
    failed.add("POLICY_STRICT_OPT_IN");
  }
  if (!sameStringSet(observation.childEnvironmentKeys, CLAUDE_BASE_ENVIRONMENT)) {
    failed.add("ENV_ALLOWLIST_EXACT");
  }
  if (observation.settingSources.length !== 1 || observation.settingSources[0] !== "project") {
    failed.add("SETTINGS_PROJECT_ONLY");
  }
  if (
    observation.credentialFrameWrites !== 1 ||
    observation.credentialFrameReads !== 1 ||
    observation.credentialReplayed
  ) {
    failed.add("SDK_CREDENTIAL_PIPE_SINGLE_USE");
  }
  const outputExceeded = observation.output.singleEventBytes > 65_536 ||
    observation.output.totalBytes > 1_048_576 ||
    observation.output.eventCount > 4_096 ||
    observation.output.queueEvents > 16 ||
    observation.output.queueBytes > 262_144;
  if (outputExceeded && (!observation.output.truncated || !observation.output.aborted || !observation.output.reaped)) {
    failed.add("SDK_OUTPUT_BOUNDED_DRAIN");
  }
  const violations = [...failed].sort().map((assertionId) => ({ assertionId }));
  return violations.length === 0
    ? { pass: true, violations: [] }
    : { pass: false, violations };
}
