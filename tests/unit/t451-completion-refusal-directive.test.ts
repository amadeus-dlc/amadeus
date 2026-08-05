// covers: function:amadeus-orchestrate:completionRefusalDirective
// size: small
//
// Issue #2251 — the completion authorities refuse for two different reasons and
// only one of them is a failure. A completion that has not settled is an
// expected wait (await-completion, no ERROR_LOGGED); anything else — malformed
// state, a lineage that contradicts the projection — is a genuine engine error
// that must keep the `error` directive and its audit contract (issue #839).
//
// The call sites live inside spawn-only orchestration, so this decision is
// exercised here in-process against the pure seam rather than only through the
// child-process integration cases in t453.

import { describe, expect, test } from "bun:test";
import { completionRefusalDirective } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { WorkflowCompletionNotSettledError } from "../../packages/framework/core/tools/amadeus-workflow-completion.ts";

describe("completionRefusalDirective separates a wait from a failure", () => {
  test("an unsettled completion becomes await-completion", () => {
    const directive = completionRefusalDirective(
      new WorkflowCompletionNotSettledError("goal receipt is absent"),
      "Goal reconciliation refused completion mirror: goal receipt is absent",
    );

    expect(directive).toEqual({
      kind: "await-completion",
      reason: "Goal reconciliation refused completion mirror: goal receipt is absent",
    });
  });

  test("any other cause stays on the error directive", () => {
    const directive = completionRefusalDirective(
      new Error("Goal lineage does not match the workflow state projection"),
      "Goal reconciliation refused completion mirror: lineage mismatch",
    );

    expect(directive).toEqual({
      kind: "error",
      message: "Goal reconciliation refused completion mirror: lineage mismatch",
    });
  });

  test("a non-Error cause is not mistaken for a wait", () => {
    // A thrown string or object must fail closed onto the error path rather
    // than silently reading as an unsettled completion.
    const directive = completionRefusalDirective("goal receipt is absent", "refusal");

    expect(directive.kind).toBe("error");
  });
});
