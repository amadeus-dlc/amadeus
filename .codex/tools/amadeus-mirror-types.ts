// amadeus-mirror-types.ts — C0 Mirror domain types.
//
// A type-only leaf: this module owns the shared value types and discriminated
// unions for the Intent Mirror and imports nothing at runtime (no filesystem,
// process, GitHub, or sibling Mirror module). C1..C8 import these shapes; C0
// never imports them, keeping the type dependency one-directional.
//
// The unions are closed to the Intent Mirror domain: MirrorMode is exactly
// off | prompt | auto and MirrorOperation is exactly create | sync | close.
// They are deliberately NOT generalized into an external-action union that
// could add PR merge, release, publish, or deploy.

export type MirrorMode = "off" | "prompt" | "auto";

export type MirrorOperation = "create" | "sync" | "close";

export type RepositoryIdentity = Readonly<{
  owner: string;
  name: string;
  canonical: `${string}/${string}`;
}>;

export type MirrorBoundary =
  | { kind: "intent-capture-approved"; instance: string }
  | { kind: "phase-verified"; phase: string; instance: string }
  | { kind: "parked"; stage: string; instance: string }
  | { kind: "workflow-completed"; instance: string }
  | { kind: "manual"; instance: string };

export type MirrorEventIdentity = {
  intentUuid: string;
  boundary: MirrorBoundary;
  operation: MirrorOperation;
};

export type MirrorCreateIdentity = Readonly<{
  schema: 1;
  intentUuid: string;
  intentDir: string;
  repository: RepositoryIdentity;
  operationId: string;
  preparedAt: string;
}>;

export type MirrorFailureClass =
  | "configuration"
  | "not-installed"
  | "unauthenticated"
  | "permission"
  | "rate-limit"
  | "network"
  | "api"
  | "command"
  | "invalid-response"
  | "state-write"
  | "state-parse"
  | "provenance"
  | "landing"
  | "ambiguous-create";

export type MirrorReceiptStatus =
  | "prepared"
  | "attempted"
  | "succeeded"
  | "skipped-for-event"
  | "pending"
  | "safety-blocked"
  | "abandoned";

export type MirrorMutationEffect =
  | "not-started"
  | "no-effect-confirmed"
  | "outcome-unknown";

export type MirrorOperationReceipt = Readonly<{
  key: string;
  event: MirrorEventIdentity;
  operationId: string;
  status: MirrorReceiptStatus;
  preparedAt: string;
  attemptedAt?: string;
  completedAt?: string;
  failureClass?: MirrorFailureClass;
  lastEffect?: MirrorMutationEffect;
  createIdentity?: MirrorCreateIdentity;
  authorization?: MirrorExecutionAuthorization;
  // Present only while the Issue mutation itself succeeded but the Project
  // board did not converge (E-U2CG). It is the sole reason a receipt can sit at
  // `pending` without a `failureClass` / `lastEffect`: those two describe the
  // Issue mutation, and reusing them here would record a failure that did not
  // happen. `completedAt` stays set, because the Issue side really did complete.
  projectSyncHold?: MirrorProjectSyncHold;
}>;

export type MirrorProjectSyncHold = Readonly<{
  reason: "project-sync-unsettled";
  heldAt: string;
}>;

export type MirrorProvenanceV1 = Readonly<{
  schema: 1;
  createIdentity: MirrorCreateIdentity;
  issueNumber: number;
  createdAt: string;
}>;

// V2 is emitted by guarded repair relink only. The state codec keeps V1
// readable, while the repair plan digest binds V2's inspection-clock createdAt.
export type MirrorProvenanceV2 = Readonly<{
  schema: 2;
  createIdentity: MirrorCreateIdentity;
  issueNumber: number;
  createdAt: string;
}>;

export type MirrorProvenance = MirrorProvenanceV1 | MirrorProvenanceV2;

