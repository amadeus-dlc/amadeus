// amadeus-mirror-project-executor.ts — Project status reconciliation.
//
// Runs after the Issue body mutation has already succeeded, inside the same
// chain. The Issue outcome is never rolled back: the remote Issue landed, and
// `issueNumber` / `provenance` are recorded before this step runs, so a Project
// failure can never strand a created Issue unlinked. The operation *receipt*,
// however, is parked at `pending` while the board has not converged — a hold
// with its own reason field, not a claim that the Issue mutation failed
// (E-U2CG). That keeps the operation IN_PROGRESS so the next boundary retries
// it, and deliberately never writes `safety-blocked` onto the receipt, since
// that status is terminal in the completion policy and would stop the mirror
// permanently over a board this tool cannot reach.
//
// The loop reconciles the union of the Projects the Issue already belongs to
// and the Projects configuration targets. Membership is synced everywhere we
// have access; only configured targets may have the Issue *added* to them.
// Each Project is independent: one Project's failure classifies that row and
// the loop moves on. Classification is unconditional — the next ledger state is
// a function of this round's result alone, never of the row's current state.

import { createMirrorProjectMutationPermit } from "./amadeus-mirror-capability.ts";
import {
  classifyProjectFailure,
  expectedProjectFieldValues,
  selectProjectStatusOption,
} from "./amadeus-mirror-policy.ts";
import {
  DEFAULT_PROJECT_PHASE_FIELD,
  mirrorProjectKey,
  normalizeMirrorProjectIdentity,
} from "./amadeus-mirror-project-contract.ts";
import type {
  MirrorProjectLedgerPlan,
  MirrorProjectLedgerRowTransition,
} from "./amadeus-mirror-project-ledger-reducer.ts";
import type {
  ExpectedProjectStatus,
  MirrorExecutionContext,
  MirrorFailureClass,
  MirrorProjectDiagnostic,
  MirrorProjectItemsView,
  MirrorProjectSyncEntry,
  MirrorProjectSyncState,
  MirrorProjectTarget,
  MirrorResolvedProjectFields,
  MirrorSnapshot,
  MirrorWarning,
} from "./amadeus-mirror-types.ts";

function projectDiagnostic(
  context: MirrorExecutionContext,
  diagnostic: MirrorProjectDiagnostic,
): void {
  context.projectSync?.diagnostic?.(diagnostic);
}

// A single unsynchronized warning, not attached to any operation receipt: the
// durable Project hold already keeps the operation receipt pending. This
// board-wide warning adds operator visibility without pretending the Issue
// mutation itself failed.
function unsyncedWarning(
  classification: MirrorFailureClass,
  summary: string,
  occurredAt: string,
): MirrorWarning {
  return {
    operationId: null,
    operation: null,
    classification,
    summary,
    occurredAt,
    retryable: false,
    effect: "not-started",
    source: "current-invocation",
  };
}

// Record the verdict for one Project that did not converge this round.
function markProjectFailure(
  project: string,
  identity: Readonly<{ projectId: string | null; itemId: string | null }>,
  classification: MirrorFailureClass,
  updatedAt: string,
): ProjectVerdict {
  const state = classifyProjectFailure(classification);
  return {
    state,
    classification,
    row: {
      kind:
        state === "pending"
          ? "mark-project-pending"
          : "mark-project-safety-blocked",
      project,
      projectId: identity.projectId,
      itemId: identity.itemId,
      updatedAt,
    },
  };
}

// What one Project's reconciliation settled on. A non-synced verdict keeps the
// classification that produced it so the caller can report the real failure.
type ProjectVerdict =
  | {
      state: Extract<MirrorProjectSyncState, "synced">;
      classification?: undefined;
      row: MirrorProjectLedgerRowTransition;
    }
  | {
      state: Extract<MirrorProjectSyncState, "pending" | "safety-blocked">;
      classification: MirrorFailureClass;
      row: MirrorProjectLedgerRowTransition;
    };

function findProjectItem(
  view: MirrorProjectItemsView,
  target: MirrorProjectTarget,
) {
  const targetKey = mirrorProjectKey(target.project);
  return view.items.find(
    (item) =>
      mirrorProjectKey({
        owner: item.projectOwner,
        number: item.projectNumber,
      }) === targetKey,
  );
}

type MembershipResolution =
  | {
      kind: "member";
      itemId: string;
      singleSelectValuesByFieldId: Readonly<Record<string, string>>;
    }
  | { kind: "failed"; classification: MirrorFailureClass };

