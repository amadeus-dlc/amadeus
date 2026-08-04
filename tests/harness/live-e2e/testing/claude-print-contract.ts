import type { OracleResult, AssertionId } from "./oracle.ts";
import {
  CLAUDE_BASE_ENVIRONMENT,
  CLAUDE_SIDE_EFFECT_CALLS,
  sameStringSet,
} from "./claude-contract-common.ts";

export interface ClaudePrintContractObservation {
  readonly ciDenied: boolean;
  readonly boundaryCalls: readonly string[];
  readonly optInValue: string | undefined;
  readonly gateAllowed: boolean;
  readonly childEnvironmentKeys: readonly string[];
  readonly authStrategy: "api-key";
  readonly args: readonly string[];
  readonly projectSettings: unknown;
}

export function adjudicateClaudePrintContract(
  observation: ClaudePrintContractObservation,
): OracleResult {
  const failed = new Set<AssertionId>();
  if (observation.ciDenied && observation.boundaryCalls.some((call) => CLAUDE_SIDE_EFFECT_CALLS.has(call))) {
    failed.add("POLICY_CI_ZERO_CALLS");
  }
  if (observation.gateAllowed !== (observation.optInValue === "1")) {
    failed.add("POLICY_STRICT_OPT_IN");
  }
  const expectedEnvironment = [...CLAUDE_BASE_ENVIRONMENT, "ANTHROPIC_API_KEY"];
  if (!sameStringSet(observation.childEnvironmentKeys, expectedEnvironment)) {
    failed.add("ENV_ALLOWLIST_EXACT");
  }
  const sourceIndexes = observation.args
    .map((argument, index) => argument === "--setting-sources" ? index : -1)
    .filter((index) => index >= 0);
  const projectOnly = sourceIndexes.length === 1 &&
    observation.args[sourceIndexes[0] + 1] === "project";
  const exactSettings = JSON.stringify(observation.projectSettings) === JSON.stringify({ hooks: {} });
  if (!projectOnly || !exactSettings) failed.add("SETTINGS_PROJECT_ONLY");
  const violations = [...failed].sort().map((assertionId) => ({ assertionId }));
  return violations.length === 0
    ? { pass: true, violations: [] }
    : { pass: false, violations };
}
