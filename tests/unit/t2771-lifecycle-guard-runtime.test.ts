// covers: function:evaluateLifecycleGuards, function:formatGuardRefusal, function:guardReceipt
//
// t2771 — the Lifecycle Guard Runtime core (#2771).
//
// The runtime is a pure evaluation function: it resolves which adapters apply
// to a checkpoint, runs them in a deterministic order, and aggregates their
// verdicts fail-closed. Every checkpoint migration in amadeus-state.ts /
// amadeus-utility.ts routes its commit path through this function, so the rules
// exercised here are the rules the whole lifecycle inherits.

import { describe, expect, test } from "bun:test";
import {
  evaluateLifecycleGuards,
  formatGuardRefusal,
  guardAllowed,
  guardDenied,
  guardNotApplicable,
  guardReceipt,
  guardUnknown,
  type LifecycleGuardAdapter,
} from "../../packages/framework/core/tools/amadeus-lifecycle-guard.ts";

type Ctx = { readonly note: string };

function adapter(
  id: string,
  order: number,
  evaluate: LifecycleGuardAdapter<Ctx, string>["evaluate"],
  checkpoint: LifecycleGuardAdapter<Ctx, string>["checkpoint"] = "stage-completion",
): LifecycleGuardAdapter<Ctx, string> {
  return { id, checkpoint, order, evaluate };
}

function evaluate(
  adapters: readonly LifecycleGuardAdapter<Ctx, string>[],
  context: Ctx = { note: "ctx" },
) {
  return evaluateLifecycleGuards<Ctx, string>({
    checkpoint: "stage-completion",
    targetRevision: "stage:code-generation",
    adapters,
    context,
  });
}

describe("evaluateLifecycleGuards — aggregation", () => {
  test("all-allowed adapters produce an allowed decision carrying every evaluation", () => {
    const decision = evaluate([
      adapter("a", 10, () => guardAllowed()),
      adapter("b", 20, () => guardAllowed()),
    ]);
    expect(decision.kind).toBe("allowed");
    expect(decision.targetRevision).toBe("stage:code-generation");
    expect(decision.evaluations.map((e) => e.policyId)).toEqual(["a", "b"]);
  });

  test("a single denial blocks the transition and names the refusing policy", () => {
    const decision = evaluate([
      adapter("a", 10, () => guardAllowed()),
      adapter("b", 20, () => guardDenied({ reason: "nope" })),
    ]);
    expect(decision.kind).toBe("blocked");
    if (decision.kind !== "blocked") throw new Error("unreachable");
    expect(decision.policyId).toBe("b");
    expect(decision.blockingKind).toBe("denied");
    expect(decision.refusal.reason).toBe("nope");
  });

  test("an unknown verdict blocks the transition just like a denial", () => {
    const decision = evaluate([adapter("a", 10, () => guardUnknown({ reason: "cannot tell" }))]);
    expect(decision.kind).toBe("blocked");
    if (decision.kind !== "blocked") throw new Error("unreachable");
    expect(decision.blockingKind).toBe("unknown");
  });

  test("not-applicable adapters do not block and are recorded", () => {
    const decision = evaluate([
      adapter("a", 10, () => guardNotApplicable("off-switch active")),
      adapter("b", 20, () => guardAllowed()),
    ]);
    expect(decision.kind).toBe("allowed");
    expect(decision.evaluations[0].verdict).toEqual({
      kind: "not-applicable",
      reason: "off-switch active",
    });
  });

  test("evaluation stops at the first blocking verdict", () => {
    const seen: string[] = [];
    const decision = evaluate([
      adapter("a", 10, () => {
        seen.push("a");
        return guardDenied({ reason: "first" });
      }),
      adapter("b", 20, () => {
        seen.push("b");
        return guardDenied({ reason: "second" });
      }),
    ]);
    expect(seen).toEqual(["a"]);
    if (decision.kind !== "blocked") throw new Error("unreachable");
    expect(decision.refusal.reason).toBe("first");
  });

  test("an adapter that throws maps to unknown, naming checkpoint and target revision", () => {
    const decision = evaluate([
      adapter("boom", 10, () => {
        throw new Error("disk gone");
      }),
    ]);
    if (decision.kind !== "blocked") throw new Error("unreachable");
    expect(decision.blockingKind).toBe("unknown");
    expect(decision.refusal.reason).toContain("disk gone");
    expect(decision.refusal.evidence).toEqual({
      checkpoint: "stage-completion",
      policy: "boom",
      target: "stage:code-generation",
    });
  });
});

