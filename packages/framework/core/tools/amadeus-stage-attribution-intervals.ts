import {
  ATTRIBUTION_CATEGORIES,
  attributionCategoryForFamily,
  createAccountedDisposition,
  createAttributionPopulationAccounting,
  createCandidateWindowContribution,
  createRejectedDisposition,
  type AccountingInvariantError,
  type AttributionCategory,
  type AttributionResult,
  type AttributionWindow,
  type AttributionWindowId,
  type CandidateAccountingDisposition,
  type CandidateId,
  type CandidateWindowContribution,
  type ExplicitLifecycleInterval,
  type IntentIdentity,
  type SecondInterval,
  type TargetStage,
} from "./amadeus-stage-attribution-domain.ts";

export type IntentIdleIntervals = {
  readonly intent: IntentIdentity;
  readonly intervals: readonly SecondInterval[];
};

export type IdleIndex = {
  readonly byIntent: readonly IntentIdleIntervals[];
};

export type CategoryWindowAttribution = {
  readonly category: AttributionCategory;
  readonly fragments: readonly SecondInterval[];
  readonly seconds: number;
  readonly share: number;
};

export type WindowAttribution = {
  readonly windowId: AttributionWindowId;
  readonly intent: IntentIdentity;
  readonly stage: TargetStage;
  readonly measuredInterval: SecondInterval;
  readonly netSeconds: number;
  readonly categories: readonly CategoryWindowAttribution[];
  readonly categorySumSeconds: number;
  readonly observableFragments: readonly SecondInterval[];
  readonly observableSeconds: number;
  readonly overlapSeconds: number;
  readonly unattributableSeconds: number;
  readonly coverage: number;
  readonly unattributableRate: number;
};

export type AttributionPopulationAccounting = {
  readonly windows: readonly WindowAttribution[];
  readonly dispositions: readonly CandidateAccountingDisposition[];
};

export type AttributionPopulationInput = {
  readonly windows: readonly AttributionWindow[];
  readonly intervals: readonly ExplicitLifecycleInterval[];
  readonly idleIndex: IdleIndex;
};

export type PopulationAccountingInvariantError = {
  readonly type: "accounting-invariant";
  readonly code: "invalid-population-accounting";
  readonly subject: {
    readonly type: "population";
    readonly candidateId?: CandidateId;
    readonly windowId?: AttributionWindowId;
    readonly intent?: IntentIdentity;
  };
  readonly invariant:
    | "unsafe-interval-seconds"
    | "invalid-interval"
    | "duplicate-window-id"
    | "duplicate-candidate-id"
    | "invalid-window-net-seconds"
    | "invalid-window-id"
    | "invalid-candidate-id"
    | "candidate-category-mismatch"
    | "invalid-idle-intent"
    | "window-net-idle-mismatch"
    | "duplicate-idle-intent"
    | "non-canonical-idle-index"
    | "candidate-disposition-bijection"
    | "window-result-bijection"
    | "unknown-window-contribution"
    | "invalid-window-accounting";
};

export type AttributionPopulationError = AccountingInvariantError | PopulationAccountingInvariantError;

function populationError(
  invariant: PopulationAccountingInvariantError["invariant"],
  subject: Omit<PopulationAccountingInvariantError["subject"], "type"> = {},
): PopulationAccountingInvariantError {
  return {
    type: "accounting-invariant",
    code: "invalid-population-accounting",
    subject: { type: "population", ...subject },
    invariant,
  };
}

export function clipInterval(interval: SecondInterval, window: SecondInterval): SecondInterval | null {
  const start = Math.max(interval.start, window.start);
  const end = Math.min(interval.end, window.end);
  return start < end ? { start, end } : null;
}