export type MirrorWarning = Readonly<{
  operationId: string | null;
  operation: MirrorOperation | null;
  classification: MirrorFailureClass;
  summary: string;
  occurredAt: string;
  retryable: boolean;
  effect: MirrorMutationEffect;
  source: "persisted-receipt" | "persisted-warning" | "current-invocation";
}>;

export type MirrorExpectedPrompt = Readonly<{
  bindingId: string;
  event: MirrorEventIdentity;
  operation: MirrorOperation;
  issuedAt: string;
  retryOf?: Readonly<{ event: MirrorEventIdentity; operationId: string }>;
}>;

export type MirrorAuditContext = Readonly<{
  triggerEvent: MirrorEventIdentity;
  operationEvent?: MirrorEventIdentity;
  operationId?: string;
  reconciliation: boolean;
  classification?: MirrorFailureClass;
}>;

export type MirrorRepairChallenge = Readonly<{
  challengeId: string;
  intentUuid: string;
  repository: RepositoryIdentity;
  planDigest: string;
  operationId: string;
  expectedPhrase: string;
  issuedAt: string;
  consumedAt?: string;
}>;

export type MirrorRepairProof = Readonly<{
  challengeId: string;
  intentUuid: string;
  repository: RepositoryIdentity;
  operationId: string;
  planDigest: string;
  exactConfirmation: string;
  checkedAt: string;
}>;

// The single transactional audit outbox persisted inside the Mirror state
// block (business-logic-model.md step 7). A committed state transition stores
// the FULL ARTIFACT_UPDATED projection (`fields`) plus its transaction identity
// and digest here in the SAME atomic rename as the business state, then the
// next call drains it (idempotent audit append) and clears it. `fields` is the
// audit event's field record exactly as appendAuditEntry consumes it, so no
// audit content is reconstructed from memory during recovery.
//
// Provenance note: this type is the C0 completion the contract-policy unit
// omitted — logical-components.md:9 assigns "outbox unions" to S0(C0) and
// business-logic-model.md:27's wire block carries `auditOutbox`. Added as a
// within-Bolt completion under leader ruling #3 (Opt1) by the
// mirror-state-provenance unit.
export type MirrorAuditOutbox = Readonly<{
  transactionId: string;
  digest: string;
  fields: Readonly<Record<string, string>>;
}>;

export type MirrorStateSnapshot = Readonly<{
  revision: number;
  issueNumber: number | null;
  provenance: MirrorProvenance | null;
  receipts: Readonly<Record<string, MirrorOperationReceipt>>;
  warnings: readonly MirrorWarning[];
  repairChallenges: Readonly<Record<string, MirrorRepairChallenge>>;
  expectedPrompt?: MirrorExpectedPrompt;
  // Optional-with-null: the wire block always serialises `auditOutbox` (null in
  // steady state); a snapshot with the key absent is treated as no outbox, the
  // same convention as `expectedPrompt?`. The codec normalises undefined->null.
  auditOutbox?: MirrorAuditOutbox | null;
  // Project status ledger, same optional-with-null convention: an empty ledger
  // renders as null so a workspace that configured no Project keeps the
  // steady-state block shape.
  projectSync?: MirrorProjectSyncLedger | null;
}>;

export type WriteOutcome<T = MirrorStateSnapshot> =
  | { kind: "written"; value: T; document: string }
  | { kind: "unchanged"; value: T; document: string }
  | { kind: "conflict"; actualRevision: number }
  | { kind: "invalid"; issues: readonly string[] }
  | { kind: "io-failure"; summary: string };

export type MarkerOutcome =
  | { kind: "parsed"; identity: MirrorCreateIdentity }
  | { kind: "missing" }
  | { kind: "invalid"; issues: readonly string[] };

export type OwnershipOutcome =
  | { kind: "verified"; issue: RemoteMirrorIssue }
  | {
      kind: "missing-marker" | "mismatch" | "wrong-repository";
      summary: string;
    };

