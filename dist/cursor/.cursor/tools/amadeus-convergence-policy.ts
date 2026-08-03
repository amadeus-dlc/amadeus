// Harness-neutral convergence budgets and retry classification (#1998).

import { createHash } from "node:crypto";
import type { Fact } from "./amadeus-execution-contract.ts";

export const BUDGET_KINDS = [
  "stop-continuation",
  "recoverable-retry",
  "question",
  "follow-up",
  "review",
  "unit-attempt",
] as const;

export type BudgetKind = (typeof BUDGET_KINDS)[number];

export interface BudgetPolicyV1 {
  readonly schemaVersion: 1;
  readonly kind: BudgetKind;
  readonly effectiveCap: number;
  readonly hardCap: number;
  readonly configVersion: string;
  readonly configDigest: string;
}

export interface CreateBudgetPolicyInput {
  readonly kind: BudgetKind;
  readonly effectiveCap: number;
  readonly hardCap: number;
  readonly configVersion: string;
}

export type BudgetPolicyResult =
  | { readonly ok: true; readonly value: BudgetPolicyV1 }
  | {
      readonly ok: false;
      readonly error:
        | "cap-not-positive-integer"
        | "hard-cap-exceeded"
        | "hard-cap-mismatch";
    };

export type StopBudgetMode = "interactive" | "autonomous" | "gated";

export interface RetryFacts {
  readonly retryClass: "recoverable-transient" | "non-retryable" | "unknown";
  readonly effectStatus: "no-effect-confirmed" | "effect-possible" | "unknown";
  readonly causeCode: string;
  readonly sourceSurface:
    | "stop-continuation"
    | "swarm-dispatch"
    | "swarm-worker-start"
    | "swarm-result-collection";
}

export type RetryRuleIdV1 =
  | "RR-V1-WSU-DISPATCH"
  | "RR-V1-WSU-WORKER-START"
  | "RR-V1-ROPT-STOP"
  | "RR-V1-ROPT-RESULT";

export type RetryClassification =
  | { readonly kind: "retryable"; readonly ruleId: RetryRuleIdV1; readonly version: 1 }
  | { readonly kind: "non-retryable"; readonly reasonCode: "retry-not-allowlisted" }
  | {
      readonly kind: "unsafe-unknown";
      readonly reasonCode: "retry-policy-version-unknown" | "retry-effect-unknown";
    };

export type TerminationReasonCodeV1 =
  | "budget-exhausted"
  | "retry-not-allowlisted"
  | "retry-effect-unknown"
  | "retry-policy-version-unknown"
  | "budget-policy-mismatch"
  | "dispatch-effect-unknown"
  | "state-inconsistent"
  | "canonical-write-failed";

export interface TerminationReasonV1 {
  readonly schemaVersion: 1;
  readonly reasonCode: TerminationReasonCodeV1;
  readonly budget: Fact<{ readonly consumed: number; readonly cap: number }>;
  readonly lastDurableProgress: string;
  readonly recommendedNextAction: string;
  readonly rootOperationId: string;
}

export interface EvaluateBudgetRequest {
  readonly rootOperationId: string;
  readonly subjectId: string;
  readonly policy: BudgetPolicyV1;
  readonly lastDurableProgress: string;
}

export interface TerminationReasonInput {
  readonly reasonCode: TerminationReasonCodeV1;
  readonly budget: Fact<{ readonly consumed: number; readonly cap: number }>;
  readonly lastDurableProgress: string;
  readonly recommendedNextAction?: string;
  readonly rootOperationId: string;
}

export type BudgetDecision =
  | { readonly kind: "reserved"; readonly nextValue: number; readonly remaining: number }
  | {
      readonly kind: "exhausted";
      readonly value: number;
      readonly cap: number;
      readonly termination: TerminationReasonV1;
    };

