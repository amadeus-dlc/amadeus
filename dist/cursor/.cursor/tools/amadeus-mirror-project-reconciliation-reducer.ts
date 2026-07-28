// amadeus-mirror-project-reconciliation-reducer.ts — atomic Project evidence.

import {
  type MirrorProjectLedgerPlan,
  projectLedgerPlanIsConverged,
  reduceProjectLedgerPlan,
} from "./amadeus-mirror-project-ledger-reducer.ts";
import { mirrorEventKey } from "./amadeus-mirror-policy.ts";
import type {
  MirrorEventIdentity,
  MirrorFailureClass,
  MirrorMutationEffect,
  MirrorOperationReceipt,
  MirrorProjectSyncHold,
  MirrorStateSnapshot,
  MirrorWarning,
} from "./amadeus-mirror-types.ts";
import {
  upsertMirrorWarning,
  warningCoalesceFacts,
} from "./amadeus-mirror-warning-reducer.ts";

export type CommitProjectReconciliationTransition = Readonly<{
  kind: "commit-project-reconciliation";
  event: MirrorEventIdentity;
  operationId: string;
  heldAt: string;
  ledgerPlan: MirrorProjectLedgerPlan;
  globalWarning?: MirrorWarning;
}>;

type HoldForProjectSyncTransition = Readonly<{
  kind: "hold-for-project-sync";
  event: MirrorEventIdentity;
  operationId: string;
  heldAt: string;
}>;

type RetireProjectSyncHoldTransition = Readonly<{
  kind: "retire-project-sync-hold";
  event: MirrorEventIdentity;
  operationId: string;
}>;

export type ProjectSyncTransition =
  | CommitProjectReconciliationTransition
  | HoldForProjectSyncTransition
  | RetireProjectSyncHoldTransition;

export type ProjectReconciliationReduction =
  | {
      kind: "changed";
      snapshot: MirrorStateSnapshot;
      auditFacts?: Readonly<Record<string, string>>;
    }
  | { kind: "unchanged" }
  | { kind: "invalid"; issues: readonly string[] };

function invalid(issue: string): ProjectReconciliationReduction {
  return { kind: "invalid", issues: [issue] };
}

function changed(
  snapshot: MirrorStateSnapshot,
  auditFacts?: Record<string, string>,
): ProjectReconciliationReduction {
  return auditFacts
    ? { kind: "changed", snapshot, auditFacts }
    : { kind: "changed", snapshot };
}

function withReceipt(
  snapshot: MirrorStateSnapshot,
  key: string,
  receipt: MirrorOperationReceipt,
): MirrorStateSnapshot {
  return {
    ...snapshot,
    receipts: { ...snapshot.receipts, [key]: receipt },
  };
}

function validateGlobalWarning(
  warning: MirrorWarning | undefined,
  converged: boolean,
  transition: CommitProjectReconciliationTransition,
): ProjectReconciliationReduction | null {
  if (warning === undefined) return null;
  if (converged) {
    return invalid(
      "commit-project-reconciliation: a converged plan cannot carry a warning",
    );
  }
  if (
    warning.operationId !== transition.operationId ||
    warning.operation !== transition.event.operation
  ) {
    return invalid(
      "commit-project-reconciliation: warning must match the held operation",
    );
  }
  return warning.effect === "not-started"
    ? null
    : invalid(
        "commit-project-reconciliation: global warning effect must be not-started",
      );
}

function verifiedReceipt(
  receipt: MirrorOperationReceipt,
): MirrorOperationReceipt {
  const completed: MirrorOperationReceipt = {
    ...receipt,
    status: "succeeded",
    projectSyncVerified: true,
  };
  delete (completed as { projectSyncHold?: MirrorProjectSyncHold })
    .projectSyncHold;
  delete (completed as { failureClass?: MirrorFailureClass }).failureClass;
  delete (completed as { lastEffect?: MirrorMutationEffect }).lastEffect;
  return completed;
}

type ProjectReconciliationReceiptGuard =
  | {
      kind: "ready";
      key: string;
      receipt: MirrorOperationReceipt;
    }
  | {
      kind: "result";
      result: ProjectReconciliationReduction;
    };

function guardProjectReconciliationReceipt(
  snapshot: MirrorStateSnapshot,
  transition: CommitProjectReconciliationTransition,
  converged: boolean,
  ledgerUnchanged: boolean,
): ProjectReconciliationReceiptGuard {
  const key = mirrorEventKey(transition.event);
  const receipt = snapshot.receipts[key];
  if (!receipt) {
    return {
      kind: "result",
      result: invalid("commit-project-reconciliation: no receipt for event"),
    };
  }
  if (transition.event.operation === "close") {
    return {
      kind: "result",
      result: invalid(
        "commit-project-reconciliation: close never synchronizes Projects",
      ),
    };
  }
  if (mirrorEventKey(receipt.event) !== mirrorEventKey(transition.event)) {
    return {
      kind: "result",
      result: invalid(
        "commit-project-reconciliation: receipt event must match transition",
      ),
    };
  }
  if (receipt.operationId !== transition.operationId) {
    return {
      kind: "result",
      result: invalid(
        "commit-project-reconciliation: operationId must match receipt",
      ),
    };
  }
  if (
    receipt.status === "succeeded" &&
    receipt.projectSyncVerified === true &&
    receipt.projectSyncHold === undefined
  ) {
    return {
      kind: "result",
      result:
        converged &&
        transition.globalWarning === undefined &&
        ledgerUnchanged
          ? { kind: "unchanged" }
          : invalid(
              "commit-project-reconciliation: verified receipt already has different ledger evidence",
            ),
    };
  }
  if (
    receipt.status !== "pending" ||
    receipt.projectSyncHold === undefined
  ) {
    return {
      kind: "result",
      result: invalid(
        "commit-project-reconciliation: requires a pending Project sync hold",
      ),
    };
  }
  if (receipt.projectSyncHold.heldAt !== transition.heldAt) {
    return {
      kind: "result",
      result: invalid(
        "commit-project-reconciliation: heldAt must match Project sync hold",
      ),
    };
  }
  return { kind: "ready", key, receipt };
}