export type CandidateOutcome =
  | { kind: "adopt"; issue: RemoteMirrorIssue; provenance: MirrorProvenance }
  | { kind: "create-new" }
  | {
      kind: "safety-blocked";
      reason: "zero-after-attempt" | "ambiguous" | "mismatch";
    };

export type GatewayOutcome<T> =
  | { kind: "ok"; value: T }
  | {
      kind: "failure";
      classification: Exclude<
        MirrorFailureClass,
        | "configuration"
        | "state-write"
        | "state-parse"
        | "provenance"
        | "landing"
        | "ambiguous-create"
      >;
      summary: string;
      retryable: boolean;
      effect: MirrorMutationEffect;
    };

export type CreateMirrorIssueInput = Readonly<{
  title: string;
  body: string;
  labels: readonly string[];
}>;

export type MirrorIssueContent = Readonly<{
  title: string;
  body: string;
  labels: readonly string[];
}>;

export type RemoteMirrorIssue = Readonly<{
  repository: RepositoryIdentity;
  number: number;
  title: string;
  body: string;
  state: "OPEN" | "CLOSED";
}>;

// The permit brand is a module-internal unique symbol. It is never exported, so
// no module outside the internal capability factory (owned by C6) can construct
// a MirrorMutationPermit — other modules may only reference the type.
declare const mirrorMutationPermitBrand: unique symbol;

export type MirrorMutationPermit = Readonly<{
  [mirrorMutationPermitBrand]: true;
  event: MirrorEventIdentity;
  repository: RepositoryIdentity;
  operation: MirrorOperation;
  issueNumber: number | null;
}>;

// --- Project status sync (U1) ------------------------------------------------
//
// A Project board reference parsed from the `"<owner>/<number>"` configuration
// string. Parse-don't-validate: the config layer rejects a malformed value and
// every consumer downstream carries this proven shape.
export type MirrorProjectRef = Readonly<{ owner: string; number: number }>;

// The phase vocabulary a configured Project lifecycle option can be derived from. Closed to
// these five keys: an unknown phase name in configuration is a configuration
// error, never coerced.
export type MirrorPhaseKey =
  | "ideation"
  | "inception"
  | "construction"
  | "operation"
  | "done";

export type MirrorProjectStatusNames = Partial<Record<MirrorPhaseKey, string>>;

export type MirrorProjectTarget = Readonly<{
  project: MirrorProjectRef;
  phaseField: string;
  statusNames: MirrorProjectStatusNames;
}>;

// One row of the `projectSync` ledger, keyed by the canonical "owner/number" in
// `project`. `state` records the outcome of the most recent reconciliation of
// that one Project: `synced` when the board matches the expected column,
// `pending` when a retryable failure left it unknown, and `safety-blocked` when
// the board's own shape (no configured lifecycle field, no matching option) or our permissions
// make it unreachable without a human.
//
// `projectId` is nullable because a Project whose lifecycle field could not be
// resolved has no node id to record; `lastAppliedStatus` is the last column this
// tool actually applied, and a later failure does not erase that history.
export type MirrorProjectSyncEntry = Readonly<{
  project: string; // canonical "owner/number"
  projectId: string | null;
  itemId: string | null;
  lastAppliedStatus: string | null;
  state: MirrorProjectSyncState;
  updatedAt: string;
}>;

export type MirrorProjectSyncState = "synced" | "pending" | "safety-blocked";

export type MirrorProjectSyncLedger = Readonly<{
  projects: readonly MirrorProjectSyncEntry[];
}>;

// The resolved lifecycle single-select field of one Project. `options` holds only
// the options the remote Project actually declares — never a synthesized name,
// because the option-missing diagnostic lists this set verbatim.
export type MirrorProjectStatusField = Readonly<{
  projectId: string;
  fieldId: string;
  options: ReadonlyArray<Readonly<{ id: string; name: string }>>;
  workflowStatusField?: Readonly<{
    fieldId: string;
    options: ReadonlyArray<Readonly<{ id: string; name: string }>>;
  }> | null;
}>;

