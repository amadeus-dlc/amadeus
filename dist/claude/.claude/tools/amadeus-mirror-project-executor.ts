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
import { DEFAULT_PROJECT_PHASE_FIELD } from "./amadeus-mirror-project-contract.ts";
import type { MirrorTransition } from "./amadeus-mirror-state-reducer.ts";
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
} from "./amadeus-mirror-types.ts";

export type ProjectTransition = Extract<
  MirrorTransition,
  {
    kind:
      | "set-global-warning"
      | "upsert-project-entry"
      | "mark-project-pending"
      | "mark-project-safety-blocked";
  }
>;

export type ProjectTransitionPort = Readonly<{
  apply: (
    transition: ProjectTransition,
    classification?: MirrorFailureClass,
  ) => void;
}>;

function projectDiagnostic(
  context: MirrorExecutionContext,
  diagnostic: MirrorProjectDiagnostic,
): void {
  context.projectSync?.diagnostic?.(diagnostic);
}

function canonicalProject(target: MirrorProjectTarget): string {
  return `${target.project.owner}/${target.project.number}`;
}

// A single unsynchronized warning, not attached to any operation receipt: the
// Issue operation itself succeeded, so its receipt must stay `succeeded`.
function persistUnsyncedWarning(
  transitions: ProjectTransitionPort,
  context: MirrorExecutionContext,
  classification: MirrorFailureClass,
  summary: string,
): void {
  transitions.apply(
    {
      kind: "set-global-warning",
      warning: {
        operationId: null,
        operation: null,
        classification,
        summary,
        occurredAt: context.now(),
        retryable: false,
        effect: "not-started",
        source: "current-invocation",
      },
    },
    classification,
  );
}

function upsertProjectEntry(
  transitions: ProjectTransitionPort,
  entry: MirrorProjectSyncEntry,
): void {
  transitions.apply({
    kind: "upsert-project-entry",
    entry,
  });
}

// Record the verdict for one Project that did not converge this round.
function markProjectFailure(
  transitions: ProjectTransitionPort,
  context: MirrorExecutionContext,
  project: string,
  identity: Readonly<{ projectId: string | null; itemId: string | null }>,
  classification: MirrorFailureClass,
): ProjectVerdict {
  const state = classifyProjectFailure(classification);
  transitions.apply({
    kind:
      state === "pending"
        ? "mark-project-pending"
        : "mark-project-safety-blocked",
    project,
    projectId: identity.projectId,
    itemId: identity.itemId,
    updatedAt: context.now(),
  });
  return { state, classification };
}

// What one Project's reconciliation settled on. A non-synced verdict keeps the
// classification that produced it so the caller can report the real failure.
type ProjectVerdict =
  | {
      state: Extract<MirrorProjectSyncState, "synced">;
      classification?: undefined;
    }
  | {
      state: Extract<MirrorProjectSyncState, "pending" | "safety-blocked">;
      classification: MirrorFailureClass;
    };

function findProjectItem(
  view: MirrorProjectItemsView,
  target: MirrorProjectTarget,
) {
  return view.items.find(
    (item) =>
      item.projectNumber === target.project.number &&
      item.projectOwner === target.project.owner,
  );
}

type MembershipResolution =
  | {
      kind: "member";
      itemId: string;
      singleSelectValuesByFieldId: Readonly<Record<string, string>>;
    }
  | { kind: "failed"; classification: MirrorFailureClass };

