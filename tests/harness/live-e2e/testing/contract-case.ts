import type { LiveCode, LiveStatus, Result } from "../contract.ts";

export const FAULT_POINTS = [
  "policy-bypass",
  "scratch-partial",
  "prepare-throw",
  "execute-failure",
  "timeout",
  "assertion",
  "cleanup",
  "leak",
  "ledger-write",
  "ledger-fsync",
  "ledger-rename",
  "ledger-revalidate",
  "process-crash",
  "matrix-drift",
] as const;

export type FaultPoint = (typeof FAULT_POINTS)[number];

export type ExpectedTerminal =
  | Readonly<{ kind: "live-code"; status: LiveStatus; code: LiveCode }>
  | Readonly<{
      kind: "run-error";
      errorKind: "cleanup-barrier-failed" | "ledger-write-failed";
    }>
  | Readonly<{ kind: "contract-error"; errorKind: string }>;

export interface ContractCase {
  readonly id: string;
  readonly requirementIds: readonly string[];
  readonly seed: number;
  readonly faults: readonly FaultPoint[];
  readonly expectedTerminal: ExpectedTerminal;
  readonly requiredTrace?: readonly string[];
  readonly allowedEnvironmentKeys?: readonly string[];
  readonly forbiddenCanaryIds?: readonly string[];
}

export type ValidatedContractCase = ContractCase & Readonly<{ validated: true }>;

export interface ContractCaseIssue {
  readonly kind: "invalid-id" | "missing-requirement" | "invalid-seed" | "invalid-fault-plan";
}

function validFaultPlan(faults: readonly FaultPoint[]): boolean {
  if (faults.some((fault) => !FAULT_POINTS.includes(fault))) return false;
  if (faults.length <= 1) return true;
  return faults.length === 2 && faults.includes("cleanup") && faults.includes("leak");
}

export function validateContractCase(
  candidate: ContractCase,
): Result<ValidatedContractCase, ContractCaseIssue> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(candidate.id)) {
    return { ok: false, error: { kind: "invalid-id" } };
  }
  if (candidate.requirementIds.length === 0) {
    return { ok: false, error: { kind: "missing-requirement" } };
  }
  if (!Number.isSafeInteger(candidate.seed) || candidate.seed < 0) {
    return { ok: false, error: { kind: "invalid-seed" } };
  }
  if (!validFaultPlan(candidate.faults)) {
    return { ok: false, error: { kind: "invalid-fault-plan" } };
  }
  return { ok: true, value: { ...candidate, validated: true } };
}

export interface OptInPropertyCase {
  readonly seed: number;
  readonly value: string | undefined;
  readonly expected: "allow" | "deny";
}

export function strictOptInPropertyCases(seed: number): readonly OptInPropertyCase[] {
  const normalizedSeed = seed >>> 0;
  const generated = `seed-${normalizedSeed.toString(16)}-\u03bb`;
  return [
    { seed, value: "1", expected: "allow" },
    ...[undefined, "", "0", "true", " 1", "1 ", "TRUE", generated].map((value) => ({
      seed,
      value,
      expected: "deny" as const,
    })),
  ];
}