export type MirrorProjectItem = Readonly<{
  projectId: string;
  projectNumber: number;
  projectOwner: string;
  itemId: string;
  currentStatus: string | null;
  workflowStatus?: string | null;
  fieldValues?: Readonly<Record<string, string>>;
}>;

// The identity the membership query needs: a Project lookup resolves the Issue
// by repository and number, and reads none of its content.
export type MirrorIssueRef = Readonly<{
  repository: RepositoryIdentity;
  number: number;
}>;

// The single membership query returns the Issue's GraphQL node id alongside its
// current Project items. The node id is required to add the Issue to a Project
// it is not yet a member of, and this one query is its only in-budget source
// (E-U1CG option A: no extra call).
export type MirrorProjectItemsView = Readonly<{
  issueNodeId: string;
  items: readonly MirrorProjectItem[];
}>;

// The Status a boundary expects. `keep` means "leave the column alone" and
// deliberately carries no name, so no caller can mistake it for a target.
export type ExpectedProjectStatus =
  | { kind: "status"; name: string }
  | { kind: "keep" };

// Project board mutations are a separate permit axis from MirrorOperation.
// MirrorOperation stays exactly create | sync | close (see this module's header):
// widening it would leak Project verbs into the receipt, policy, and codec
// vocabularies that key off it. This parallel brand reuses the same runtime
// authority pattern — a module-private WeakSet in the capability factory — so a
// forged literal is rejected before any process spawns.
declare const mirrorProjectPermitBrand: unique symbol;

export type MirrorProjectMutation =
  | "add-project-item"
  | "update-project-item-status";

export type MirrorProjectMutationPermit = Readonly<{
  [mirrorProjectPermitBrand]: true;
  event: MirrorEventIdentity;
  repository: RepositoryIdentity;
  mutation: MirrorProjectMutation;
  project: MirrorProjectRef;
}>;