describe("evaluateLifecycleGuards — applicability and order", () => {
  test("adapters run in ascending order regardless of registration order", () => {
    const seen: string[] = [];
    evaluate([
      adapter("late", 30, () => {
        seen.push("late");
        return guardAllowed();
      }),
      adapter("early", 10, () => {
        seen.push("early");
        return guardAllowed();
      }),
      adapter("middle", 20, () => {
        seen.push("middle");
        return guardAllowed();
      }),
    ]);
    expect(seen).toEqual(["early", "middle", "late"]);
  });

  test("adapters sharing an order break the tie on policy id", () => {
    const seen: string[] = [];
    evaluate([
      adapter("zulu", 10, () => {
        seen.push("zulu");
        return guardAllowed();
      }),
      adapter("alpha", 10, () => {
        seen.push("alpha");
        return guardAllowed();
      }),
    ]);
    expect(seen).toEqual(["alpha", "zulu"]);
  });

  test("an adapter declared for another checkpoint is resolved not-applicable", () => {
    let ran = false;
    const decision = evaluate([
      adapter(
        "other",
        10,
        () => {
          ran = true;
          return guardDenied({ reason: "should never run" });
        },
        "workflow-completion",
      ),
    ]);
    expect(ran).toBe(false);
    expect(decision.kind).toBe("allowed");
    expect(decision.evaluations[0].verdict).toEqual({
      kind: "not-applicable",
      reason: 'declared for the "workflow-completion" checkpoint',
    });
  });

  test("duplicate policy ids are a wiring defect and throw", () => {
    expect(() =>
      evaluate([adapter("dup", 10, () => guardAllowed()), adapter("dup", 20, () => guardAllowed())]),
    ).toThrow(/duplicate/i);
  });

  test("the context reaches every adapter unchanged", () => {
    const seen: string[] = [];
    evaluate(
      [
        adapter("a", 10, (ctx) => {
          seen.push(ctx.note);
          return guardAllowed();
        }),
        adapter("b", 20, (ctx) => {
          seen.push(ctx.note);
          return guardAllowed();
        }),
      ],
      { note: "shared" },
    );
    expect(seen).toEqual(["shared", "shared"]);
  });
});

describe("formatGuardRefusal", () => {
  test("a bare reason renders verbatim", () => {
    expect(formatGuardRefusal({ reason: "Refusing to complete." })).toBe("Refusing to complete.");
  });

  test("a recovery hint is appended as the message tail", () => {
    expect(formatGuardRefusal({ reason: "Refusing to complete.", recovery: "Re-run it." })).toBe(
      "Refusing to complete. Re-run it.",
    );
  });

  test("evidence renders as a sorted trailing clause", () => {
    expect(
      formatGuardRefusal({
        reason: "Could not evaluate.",
        evidence: { policy: "p", checkpoint: "stage-completion" },
      }),
    ).toBe("Could not evaluate. (evidence: checkpoint=stage-completion; policy=p)");
  });

  test("an empty evidence map adds no clause", () => {
    expect(formatGuardRefusal({ reason: "Could not evaluate.", evidence: {} })).toBe(
      "Could not evaluate.",
    );
  });
});

describe("guardReceipt", () => {
  test("returns the receipt an allowing adapter attached", () => {
    const decision = evaluate([adapter("a", 10, () => guardAllowed("payload"))]);
    expect(guardReceipt(decision, "a")).toBe("payload");
  });

  test("throws when the named policy attached no receipt", () => {
    const decision = evaluate([adapter("a", 10, () => guardAllowed())]);
    expect(() => guardReceipt(decision, "a")).toThrow(/receipt/i);
  });
});