// Resolve the Issue's item on a configured Project, adding it when absent. A
// membership-only Project never reaches this absent branch: reconcileTargets
// creates such targets exclusively from items already present in this view.
// A freshly added item has no single-select value yet, so its current value map
// is empty rather than assumed.
async function resolveMembership(
  context: MirrorExecutionContext,
  target: MirrorProjectTarget,
  view: MirrorProjectItemsView,
  fields: MirrorResolvedProjectFields,
): Promise<MembershipResolution> {
  const existing = findProjectItem(view, target);
  if (existing) {
    return {
      kind: "member",
      itemId: existing.itemId,
      singleSelectValuesByFieldId: existing.singleSelectValuesByFieldId,
    };
  }
  const permit = createMirrorProjectMutationPermit({
    event: context.event,
    repository: context.repository,
    mutation: "add-project-item",
    project: target.project,
  });
  const added = await context.gateway.addProjectItem(
    permit,
    fields.projectId,
    view.issueNodeId,
  );
  if (added.kind === "failure") {
    projectDiagnostic(context, {
      project: mirrorProjectKey(target.project),
      reason: "add-failed",
      expectedStatus: null,
      availableOptions: [],
      summary: `could not add the Issue to the Project: ${added.summary}`,
    });
    return { kind: "failed", classification: added.classification };
  }
  return {
    kind: "member",
    itemId: added.value.itemId,
    singleSelectValuesByFieldId: {},
  };
}

async function syncAuxiliaryWorkflowStatus(
  context: MirrorExecutionContext,
  target: MirrorProjectTarget,
  fields: MirrorResolvedProjectFields,
  membership: Extract<MembershipResolution, { kind: "member" }>,
  expected: ExpectedProjectStatus,
): Promise<void> {
  const workflowField = fields.auxiliaryStatus;
  if (
    expected.kind === "keep" ||
    workflowField === null ||
    workflowField.fieldId === fields.lifecycle.fieldId ||
    membership.singleSelectValuesByFieldId[workflowField.fieldId] ===
      expected.name
  ) {
    return;
  }
  const option = selectProjectStatusOption(workflowField, expected.name);
  if (option === null) return;
  const permit = createMirrorProjectMutationPermit({
    event: context.event,
    repository: context.repository,
    mutation: "update-project-item-field",
    project: target.project,
  });
  await context.gateway.updateProjectItemSingleSelectField(
    permit,
    fields.projectId,
    membership.itemId,
    workflowField.fieldId,
    option.id,
  );
}

async function syncOneProject(
  context: MirrorExecutionContext,
  target: MirrorProjectTarget,
  view: MirrorProjectItemsView,
  snapshot: MirrorSnapshot,
  updatedAt: string,
): Promise<ProjectVerdict> {
  const project = mirrorProjectKey(target.project);
  const known = findProjectItem(view, target);
  const identity = {
    projectId: known?.projectId ?? null,
    itemId: known?.itemId ?? null,
  };
  const fail = (classification: MirrorFailureClass): ProjectVerdict =>
    markProjectFailure(
      project,
      identity,
      classification,
      updatedAt,
    );

  const resolved = await context.gateway.resolveProjectFields(
    target.project,
    target.phaseField,
  );
  if (resolved.kind === "failure") {
    projectDiagnostic(context, {
      project,
      reason: "project-unresolved",
      expectedStatus: null,
      availableOptions: [],
      summary: `the Project or its "${target.phaseField}" field could not be resolved: ${resolved.summary}`,
    });
    return fail(resolved.classification);
  }
  const fields = resolved.value;
  identity.projectId = fields.projectId;
  const membership = await resolveMembership(
    context,
    target,
    view,
    fields,
  );
  if (membership.kind === "failed") return fail(membership.classification);
  identity.itemId = membership.itemId;

  const expected = expectedProjectFieldValues(
    snapshot,
    context.event.boundary.kind,
    target.statusNames,
  );
  if (expected.lifecycle.kind === "status") {
    const option = selectProjectStatusOption(
      fields.lifecycle,
      expected.lifecycle.name,
    );
    if (option === null) {
      projectDiagnostic(context, {
        project,
        reason: "option-missing",
        expectedStatus: expected.lifecycle.name,
        availableOptions: fields.lifecycle.options.map((each) => each.name),
        summary: `the Project "${fields.lifecycle.fieldName}" field has no option named exactly "${expected.lifecycle.name}"`,
      });
      return fail("configuration");
    }

    if (
      membership.singleSelectValuesByFieldId[fields.lifecycle.fieldId] !==
      expected.lifecycle.name
    ) {
      const permit = createMirrorProjectMutationPermit({
        event: context.event,
        repository: context.repository,
        mutation: "update-project-item-field",
        project: target.project,
      });
      const updated = await context.gateway.updateProjectItemSingleSelectField(
        permit,
        fields.projectId,
        membership.itemId,
        fields.lifecycle.fieldId,
        option.id,
      );
      if (updated.kind === "failure") {
        projectDiagnostic(context, {
          project,
          reason: "update-failed",
          expectedStatus: expected.lifecycle.name,
          availableOptions: [],
          summary: `could not set the Project "${fields.lifecycle.fieldName}" field: ${updated.summary}`,
        });
        return fail(updated.classification);
      }
    }
  }

  await syncAuxiliaryWorkflowStatus(
    context,
    target,
    fields,
    membership,
    expected.auxiliaryStatus,
  );

  const entry: MirrorProjectSyncEntry = {
    project,
    projectId: fields.projectId,
    itemId: membership.itemId,
    phaseField: target.phaseField,
    lastAppliedStatus:
      expected.lifecycle.kind === "status"
        ? expected.lifecycle.name
        : (membership.singleSelectValuesByFieldId[
            fields.lifecycle.fieldId
          ] ?? null),
    state: "synced",
    updatedAt,
  };
  return {
    state: "synced",
    row: { kind: "upsert-project-entry", entry },
  };
}