function policyDigest(input: CreateBudgetPolicyInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

const CANONICAL_HARD_CAPS: Partial<Record<BudgetKind, number>> = {
  "stop-continuation": 10,
  "recoverable-retry": 3,
};

const RETRY_ALLOWLIST_V1 = new Map<string, RetryRuleIdV1>([
  [
    "recoverable-transient\u0000no-effect-confirmed\u0000worker-spawn-unavailable\u0000swarm-dispatch",
    "RR-V1-WSU-DISPATCH",
  ],
  [
    "recoverable-transient\u0000no-effect-confirmed\u0000worker-spawn-unavailable\u0000swarm-worker-start",
    "RR-V1-WSU-WORKER-START",
  ],
  [
    "recoverable-transient\u0000no-effect-confirmed\u0000read-only-probe-timeout\u0000stop-continuation",
    "RR-V1-ROPT-STOP",
  ],
  [
    "recoverable-transient\u0000no-effect-confirmed\u0000read-only-probe-timeout\u0000swarm-result-collection",
    "RR-V1-ROPT-RESULT",
  ],
]);

export function createBudgetPolicy(input: CreateBudgetPolicyInput): BudgetPolicyResult {
  if (!Number.isInteger(input.effectiveCap) || input.effectiveCap <= 0) {
    return { ok: false, error: "cap-not-positive-integer" };
  }
  if (!Number.isInteger(input.hardCap) || input.hardCap <= 0) {
    return { ok: false, error: "cap-not-positive-integer" };
  }
  if (input.effectiveCap > input.hardCap) {
    return { ok: false, error: "hard-cap-exceeded" };
  }
  const canonicalHardCap = CANONICAL_HARD_CAPS[input.kind];
  if (canonicalHardCap !== undefined && input.hardCap !== canonicalHardCap) {
    return { ok: false, error: "hard-cap-mismatch" };
  }
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      ...input,
      configDigest: policyDigest(input),
    },
  };
}

export function defaultBudgetPolicy(
  kind: "stop-continuation" | "recoverable-retry",
  mode: StopBudgetMode = "interactive",
): BudgetPolicyResult {
  if (kind === "recoverable-retry") {
    return createBudgetPolicy({
      kind,
      effectiveCap: 2,
      hardCap: 3,
      configVersion: "convergence-v1",
    });
  }
  return createBudgetPolicy({
    kind,
    effectiveCap: mode === "interactive" ? 2 : 8,
    hardCap: 10,
    configVersion: "convergence-v1",
  });
}

export function classifyRetry(
  facts: RetryFacts,
  allowlistVersion: number,
): RetryClassification {
  if (allowlistVersion !== 1) {
    return {
      kind: "unsafe-unknown",
      reasonCode: "retry-policy-version-unknown",
    };
  }
  if (facts.effectStatus !== "no-effect-confirmed") {
    return {
      kind: "unsafe-unknown",
      reasonCode: "retry-effect-unknown",
    };
  }
  const key = [
    facts.retryClass,
    facts.effectStatus,
    facts.causeCode,
    facts.sourceSurface,
  ].join("\u0000");
  const ruleId = RETRY_ALLOWLIST_V1.get(key);
  return ruleId === undefined
    ? { kind: "non-retryable", reasonCode: "retry-not-allowlisted" }
    : { kind: "retryable", ruleId, version: 1 };
}

/** Deterministic bounded retry delay; callers sleep only after authorization. */
export function retryBackoffMs(retryOrdinal: number): number {
  if (!Number.isInteger(retryOrdinal) || retryOrdinal <= 0) return 0;
  return Math.min(retryOrdinal, 3) * 50;
}

export function evaluateBudget(
  current: number,
  request: EvaluateBudgetRequest,
): BudgetDecision {
  if (current < request.policy.effectiveCap) {
    const nextValue = current + 1;
    return {
      kind: "reserved",
      nextValue,
      remaining: request.policy.effectiveCap - nextValue,
    };
  }
  return {
    kind: "exhausted",
    value: request.policy.effectiveCap,
    cap: request.policy.effectiveCap,
    termination: terminationReason({
      reasonCode: "budget-exhausted",
      budget: {
        state: "available",
        value: {
          consumed: request.policy.effectiveCap,
          cap: request.policy.effectiveCap,
        },
      },
      lastDurableProgress: request.lastDurableProgress,
      rootOperationId: request.rootOperationId,
    }),
  };
}

export function terminationReason(input: TerminationReasonInput): TerminationReasonV1 {
  return {
    schemaVersion: 1,
    ...input,
    recommendedNextAction: input.recommendedNextAction ?? "halt-and-ask",
  };
}