function reduceProjectReconciliation(
  snapshot: MirrorStateSnapshot,
  transition: CommitProjectReconciliationTransition,
): ProjectReconciliationReduction {
  const ledger = reduceProjectLedgerPlan(
    snapshot.projectSync,
    transition.ledgerPlan,
  );
  if (ledger.kind === "invalid") return ledger;

  const converged = projectLedgerPlanIsConverged(transition.ledgerPlan);
  const invalidWarning = validateGlobalWarning(
    transition.globalWarning,
    converged,
    transition,
  );
  if (invalidWarning) return invalidWarning;

  const guarded = guardProjectReconciliationReceipt(
    snapshot,
    transition,
    converged,
    ledger.kind === "unchanged",
  );
  if (guarded.kind === "result") return guarded.result;
  const { key, receipt } = guarded;

  let warnings = [...snapshot.warnings];
  let warningChanged = false;
  let auditFacts: Record<string, string> | undefined;
  if (transition.globalWarning !== undefined) {
    const upserted = upsertMirrorWarning(
      warnings,
      transition.globalWarning,
    );
    warnings = upserted.warnings;
    warningChanged = !upserted.unchanged;
    auditFacts = warningCoalesceFacts(upserted.coalesced);
  }

  let next: MirrorStateSnapshot = {
    ...snapshot,
    ...(ledger.kind === "changed"
      ? { projectSync: ledger.ledger }
      : {}),
    ...(warningChanged ? { warnings } : {}),
  };
  if (converged) {
    next = withReceipt(
      {
        ...next,
        warnings: warnings.filter(
          (warning) => warning.operationId !== receipt.operationId,
        ),
      },
      key,
      verifiedReceipt(receipt),
    );
  }

  return ledger.kind === "changed" || warningChanged || converged
    ? changed(next, auditFacts)
    : { kind: "unchanged" };
}

// Park a succeeded receipt at `pending` without claiming the Issue mutation
// failed. The Issue-side completion timestamp and provenance remain intact.
function reduceHoldForProjectSync(
  snapshot: MirrorStateSnapshot,
  transition: HoldForProjectSyncTransition,
): ProjectReconciliationReduction {
  const key = mirrorEventKey(transition.event);
  const receipt = snapshot.receipts[key];
  if (!receipt) return invalid("hold-for-project-sync: no receipt for event");
  if (receipt.operationId !== transition.operationId) {
    return invalid(
      "hold-for-project-sync: operationId must match receipt",
    );
  }
  if (
    receipt.status === "pending" &&
    receipt.projectSyncHold?.heldAt === transition.heldAt
  ) {
    return { kind: "unchanged" };
  }
  if (receipt.status !== "succeeded") {
    return invalid(
      `hold-for-project-sync: only allowed from 'succeeded', not '${receipt.status}'`,
    );
  }
  const held: MirrorOperationReceipt = {
    ...receipt,
    status: "pending",
    projectSyncHold: {
      reason: "project-sync-unsettled",
      heldAt: transition.heldAt,
    },
  };
  delete (held as { projectSyncVerified?: true }).projectSyncVerified;
  return changed(withReceipt(snapshot, key, held));
}

// Disabling every configured Project retires the barrier without claiming that
// a Project query converged.
function reduceRetireProjectSyncHold(
  snapshot: MirrorStateSnapshot,
  transition: RetireProjectSyncHoldTransition,
): ProjectReconciliationReduction {
  const key = mirrorEventKey(transition.event);
  const receipt = snapshot.receipts[key];
  if (!receipt) {
    return invalid("retire-project-sync-hold: no receipt for event");
  }
  if (transition.event.operation === "close") {
    return invalid(
      "retire-project-sync-hold: close never synchronizes Projects",
    );
  }
  if (receipt.operationId !== transition.operationId) {
    return invalid(
      "retire-project-sync-hold: operationId must match receipt",
    );
  }
  if (
    receipt.status === "succeeded" &&
    receipt.projectSyncHold === undefined &&
    receipt.projectSyncVerified === undefined
  ) {
    return { kind: "unchanged" };
  }
  if (
    receipt.status !== "pending" ||
    receipt.projectSyncHold === undefined
  ) {
    return invalid(
      "retire-project-sync-hold: requires a pending Project sync hold",
    );
  }
  const retired: MirrorOperationReceipt = {
    ...receipt,
    status: "succeeded",
  };
  delete (retired as { projectSyncHold?: MirrorProjectSyncHold })
    .projectSyncHold;
  delete (retired as { projectSyncVerified?: true }).projectSyncVerified;
  return changed(
    withReceipt(
      {
        ...snapshot,
        warnings: snapshot.warnings.filter(
          (warning) => warning.operationId !== receipt.operationId,
        ),
      },
      key,
      retired,
    ),
  );
}

export function reduceProjectSyncTransition(
  snapshot: MirrorStateSnapshot,
  transition: ProjectSyncTransition,
): ProjectReconciliationReduction {
  switch (transition.kind) {
    case "commit-project-reconciliation":
      return reduceProjectReconciliation(snapshot, transition);
    case "hold-for-project-sync":
      return reduceHoldForProjectSync(snapshot, transition);
    case "retire-project-sync-hold":
      return reduceRetireProjectSyncHold(snapshot, transition);
  }
}
