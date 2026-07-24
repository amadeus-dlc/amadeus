// amadeus-mirror-policy.ts — C2 Mirror policy.
//
// Pure decision layer: given a resolved mode, a generated event identity, and
// the current Mirror snapshot, it returns the next action without side effects.
// It owns NO filesystem, `gh`, or state write, and it does NOT evaluate the
// provenance / repository / landing / candidate safety guards — those are C6's
// mandatory precondition for every operation, manual included. This module
// imports only the C0 domain types.

import type {
  MirrorBoundary,
  MirrorDecision,
  MirrorEventIdentity,
  MirrorExpectedPrompt,
  MirrorOperation,
  MirrorOperationReceipt,
  MirrorReceiptStatus,
  MirrorStateSnapshot,
} from "./amadeus-mirror-types.ts";

export type MirrorPolicyInput =
  | Readonly<{
      kind: "lifecycle";
      mode: "off" | "prompt" | "auto";
      event: MirrorEventIdentity;
      state: MirrorStateSnapshot;
    }>
  | Readonly<{
      kind: "manual";
      event: MirrorEventIdentity & {
        boundary: Extract<MirrorBoundary, { kind: "manual" }>;
      };
      state: MirrorStateSnapshot;
    }>;

export type CompletionPolicyInput = Readonly<{
  intentUuid: string;
  boundary: Extract<MirrorBoundary, { kind: "workflow-completed" }>;
  state: MirrorStateSnapshot;
}>;

// Structural applicability: which operations a boundary kind can ever evaluate.
// The finer "create when no issue, sync when issue" refinement is the
// coordinator's event-construction concern, not a policy suppression.
const APPLICABLE_OPERATIONS: Readonly<
  Record<MirrorBoundary["kind"], readonly MirrorOperation[]>
> = {
  "intent-capture-approved": ["create"],
  "phase-verified": ["create", "sync"],
  parked: ["create", "sync"],
  "workflow-completed": ["create", "sync", "close"],
  manual: ["create", "sync", "close"],
};

const IN_PROGRESS_STATUSES: readonly MirrorReceiptStatus[] = [
  "prepared",
  "attempted",
  "pending",
];

const TERMINAL_BLOCK_STATUSES: readonly MirrorReceiptStatus[] = [
  "skipped-for-event",
  "safety-blocked",
  "abandoned",
];

// The versioned, position-fixed identity of a boundary evaluation. Display-only
// detail (phase / stage names) is deliberately excluded so a resume of the same
// engine-owned transition converges on the same key.
export function mirrorEventIdentity(
  intentUuid: string,
  boundary: MirrorBoundary,
  operation: MirrorOperation,
): MirrorEventIdentity {
  return { intentUuid, boundary, operation };
}

// FR-10 uniqueness rendered as a versioned positional tuple, JSON-serialized
// (UTF-8), base64url-encoded without padding, and prefixed. The array position
// fixes field order, so the key never depends on object key order or locale.
export function mirrorEventKey(event: MirrorEventIdentity): string {
  const tuple = [
    "mirror-event",
    1,
    event.intentUuid,
    event.boundary.kind,
    event.boundary.instance,
    event.operation,
  ];
  const encoded = Buffer.from(JSON.stringify(tuple), "utf-8").toString(
    "base64url",
  );
  return `mirror-event:v1:${encoded}`;
}

function classifyReceipt(
  receipt: MirrorOperationReceipt | undefined,
): "none" | "in-progress" | "succeeded" | "terminal-block" {
  if (receipt === undefined) return "none";
  const status = receipt.status;
  if (status === "succeeded") return "succeeded";
  if (IN_PROGRESS_STATUSES.includes(status)) return "in-progress";
  if (TERMINAL_BLOCK_STATUSES.includes(status)) return "terminal-block";
  // A corrupted snapshot must fail fast rather than round to terminal / prompt.
  throw new Error(`unknown mirror receipt status: ${String(status)}`);
}

function retryOfCurrent(
  event: MirrorEventIdentity,
  state: MirrorStateSnapshot,
): Readonly<{ event: MirrorEventIdentity; operationId: string }> | undefined {
  const receipt = state.receipts[mirrorEventKey(event)];
  if (receipt === undefined) return undefined;
  if (!IN_PROGRESS_STATUSES.includes(receipt.status)) return undefined;
  return { event, operationId: receipt.operationId };
}

