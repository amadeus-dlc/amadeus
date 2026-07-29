import { describe, expect, test } from "bun:test";
import { decideMirrorBoundary } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { EMPTY_MIRROR_STATE } from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import {
  mirrorEventIdentity,
  mirrorEventKey,
  workflowCompletionSettlement,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  parseMirrorBoundaryReceipts,
  serializeMirrorBoundaryReceipts,
  transitionMirrorBoundaryReceipt,
} from "../../packages/framework/core/tools/amadeus-state.ts";
import { prepareWorkflowCompletion } from "../../packages/framework/core/tools/amadeus-workflow-completion.ts";

const STATE = `# State

## Runtime State

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
`;

describe("t265 mirror boundary decision", () => {
  test.each([
    ["off", false, { kind: "suppress" }],
    ["off", true, { kind: "suppress" }],
    ["prompt", false, { kind: "ask", includeCreate: true }],
    ["prompt", true, { kind: "ask", includeCreate: false }],
    ["auto", false, { kind: "ask", includeCreate: true }],
    ["auto", true, { kind: "auto-sync" }],
  ] as const)("maps mode=%s mirror=%s", (mode, mirror, expected) => {
    expect(decideMirrorBoundary(mode, mirror)).toEqual(expected);
  });
});

describe("t265 mirror boundary receipts", () => {
  test("parses an absent field as empty", () => {
    expect(parseMirrorBoundaryReceipts(null)).toEqual({});
  });

  test("serializes in canonical phase order", () => {
    expect(
      serializeMirrorBoundaryReceipts({
        construction: "pending",
        ideation: "completed",
        inception: "completed",
      }),
    ).toBe(
      '{"ideation":"completed","inception":"completed","construction":"pending"}',
    );
  });

  test("rejects invalid JSON", () => {
    expect(() => parseMirrorBoundaryReceipts("{")).toThrow("invalid JSON");
  });

  test("rejects unknown phases", () => {
    expect(() =>
      parseMirrorBoundaryReceipts('{"operation":"pending"}'),
    ).toThrow('unknown phase "operation"');
  });

  test("rejects unknown statuses", () => {
    expect(() =>
      parseMirrorBoundaryReceipts('{"ideation":"running"}'),
    ).toThrow('invalid status for "ideation"');
  });

  test("rejects duplicate phases instead of accepting JSON last-write-wins", () => {
    expect(() =>
      parseMirrorBoundaryReceipts(
        '{"ideation":"pending","ideation":"completed"}',
      ),
    ).toThrow('duplicate phase "ideation"');
  });

  test("transitions absent to pending and pending to completed", () => {
    const pending = transitionMirrorBoundaryReceipt(
      STATE,
      "inception",
      "absent",
      "pending",
    );
    expect(pending).toContain(
      '- **Mirror Boundary Receipts**: {"inception":"pending"}',
    );
    expect(
      transitionMirrorBoundaryReceipt(
        pending,
        "inception",
        "pending",
        "completed",
      ),
    ).toContain(
      '- **Mirror Boundary Receipts**: {"inception":"completed"}',
    );
  });

  test("completed replay is idempotent", () => {
    const completed = `${STATE}- **Mirror Boundary Receipts**: {"ideation":"completed"}\n`;
    expect(
      transitionMirrorBoundaryReceipt(
        completed,
        "ideation",
        "pending",
        "completed",
      ),
    ).toBe(completed);
  });

  test("rejects an unexpected source state", () => {
    const pending = `${STATE}- **Mirror Boundary Receipts**: {"ideation":"pending"}\n`;
    expect(() =>
      transitionMirrorBoundaryReceipt(
        pending,
        "ideation",
        "absent",
        "completed",
      ),
    ).toThrow("expected absent, found pending");
  });
});

describe("t265 workflow completion identity", () => {
  test("persists one completion instance independently of construction receipts", () => {
    const prepared = prepareWorkflowCompletion(
      `${STATE}- **Mirror Boundary Receipts**: {"construction":"completed"}\n`,
      "build-and-test",
      "completion-1",
    );
    expect(prepared).toContain(
      '- **Mirror Boundary Receipts**: {"construction":"completed"}',
    );
    expect(prepared).toContain(
      "- **Workflow Completion Instance**: completion-1",
    );
    expect(prepared).toContain(
      "- **Workflow Completion Stage**: build-and-test",
    );
    expect(prepared).toContain("- **Workflow Completion Status**: pending");
    expect(
      prepareWorkflowCompletion(
        prepared,
        "build-and-test",
        "completion-1",
      ),
    ).toBe(prepared);
  });

  test("refuses to replace a durable completion instance", () => {
    const prepared = prepareWorkflowCompletion(
      STATE,
      "build-and-test",
      "completion-1",
    );
    expect(() =>
      prepareWorkflowCompletion(
        prepared,
        "build-and-test",
        "completion-2",
      ),
    ).toThrow("completion-1");
  });

  test("does not reuse receipts from another completion instance", () => {
    const intentUuid = "00000000-0000-7000-8000-000000000001";
    const oldBoundary = {
      kind: "workflow-completed" as const,
      instance: "completion-old",
    };
    const receipts = Object.fromEntries(
      (["sync", "close"] as const).map((operation, index) => {
        const event = mirrorEventIdentity(intentUuid, oldBoundary, operation);
        const key = mirrorEventKey(event);
        return [
          key,
          {
            key,
            event,
            operationId: `op-${operation}`,
            createdRevision: index + 1,
            status: "succeeded" as const,
            preparedAt: "2026-07-29T10:00:00Z",
            attemptedAt: "2026-07-29T10:00:00Z",
            completedAt: "2026-07-29T10:00:00Z",
          },
        ];
      }),
    );
    expect(
      workflowCompletionSettlement({
        intentUuid,
        boundary: {
          kind: "workflow-completed",
          instance: "completion-new",
        },
        state: {
          ...EMPTY_MIRROR_STATE,
          issueNumber: 123,
          receipts,
        },
      }),
    ).toEqual({ kind: "pending", operation: "sync" });
  });

  test("does not let an explicit skip hide a blocked completion receipt", () => {
    const intentUuid = "00000000-0000-7000-8000-000000000001";
    const boundary = {
      kind: "workflow-completed" as const,
      instance: "completion-1",
    };
    const receipt = (
      operation: "sync" | "close",
      status: "skipped-for-event" | "safety-blocked",
    ) => {
      const event = mirrorEventIdentity(intentUuid, boundary, operation);
      const key = mirrorEventKey(event);
      return [
        key,
        {
          key,
          event,
          operationId: `op-${operation}`,
          createdRevision: operation === "sync" ? 1 : 2,
          status,
          preparedAt: "2026-07-29T10:00:00Z",
          completedAt: "2026-07-29T10:00:00Z",
        },
      ] as const;
    };
    expect(
      workflowCompletionSettlement({
        intentUuid,
        boundary,
        state: {
          ...EMPTY_MIRROR_STATE,
          issueNumber: 123,
          receipts: Object.fromEntries([
            receipt("sync", "skipped-for-event"),
            receipt("close", "safety-blocked"),
          ]),
        },
      }),
    ).toEqual({
      kind: "blocked",
      operation: "close",
      status: "safety-blocked",
    });
  });
});
