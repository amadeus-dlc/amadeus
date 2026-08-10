import {
  ATTRIBUTION_CATEGORIES,
  CANDIDATE_FAMILIES,
  CANDIDATE_REJECTION_REASON_PRECEDENCE,
  attributionCategoryForFamily,
  createAttributionWindow,
  createIntentIdentity,
  createSecondInterval,
  type AccountingInvariantError,
  type AttributionResult,
  type AttributionWindow,
  type AttributionWindowId,
  type CandidateFamily,
  type CandidateRejectionReason,
  type TargetStage,
  type OutlierLimit,
} from "./amadeus-stage-attribution-domain.ts";
import type { CandidateInventory } from "./amadeus-stage-attribution-candidates.ts";
import type {
  AttributionPopulationAccounting,
  WindowAttribution,
} from "./amadeus-stage-attribution-intervals.ts";

export type WindowIdentityEvidence =
  | {
      readonly type: "unique";
      readonly correlationKey: string;
      readonly windowId: AttributionWindowId;
    }
  | {
      readonly type: "ambiguous";
      readonly correlationKey: string;
      readonly collisionMemberCount: number;
    };

export type StageWindowEvidence = {
  readonly intent: string;
  readonly stage: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly identity: WindowIdentityEvidence;
};

export type MeasuredStageWindow = {
  readonly intent: string;
  readonly stage: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly rawSeconds: number;
  readonly idleSeconds: number;
  readonly netSeconds: number;
};

export const ATTRIBUTION_WINDOW_EXCLUSION_REASONS = [
  "zero-net-attribution",
  "ambiguous-window-identity",
] as const;

export type AttributionWindowExclusionReason = (typeof ATTRIBUTION_WINDOW_EXCLUSION_REASONS)[number];

export type AttributionWindowSelection = {
  readonly targetStage: TargetStage;
  readonly measuredWindowCount: number;
  readonly targetMeasuredWindowCount: number;
  readonly eligible: readonly AttributionWindow[];
  readonly exclusions: readonly {
    readonly reason: AttributionWindowExclusionReason;
    readonly count: number;
  }[];
};

export type NearestRankSummary = {
  readonly n: number;
  readonly median: number | null;
  readonly p95: number | null;
};

export function nearestRankSummary(values: readonly number[]): NearestRankSummary {
  if (values.length === 0) return { n: 0, median: null, p95: null };
  const sorted = [...values].sort((left, right) => left - right);
  const middle = sorted.length >> 1;
  const median = sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return {
    n: sorted.length,
    median,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1]!,
  };
}

type PopulationAccountingError = Extract<
  AccountingInvariantError,
  { readonly code: "invalid-population-accounting" }
>;

function populationError(
  invariant: PopulationAccountingError["invariant"],
  subject: Omit<PopulationAccountingError["subject"], "type"> = {},
): AttributionResult<never, AccountingInvariantError> {
  return {
    ok: false,
    error: {
      type: "accounting-invariant",
      code: "invalid-population-accounting",
      subject: { type: "population", ...subject },
      invariant,
    },
  };
}

export type AttributionCategoryStat = {
  readonly category: (typeof ATTRIBUTION_CATEGORIES)[number];
  readonly durationSeconds: NearestRankSummary;
  readonly share: NearestRankSummary;
};

export type AttributionCoverageStats = {
  readonly observableSeconds: NearestRankSummary;
  readonly unattributableSeconds: NearestRankSummary;
  readonly coverage: NearestRankSummary;
  readonly unattributableRate: NearestRankSummary;
  readonly overlapSeconds: NearestRankSummary;
};

export type CandidateFamilyReport = {
  readonly family: CandidateFamily;
  readonly observed: number;
  readonly accounted: number;
  readonly rejected: number;
};

export type CandidateReasonReport = {
  readonly family: CandidateFamily;
  readonly reason: CandidateRejectionReason;
  readonly count: number;
};

export type AttributionOutlier = {
  readonly windowId: AttributionWindowId;
  readonly intent: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly netSeconds: number;
  readonly observableSeconds: number;
  readonly unattributableSeconds: number;
  readonly coverage: number;
  readonly unattributableRate: number;
};

