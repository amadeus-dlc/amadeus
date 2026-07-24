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
}>;

export type MirrorProvenance = Readonly<{
  schema: 1;
  createIdentity: MirrorCreateIdentity;
  issueNumber: number;
  createdAt: string;
}>;

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

export type MirrorStateSnapshot = Readonly<{
  revision: number;
  issueNumber: number | null;
  provenance: MirrorProvenance | null;
  receipts: Readonly<Record<string, MirrorOperationReceipt>>;
  warnings: readonly MirrorWarning[];
  repairChallenges: Readonly<Record<string, MirrorRepairChallenge>>;
  expectedPrompt?: MirrorExpectedPrompt;
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
}>;

export type MirrorSnapshot = Readonly<{
  intentUuid: string;
  intentDir: string;
  projectSummary: string;
  lifecyclePhase: string;
  currentStage: string;
  status: string;
  updatedAt: string;
}>;

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
