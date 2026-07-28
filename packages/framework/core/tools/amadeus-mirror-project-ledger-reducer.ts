// amadeus-mirror-project-ledger-reducer.ts — pure Project ledger transitions.
//
// Owns the keyed ledger semantics independently from the receipt/warning state
// machine. The parent state reducer remains responsible for transaction-wide
// concerns such as clearing the audit outbox.

import type {
  MirrorProjectSyncEntry,
  MirrorProjectSyncLedger,
} from "./amadeus-mirror-types.ts";

// A failure row deliberately carries no `lastAppliedStatus`: a later failure
// preserves the last successfully applied field and column rather than
// rewriting history it could not observe.
type ProjectFailureRow = Readonly<{
  project: string;
  projectId: string | null;
  itemId: string | null;
  updatedAt: string;
}>;

type ProjectFailureTransition =
  | ({ kind: "mark-project-pending" } & ProjectFailureRow)
  | ({ kind: "mark-project-safety-blocked" } & ProjectFailureRow);

export type MirrorProjectLedgerRowTransition =
  | { kind: "upsert-project-entry"; entry: MirrorProjectSyncEntry }
  | ProjectFailureTransition;

// One reconciliation round is immutable evidence: the authoritative Project
// scope and exactly one verdict for each Project, in the same order. The state
// reducer folds the complete plan before it commits any ledger bytes.
export type MirrorProjectLedgerPlan = Readonly<{
  activeProjects: readonly string[];
  rows: readonly MirrorProjectLedgerRowTransition[];
}>;

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
  transition: Extract<MirrorProjectLedgerRowTransition, { kind: "upsert-project-entry" }>,
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
  activeProjects: readonly string[],
): ProjectLedgerReduction {
  const existing = ledger?.projects ?? [];
  const active = new Set(activeProjects);
  const projects = existing.filter((entry) => active.has(entry.project));
  return projects.length === existing.length
    ? { kind: "unchanged" }
    : { kind: "changed", ledger: projects.length === 0 ? null : { projects } };
}

function reduceFailureMark(
  ledger: MirrorProjectSyncLedger | null | undefined,
  transition: ProjectFailureTransition,
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

function reduceProjectLedgerRow(
  ledger: MirrorProjectSyncLedger | null | undefined,
  transition: MirrorProjectLedgerRowTransition,
): ProjectLedgerReduction {
  switch (transition.kind) {
    case "upsert-project-entry":
      return reduceUpsert(ledger, transition);
    case "mark-project-pending":
    case "mark-project-safety-blocked":
      return reduceFailureMark(ledger, transition);
  }
}

function rowProject(row: MirrorProjectLedgerRowTransition): string {
  return row.kind === "upsert-project-entry"
    ? row.entry.project
    : row.project;
}

function validateProjectLedgerPlan(
  plan: MirrorProjectLedgerPlan,
): ProjectLedgerReduction | null {
  if (plan.activeProjects.length === 0) {
    return invalid(
      "project-ledger-plan: activeProjects must not be empty",
    );
  }
  if (plan.activeProjects.some((project) => project.length === 0)) {
    return invalid(
      "project-ledger-plan: active Project must be non-empty",
    );
  }
  if (new Set(plan.activeProjects).size !== plan.activeProjects.length) {
    return invalid(
      "project-ledger-plan: activeProjects must not contain duplicates",
    );
  }
  if (plan.rows.length !== plan.activeProjects.length) {
    return invalid(
      "project-ledger-plan: requires one row per active Project",
    );
  }
  for (let index = 0; index < plan.rows.length; index += 1) {
    const row = plan.rows[index];
    if (rowProject(row) !== plan.activeProjects[index]) {
      return invalid(
        "project-ledger-plan: row order must match activeProjects",
      );
    }
    if (
      row.kind === "upsert-project-entry" &&
      row.entry.state !== "synced"
    ) {
      return invalid(
        "project-ledger-plan: upsert rows must be synced",
      );
    }
  }
  return null;
}

export function projectLedgerPlanIsConverged(
  plan: MirrorProjectLedgerPlan,
): boolean {
  return (
    plan.rows.length > 0 &&
    plan.rows.every(
      (row) =>
        row.kind === "upsert-project-entry" &&
        row.entry.state === "synced",
    )
  );
}

export function reduceProjectLedgerPlan(
  ledger: MirrorProjectSyncLedger | null | undefined,
  plan: MirrorProjectLedgerPlan,
): ProjectLedgerReduction {
  const invalidPlan = validateProjectLedgerPlan(plan);
  if (invalidPlan) return invalidPlan;

  let current = ledger ?? null;
  let changedLedger = false;
  const pruned = reducePrune(current, plan.activeProjects);
  if (pruned.kind === "invalid") return pruned;
  if (pruned.kind === "changed") {
    current = pruned.ledger;
    changedLedger = true;
  }
  for (const row of plan.rows) {
    const result = reduceProjectLedgerRow(current, row);
    if (result.kind === "invalid") return result;
    if (result.kind === "changed") {
      current = result.ledger;
      changedLedger = true;
    }
  }
  if (current !== null) {
    const entries = new Map(
      current.projects.map((entry) => [entry.project, entry]),
    );
    const ordered = plan.activeProjects.flatMap((project) => {
      const entry = entries.get(project);
      return entry === undefined ? [] : [entry];
    });
    if (
      ordered.some(
        (entry, index) => current?.projects[index]?.project !== entry.project,
      )
    ) {
      current = { projects: ordered };
      changedLedger = true;
    }
  }
  return changedLedger
    ? { kind: "changed", ledger: current }
    : { kind: "unchanged" };
}
