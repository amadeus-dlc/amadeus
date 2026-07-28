// amadeus-mirror-warning-reducer.ts — pure warning list semantics.

import type { MirrorWarning } from "./amadeus-mirror-types.ts";

export const MAX_NORMAL_WARNINGS = 999;
export const CAPACITY_WARNING_MARKER = "state-capacity";

function isCapacityWarning(warning: MirrorWarning): boolean {
  return (
    warning.operationId === null &&
    warning.summary.startsWith(CAPACITY_WARNING_MARKER)
  );
}

function warningsEqual(left: MirrorWarning, right: MirrorWarning): boolean {
  return (
    left.operationId === right.operationId &&
    left.operation === right.operation &&
    left.classification === right.classification &&
    left.summary === right.summary &&
    left.occurredAt === right.occurredAt &&
    left.retryable === right.retryable &&
    left.effect === right.effect &&
    left.source === right.source
  );
}

// Coalesce by (operationId, classification, effect): the latest replaces the
// prior, whose value is surfaced for the transaction audit. Enforces the
// 999 normal + 1 reserved capacity slot bound.
export function upsertMirrorWarning(
  warnings: readonly MirrorWarning[],
  warning: MirrorWarning,
) {
  const existingIndex = warnings.findIndex((each) =>
    warningsEqual(each, warning)
  );
  if (existingIndex !== -1) {
    return { warnings: [...warnings], coalesced: null, unchanged: true };
  }
  const coalesceIndex = warnings.findIndex(
    (each) =>
      !isCapacityWarning(each) &&
      each.operationId === warning.operationId &&
      each.classification === warning.classification &&
      each.effect === warning.effect,
  );
  if (coalesceIndex !== -1) {
    const coalesced = warnings[coalesceIndex];
    const next = [...warnings];
    next[coalesceIndex] = warning;
    return { warnings: next, coalesced, unchanged: false };
  }
  const normalCount = warnings.filter(
    (each) => !isCapacityWarning(each)
  ).length;
  if (!isCapacityWarning(warning) && normalCount >= MAX_NORMAL_WARNINGS) {
    const capacity: MirrorWarning = {
      operationId: null,
      operation: null,
      classification: warning.classification,
      summary: `${CAPACITY_WARNING_MARKER}: normal warning slots exhausted`,
      occurredAt: warning.occurredAt,
      retryable: false,
      effect: "not-started",
      source: "persisted-warning",
    };
    const withoutCapacity = warnings.filter(
      (each) => !isCapacityWarning(each)
    );
    return {
      warnings: [...withoutCapacity, capacity],
      coalesced: warning,
      unchanged: false,
    };
  }
  return {
    warnings: [...warnings, warning],
    coalesced: null,
    unchanged: false,
  };
}

export function warningCoalesceFacts(
  coalesced: MirrorWarning | null,
): Record<string, string> | undefined {
  if (!coalesced) return undefined;
  return {
    coalescedWarning: `${coalesced.operationId ?? "null"}:${coalesced.classification}:${coalesced.effect}:${coalesced.occurredAt}`,
  };
}