// Resolve the Issue's item on this Project, adding it when absent. Only a
// configured target may be joined: a Project the Issue merely already belongs
// to is synced where it sits and never recruited. A freshly added item has no
// single-select value yet, so its current value map is empty rather than
// assumed.
// Exported as an in-process seam: the unconfigured non-member branch below is
// unreachable through syncProjects (reconcileTargets only admits unconfigured
// targets that appear in the items view), so tests drive it directly.
export async function resolveMembership(
  context: MirrorExecutionContext,
  target: MirrorProjectTarget,
  view: MirrorProjectItemsView,
  fields: MirrorResolvedProjectFields,
  configured: boolean,
): Promise<MembershipResolution> {
  const existing = findProjectItem(view, target);
  if (existing) {
    return {
      kind: "member",
      itemId: existing.itemId,
      singleSelectValuesByFieldId: existing.singleSelectValuesByFieldId,
    };
  }
  if (!configured) {
    // Unreachable in practice — a Project only enters the loop unconfigured
    // because the Issue is already an item of it — but classified rather than
    // assumed away.
    projectDiagnostic(context, {
      project: canonicalProject(target),
      reason: "add-failed",
      expectedStatus: null,
      availableOptions: [],
      summary:
        "the Issue is not an item of this Project and the Project is not configured, so it is not joined",
    });
    return { kind: "failed", classification: "configuration" };
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
      project: canonicalProject(target),
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
  transitions: ProjectTransitionPort,
  context: MirrorExecutionContext,
  target: MirrorProjectTarget,
  view: MirrorProjectItemsView,
  snapshot: MirrorSnapshot,
  configured: boolean,
): Promise<ProjectVerdict> {
  const project = canonicalProject(target);
  const known = findProjectItem(view, target);
  const identity = {
    projectId: known?.projectId ?? null,
    itemId: known?.itemId ?? null,
  };
  const fail = (classification: MirrorFailureClass): ProjectVerdict =>
    markProjectFailure(
      transitions,
      context,
      project,
      identity,
      classification,
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
    configured,
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

  upsertProjectEntry(transitions, {
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
    updatedAt: context.now(),
  });
  return { state: "synced" };
}

// The Projects to reconcile this round: everything the Issue already belongs
// to, plus every configured target. A configured target supplies its own status
// vocabulary; a Project known only from membership takes the defaults.
function reconcileTargets(
  configured: readonly MirrorProjectTarget[],
  view: MirrorProjectItemsView,
): Array<Readonly<{ target: MirrorProjectTarget; configured: boolean }>> {
  const out = configured.map((target) => ({ target, configured: true }));
  const seen = new Set(configured.map(canonicalProject));
  for (const item of view.items) {
    const target: MirrorProjectTarget = {
      project: { owner: item.projectOwner, number: item.projectNumber },
      phaseField: DEFAULT_PROJECT_PHASE_FIELD,
      statusNames: {},
    };
    const key = canonicalProject(target);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ target, configured: false });
  }
  return out;
}

// The board-wide verdict. `unsettled` carries the classification of the first
// Project that did not converge, so the operation warning reports a failure
// that actually happened rather than a synthesized one.
export type ProjectReconcileResult =
  | { kind: "converged" }
  | {
      kind: "unsettled";
      classification: MirrorFailureClass;
      unsettled: number;
    };

// Reconcile every in-scope Project and report whether the board as a whole
// converged. `unsettled` means at least one row is pending or safety-blocked,
// which is what parks the operation receipt.
export async function syncProjects(
  transitions: ProjectTransitionPort,
  context: MirrorExecutionContext,
  issueNumber: number,
): Promise<ProjectReconcileResult> {
  const config = context.projectSync;
  if (config === undefined || config.targets.length === 0) {
    return { kind: "converged" };
  }
  const targets = config.targets;
  const view = await context.gateway.listProjectItems({
    repository: context.repository,
    number: issueNumber,
  });
  if (view.kind === "failure") {
    projectDiagnostic(context, {
      project: targets.map(canonicalProject).join(", "),
      reason: "membership-query-failed",
      expectedStatus: null,
      availableOptions: [],
      summary: `Project membership could not be read: ${view.summary}`,
    });
    persistUnsyncedWarning(
      transitions,
      context,
      view.classification,
      `Project status is unsynchronized: ${view.summary}`,
    );
    // Membership is the one read the whole loop depends on, so its failure
    // classifies every configured Project at once.
    for (const target of targets) {
      markProjectFailure(
        transitions,
        context,
        canonicalProject(target),
        { projectId: null, itemId: null },
        view.classification,
      );
    }
    return {
      kind: "unsettled",
      classification: view.classification,
      unsettled: targets.length,
    };
  }
  let first: MirrorFailureClass | null = null;
  let unsettled = 0;
  for (const each of reconcileTargets(targets, view.value)) {
    const verdict = await syncOneProject(
      transitions,
      context,
      each.target,
      view.value,
      config.snapshot,
      each.configured,
    );
    if (verdict.state === "synced") continue;
    unsettled += 1;
    first = first ?? verdict.classification;
  }
  if (first === null) return { kind: "converged" };
  return { kind: "unsettled", classification: first, unsettled };
}