export function unionIntervals(intervals: readonly SecondInterval[]): readonly SecondInterval[] {
  const sorted = intervals.map(({ start, end }) => ({ start, end })).sort((left, right) => left.start - right.start || left.end - right.end);
  const union: SecondInterval[] = [];
  for (const interval of sorted) {
    const previous = union.at(-1);
    if (previous === undefined || interval.start > previous.end) {
      union.push({ ...interval });
    } else if (interval.end > previous.end) {
      union[union.length - 1] = { start: previous.start, end: interval.end };
    }
  }
  return union;
}

export function subtractIntervals(interval: SecondInterval, exclusions: readonly SecondInterval[]): readonly SecondInterval[] {
  const fragments: SecondInterval[] = [];
  let cursor = interval.start;
  for (const exclusion of unionIntervals(exclusions)) {
    const clipped = clipInterval(exclusion, interval);
    if (clipped === null) continue;
    if (cursor < clipped.start) fragments.push({ start: cursor, end: clipped.start });
    cursor = Math.max(cursor, clipped.end);
  }
  if (cursor < interval.end) fragments.push({ start: cursor, end: interval.end });
  return fragments;
}

export function intervalSeconds(
  intervals: readonly SecondInterval[],
): number {
  for (const interval of intervals) {
    const duration = interval.end - interval.start;
    if (!Number.isSafeInteger(interval.start) || !Number.isSafeInteger(interval.end) || !Number.isSafeInteger(duration) || duration <= 0) {
      throw new RangeError("interval seconds must be a positive safe integer");
    }
  }
  let seconds = 0;
  for (const interval of unionIntervals(intervals)) {
    const duration = interval.end - interval.start;
    seconds += duration;
    if (!Number.isSafeInteger(seconds)) {
      throw new RangeError("interval seconds exceed the safe integer range");
    }
  }
  return seconds;
}

export function accountAttributionPopulation(
  input: AttributionPopulationInput,
): AttributionResult<AttributionPopulationAccounting, AttributionPopulationError> {
  const preflight = validateInput(input);
  if (!preflight.ok) return preflight;

  const windows = [...input.windows].sort(compareWindows);
  const intervals = [...input.intervals].sort((left, right) => compareText(left.candidateId, right.candidateId));
  const idleByIntent = new Map(input.idleIndex.byIntent.map(({ intent, intervals }) => [intent, intervals]));
  const accumulated = accountCandidates(intervals, windows, idleByIntent);
  if (!accumulated.ok) return accumulated;

  const domainPopulation = createAttributionPopulationAccounting(windows, accumulated.value.dispositions);
  if (!domainPopulation.ok) return domainPopulation;

  const attributedWindows = createWindowAttributions(windows, accumulated.value.fragmentsByWindow);
  if (!attributedWindows.ok) return attributedWindows;

  const result = {
    windows: Object.freeze(attributedWindows.value),
    dispositions: Object.freeze([...accumulated.value.dispositions]),
  };
  const invariant = validateResult(input, result);
  return invariant ?? { ok: true, value: Object.freeze(result) };
}

type CandidateAccumulation = {
  readonly dispositions: readonly CandidateAccountingDisposition[];
  readonly fragmentsByWindow: ReadonlyMap<AttributionWindowId, ReadonlyMap<AttributionCategory, readonly SecondInterval[]>>;
};

function accountCandidates(
  intervals: readonly ExplicitLifecycleInterval[],
  windows: readonly AttributionWindow[],
  idleByIntent: ReadonlyMap<IntentIdentity, readonly SecondInterval[]>,
): AttributionResult<CandidateAccumulation, AccountingInvariantError> {
  const dispositions: CandidateAccountingDisposition[] = [];
  const fragmentsByWindow = new Map<AttributionWindowId, Map<AttributionCategory, SecondInterval[]>>();
  for (const candidate of intervals) {
    const disposition = accountCandidate(candidate, windows, idleByIntent, fragmentsByWindow);
    if (!disposition.ok) return disposition;
    dispositions.push(disposition.value);
  }
  return { ok: true, value: { dispositions, fragmentsByWindow } };
}

