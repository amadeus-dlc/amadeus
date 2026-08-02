// amadeus-mirror-project-diagnostics.ts — read-only Project repair diagnostics.
//
// This module owns the Project-specific observation model used by
// `mirror repair status`. It never mutates a Project or the local ledger.

import { resolveAmadeusConfig } from "./amadeus-config.ts";
import {
  expectedProjectStatus,
  selectProjectStatusOption,
} from "./amadeus-mirror-policy.ts";
import {
  DEFAULT_PROJECT_PHASE_FIELD,
  mirrorProjectKey,
  normalizeMirrorProjectIdentity,
} from "./amadeus-mirror-project-contract.ts";
import type {
  MirrorFailureClass,
  MirrorGitHubGateway,
  MirrorProjectItem,
  MirrorProjectRef,
  MirrorProjectSyncEntry,
  MirrorProjectTarget,
  MirrorSnapshot,
  MirrorStateSnapshot,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";

// One read-only observation about one Project board. `expectedStatus` is the
// lifecycle option the sync policy names and is null when the board must stay
// untouched. Fixed summaries contain only known Project and field names.
export type MirrorRepairProjectDiagnostic = Readonly<{
  project: string;
  membership: "member" | "not-member";
  currentStatus: string | null;
  expectedStatus: string | null;
  drift: boolean;
  resolution:
    "resolved" | "field-missing" | "option-missing" | "permission-denied";
  availableOptions?: readonly string[];
  summary: string;
}>;

export type MirrorProjectReadGateway = Pick<
  MirrorGitHubGateway,
  "listProjectItems" | "resolveProjectFields"
>;

export type MirrorProjectDiagnosticTarget = Readonly<{
  projectDir: string;
  space: string;
  intentDir: string;
  repository: RepositoryIdentity;
  gateway: MirrorProjectReadGateway;
  snapshot: MirrorSnapshot | null;
}>;

// Diagnose configured boards, ledger-known boards, and current memberships.
// A board discovered outside configuration uses the default lifecycle field.
function diagnosticTargets(
  configured: readonly MirrorProjectTarget[],
  ledger: readonly MirrorProjectSyncEntry[],
  items: readonly MirrorProjectItem[],
): MirrorProjectTarget[] {
  const byProject = new Map<string, MirrorProjectTarget>();
  for (const target of configured) {
    byProject.set(mirrorProjectKey(target.project), {
      ...target,
      project: normalizeMirrorProjectIdentity(target.project),
    });
  }
  const addBare = (
    project: MirrorProjectRef,
    phaseField: string = DEFAULT_PROJECT_PHASE_FIELD,
  ): void => {
    const normalized = normalizeMirrorProjectIdentity(project);
    const key = mirrorProjectKey(normalized);
    if (!byProject.has(key)) {
      byProject.set(key, {
        project: normalized,
        phaseField,
        statusNames: {},
      });
    }
  };
  for (const entry of ledger) {
    const parts = entry.project.split("/");
    const number = Number(parts[1]);
    if (parts.length === 2 && Number.isSafeInteger(number)) {
      addBare(
        { owner: parts[0], number },
        entry.phaseField ?? DEFAULT_PROJECT_PHASE_FIELD,
      );
    }
  }
  for (const item of items) {
    addBare({ owner: item.projectOwner, number: item.projectNumber });
  }
  return [...byProject.values()].sort((left, right) =>
    mirrorProjectKey(left.project).localeCompare(
      mirrorProjectKey(right.project),
    ),
  );
}

function unreachableResolution(
  classification: MirrorFailureClass,
): "field-missing" | "permission-denied" {
  return classification === "permission" || classification === "unauthenticated"
    ? "permission-denied"
    : "field-missing";
}

type RepairSummaryRow = Readonly<{
  membership: "member" | "not-member";
  currentStatus: string | null;
  expectedStatus: string | null;
  drift: boolean;
}>;

function resolvedSummary(row: RepairSummaryRow): string {
  if (row.expectedStatus === null) {
    return "no column is expected right now, so this board is left exactly as it is.";
  }
  if (row.membership === "not-member") {
    return `the Issue is not on this board; the column it would take is "${row.expectedStatus}".`;
  }
  if (!row.drift) return `this board is already in "${row.expectedStatus}".`;
  return `this board is in ${
    row.currentStatus === null ? "no column" : `"${row.currentStatus}"`
  } but the workflow expects "${row.expectedStatus}".`;
}

function optionMissingSummary(
  project: string,
  phaseField: string,
  expected: string,
): string {
  return (
    `${project} declares no "${phaseField}" option named exactly "${expected}" ` +
    "(the match is exact — case and spacing included). Either add that option to " +
    "the board, or map this phase onto one of the options it already has with a " +
    "`status-names` override for this Project in `mirror-projects`."
  );
}

function permissionDeniedSummary(project: string, phaseField: string): string {
  return (
    `the GitHub credential in use cannot read the "${phaseField}" field of ${project}; ` +
    "reading and setting a Project column requires the `project` scope. " +
    "Grant that scope to the credential and run `repair status` again."
  );
}

function fieldMissingSummary(project: string, phaseField: string): string {
  const missing =
    `the "${phaseField}" field of ${project} could not be resolved, so no column can be compared or applied.`;
  const repair =
    `Confirm the Project exists and carries a single-select field named "${phaseField}".`;
  return `${missing} ${repair}`;
}

async function diagnoseProject(
  target: MirrorProjectDiagnosticTarget,
  snapshot: MirrorSnapshot,
  project: MirrorProjectTarget,
  items: readonly MirrorProjectItem[],
): Promise<MirrorRepairProjectDiagnostic> {
  const canonical = mirrorProjectKey(project.project);
  const item = items.find(
    (candidate) =>
      mirrorProjectKey({
        owner: candidate.projectOwner,
        number: candidate.projectNumber,
      }) === canonical,
  );
  const expected = expectedProjectStatus(
    snapshot,
    "manual",
    project.statusNames,
  );
  const expectedStatus = expected.kind === "status" ? expected.name : null;
  const membership: MirrorRepairProjectDiagnostic["membership"] =
    item === undefined ? "not-member" : "member";
  const unresolvedBase = {
    project: canonical,
    membership,
    currentStatus: null,
    expectedStatus,
    drift: false,
  };

  const field = await target.gateway.resolveProjectFields(
    project.project,
    project.phaseField,
  );
  if (field.kind === "failure") {
    const resolution = unreachableResolution(field.classification);
    return {
      ...unresolvedBase,
      resolution,
      summary:
        resolution === "permission-denied"
          ? permissionDeniedSummary(canonical, project.phaseField)
          : fieldMissingSummary(canonical, project.phaseField),
    };
  }
  const currentStatus =
    item?.singleSelectValuesByFieldId[field.value.lifecycle.fieldId] ?? null;
  const base = {
    ...unresolvedBase,
    currentStatus,
    drift: expectedStatus !== null && currentStatus !== expectedStatus,
  };
  if (
    expected.kind === "status" &&
    selectProjectStatusOption(field.value.lifecycle, expected.name) === null
  ) {
    return {
      ...base,
      resolution: "option-missing",
      availableOptions: field.value.lifecycle.options.map(
        (option) => option.name,
      ),
      summary: optionMissingSummary(
        canonical,
        field.value.lifecycle.fieldName,
        expected.name,
      ),
    };
  }
  return { ...base, resolution: "resolved", summary: resolvedSummary(base) };
}

const PROJECT_DIAGNOSTIC_CONCURRENCY = 2;

// Project reads are independent, but an Intent may reference many boards.
// A fixed worker pool avoids both serial latency and an unbounded GraphQL burst.
// Each worker claims its index before awaiting, then writes back to that index,
// so completion order never changes the stable diagnostic target order.
async function diagnoseProjects(
  target: MirrorProjectDiagnosticTarget,
  snapshot: MirrorSnapshot,
  projects: readonly MirrorProjectTarget[],
  items: readonly MirrorProjectItem[],
): Promise<MirrorRepairProjectDiagnostic[]> {
  const rows = new Array<MirrorRepairProjectDiagnostic>(projects.length);
  let nextIndex = 0;
  const runWorker = async (): Promise<void> => {
    while (nextIndex < projects.length) {
      const index = nextIndex;
      nextIndex += 1;
      rows[index] = await diagnoseProject(
        target,
        snapshot,
        projects[index],
        items,
      );
    }
  };
  const workerCount = Math.min(
    PROJECT_DIAGNOSTIC_CONCURRENCY,
    projects.length,
  );
  await Promise.all(
    Array.from({ length: workerCount }, () => runWorker()),
  );
  return rows;
}

export async function diagnoseMirrorProjects(
  target: MirrorProjectDiagnosticTarget,
  state: MirrorStateSnapshot,
): Promise<readonly MirrorRepairProjectDiagnostic[]> {
  const config = resolveAmadeusConfig(
    target.projectDir,
    target.intentDir,
    target.space,
  );
  const configured = config.kind === "resolved" ? config.config.projects : [];
  const ledger = state.projectSync?.projects ?? [];
  if (configured.length === 0 && ledger.length === 0) return [];
  if (state.issueNumber === null || target.snapshot === null) return [];

  const view = await target.gateway.listProjectItems({
    repository: target.repository,
    number: state.issueNumber,
  });
  const items = view.kind === "ok" ? view.value.items : [];
  if (view.kind === "failure") {
    const resolution = unreachableResolution(view.classification);
    return diagnosticTargets(configured, ledger, []).map((project) => {
      const canonical = mirrorProjectKey(project.project);
      return {
        project: canonical,
        membership: "not-member" as const,
        currentStatus: null,
        expectedStatus: null,
        drift: false,
        resolution,
        summary:
          resolution === "permission-denied"
            ? permissionDeniedSummary(canonical, project.phaseField)
            : `the Issue's Project memberships could not be read, so nothing about ${canonical} could be observed.`,
      };
    });
  }

  return diagnoseProjects(
    target,
    target.snapshot,
    diagnosticTargets(configured, ledger, items),
    items,
  );
}