const CANDIDATE_RULES = [
  { family: "sensor", category: "sensor-execution", identityKey: "Fire id", lifecycle: "SENSOR_FIRED -> SENSOR_PASSED|SENSOR_FAILED|SENSOR_BUDGET_OVERRIDE" },
  { family: "swarm", category: "swarm-lifecycle", identityKey: "explicit swarm identity", lifecycle: "SWARM_STARTED -> SWARM_COMPLETED" },
  { family: "bolt", category: "bolt-lifecycle", identityKey: "explicit bolt identity", lifecycle: "BOLT_STARTED -> BOLT_COMPLETED|BOLT_FAILED" },
  { family: "subagent", category: "subagent-lifecycle", identityKey: "explicit subagent identity", lifecycle: "SUBAGENT_STARTED -> SUBAGENT_COMPLETED" },
  { family: "loop-monitor", category: "loop-monitor-lifecycle", identityKey: "explicit loop identity", lifecycle: "explicit loop start -> explicit loop terminal" },
  { family: "merge-dispatch", category: "merge-dispatch-lifecycle", identityKey: "explicit dispatch identity", lifecycle: "MERGE_DISPATCH_INVOKED -> MERGE_DISPATCH_RETURNED|MERGE_DISPATCH_FALLBACK" },
  { family: "execution-event-set", category: "execution-lifecycle", identityKey: "operationId", lifecycle: "operation-started -> operation-finished" },
  { family: "unit-pool-event-set", category: "unit-pool-lifecycle", identityKey: "attemptId", lifecycle: "unit-acquired -> unit-settled" },
  { family: "transaction-envelope", category: "transaction-lifecycle", identityKey: "explicit transaction identity", lifecycle: "explicit transaction start -> explicit transaction terminal" },
] as const;

export type StageAttributionReport = {
  readonly reference: {
    readonly scanScope: string;
    readonly unreadableShardCount: number;
    readonly targetStage: TargetStage;
    readonly outlierLimit: OutlierLimit;
    readonly measuredWindowCount: number;
    readonly targetMeasuredWindowCount: number;
    readonly eligibleWindowCount: number;
  };
  readonly categories: readonly AttributionCategoryStat[];
  readonly coverage: AttributionCoverageStats;
  readonly windowExclusions: AttributionWindowSelection["exclusions"];
  readonly candidateFamilies: readonly CandidateFamilyReport[];
  readonly candidateReasons: readonly CandidateReasonReport[];
  readonly observedFacts: {
    readonly highUnattributableWindowCount: number;
    readonly missingTerminalCandidateCount: number;
  };
  readonly instrumentationHypotheses: readonly {
    readonly type: "candidate-boundary";
    readonly boundary: "review-lifecycle" | "test-lifecycle" | "pr-convergence-lifecycle";
  }[];
  readonly outliers: readonly AttributionOutlier[];
  readonly methodology: {
    readonly interval: "integer-second half-open [start,end)";
    readonly accounting: "clip to measured window, subtract idle, union within category, then union across categories";
    readonly overlap: "category shares are independent and must not be summed";
    readonly windowSelection: "ambiguous identity, then zero net, then eligible";
    readonly candidateRules: typeof CANDIDATE_RULES;
  };
};

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortOutliers(windows: readonly WindowAttribution[]): WindowAttribution[] {
  return [...windows].sort((left, right) =>
    right.unattributableSeconds - left.unattributableSeconds
    || compareText(String(left.intent), String(right.intent))
    || left.measuredInterval.start - right.measuredInterval.start
    || left.measuredInterval.end - right.measuredInterval.end
    || compareText(String(left.windowId), String(right.windowId))
  );
}

function sameSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function validateWindowAccounting(window: WindowAttribution): AttributionResult<true, AccountingInvariantError> {
  const categoryOrder = window.categories.map(({ category }) => category);
  const categorySeconds = window.categories.reduce((sum, category) => sum + category.seconds, 0);
  const finite = [
    window.netSeconds,
    window.categorySumSeconds,
    window.observableSeconds,
    window.overlapSeconds,
    window.unattributableSeconds,
    window.coverage,
    window.unattributableRate,
    ...window.categories.flatMap(({ seconds, share }) => [seconds, share]),
  ].every(Number.isFinite);
  const valid = finite
    && categoryOrder.length === ATTRIBUTION_CATEGORIES.length
    && categoryOrder.every((category, index) => category === ATTRIBUTION_CATEGORIES[index])
    && window.netSeconds > 0
    && window.categories.every(({ seconds, share }) => seconds >= 0 && share === seconds / window.netSeconds)
    && categorySeconds === window.categorySumSeconds
    && window.categorySumSeconds - window.observableSeconds === window.overlapSeconds
    && window.observableSeconds + window.unattributableSeconds === window.netSeconds
    && window.coverage === window.observableSeconds / window.netSeconds
    && Math.abs(window.coverage + window.unattributableRate - 1) < Number.EPSILON * 4;
  return valid
    ? { ok: true, value: true }
    : populationError("invalid-window-accounting", { windowId: window.windowId });
}