function accountCandidate(
  candidate: ExplicitLifecycleInterval,
  windows: readonly AttributionWindow[],
  idleByIntent: ReadonlyMap<IntentIdentity, readonly SecondInterval[]>,
  fragmentsByWindow: Map<AttributionWindowId, Map<AttributionCategory, SecondInterval[]>>,
): AttributionResult<CandidateAccountingDisposition, AccountingInvariantError> {
  let hadRawClip = false;
  const contributions: CandidateWindowContribution[] = [];
  for (const window of windows) {
    if (!isEligible(candidate, window)) continue;
    const rawClip = clipInterval(candidate.interval, window.measuredInterval);
    if (rawClip === null) continue;
    hadRawClip = true;
    const fragments = subtractIntervals(rawClip, idleByIntent.get(candidate.explicitIntent) ?? []);
    if (fragments.length === 0) continue;
    const contribution = createCandidateWindowContribution(window.windowId, fragments);
    if (!contribution.ok) return contribution;
    contributions.push(contribution.value);
    recordCategoryFragments(fragmentsByWindow, window.windowId, candidate.category, fragments);
  }
  if (contributions.length === 0) {
    return { ok: true, value: createRejectedDisposition(candidate.candidateId, hadRawClip ? "empty-after-idle" : "outside-window") };
  }
  return createAccountedDisposition(candidate.candidateId, contributions);
}

function isEligible(candidate: ExplicitLifecycleInterval, window: AttributionWindow): boolean {
  return candidate.explicitIntent === window.intent && candidate.stage === window.stage;
}

function recordCategoryFragments(
  fragmentsByWindow: Map<AttributionWindowId, Map<AttributionCategory, SecondInterval[]>>,
  windowId: AttributionWindowId,
  category: AttributionCategory,
  fragments: readonly SecondInterval[],
): void {
  const byCategory = fragmentsByWindow.get(windowId) ?? new Map<AttributionCategory, SecondInterval[]>();
  const categoryFragments = byCategory.get(category) ?? [];
  categoryFragments.push(...fragments);
  byCategory.set(category, categoryFragments);
  fragmentsByWindow.set(windowId, byCategory);
}

function validateInput(
  input: AttributionPopulationInput,
): AttributionResult<true, PopulationAccountingInvariantError> {
  const windows = validateWindows(input.windows);
  if (!windows.ok) return windows;
  const candidates = validateCandidates(input.intervals);
  if (!candidates.ok) return candidates;
  const idle = validateIdleIndex(input.idleIndex);
  if (!idle.ok) return idle;
  return validateWindowNetSeconds(input.windows, input.idleIndex);
}

function validateWindows(
  windows: readonly AttributionWindow[],
): AttributionResult<true, PopulationAccountingInvariantError> {
  const windowIds = new Set<string>();
  for (const window of windows) {
    if (!isValidIdentity(window.windowId)) return { ok: false, error: populationError("invalid-window-id", { windowId: window.windowId }) };
    if (windowIds.has(window.windowId)) return { ok: false, error: populationError("duplicate-window-id", { windowId: window.windowId }) };
    windowIds.add(window.windowId);
    const intervalError = validateInterval(window.measuredInterval, { windowId: window.windowId });
    if (intervalError !== null) return { ok: false, error: intervalError };
    if (!Number.isSafeInteger(window.netSeconds) || window.netSeconds <= 0) {
      return { ok: false, error: populationError("invalid-window-net-seconds", { windowId: window.windowId }) };
    }
  }
  return { ok: true, value: true };
}