function eventsMatch(a: MirrorEventIdentity, b: MirrorEventIdentity): boolean {
  return mirrorEventKey(a) === mirrorEventKey(b) && a.operation === b.operation;
}

// Ordered decision rules. Manual invocation is explicit consent and bypasses
// mode resolution (C6 still applies every safety guard). For lifecycle input,
// `off` is evaluated before pending / skip, then applicability, then the
// event-scoped skip, then the mode.
export function decideMirrorAction(input: MirrorPolicyInput): MirrorDecision {
  if (input.kind === "manual") {
    return {
      kind: "execute",
      operation: input.event.operation,
      event: input.event,
      ...withRetry(retryOfCurrent(input.event, input.state)),
    };
  }

  const { mode, event, state } = input;
  if (mode === "off") return { kind: "suppress", reason: "off" };

  if (!APPLICABLE_OPERATIONS[event.boundary.kind].includes(event.operation)) {
    return { kind: "suppress", reason: "not-applicable" };
  }

  const receipt = state.receipts[mirrorEventKey(event)];
  if (receipt?.status === "skipped-for-event") {
    return { kind: "suppress", reason: "skipped-for-event" };
  }

  const retryOf = retryOfCurrent(event, state);
  if (mode === "prompt") {
    return { kind: "prompt", operation: event.operation, event, ...withRetry(retryOf) };
  }
  return { kind: "execute", operation: event.operation, event, ...withRetry(retryOf) };
}

function withRetry(
  retryOf: Readonly<{ event: MirrorEventIdentity; operationId: string }> | undefined,
): { retryOf?: Readonly<{ event: MirrorEventIdentity; operationId: string }> } {
  return retryOf === undefined ? {} : { retryOf };
}

// Approve a stored prompt only when the answer exactly matches the persisted
// expected event and operation. A different event or operation is rejected
// (suppress). The state's own expected prompt must still be the one being
// approved, so a consumed / stale binding cannot be replayed.
export function approveMirrorPrompt(
  input: Readonly<{
    expected: MirrorExpectedPrompt;
    answer: Readonly<{ event: MirrorEventIdentity; operation: MirrorOperation }>;
    state: MirrorStateSnapshot;
  }>,
):
  | Extract<MirrorDecision, { kind: "execute" }>
  | Extract<MirrorDecision, { kind: "suppress" }> {
  const { expected, answer, state } = input;
  const answerMatches =
    eventsMatch(expected.event, answer.event) &&
    expected.operation === answer.operation;
  const stateBinds =
    state.expectedPrompt !== undefined &&
    eventsMatch(state.expectedPrompt.event, expected.event) &&
    state.expectedPrompt.operation === expected.operation;
  if (!answerMatches || !stateBinds) {
    return { kind: "suppress", reason: "not-applicable" };
  }
  return {
    kind: "execute",
    operation: expected.operation,
    event: expected.event,
    ...withRetry(expected.retryOf),
  };
}

// Select the single next operation for the current workflow-completion
// boundary, considering only that instance's receipts. Returns the same
// operation while in progress, null when a stage is terminally blocked, and
// otherwise advances create -> sync -> close. Never returns more than one
// operation or an out-of-order operation.
export function nextCompletionOperation(
  input: CompletionPolicyInput,
): MirrorOperation | null {
  const { intentUuid, boundary, state } = input;
  const receiptFor = (operation: MirrorOperation): MirrorOperationReceipt | undefined =>
    state.receipts[mirrorEventKey(mirrorEventIdentity(intentUuid, boundary, operation))];

  const create = classifyReceipt(receiptFor("create"));
  if (create === "in-progress") return "create";
  if (create === "terminal-block") return null;
  const issueExists = state.issueNumber !== null || create === "succeeded";
  if (!issueExists) return "create";

  const sync = classifyReceipt(receiptFor("sync"));
  if (sync === "in-progress") return "sync";
  if (sync === "terminal-block") return null;
  if (sync !== "succeeded") return "sync";

  const close = classifyReceipt(receiptFor("close"));
  if (close === "in-progress") return "close";
  if (close === "terminal-block" || close === "succeeded") return null;
  return "close";
}
