// amadeus-mirror-labels.ts — Intent Mirror in-progress label sync (#1990).
//
// Rides the mirror lifecycle boundaries that already reach GitHub: the intent
// start boundaries add the `in-progress` label to the intent's related issues
// (the `#N` references in the first-class `Project` state field) plus the
// linked mirror issue, and the workflow-completed boundary removes it again.
// Closing related issues stays with the Bolt PR `Closes #N` convention — this
// module never closes anything.
//
// Contract (user ruling 2026-08-02 on #1990):
//   - attach at intent start (earliest boundary), so a labelled issue is never
//     mistakenly dispatched to another agent;
//   - scope = mirror issue + related issues;
//   - fail-open: a label failure warns loudly and never blocks the workflow.

import { getField } from "./amadeus-lib.ts";
import type {
  GatewayOutcome,
  MirrorBoundary,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";

export const IN_PROGRESS_LABEL = "in-progress";

// The label mutations one boundary wants, as issue numbers. Pure data so the
// planning layer stays deterministic and directly testable.
export type MirrorLabelSyncPlan = Readonly<{
  add: readonly number[];
  remove: readonly number[];
}>;

export type MirrorLabelSyncFailure = Readonly<{
  issue: number;
  operation: "add" | "remove";
  label: string;
  detail: string;
}>;

export type MirrorLabelSyncReport = Readonly<{
  attempted: number;
  failures: readonly MirrorLabelSyncFailure[];
}>;

// Narrow, mirror-permit-free seam: label sync touches issues OUTSIDE the
// mirror link (related issues), so it deliberately does not share the
// permit-gated MirrorGitHubGateway mutation surface.
export interface MirrorLabelGateway {
  addIssueLabels(
    repository: RepositoryIdentity,
    issueNumber: number,
    labels: readonly string[],
  ): Promise<GatewayOutcome<void>>;
  removeIssueLabel(
    repository: RepositoryIdentity,
    issueNumber: number,
    label: string,
  ): Promise<GatewayOutcome<void>>;
  // Distinguishes a `#N` reference that is actually a pull request (#2020):
  // the Project field's PR-number-appended-after-issue-approval convention
  // means a later re-fire of an attach boundary could otherwise mislabel a
  // PR as an in-progress issue. Read-only and advisory — a failed check
  // resolves to "proceed with the add" (see runMirrorLabelSync), preserving
  // the module's overall fail-open contract.
  isPullRequest(
    repository: RepositoryIdentity,
    issueNumber: number,
  ): Promise<GatewayOutcome<boolean>>;
}

// Every unique `#N` in the `Project` state field, in first-appearance order.
export function relatedIssueNumbers(stateContent: string): number[] {
  const project = getField(stateContent, "Project");
  if (project === null) return [];
  const refs = project.match(/#(\d+)/g) ?? [];
  return [...new Set(refs.map((ref) => Number.parseInt(ref.slice(1), 10)))];
}

const ATTACH_BOUNDARIES: ReadonlySet<MirrorBoundary["kind"]> = new Set([
  "intent-initialized",
  "intent-capture-approved",
]);

export function mirrorLabelSyncPlan(
  boundaryKind: MirrorBoundary["kind"],
  stateContent: string,
  mirrorIssueNumber: number | null,
): MirrorLabelSyncPlan {
  const attach = ATTACH_BOUNDARIES.has(boundaryKind);
  const detach = boundaryKind === "workflow-completed";
  if (!attach && !detach) return { add: [], remove: [] };
  const targets = relatedIssueNumbers(stateContent);
  if (mirrorIssueNumber !== null && !targets.includes(mirrorIssueNumber)) {
    targets.push(mirrorIssueNumber);
  }
  return attach ? { add: targets, remove: [] } : { add: [], remove: targets };
}

export async function runMirrorLabelSync(
  plan: MirrorLabelSyncPlan,
  repository: RepositoryIdentity,
  gateway: MirrorLabelGateway,
): Promise<MirrorLabelSyncReport> {
  const failures: MirrorLabelSyncFailure[] = [];
  let attempted = 0;
  for (const issue of plan.add) {
    // #2020: skip a target the gateway positively confirms is a pull request
    // rather than an issue — never mislabel it. A failed/inconclusive check
    // falls through to the add, matching this module's fail-open contract.
    const prCheck = await gateway.isPullRequest(repository, issue);
    if (prCheck.kind === "ok" && prCheck.value) continue;
    attempted += 1;
    const outcome = await gateway.addIssueLabels(repository, issue, [IN_PROGRESS_LABEL]);
    if (outcome.kind === "failure") {
      failures.push({ issue, operation: "add", label: IN_PROGRESS_LABEL, detail: outcome.summary });
    }
  }
  for (const issue of plan.remove) {
    attempted += 1;
    const outcome = await gateway.removeIssueLabel(repository, issue, IN_PROGRESS_LABEL);
    if (outcome.kind === "failure") {
      failures.push({ issue, operation: "remove", label: IN_PROGRESS_LABEL, detail: outcome.summary });
    }
  }
  return { attempted, failures };
}