function validateCandidates(
  candidates: readonly ExplicitLifecycleInterval[],
): AttributionResult<true, PopulationAccountingInvariantError> {
  const candidateIds = new Set<string>();
  for (const candidate of candidates) {
    if (!isValidIdentity(candidate.candidateId)) {
      return { ok: false, error: populationError("invalid-candidate-id", { candidateId: candidate.candidateId }) };
    }
    if (candidateIds.has(candidate.candidateId)) {
      return { ok: false, error: populationError("duplicate-candidate-id", { candidateId: candidate.candidateId }) };
    }
    candidateIds.add(candidate.candidateId);
    const intervalError = validateInterval(candidate.interval, { candidateId: candidate.candidateId });
    if (intervalError !== null) return { ok: false, error: intervalError };
    if (candidate.category !== attributionCategoryForFamily(candidate.family)) {
      return { ok: false, error: populationError("candidate-category-mismatch", { candidateId: candidate.candidateId }) };
    }
  }
  return { ok: true, value: true };
}

function validateWindowNetSeconds(
  windows: readonly AttributionWindow[],
  idleIndex: IdleIndex,
): AttributionResult<true, PopulationAccountingInvariantError> {
  const idleByIntent = new Map(idleIndex.byIntent.map(({ intent, intervals }) => [intent, intervals]));
  for (const window of windows) {
    let expectedNet: number;
    try {
      expectedNet = intervalSeconds(subtractIntervals(window.measuredInterval, idleByIntent.get(window.intent) ?? []));
    } catch {
      return { ok: false, error: populationError("unsafe-interval-seconds", { windowId: window.windowId }) };
    }
    if (expectedNet !== window.netSeconds) {
      return { ok: false, error: populationError("window-net-idle-mismatch", { windowId: window.windowId }) };
    }
  }
  return { ok: true, value: true };
}

function validateIdleIndex(idleIndex: IdleIndex): AttributionResult<true, PopulationAccountingInvariantError> {
  const intents = new Set<string>();
  let previousIntent: string | null = null;
  for (const entry of idleIndex.byIntent) {
    if (!isValidIdentity(entry.intent)) return { ok: false, error: populationError("invalid-idle-intent", { intent: entry.intent }) };
    if (intents.has(entry.intent)) return { ok: false, error: populationError("duplicate-idle-intent", { intent: entry.intent }) };
    intents.add(entry.intent);
    if (previousIntent !== null && compareText(previousIntent, entry.intent) >= 0) {
      return { ok: false, error: populationError("non-canonical-idle-index", { intent: entry.intent }) };
    }
    previousIntent = entry.intent;
    const intervals = validateIdleIntervals(entry);
    if (!intervals.ok) return intervals;
  }
  return { ok: true, value: true };
}

function validateIdleIntervals(
  entry: IntentIdleIntervals,
): AttributionResult<true, PopulationAccountingInvariantError> {
  let previous: SecondInterval | null = null;
  for (const interval of entry.intervals) {
    const intervalError = validateInterval(interval, { intent: entry.intent });
    if (intervalError !== null) return { ok: false, error: intervalError };
    if (previous !== null && interval.start <= previous.end) {
      return { ok: false, error: populationError("non-canonical-idle-index", { intent: entry.intent }) };
    }
    previous = interval;
  }
  return { ok: true, value: true };
}

function createWindowAttributions(
  windows: readonly AttributionWindow[],
  fragmentsByWindow: CandidateAccumulation["fragmentsByWindow"],
): AttributionResult<WindowAttribution[], PopulationAccountingInvariantError> {
  const attributedWindows: WindowAttribution[] = [];
  for (const window of windows) {
    const attributed = createWindowAttribution(window, fragmentsByWindow.get(window.windowId));
    if (!attributed.ok) return attributed;
    attributedWindows.push(attributed.value);
  }
  return { ok: true, value: attributedWindows };
}