function validateWindowBijection(
  selection: AttributionWindowSelection,
  accounting: AttributionPopulationAccounting,
): AttributionResult<true, AccountingInvariantError> {
  const selectedWindows = new Set(selection.eligible.map(({ windowId }) => String(windowId)));
  const accountedWindows = new Set(accounting.windows.map(({ windowId }) => String(windowId)));
  if (selection.eligible.length !== selectedWindows.size
    || accounting.windows.length !== accountedWindows.size
    || !sameSet(selectedWindows, accountedWindows)) {
    return populationError("window-result-bijection");
  }
  const selectionById = new Map(selection.eligible.map((window) => [String(window.windowId), window]));
  for (const window of accounting.windows) {
    const selected = selectionById.get(String(window.windowId));
    if (selected === undefined
      || selected.intent !== window.intent
      || selected.stage !== window.stage
      || selected.measuredInterval.start !== window.measuredInterval.start
      || selected.measuredInterval.end !== window.measuredInterval.end
      || selected.netSeconds !== window.netSeconds) {
      return populationError("window-result-bijection");
    }
  }
  return { ok: true, value: true };
}

function validateCandidateBijection(
  inventory: CandidateInventory,
  accounting: AttributionPopulationAccounting,
): AttributionResult<true, AccountingInvariantError> {
  const acceptedById = new Map(inventory.accepted.map((candidate) => [String(candidate.candidateId), candidate]));
  const rejectedIds = new Set(inventory.rejected.map(({ candidateId }) => String(candidateId)));
  const dispositionIds = new Set(accounting.dispositions.map(({ candidateId }) => String(candidateId)));
  if (acceptedById.size !== inventory.accepted.length
    || rejectedIds.size !== inventory.rejected.length
    || accounting.dispositions.length !== dispositionIds.size
    || !sameSet(new Set(acceptedById.keys()), dispositionIds)
    || [...rejectedIds].some((candidateId) => acceptedById.has(candidateId))) {
    return populationError("candidate-disposition-bijection");
  }
  for (const candidate of inventory.accepted) {
    if (candidate.category !== attributionCategoryForFamily(candidate.family)) {
      return populationError("candidate-category-mismatch", { candidateId: candidate.candidateId });
    }
  }
  return { ok: true, value: true };
}

function validateFamilyCounts(inventory: CandidateInventory): AttributionResult<true, AccountingInvariantError> {
  if (inventory.familyCounts.length !== CANDIDATE_FAMILIES.length
    || new Set(inventory.familyCounts.map(({ family }) => family)).size !== CANDIDATE_FAMILIES.length) {
    return populationError("candidate-disposition-bijection");
  }
  for (const family of CANDIDATE_FAMILIES) {
    const actualAccepted = inventory.accepted.filter((candidate) => candidate.family === family).length;
    const actualRejected = inventory.rejected.filter((candidate) => candidate.family === family).length;
    const count = inventory.familyCounts.find((entry) => entry.family === family);
    if (count === undefined
      || count.accepted !== actualAccepted
      || count.rejected !== actualRejected
      || count.observed !== actualAccepted + actualRejected) {
      return populationError("candidate-disposition-bijection");
    }
  }
  return { ok: true, value: true };
}

function validateReconciliation(input: {
  readonly selection: AttributionWindowSelection;
  readonly inventory: CandidateInventory;
  readonly accounting: AttributionPopulationAccounting;
}): AttributionResult<true, AccountingInvariantError> {
  for (const result of [
    validateWindowBijection(input.selection, input.accounting),
    validateCandidateBijection(input.inventory, input.accounting),
    validateFamilyCounts(input.inventory),
  ]) {
    if (!result.ok) return result;
  }
  for (const window of input.accounting.windows) {
    const valid = validateWindowAccounting(window);
    if (!valid.ok) return valid;
  }
  return { ok: true, value: true };
}

function categoryStats(windows: readonly WindowAttribution[]): AttributionCategoryStat[] {
  return ATTRIBUTION_CATEGORIES.map((category) => {
    const values = windows.map((window) => window.categories.find((entry) => entry.category === category)!);
    return Object.freeze({
      category,
      durationSeconds: Object.freeze(nearestRankSummary(values.filter(({ seconds }) => seconds > 0).map(({ seconds }) => seconds))),
      share: Object.freeze(nearestRankSummary(values.map(({ share }) => share))),
    });
  });
}

