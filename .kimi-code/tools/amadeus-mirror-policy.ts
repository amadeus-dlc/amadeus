// amadeus-mirror-policy.ts — C2 Mirror policy.
//
// Pure decision layer: given a resolved mode, a generated event identity, and
// the current Mirror snapshot, it returns the next action without side effects.
// It owns NO filesystem, `gh`, or state write, and it does NOT evaluate the
// provenance / repository / landing / candidate safety guards — those are C6's
// mandatory precondition for every operation, manual included. This module
// imports only the import-free C0 Project contract and C0 domain types.

import { MIRROR_PROJECT_FIELD_CONTRACT } from "./amadeus-mirror-project-contract.ts";
import type {
  ExpectedProjectStatus,
  MirrorBoundary,
  MirrorDecision,
  MirrorEventIdentity,
  MirrorExpectedPrompt,
  MirrorFailureClass,
  MirrorOperation,
  MirrorOperationReceipt,
  MirrorPhaseKey,
  MirrorProjectSingleSelectField,
  MirrorProjectStatusNames,
  MirrorProjectSyncEntry,
  MirrorProjectSyncState,
  MirrorProjectTarget,
  MirrorReceiptStatus,
  MirrorSnapshot,
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
    answer: Readonly<{
      bindingId: string;
      event: MirrorEventIdentity;
      operation: MirrorOperation;
    }>;
    state: MirrorStateSnapshot;
  }>,
):
  | Extract<MirrorDecision, { kind: "execute" }>
  | Extract<MirrorDecision, { kind: "suppress" }> {
  const { expected, answer, state } = input;
  const answerMatches =
    expected.bindingId === answer.bindingId &&
    eventsMatch(expected.event, answer.event) &&
    expected.operation === answer.operation;
  const stateBinds =
    state.expectedPrompt !== undefined &&
    state.expectedPrompt.bindingId === expected.bindingId &&
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

// --- Project status derivation (U1) ------------------------------------------

// The FR-3a phase -> column-name table. This is the ONLY definition: the config
// layer's `status-names` overrides entries here, and every consumer derives from
// this map rather than restating a literal.
export const DEFAULT_PROJECT_STATUS_NAMES: Record<MirrorPhaseKey, string> = {
  ideation: "Ideation",
  inception: "Inception",
  construction: "Construction",
  operation: "Operation",
  done: "Done",
};

const PHASE_KEYS: ReadonlySet<string> = new Set(Object.keys(
  DEFAULT_PROJECT_STATUS_NAMES,
));

const KEEP: ExpectedProjectStatus = { kind: "keep" };

// Map the workflow's Lifecycle Phase to a Project column key. Returns null for a
// phase outside the closed vocabulary (`initialization` is a real engine phase
// with no board column), which the caller answers with `keep`.
function phaseKeyOf(lifecyclePhase: string): MirrorPhaseKey | null {
  const lower = lifecyclePhase.toLowerCase();
  // `done` is a landing outcome, not a lifecycle phase: it is reachable only
  // through the completion branch, never by naming a phase `done`.
  if (lower === "done") return null;
  return PHASE_KEYS.has(lower) ? (lower as MirrorPhaseKey) : null;
}

// Derive the Status a boundary expects. Ordered rules:
//   1. parked (boundary kind or registry status) or archived -> keep: the
//      column is left exactly as the human left it (FR-4).
//   2. landed (registry complete + workflow Completed) -> the `done` column.
//   3. otherwise the current Lifecycle Phase's column.
// An unmapped phase yields `keep`, so an unrecognised snapshot never drives a
// mutation toward a column name this module invented.
export function expectedProjectStatus(
  snapshot: MirrorSnapshot,
  boundaryKind: MirrorBoundary["kind"],
  statusNames: MirrorProjectStatusNames,
): ExpectedProjectStatus {
  if (boundaryKind === "parked") return KEEP;
  const named = (phase: MirrorPhaseKey): ExpectedProjectStatus => ({
    kind: "status",
    name: statusNames[phase] ?? DEFAULT_PROJECT_STATUS_NAMES[phase],
  });
  const phase = phaseKeyOf(snapshot.lifecyclePhase);
  const currentPhase = phase === null ? KEEP : named(phase);
  switch (snapshot.registryStatus) {
    case "in-flight":
      return currentPhase;
    case "complete":
      return snapshot.status === "Completed" ? named("done") : currentPhase;
    case "parked":
    case "archived":
      return KEEP;
  }
}

export type ExpectedProjectFieldValues = Readonly<{
  lifecycle: ExpectedProjectStatus;
  auxiliaryStatus: ExpectedProjectStatus;
}>;

function expectedAuxiliaryProjectStatus(
  snapshot: MirrorSnapshot,
  boundaryKind: MirrorBoundary["kind"],
): ExpectedProjectStatus {
  if (boundaryKind === "parked") return KEEP;
  switch (snapshot.registryStatus) {
    case "in-flight":
      return {
        kind: "status",
        name: MIRROR_PROJECT_FIELD_CONTRACT.auxiliaryStatus.active,
      };
    case "complete":
      return snapshot.status === "Completed"
        ? {
            kind: "status",
            name: MIRROR_PROJECT_FIELD_CONTRACT.auxiliaryStatus.complete,
          }
        : KEEP;
    case "parked":
    case "archived":
      return KEEP;
  }
}

// Decide every Project field from the same snapshot in the pure policy layer.
// The executor applies this plan but never invents workflow-state mappings.
export function expectedProjectFieldValues(
  snapshot: MirrorSnapshot,
  boundaryKind: MirrorBoundary["kind"],
  statusNames: MirrorProjectStatusNames,
): ExpectedProjectFieldValues {
  return {
    lifecycle: expectedProjectStatus(snapshot, boundaryKind, statusNames),
    auxiliaryStatus: expectedAuxiliaryProjectStatus(snapshot, boundaryKind),
  };
}

// Classify one Project reconciliation failure into the ledger state it earns.
// `pending` means "the same call could succeed later" and keeps the Project in
// the reconcile loop; `safety-blocked` means the board's own shape or our
// permissions make it unreachable, so retrying is noise until a human acts.
//
// This is a total function over MirrorFailureClass rather than a list of
// retryable classes, so a class added to that union is a compile error here
// instead of a silent default.
export function classifyProjectFailure(
  classification: MirrorFailureClass,
): Extract<MirrorProjectSyncState, "pending" | "safety-blocked"> {
  switch (classification) {
    case "rate-limit":
    case "network":
    case "api":
    case "command":
    case "state-write":
      return "pending";
    case "permission":
    case "unauthenticated":
    case "not-installed":
    case "configuration":
    case "invalid-response":
    case "state-parse":
    case "provenance":
    case "landing":
    case "ambiguous-create":
      return "safety-blocked";
  }
}

// Exact-match option lookup (BR-U1-4): no case folding, no trimming, no
// fuzzy fallback. A name that does not appear verbatim in the remote Project's
// own option list is unresolved, and the caller reports it as a diagnostic.
export function selectProjectStatusOption(
  field: MirrorProjectSingleSelectField,
  name: string,
): Readonly<{ id: string; name: string }> | null {
  return field.options.find((option) => option.name === name) ?? null;
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

// --- Completion gate (U3) -----------------------------------------------------

// The gate reads the Project ledger and nothing else: no board is re-queried, so
// a completion evaluates the same way offline as online. `snapshot` and
// `targets` are not a second source of truth — they are the two arguments
// `expectedProjectStatus` needs to name the `done` column, which stays that
// function's sole definition rather than a literal restated here.
export type CompletionProjectGateInput = Readonly<{
  state: MirrorStateSnapshot;
  snapshot: MirrorSnapshot;
  targets: readonly MirrorProjectTarget[];
}>;

export type CompletionProjectGate = Readonly<{
  ready: boolean;
  blocking: readonly string[];
}>;

function projectBlocker(
  entry: MirrorProjectSyncEntry,
  expected: ExpectedProjectStatus,
): string | null {
  if (expected.kind !== "status") return `${entry.project}: not-landed`;
  if (entry.state !== "synced") return `${entry.project}: ${entry.state}`;
  return entry.lastAppliedStatus === expected.name
    ? null
    : `${entry.project}: ${entry.lastAppliedStatus ?? "unapplied"}`;
}

// Is every Project this Intent syncs to actually sitting in the `done` column?
// `blocking` names each row that is not, so a withheld close explains itself
// instead of stalling silently. An Intent with no ledger row has no board to
// wait for and is ready by definition.
export function completionProjectGate(
  input: CompletionProjectGateInput,
): CompletionProjectGate {
  const statusNamesOf = (project: string): MirrorProjectStatusNames =>
    input.targets.find(
      (target) => `${target.project.owner}/${target.project.number}` === project,
    )?.statusNames ?? {};
  const blocking = (input.state.projectSync?.projects ?? [])
    .map((entry) =>
      projectBlocker(
        entry,
        expectedProjectStatus(
          input.snapshot,
          "workflow-completed",
          statusNamesOf(entry.project),
        ),
      ),
    )
    .filter((blocker): blocker is string => blocker !== null);
  return { ready: blocking.length === 0, blocking };
}
