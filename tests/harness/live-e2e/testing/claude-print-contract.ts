import type { OracleResult, AssertionId } from "./oracle.ts";

export interface ClaudePrintContractObservation {
  readonly ciDenied: boolean;
  readonly boundaryCalls: readonly string[];
  readonly optInValue: string | undefined;
  readonly gateAllowed: boolean;
  readonly childEnvironmentKeys: readonly string[];
  readonly authStrategy: "api-key" | "native-keychain";
  readonly args: readonly string[];
  readonly projectSettings: unknown;
}

const SIDE_EFFECT_CALLS = new Set(["probe", "lease", "scratch", "spawn", "ledger"]);
const BASE_ENVIRONMENT = ["HOME", "LANG", "LC_ALL", "NO_COLOR", "PATH", "TMPDIR"];

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return [...new Set(left)].sort().join("\0") === [...new Set(right)].sort().join("\0");
}

export function adjudicateClaudePrintContract(
  observation: ClaudePrintContractObservation,
): OracleResult {
  const failed = new Set<AssertionId>();
  if (observation.ciDenied && observation.boundaryCalls.some((call) => SIDE_EFFECT_CALLS.has(call))) {
    failed.add("POLICY_CI_ZERO_CALLS");
  }
  if (observation.gateAllowed !== (observation.optInValue === "1")) {
    failed.add("POLICY_STRICT_OPT_IN");
  }
  const expectedEnvironment = observation.authStrategy === "api-key"
    ? [...BASE_ENVIRONMENT, "ANTHROPIC_API_KEY"]
    : BASE_ENVIRONMENT;
  if (!sameSet(observation.childEnvironmentKeys, expectedEnvironment)) {
    failed.add("ENV_ALLOWLIST_EXACT");
  }
  const sourceIndex = observation.args.indexOf("--setting-sources");
  const projectOnly = sourceIndex >= 0 && observation.args[sourceIndex + 1] === "project";
  const exactSettings = JSON.stringify(observation.projectSettings) === JSON.stringify({ hooks: {} });
  if (!projectOnly || !exactSettings) failed.add("SETTINGS_PROJECT_ONLY");
  const violations = [...failed].sort().map((assertionId) => ({ assertionId }));
  return violations.length === 0
    ? { pass: true, violations: [] }
    : { pass: false, violations };
}
