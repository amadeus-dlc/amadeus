import type { AssertionId, OracleResult } from "./oracle.ts";

export interface RedGreenEvidence {
  readonly caseId: string;
  readonly seed: number;
  readonly requirementIds: readonly string[];
  readonly baselineStatus: "green";
  readonly mutantStatus: "red";
  readonly failedAssertionIds: readonly AssertionId[];
  readonly proven: true;
}

export function buildRedGreenEvidence(input: Readonly<{
  caseId: string;
  seed: number;
  requirementIds: readonly string[];
  baseline: OracleResult;
  mutant: OracleResult;
  expectedAssertionIds: readonly AssertionId[];
}>): RedGreenEvidence {
  if (!input.baseline.pass) throw new Error("baseline must be green");
  if (input.mutant.pass) throw new Error("mutant must be red");
  if (input.expectedAssertionIds.length === 0) throw new Error("expected assertions must not be empty");
  const actual = new Set(input.mutant.violations.map((violation) => violation.assertionId));
  if (input.expectedAssertionIds.some((assertionId) => !actual.has(assertionId))) {
    throw new Error("mutant did not fail the expected assertion");
  }
  const expected = new Set(input.expectedAssertionIds);
  if ([...actual].some((assertionId) => !expected.has(assertionId))) {
    throw new Error("mutant failed unexpected assertions");
  }
  return {
    caseId: input.caseId,
    seed: input.seed,
    requirementIds: [...input.requirementIds],
    baselineStatus: "green",
    mutantStatus: "red",
    failedAssertionIds: [...input.expectedAssertionIds],
    proven: true,
  };
}