function candidateReports(
  inventory: CandidateInventory,
  accounting: AttributionPopulationAccounting,
): { families: CandidateFamilyReport[]; reasons: CandidateReasonReport[] } {
  const acceptedById = new Map(inventory.accepted.map((candidate) => [String(candidate.candidateId), candidate]));
  const postRejected = accounting.dispositions.filter((disposition) => disposition.type === "rejected");
  const families = CANDIDATE_FAMILIES.map((family) => {
    const accounted = accounting.dispositions.filter((disposition) =>
      disposition.type === "accounted" && acceptedById.get(String(disposition.candidateId))?.family === family).length;
    const rejected = inventory.rejected.filter((candidate) => candidate.family === family).length
      + postRejected.filter((disposition) => acceptedById.get(String(disposition.candidateId))?.family === family).length;
    return Object.freeze({ family, observed: accounted + rejected, accounted, rejected });
  });
  const reasonCounts = new Map<string, number>();
  for (const candidate of inventory.rejected) {
    for (const reason of new Set([candidate.primaryReason, ...candidate.secondaryReasons])) {
      const key = `${candidate.family}\u0000${reason}`;
      reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
    }
  }
  for (const disposition of postRejected) {
    const family = acceptedById.get(String(disposition.candidateId))!.family;
    const key = `${family}\u0000${disposition.reason}`;
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
  }
  const reasons = CANDIDATE_FAMILIES.flatMap((family) =>
    CANDIDATE_REJECTION_REASON_PRECEDENCE.map((reason) =>
      Object.freeze({ family, reason, count: reasonCounts.get(`${family}\u0000${reason}`) ?? 0 })));
  return { families, reasons };
}

export function composeAttributionReport(input: {
  readonly selection: AttributionWindowSelection;
  readonly inventory: CandidateInventory;
  readonly accounting: AttributionPopulationAccounting;
  readonly outlierLimit: OutlierLimit;
  readonly scanReference: {
    readonly scanScope: string;
    readonly unreadableShardCount: number;
  };
}): AttributionResult<StageAttributionReport, AccountingInvariantError> {
  const reconciled = validateReconciliation(input);
  if (!reconciled.ok) return reconciled;
  const candidates = candidateReports(input.inventory, input.accounting);
  if (!candidates.families.every(({ observed, accounted, rejected }) => observed === accounted + rejected)) {
    return populationError("candidate-disposition-bijection");
  }
  const missingTerminalCandidateCount = new Set(input.inventory.rejected
    .filter((candidate) => candidate.primaryReason === "missing-terminal" || candidate.secondaryReasons.includes("missing-terminal"))
    .map(({ candidateId }) => String(candidateId))).size;
  const outliers = sortOutliers(input.accounting.windows).slice(0, input.outlierLimit).map((window) => Object.freeze({
    windowId: window.windowId,
    intent: String(window.intent),
    startedAt: new Date(window.measuredInterval.start * 1000).toISOString(),
    completedAt: new Date(window.measuredInterval.end * 1000).toISOString(),
    netSeconds: window.netSeconds,
    observableSeconds: window.observableSeconds,
    unattributableSeconds: window.unattributableSeconds,
    coverage: window.coverage,
    unattributableRate: window.unattributableRate,
  }));
  return {
    ok: true,
    value: Object.freeze({
      reference: Object.freeze({
        ...input.scanReference,
        targetStage: input.selection.targetStage,
        outlierLimit: input.outlierLimit,
        measuredWindowCount: input.selection.measuredWindowCount,
        targetMeasuredWindowCount: input.selection.targetMeasuredWindowCount,
        eligibleWindowCount: input.selection.eligible.length,
      }),
      categories: Object.freeze(categoryStats(input.accounting.windows)),
      coverage: Object.freeze({
        observableSeconds: Object.freeze(nearestRankSummary(input.accounting.windows.map(({ observableSeconds }) => observableSeconds))),
        unattributableSeconds: Object.freeze(nearestRankSummary(input.accounting.windows.map(({ unattributableSeconds }) => unattributableSeconds))),
        coverage: Object.freeze(nearestRankSummary(input.accounting.windows.map(({ coverage }) => coverage))),
        unattributableRate: Object.freeze(nearestRankSummary(input.accounting.windows.map(({ unattributableRate }) => unattributableRate))),
        overlapSeconds: Object.freeze(nearestRankSummary(input.accounting.windows.map(({ overlapSeconds }) => overlapSeconds))),
      }),
      windowExclusions: Object.freeze([...input.selection.exclusions]),
      candidateFamilies: Object.freeze(candidates.families),
      candidateReasons: Object.freeze(candidates.reasons),
      observedFacts: Object.freeze({
        highUnattributableWindowCount: input.accounting.windows.filter(({ unattributableRate }) => unattributableRate > 0.5).length,
        missingTerminalCandidateCount,
      }),
      instrumentationHypotheses: Object.freeze([
        Object.freeze({ type: "candidate-boundary" as const, boundary: "review-lifecycle" as const }),
        Object.freeze({ type: "candidate-boundary" as const, boundary: "test-lifecycle" as const }),
        Object.freeze({ type: "candidate-boundary" as const, boundary: "pr-convergence-lifecycle" as const }),
      ]),
      outliers: Object.freeze(outliers),
      methodology: Object.freeze({
        interval: "integer-second half-open [start,end)" as const,
        accounting: "clip to measured window, subtract idle, union within category, then union across categories" as const,
        overlap: "category shares are independent and must not be summed" as const,
        windowSelection: "ambiguous identity, then zero net, then eligible" as const,
        candidateRules: CANDIDATE_RULES,
      }),
    }),
  };
}