// The Projects to reconcile this round: everything the Issue already belongs
// to, plus every configured target. A configured target supplies its own status
// vocabulary; a Project known only from membership takes the defaults.
function reconcileTargets(
  configured: readonly MirrorProjectTarget[],
  view: MirrorProjectItemsView,
): MirrorProjectTarget[] {
  const out = configured.map((target) => ({
    ...target,
    project: normalizeMirrorProjectIdentity(target.project),
  }));
  const seen = new Set(
    out.map((target) => mirrorProjectKey(target.project)),
  );
  for (const item of view.items) {
    const target: MirrorProjectTarget = {
      project: normalizeMirrorProjectIdentity({
        owner: item.projectOwner,
        number: item.projectNumber,
      }),
      phaseField: DEFAULT_PROJECT_PHASE_FIELD,
      statusNames: {},
    };
    const key = mirrorProjectKey(target.project);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(target);
  }
  return out;
}

// The board-wide verdict. `unsettled` carries the classification of the first
// Project that did not converge, so the operation warning reports a failure
// that actually happened rather than a synthesized one.
export type ProjectReconcileResult =
  | { kind: "not-required" }
  | {
      kind: "converged";
      ledgerPlan: MirrorProjectLedgerPlan;
    }
  | {
      kind: "unsettled";
      classification: MirrorFailureClass;
      unsettled: number;
      ledgerPlan: MirrorProjectLedgerPlan;
      globalWarning?: MirrorWarning;
    };

function recordMembershipFailure(
  context: MirrorExecutionContext,
  targets: readonly MirrorProjectTarget[],
  failure: { classification: MirrorFailureClass; summary: string },
  updatedAt: string,
): ProjectReconcileResult {
  projectDiagnostic(context, {
    project: targets.map((target) => mirrorProjectKey(target.project)).join(", "),
    reason: "membership-query-failed",
    expectedStatus: null,
    availableOptions: [],
    summary: `Project membership could not be read: ${failure.summary}`,
  });
  const globalWarning = unsyncedWarning(
    failure.classification,
    `Project status is unsynchronized: ${failure.summary}`,
    updatedAt,
  );
  // Membership is the one read the whole loop depends on, so its failure
  // classifies every configured Project at once.
  const activeProjects = targets.map((target) =>
    mirrorProjectKey(target.project)
  );
  const rows = activeProjects.map(
    (project) =>
      markProjectFailure(
        project,
        { projectId: null, itemId: null },
        failure.classification,
        updatedAt,
      ).row,
  );
  return {
    kind: "unsettled",
    classification: failure.classification,
    unsettled: targets.length,
    ledgerPlan: { activeProjects, rows },
    globalWarning,
  };
}

// Reconcile every in-scope Project and report whether the board as a whole
// converged. `unsettled` means at least one row is pending or safety-blocked,
// which is what parks the operation receipt.
export async function syncProjects(
  context: MirrorExecutionContext,
  issueNumber: number,
): Promise<ProjectReconcileResult> {
  const config = context.projectSync;
  if (config === undefined || config.targets.length === 0) {
    return { kind: "not-required" };
  }
  const updatedAt = context.now();
  const targets = config.targets;
  const view = await context.gateway.listProjectItems({
    repository: context.repository,
    number: issueNumber,
  });
  if (view.kind === "failure") {
    return recordMembershipFailure(
      context,
      targets,
      view,
      updatedAt,
    );
  }
  const scope = reconcileTargets(targets, view.value);
  const activeProjects = scope.map((target) =>
    mirrorProjectKey(target.project)
  );
  let first: MirrorFailureClass | null = null;
  let unsettled = 0;
  const rows: MirrorProjectLedgerRowTransition[] = [];
  for (const target of scope) {
    const verdict = await syncOneProject(
      context,
      target,
      view.value,
      config.snapshot,
      updatedAt,
    );
    rows.push(verdict.row);
    if (verdict.state === "synced") continue;
    unsettled += 1;
    first = first ?? verdict.classification;
  }
  const ledgerPlan = { activeProjects, rows };
  if (first === null) return { kind: "converged", ledgerPlan };
  return {
    kind: "unsettled",
    classification: first,
    unsettled,
    ledgerPlan,
  };
}