// The Gateway methods are asynchronous: a mutation deadline drives a multi-step
// SIGTERM -> grace -> SIGKILL -> process-group-death termination that cannot
// settle behind a synchronous return. Every consumer (the C6 executor reached
// through MirrorExecutionContext.gateway) awaits these.
export interface MirrorGitHubGateway {
  readiness(repository: RepositoryIdentity): Promise<GatewayOutcome<void>>;
  createIssue(
    permit: MirrorMutationPermit,
    input: CreateMirrorIssueInput,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>>;
  findIssuesByMarker(
    repository: RepositoryIdentity,
    marker: string,
  ): Promise<GatewayOutcome<readonly RemoteMirrorIssue[]>>;
  viewIssue(
    repository: RepositoryIdentity,
    issueNumber: number,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>>;
  editIssue(
    permit: MirrorMutationPermit,
    body: string,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>>;
  closeIssue(
    permit: MirrorMutationPermit,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>>;
  // Project status sync (U1). The two read methods take no permit; the two
  // mutations require a Project permit, mirroring the Issue mutation rule.
  listProjectItems(
    issue: MirrorIssueRef,
  ): Promise<GatewayOutcome<MirrorProjectItemsView>>;
  resolveProjectStatusField(
    project: MirrorProjectRef,
    phaseField: string,
  ): Promise<GatewayOutcome<MirrorProjectStatusField>>;
  addProjectItem(
    permit: MirrorProjectMutationPermit,
    projectId: string,
    issueNodeId: string,
  ): Promise<GatewayOutcome<{ itemId: string }>>;
  updateProjectItemStatus(
    permit: MirrorProjectMutationPermit,
    projectId: string,
    itemId: string,
    fieldId: string,
    optionId: string,
  ): Promise<GatewayOutcome<void>>;
}

export type MirrorExecutionContext = Readonly<{
  statePath: string;
  intentUuid: string;
  intentDir: string;
  repository: RepositoryIdentity;
  triggerEvent: MirrorEventIdentity;
  event: MirrorEventIdentity;
  operation: MirrorOperation;
  issueContent: MirrorIssueContent;
  expectedMirrorRevision: number;
  now: () => string;
  newOperationId: () => string;
  gateway: MirrorGitHubGateway;
  authorization: MirrorExecutionAuthorization;
  // Project status sync inputs, supplied by the coordinator (which owns both the
  // resolved configuration and the workflow snapshot). Absent means the step is
  // not wired for this invocation and no Project API call is made.
  projectSync?: Readonly<{
    targets: readonly MirrorProjectTarget[];
    snapshot: MirrorSnapshot;
    diagnostic?: (diagnostic: MirrorProjectDiagnostic) => void;
  }>;
}>;

// An observation-only Project diagnostic. Built from a fixed template over the
// remote Project's own vocabulary, so it carries no credential and no raw
// response bytes.
export type MirrorProjectDiagnostic = Readonly<{
  project: string;
  reason:
    | "membership-query-failed"
    | "project-unresolved"
    | "option-missing"
    | "add-failed"
    | "update-failed";
  expectedStatus: string | null;
  availableOptions: readonly string[];
  summary: string;
}>;

export type MirrorSnapshot = Readonly<{
  intentUuid: string;
  intentDir: string;
  projectSummary: string;
  lifecyclePhase: string;
  currentStage: string;
  status: string;
  registryStatus: string;
  updatedAt: string;
}>;

export type MirrorLandingEvidence = Readonly<{
  registryStatus: "complete";
  workflowStatus: "Completed";
}>;

type MirrorAuthorizationBase = Readonly<{
  event: MirrorEventIdentity;
  operation: MirrorOperation;
  boundaryInstance: string;
  receiptRevision: number;
  landing?: MirrorLandingEvidence;
  finalSyncReceiptKey?: string;
}>;

export type MirrorExecutionAuthorization =
  | (MirrorAuthorizationBase &
      Readonly<{
        kind: "auto";
        resolvedMode: "auto";
      }>)
  | (MirrorAuthorizationBase &
      Readonly<{
        kind: "prompt-approved";
        expectedBindingId: string;
        answerId: string;
      }>)
  | (MirrorAuthorizationBase &
      Readonly<{
        kind: "manual";
        invocationId: string;
      }>);

export type MirrorStatusContext = Readonly<{
  mode: MirrorMode;
  configSources: readonly string[];
  state: MirrorStateSnapshot;
  provenanceStatus: "unlinked" | "verified" | "unverified";
}>;

export type MirrorOperationOutcome =
  | { kind: "completed"; operation: MirrorOperation; issueNumber: number }
  | { kind: "skipped"; operation: MirrorOperation }
  | {
      kind: "suppressed";
      operation: MirrorOperation | null;
      reason: "off" | "not-applicable" | "configuration";
      warning?: MirrorWarning;
    }
  | { kind: "pending"; operation: MirrorOperation; warning: MirrorWarning }
  | {
      kind: "safety-blocked";
      operation: MirrorOperation;
      warning: MirrorWarning;
    }
  | {
      kind: "repaired";
      action: "relink" | "abandon";
      issueNumber: number | null;
    };

export type MirrorRepairPlan =
  | {
      kind: "relink";
      repository: RepositoryIdentity;
      issue: RemoteMirrorIssue;
      provenance: MirrorProvenance;
    }
  | { kind: "abandon-attempt"; operationId: string; duplicateRisk: true }
  | { kind: "rejected"; reason: string };

export type MirrorDecision =
  | { kind: "suppress"; reason: "off" | "not-applicable" | "skipped-for-event" }
  | {
      kind: "prompt";
      operation: MirrorOperation;
      event: MirrorEventIdentity;
      retryOf?: Readonly<{ event: MirrorEventIdentity; operationId: string }>;
    }
  | {
      kind: "execute";
      operation: MirrorOperation;
      event: MirrorEventIdentity;
      retryOf?: Readonly<{ event: MirrorEventIdentity; operationId: string }>;
    };