function evidenceKey(window: Pick<MeasuredStageWindow, "intent" | "stage" | "startedAt" | "completedAt">): string {
  return JSON.stringify([window.intent, window.stage, window.startedAt, window.completedAt]);
}

function compareWindows(left: AttributionWindow, right: AttributionWindow): number {
  return compareText(String(left.intent), String(right.intent))
    || left.measuredInterval.start - right.measuredInterval.start
    || left.measuredInterval.end - right.measuredInterval.end
    || compareText(String(left.windowId), String(right.windowId));
}

function indexEvidence(evidence: readonly StageWindowEvidence[]): Map<string, StageWindowEvidence[]> {
  const indexed = new Map<string, StageWindowEvidence[]>();
  for (const entry of evidence) {
    const key = evidenceKey(entry);
    const entries = indexed.get(key) ?? [];
    entries.push(entry);
    indexed.set(key, entries);
  }
  return indexed;
}

function createEligibleWindow(
  measured: MeasuredStageWindow,
  evidence: Extract<WindowIdentityEvidence, { readonly type: "unique" }>,
  targetStage: TargetStage,
): AttributionResult<AttributionWindow, AccountingInvariantError> {
  const intent = createIntentIdentity(measured.intent);
  // The window's intent string failed identity decoding; the invalid raw value
  // cannot be carried as a branded IntentIdentity, so the window id locates
  // the offending window instead.
  if (!intent.ok) return populationError("invalid-window-id", { windowId: evidence.windowId });
  const interval = createSecondInterval(
    Math.floor(Date.parse(measured.startedAt) / 1000),
    Math.floor(Date.parse(measured.completedAt) / 1000),
    { type: "window", windowId: evidence.windowId },
  );
  if (!interval.ok) return interval;
  return createAttributionWindow({
    windowId: evidence.windowId,
    intent: intent.value,
    stage: targetStage,
    measuredInterval: interval.value,
    netSeconds: measured.netSeconds,
  });
}

export function selectAttributionWindows(input: {
  readonly measured: readonly MeasuredStageWindow[];
  readonly evidence: readonly StageWindowEvidence[];
  readonly targetStage: TargetStage;
}): AttributionResult<AttributionWindowSelection, AccountingInvariantError> {
  const evidenceByWindow = indexEvidence(input.evidence);
  const eligible: AttributionWindow[] = [];
  let zeroNetCount = 0;
  let ambiguousCount = 0;
  const targetMeasured = input.measured.filter(({ stage }) => stage === input.targetStage);
  for (const measured of targetMeasured) {
    const entries = evidenceByWindow.get(evidenceKey(measured));
    const evidence = entries?.shift();
    if (evidence === undefined) return populationError("window-result-bijection");
    if (evidence.identity.type === "ambiguous") {
      ambiguousCount += 1;
      continue;
    }
    if (measured.netSeconds <= 0) {
      zeroNetCount += 1;
      continue;
    }
    const window = createEligibleWindow(measured, evidence.identity, input.targetStage);
    if (!window.ok) return window;
    eligible.push(window.value);
  }

  const leftovers = [...evidenceByWindow.values()].reduce((count, entries) =>
    count + entries.filter(({ stage }) => stage === input.targetStage).length, 0);
  if (leftovers !== 0) return populationError("window-result-bijection");

  eligible.sort(compareWindows);
  return {
    ok: true,
    value: Object.freeze({
      targetStage: input.targetStage,
      measuredWindowCount: input.measured.length,
      targetMeasuredWindowCount: targetMeasured.length,
      eligible: Object.freeze(eligible),
      exclusions: Object.freeze([
        Object.freeze({ reason: "zero-net-attribution" as const, count: zeroNetCount }),
        Object.freeze({ reason: "ambiguous-window-identity" as const, count: ambiguousCount }),
      ]),
    }),
  };
}