function createWindowAttribution(
  window: AttributionWindow,
  fragmentsByCategory: ReadonlyMap<AttributionCategory, readonly SecondInterval[]> | undefined,
): AttributionResult<WindowAttribution, PopulationAccountingInvariantError> {
  try {
    const categories = ATTRIBUTION_CATEGORIES.map((category) => {
      const fragments = unionIntervals(fragmentsByCategory?.get(category) ?? []);
      const seconds = intervalSeconds(fragments);
      return Object.freeze({ category, fragments: Object.freeze(fragments), seconds, share: seconds / window.netSeconds });
    });
    const categorySumSeconds = categories.reduce((sum, category) => sum + category.seconds, 0);
    if (!Number.isSafeInteger(categorySumSeconds)) {
      return { ok: false, error: populationError("unsafe-interval-seconds", { windowId: window.windowId }) };
    }
    const observableFragments = unionIntervals(categories.flatMap(({ fragments }) => fragments));
    const observableSeconds = intervalSeconds(observableFragments);
    const overlapSeconds = categorySumSeconds - observableSeconds;
    const unattributableSeconds = window.netSeconds - observableSeconds;
    const coverage = observableSeconds / window.netSeconds;
    const unattributableRate = 1 - coverage;
    if (
      overlapSeconds < 0
      || unattributableSeconds < 0
      || ![coverage, unattributableRate, ...categories.map(({ share }) => share)].every(Number.isFinite)
    ) {
      return { ok: false, error: populationError("invalid-window-accounting", { windowId: window.windowId }) };
    }
    return {
      ok: true,
      value: Object.freeze({
        windowId: window.windowId,
        intent: window.intent,
        stage: window.stage,
        measuredInterval: Object.freeze({ ...window.measuredInterval }),
        netSeconds: window.netSeconds,
        categories: Object.freeze(categories),
        categorySumSeconds,
        observableFragments: Object.freeze(observableFragments),
        observableSeconds,
        overlapSeconds,
        unattributableSeconds,
        coverage,
        unattributableRate,
      }),
    };
  } catch {
    return { ok: false, error: populationError("unsafe-interval-seconds", { windowId: window.windowId }) };
  }
}

function validateResult(
  input: AttributionPopulationInput,
  result: AttributionPopulationAccounting,
): AttributionResult<never, PopulationAccountingInvariantError> | null {
  const inputCandidates = new Set(input.intervals.map(({ candidateId }) => candidateId));
  const resultCandidates = new Set(result.dispositions.map(({ candidateId }) => candidateId));
  if (inputCandidates.size !== result.dispositions.length || !setsEqual(inputCandidates, resultCandidates)) {
    return { ok: false, error: populationError("candidate-disposition-bijection") };
  }
  const inputWindows = new Set(input.windows.map(({ windowId }) => windowId));
  const resultWindows = new Set(result.windows.map(({ windowId }) => windowId));
  if (inputWindows.size !== result.windows.length || !setsEqual(inputWindows, resultWindows)) {
    return { ok: false, error: populationError("window-result-bijection") };
  }
  for (const disposition of result.dispositions) {
    if (disposition.type !== "accounted") continue;
    for (const contribution of disposition.contributions) {
      if (!resultWindows.has(contribution.windowId)) {
        return { ok: false, error: populationError("unknown-window-contribution", { candidateId: disposition.candidateId, windowId: contribution.windowId }) };
      }
    }
  }
  return null;
}

function compareWindows(left: AttributionWindow, right: AttributionWindow): number {
  return compareText(left.intent, right.intent)
    || left.measuredInterval.start - right.measuredInterval.start
    || left.measuredInterval.end - right.measuredInterval.end
    || compareText(left.windowId, right.windowId);
}

function validateInterval(
  interval: SecondInterval,
  subject: Omit<PopulationAccountingInvariantError["subject"], "type">,
): PopulationAccountingInvariantError | null {
  if (!Number.isSafeInteger(interval.start) || !Number.isSafeInteger(interval.end) || interval.start >= interval.end) {
    return populationError("invalid-interval", subject);
  }
  return Number.isSafeInteger(interval.end - interval.start)
    ? null
    : populationError("unsafe-interval-seconds", subject);
}

function isValidIdentity(value: string): boolean {
  return value.length > 0
    && value.trim() === value
    && !Array.from(value).some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127);
}

function setsEqual<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  return left.size === right.size && Array.from(left).every((value) => right.has(value));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
