// amadeus-mirror-project-ledger-reducer.ts — pure Project ledger transitions.
//
// Owns the keyed ledger semantics independently from the receipt/warning state
// machine. The parent state reducer remains responsible for transaction-wide
// concerns such as clearing the audit outbox.

import type {
  MirrorProjectSyncEntry,
  MirrorProjectSyncLedger,
} from "./amadeus-mirror-types.ts";

// What a failed reconciliation of one Project knows. It deliberately carries no
// `lastAppliedStatus`: a later failure preserves the last successfully applied
// field and column rather than rewriting history it could not observe.
export type ProjectFailureMark = Readonly<{
  project: string;
  projectId: string | null;
  itemId: string | null;
  updatedAt: string;
}>;

export type MirrorProjectLedgerTransition =
  | { kind: "upsert-project-entry"; entry: MirrorProjectSyncEntry }
  | { kind: "prune-project-entries"; activeProjects: readonly string[] }
  | ({ kind: "mark-project-pending" } & ProjectFailureMark)
  | ({ kind: "mark-project-safety-blocked" } & ProjectFailureMark);

export type ProjectLedgerReduction =
  | { kind: "changed"; ledger: MirrorProjectSyncLedger | null }
  | { kind: "unchanged" }
  | { kind: "invalid"; issues: readonly string[] };

const EMPTY_PROJECT_HISTORY = {
  projectId: null,
  itemId: null,
  phaseField: null,
  lastAppliedStatus: null,
} as const;

function invalid(issue: string): ProjectLedgerReduction {
  return { kind: "invalid", issues: [issue] };
}

function projectEntryEquals(
  left: MirrorProjectSyncEntry,
  right: MirrorProjectSyncEntry,
): boolean {
  return (
    left.project === right.project &&
    left.projectId === right.projectId &&
    left.itemId === right.itemId &&
    left.phaseField === right.phaseField &&
    left.lastAppliedStatus === right.lastAppliedStatus &&
    left.state === right.state &&
    left.updatedAt === right.updatedAt
  );
}

function writeProjectEntry(
  ledger: MirrorProjectSyncLedger | null | undefined,
  entry: MirrorProjectSyncEntry,
): ProjectLedgerReduction {
  const existing = ledger?.projects ?? [];
  const at = existing.findIndex((candidate) => candidate.project === entry.project);
  if (at >= 0 && projectEntryEquals(existing[at], entry)) {
    return { kind: "unchanged" };
  }
  const projects =
    at >= 0
      ? existing.map((candidate, index) => (index === at ? entry : candidate))
      : [...existing, entry];
  return { kind: "changed", ledger: { projects } };
}

function reduceUpsert(
  ledger: MirrorProjectSyncLedger | null | undefined,
  transition: Extract<
    MirrorProjectLedgerTransition,
    { kind: "upsert-project-entry" }
  >,
): ProjectLedgerReduction {
  if (transition.entry.project.length === 0) {
    return invalid("upsert-project-entry: project must be non-empty");
  }
  if (
    transition.entry.projectId !== null &&
    transition.entry.projectId.length === 0
  ) {
    return invalid("upsert-project-entry: projectId must be non-empty or null");
  }
  if (
    transition.entry.phaseField !== null &&
    transition.entry.phaseField.length === 0
  ) {
    return invalid("upsert-project-entry: phaseField must be non-empty or null");
  }
  return writeProjectEntry(ledger, transition.entry);
}

function reducePrune(
  ledger: MirrorProjectSyncLedger | null | undefined,
  transition: Extract<
    MirrorProjectLedgerTransition,
    { kind: "prune-project-entries" }
  >,
): ProjectLedgerReduction {
  if (transition.activeProjects.some((project) => project.length === 0)) {
    return invalid("prune-project-entries: active project must be non-empty");
  }
  const existing = ledger?.projects ?? [];
  const active = new Set(transition.activeProjects);
  const projects = existing.filter((entry) => active.has(entry.project));
  return projects.length === existing.length
    ? { kind: "unchanged" }
    : { kind: "changed", ledger: projects.length === 0 ? null : { projects } };
}

function reduceFailureMark(
  ledger: MirrorProjectSyncLedger | null | undefined,
  transition: Extract<
    MirrorProjectLedgerTransition,
    { kind: "mark-project-pending" | "mark-project-safety-blocked" }
  >,
): ProjectLedgerReduction {
  const state =
    transition.kind === "mark-project-pending" ? "pending" : "safety-blocked";
  if (transition.project.length === 0) {
    return invalid(`mark-project-${state}: project must be non-empty`);
  }
  const previous =
    (ledger?.projects ?? []).find(
      (entry) => entry.project === transition.project,
    ) ?? EMPTY_PROJECT_HISTORY;
  return writeProjectEntry(ledger, {
    project: transition.project,
    projectId: transition.projectId ?? previous.projectId,
    itemId: transition.itemId ?? previous.itemId,
    phaseField: previous.phaseField,
    lastAppliedStatus: previous.lastAppliedStatus,
    state,
    updatedAt: transition.updatedAt,
  });
}

export function reduceProjectLedger(
  ledger: MirrorProjectSyncLedger | null | undefined,
  transition: MirrorProjectLedgerTransition,
): ProjectLedgerReduction {
  switch (transition.kind) {
    case "upsert-project-entry":
      return reduceUpsert(ledger, transition);
    case "prune-project-entries":
      return reducePrune(ledger, transition);
    case "mark-project-pending":
    case "mark-project-safety-blocked":
      return reduceFailureMark(ledger, transition);
  }
}
