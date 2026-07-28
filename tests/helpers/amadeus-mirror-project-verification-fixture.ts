import {
  mirrorEventIdentity,
  mirrorEventKey,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import type { ProjectVerificationScope } from "../../packages/framework/core/tools/amadeus-mirror-project-verification.ts";
import {
  EMPTY_MIRROR_STATE,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type { MirrorStateStorePorts } from "../../packages/framework/core/tools/amadeus-mirror-state-store.ts";
import type {
  MirrorBoundary,
  MirrorOperation,
  MirrorOperationReceipt,
  MirrorProjectTarget,
  MirrorSnapshot,
  MirrorStateSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

export const NOW = "2026-07-27T00:00:00Z";
export const LATER = "2026-07-28T00:00:00Z";
export const INTENT = "intent-t359";

// These instances encode to keys whose code-unit order differs from
// localeCompare; the first key also sorts first, exposing preparedAt precedence.
export const CODE_UNIT_FIRST_KEY_INSTANCE = "Mdu7Q03K";
export const CODE_UNIT_SECOND_KEY_INSTANCE = "sZx2NueV";

export const TARGET: MirrorProjectTarget = {
  project: { owner: "acme", number: 5 },
  phaseField: "Intent Phase",
  statusNames: {},
};

export function completion(instance: string): MirrorBoundary {
  return { kind: "workflow-completed", instance };
}

export function receipt(
  boundary: MirrorBoundary,
  operation: MirrorOperation,
  status: MirrorOperationReceipt["status"],
  preparedAt: string,
): MirrorOperationReceipt {
  const event = mirrorEventIdentity(INTENT, boundary, operation);
  return {
    key: mirrorEventKey(event),
    event,
    operationId: `op-${operation}`,
    status,
    preparedAt,
    attemptedAt: preparedAt,
    ...(status === "succeeded" ? { completedAt: preparedAt } : {}),
    ...(status === "pending"
      ? {
          projectSyncHold: {
            reason: "project-sync-unsettled" as const,
            heldAt: preparedAt,
          },
        }
      : {}),
  };
}

export function authorized(
  candidate: MirrorOperationReceipt,
  receiptRevision: number,
): MirrorOperationReceipt {
  return {
    ...candidate,
    authorization: {
      kind: "auto",
      event: candidate.event,
      operation: candidate.event.operation,
      boundaryInstance: candidate.event.boundary.instance,
      receiptRevision,
      resolvedMode: "auto",
    },
  };
}

export function createdAtRevision(
  candidate: MirrorOperationReceipt,
  createdRevision: number,
): MirrorOperationReceipt {
  return { ...candidate, createdRevision };
}

export function withReceipts(
  ...receipts: MirrorOperationReceipt[]
): MirrorStateSnapshot {
  const revision = Math.max(
    4,
    ...receipts.map(
      (candidate) =>
        candidate.createdRevision ??
        candidate.authorization?.receiptRevision ??
        0,
    ),
  );
  return {
    ...EMPTY_MIRROR_STATE,
    revision,
    receipts: Object.fromEntries(
      receipts.map((candidate) => [candidate.key, candidate]),
    ),
  };
}

export function landed(): MirrorSnapshot {
  return {
    intentUuid: INTENT,
    intentDir: "260727-demo-t359",
    projectSummary: "Project verification",
    lifecyclePhase: "OPERATION",
    currentStage: "none",
    status: "Completed",
    registryStatus: "complete",
    updatedAt: NOW,
  };
}

export function statePorts(
  source: MirrorStateSnapshot | string,
  lockAvailable = true,
): Readonly<{ ports: MirrorStateStorePorts; writes: () => number }> {
  let document =
    typeof source === "string" ? source : renderMirrorStateBlock(source);
  let writeCount = 0;
  return {
    ports: {
      acquireLock: () => lockAvailable,
      releaseLock: () => {},
      readDocument: () => document,
      writeDocumentAtomic(text: string) {
        document = text;
        writeCount += 1;
        return { kind: "ok" };
      },
      appendArtifactUpdated: () => ({ kind: "appended" }),
    },
    writes: () => writeCount,
  };
}

export function verificationScope(
  ports: MirrorStateStorePorts,
  projects: readonly MirrorProjectTarget[] = [TARGET],
  boundary: MirrorBoundary = completion("current"),
  operation: MirrorOperation = "close",
): ProjectVerificationScope {
  return {
    intentUuid: INTENT,
    boundary,
    operation,
    snapshot: landed(),
    projects,
    ports,
    now: () => NOW,
  };
}
