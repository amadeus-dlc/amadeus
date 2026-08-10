declare const targetStageBrand: unique symbol;
declare const outlierLimitBrand: unique symbol;
declare const intentIdentityBrand: unique symbol;
declare const candidateIdBrand: unique symbol;
declare const eventSetIdBrand: unique symbol;
declare const attributionWindowIdBrand: unique symbol;
declare const lifecycleIdentityBrand: unique symbol;

export type TargetStage = string & {
  readonly [targetStageBrand]: "TargetStage";
};

export type OutlierLimit = number & {
  readonly [outlierLimitBrand]: "OutlierLimit";
};

export type IntentIdentity = string & {
  readonly [intentIdentityBrand]: "IntentIdentity";
};

export type CandidateId = string & {
  readonly [candidateIdBrand]: "CandidateId";
};

export type EventSetId = string & {
  readonly [eventSetIdBrand]: "EventSetId";
};

export type AttributionWindowId = string & {
  readonly [attributionWindowIdBrand]: "AttributionWindowId";
};

export type LifecycleIdentity = string & {
  readonly [lifecycleIdentityBrand]: "LifecycleIdentity";
};

export type SecondInterval = {
  readonly start: number;
  readonly end: number;
};

export const CANDIDATE_FAMILIES = [
  "sensor",
  "swarm",
  "bolt",
  "subagent",
  "loop-monitor",
  "merge-dispatch",
  "execution-event-set",
  "unit-pool-event-set",
  "transaction-envelope",
] as const;

export type CandidateFamily = (typeof CANDIDATE_FAMILIES)[number];

export const ATTRIBUTION_CATEGORIES = [
  "sensor-execution",
  "swarm-lifecycle",
  "bolt-lifecycle",
  "subagent-lifecycle",
  "loop-monitor-lifecycle",
  "merge-dispatch-lifecycle",
  "execution-lifecycle",
  "unit-pool-lifecycle",
  "transaction-lifecycle",
] as const;

export type AttributionCategory = (typeof ATTRIBUTION_CATEGORIES)[number];

export const CANDIDATE_CATEGORY_BY_FAMILY: Readonly<Record<CandidateFamily, AttributionCategory>> = {
  sensor: "sensor-execution",
  swarm: "swarm-lifecycle",
  bolt: "bolt-lifecycle",
  subagent: "subagent-lifecycle",
  "loop-monitor": "loop-monitor-lifecycle",
  "merge-dispatch": "merge-dispatch-lifecycle",
  "execution-event-set": "execution-lifecycle",
  "unit-pool-event-set": "unit-pool-lifecycle",
  "transaction-envelope": "transaction-lifecycle",
};

export function attributionCategoryForFamily(
  family: CandidateFamily,
): AttributionCategory {
  return CANDIDATE_CATEGORY_BY_FAMILY[family];
}

export const CANDIDATE_REJECTION_REASON_PRECEDENCE = [
  "malformed-event-set",
  "digest-mismatch",
  "unsupported-event-set-schema",
  "duplicate-event-set-id",
  "missing-intent",
  "intent-mismatch",
  "missing-stage",
  "stage-mismatch",
  "missing-identity",
  "duplicate-start",
  "duplicate-terminal",
  "missing-start",
  "missing-terminal",
  "invalid-timestamp",
  "non-positive-interval",
  "outside-window",
  "empty-after-idle",
] as const;

export type CandidateRejectionReason = (typeof CANDIDATE_REJECTION_REASON_PRECEDENCE)[number];

export type CandidateFinding = {
  readonly type: "candidate-finding";
  readonly reason: CandidateRejectionReason;
};

export type CandidateBoundary = {
  readonly sourceId: EventSetId;
  readonly kind: "start" | "terminal";
  readonly at: number | null;
};

export type DecodedCandidate = {
  readonly type: "decoded-candidate";
  readonly candidateId: CandidateId;
  readonly sourceIds: readonly EventSetId[];
  readonly family: CandidateFamily;
  readonly category: AttributionCategory;
  readonly explicitIntent: IntentIdentity | null;
  readonly explicitStage: TargetStage | null;
  readonly lifecycleIdentity: LifecycleIdentity | null;
  readonly starts: readonly CandidateBoundary[];
  readonly terminals: readonly CandidateBoundary[];
  readonly findings: readonly CandidateFinding[];
};

export type RejectedCandidate = {
  readonly type: "rejected-candidate";
  readonly candidateId: CandidateId;
  readonly sourceIds: readonly EventSetId[];
  readonly family: CandidateFamily;
  readonly primaryReason: CandidateRejectionReason;
  readonly secondaryReasons: readonly CandidateRejectionReason[];
};

export type ExplicitLifecycleInterval = {
  readonly type: "explicit-lifecycle-interval";
  readonly candidateId: CandidateId;
  readonly explicitIntent: IntentIdentity;
  readonly lifecycleIdentity: LifecycleIdentity;
  readonly family: CandidateFamily;
  readonly category: AttributionCategory;
  readonly stage: TargetStage;
  readonly interval: SecondInterval;
};

export type AttributionWindow = {
  readonly type: "attribution-window";
  readonly windowId: AttributionWindowId;
  readonly intent: IntentIdentity;
  readonly stage: TargetStage;
  readonly measuredInterval: SecondInterval;
  readonly netSeconds: number;
};

export type AttributionWindowInput = {
  readonly windowId: AttributionWindowId;
  readonly intent: IntentIdentity | null;
  readonly stage: TargetStage | null;
  readonly measuredInterval: SecondInterval | null;
  readonly netSeconds: number;
};

export type CandidateWindowContribution = {
  readonly type: "candidate-window-contribution";
  readonly windowId: AttributionWindowId;
  readonly fragments: readonly [SecondInterval, ...SecondInterval[]];
};

export type AccountedCandidateDisposition = {
  readonly type: "accounted";
  readonly candidateId: CandidateId;
  readonly contributions: readonly [CandidateWindowContribution, ...CandidateWindowContribution[]];
};

export const POST_ACCOUNTING_REJECTION_REASONS = ["outside-window", "empty-after-idle"] as const;

export type PostAccountingRejectionReason = (typeof POST_ACCOUNTING_REJECTION_REASONS)[number];

export type RejectedCandidateDisposition = {
  readonly type: "rejected";
  readonly candidateId: CandidateId;
  readonly reason: PostAccountingRejectionReason;
};

export type CandidateAccountingDisposition = AccountedCandidateDisposition | RejectedCandidateDisposition;

export type AttributionPopulationAccounting = {
  readonly type: "attribution-population-accounting";
  readonly windows: readonly AttributionWindow[];
  readonly dispositions: readonly CandidateAccountingDisposition[];
};

export function candidatePrimaryReason(
  findings: readonly CandidateFinding[],
): CandidateRejectionReason {
  if (findings.length === 0) {
    throw new TypeError("candidatePrimaryReason requires at least one finding");
  }
  let primary = findings[0]!.reason;
  for (const finding of findings.slice(1)) {
    if (CANDIDATE_REJECTION_REASON_PRECEDENCE.indexOf(finding.reason) < CANDIDATE_REJECTION_REASON_PRECEDENCE.indexOf(primary)) {
      primary = finding.reason;
    }
  }
  return primary;
}

export function createRejectedCandidate(input: {
  readonly candidateId: CandidateId;
  readonly sourceIds: readonly EventSetId[];
  readonly family: CandidateFamily;
  readonly findings: readonly CandidateFinding[];
}): RejectedCandidate {
  const primaryReason = candidatePrimaryReason(input.findings);
  const reasons = new Set(input.findings.map(({ reason }) => reason));
  const secondaryReasons = CANDIDATE_REJECTION_REASON_PRECEDENCE.filter(
    (reason) => reason !== primaryReason && reasons.has(reason),
  );
  return Object.freeze({
    type: "rejected-candidate" as const,
    candidateId: input.candidateId,
    sourceIds: Object.freeze([...input.sourceIds]),
    family: input.family,
    primaryReason,
    secondaryReasons: Object.freeze(secondaryReasons),
  });
}

function finding(reason: CandidateRejectionReason): CandidateFinding {
  return { type: "candidate-finding", reason };
}

function candidateShapeFindings(candidate: DecodedCandidate): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  if (candidate.category !== attributionCategoryForFamily(candidate.family)) findings.push(finding("malformed-event-set"));
  if (candidate.explicitIntent === null) findings.push(finding("missing-intent"));
  if (candidate.explicitStage === null) findings.push(finding("missing-stage"));
  if (candidate.lifecycleIdentity === null) findings.push(finding("missing-identity"));
  if (candidate.starts.length === 0) findings.push(finding("missing-start"));
  if (candidate.starts.length > 1) findings.push(finding("duplicate-start"));
  if (candidate.terminals.length === 0) findings.push(finding("missing-terminal"));
  if (candidate.terminals.length > 1) findings.push(finding("duplicate-terminal"));
  return findings;
}

function isIntegerTimestamp(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function candidateBoundaryFindings(candidate: DecodedCandidate): CandidateFinding[] {
  if (candidate.starts.length !== 1 || candidate.terminals.length !== 1) return [];
  const start = candidate.starts[0]!;
  const terminal = candidate.terminals[0]!;
  const findings: CandidateFinding[] = [];
  if (start.kind !== "start" || terminal.kind !== "terminal") findings.push(finding("malformed-event-set"));
  if (!isIntegerTimestamp(start.at) || !isIntegerTimestamp(terminal.at)) {
    findings.push(finding("invalid-timestamp"));
  } else if (start.at >= terminal.at) {
    findings.push(finding("non-positive-interval"));
  }
  return findings;
}

export function createExplicitLifecycleInterval(
  candidate: DecodedCandidate,
): AttributionResult<ExplicitLifecycleInterval, RejectedCandidate> {
  const findings = [...candidate.findings, ...candidateShapeFindings(candidate), ...candidateBoundaryFindings(candidate)];

  if (findings.length > 0) {
    return {
      ok: false,
      error: createRejectedCandidate({
        candidateId: candidate.candidateId,
        sourceIds: candidate.sourceIds,
        family: candidate.family,
        findings,
      }),
    };
  }

  const start = candidate.starts[0]!.at as number;
  const end = candidate.terminals[0]!.at as number;

  return {
    ok: true,
    value: Object.freeze({
      type: "explicit-lifecycle-interval" as const,
      candidateId: candidate.candidateId,
      explicitIntent: candidate.explicitIntent as IntentIdentity,
      lifecycleIdentity: candidate.lifecycleIdentity as LifecycleIdentity,
      family: candidate.family,
      category: candidate.category,
      stage: candidate.explicitStage as TargetStage,
      interval: Object.freeze({ start, end }),
    }),
  };
}

function isPositiveSecondInterval(interval: SecondInterval): boolean {
  return Number.isFinite(interval.start)
    && Number.isFinite(interval.end)
    && Number.isInteger(interval.start)
    && Number.isInteger(interval.end)
    && interval.start < interval.end;
}

function attributionWindowError(
  windowId: AttributionWindowId,
  invariant: Extract<AccountingInvariantError, { readonly code: "invalid-attribution-window" }>["invariant"],
): AttributionResult<never, AccountingInvariantError> {
  return {
    ok: false,
    error: {
      type: "accounting-invariant",
      code: "invalid-attribution-window",
      subject: { type: "window", windowId },
      invariant,
    },
  };
}

export function createAttributionWindow(
  input: AttributionWindowInput,
): AttributionResult<AttributionWindow, AccountingInvariantError> {
  if (input.intent === null) return attributionWindowError(input.windowId, "missing-intent");
  if (input.stage === null) return attributionWindowError(input.windowId, "missing-stage");
  if (input.measuredInterval === null || !isPositiveSecondInterval(input.measuredInterval)) {
    return attributionWindowError(input.windowId, "invalid-measured-interval");
  }
  if (!Number.isFinite(input.netSeconds) || !Number.isInteger(input.netSeconds) || input.netSeconds <= 0) {
    return attributionWindowError(input.windowId, "invalid-net-seconds");
  }
  if (input.netSeconds > input.measuredInterval.end - input.measuredInterval.start) {
    return attributionWindowError(input.windowId, "net-seconds-exceed-duration");
  }
  return {
    ok: true,
    value: Object.freeze({
      type: "attribution-window" as const,
      windowId: input.windowId,
      intent: input.intent,
      stage: input.stage,
      measuredInterval: Object.freeze({ ...input.measuredInterval }),
      netSeconds: input.netSeconds,
    }),
  };
}

export function createCandidateWindowContribution(
  windowId: AttributionWindowId,
  fragments: readonly SecondInterval[],
): AttributionResult<CandidateWindowContribution, AccountingInvariantError> {
  const subject = { type: "window" as const, windowId };
  if (fragments.length === 0) {
    return {
      ok: false,
      error: {
        type: "accounting-invariant",
        code: "invalid-candidate-contribution",
        subject,
        invariant: "empty-fragments",
      },
    };
  }
  if (!fragments.every(isPositiveSecondInterval)) {
    return {
      ok: false,
      error: {
        type: "accounting-invariant",
        code: "invalid-candidate-contribution",
        subject,
        invariant: "invalid-fragment",
      },
    };
  }
  const copied = fragments.map((fragment) => Object.freeze({ ...fragment })) as [SecondInterval, ...SecondInterval[]];
  return {
    ok: true,
    value: Object.freeze({
      type: "candidate-window-contribution" as const,
      windowId,
      fragments: Object.freeze(copied),
    }),
  };
}

export function createAccountedDisposition(
  candidateId: CandidateId,
  contributions: readonly CandidateWindowContribution[],
): AttributionResult<AccountedCandidateDisposition, AccountingInvariantError> {
  if (contributions.length === 0) {
    return {
      ok: false,
      error: {
        type: "accounting-invariant",
        code: "invalid-accounting-disposition",
        subject: { type: "population", candidateId },
        invariant: "empty-contributions",
      },
    };
  }
  const copied = [...contributions] as [CandidateWindowContribution, ...CandidateWindowContribution[]];
  return {
    ok: true,
    value: Object.freeze({
      type: "accounted" as const,
      candidateId,
      contributions: Object.freeze(copied),
    }),
  };
}

export function createRejectedDisposition(
  candidateId: CandidateId,
  reason: PostAccountingRejectionReason,
): RejectedCandidateDisposition {
  return Object.freeze({ type: "rejected" as const, candidateId, reason });
}

export function createAttributionPopulationAccounting(
  windows: readonly AttributionWindow[],
  dispositions: readonly CandidateAccountingDisposition[],
): AttributionResult<AttributionPopulationAccounting, AccountingInvariantError> {
  const windowIds = new Set<AttributionWindowId>();
  for (const window of windows) {
    if (windowIds.has(window.windowId)) {
      return {
        ok: false,
        error: {
          type: "accounting-invariant",
          code: "invalid-attribution-population",
          subject: { type: "population" },
          invariant: "duplicate-window-id",
          windowId: window.windowId,
        },
      };
    }
    windowIds.add(window.windowId);
  }

  for (const disposition of dispositions) {
    if (disposition.type !== "accounted") continue;
    for (const contribution of disposition.contributions) {
      if (!windowIds.has(contribution.windowId)) {
        return {
          ok: false,
          error: {
            type: "accounting-invariant",
            code: "invalid-attribution-population",
            subject: { type: "population", candidateId: disposition.candidateId },
            invariant: "unknown-window-id",
            windowId: contribution.windowId,
          },
        };
      }
    }
  }

  return {
    ok: true,
    value: Object.freeze({
      type: "attribution-population-accounting" as const,
      windows: Object.freeze([...windows]),
      dispositions: Object.freeze([...dispositions]),
    }),
  };
}

export type UsageError =
  | {
      readonly type: "usage";
      readonly code: "invalid-target-stage";
      readonly argument: "stage";
      readonly value: string;
    }
  | {
      readonly type: "usage";
      readonly code: "invalid-outlier-limit";
      readonly argument: "outliers";
      readonly value: string;
    };

export type AttributionResult<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export type IdentityKind =
  | "intent"
  | "candidate"
  | "event-set"
  | "attribution-window"
  | "lifecycle";

export type DecodeError = {
  readonly type: "decode";
  readonly code: "invalid-identity";
  readonly identity: IdentityKind;
  readonly value: string;
};

export type AccountingInvariantSubject =
  | {
      readonly type: "window";
      readonly windowId: AttributionWindowId;
    }
  | {
      readonly type: "population";
      readonly candidateId?: CandidateId;
    };

export type AccountingInvariantError =
  | {
      readonly type: "accounting-invariant";
      readonly code: "invalid-second-interval";
      readonly subject: AccountingInvariantSubject;
      readonly start: number;
      readonly end: number;
    }
  | {
      readonly type: "accounting-invariant";
      readonly code: "invalid-attribution-window";
      readonly subject: Extract<AccountingInvariantSubject, { readonly type: "window" }>;
      readonly invariant:
        | "missing-intent"
        | "missing-stage"
        | "invalid-measured-interval"
        | "invalid-net-seconds"
        | "net-seconds-exceed-duration";
    }
  | {
      readonly type: "accounting-invariant";
      readonly code: "invalid-candidate-contribution";
      readonly subject: Extract<AccountingInvariantSubject, { readonly type: "window" }>;
      readonly invariant: "empty-fragments" | "invalid-fragment";
    }
  | {
      readonly type: "accounting-invariant";
      readonly code: "invalid-accounting-disposition";
      readonly subject: Extract<AccountingInvariantSubject, { readonly type: "population" }>;
      readonly invariant: "empty-contributions";
    }
  | {
      readonly type: "accounting-invariant";
      readonly code: "invalid-attribution-population";
      readonly subject: Extract<AccountingInvariantSubject, { readonly type: "population" }>;
      readonly invariant: "duplicate-window-id" | "unknown-window-id";
      readonly windowId: AttributionWindowId;
    };

export type AttributionError = UsageError | DecodeError | AccountingInvariantError;

const TARGET_STAGE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function parseTargetStage(
  raw: string | undefined,
): AttributionResult<TargetStage, UsageError> {
  const value = raw ?? "code-generation";
  if (value.length < 1 || value.length > 64 || !TARGET_STAGE_PATTERN.test(value)) {
    return {
      ok: false,
      error: {
        type: "usage",
        code: "invalid-target-stage",
        argument: "stage",
        value,
      },
    };
  }
  return { ok: true, value: value as TargetStage };
}

export function parseOutlierLimit(
  raw: string | undefined,
): AttributionResult<OutlierLimit, UsageError> {
  const value = raw ?? "10";
  if (!/^\d+$/.test(value)) {
    return outlierLimitError(value);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > 100) {
    return outlierLimitError(value);
  }
  return { ok: true, value: parsed as OutlierLimit };
}

function outlierLimitError(
  value: string,
): AttributionResult<never, UsageError> {
  return {
    ok: false,
    error: {
      type: "usage",
      code: "invalid-outlier-limit",
      argument: "outliers",
      value,
    },
  };
}

export function createSecondInterval(
  start: number,
  end: number,
  subject: AccountingInvariantSubject = { type: "population" },
): AttributionResult<SecondInterval, AccountingInvariantError> {
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isInteger(start) || !Number.isInteger(end) || start >= end) {
    return {
      ok: false,
      error: {
        type: "accounting-invariant",
        code: "invalid-second-interval",
        subject,
        start,
        end,
      },
    };
  }
  return { ok: true, value: Object.freeze({ start, end }) };
}

function createIdentity<T extends string>(
  identity: IdentityKind,
  value: string,
): AttributionResult<T, DecodeError> {
  if (value.length === 0 || value.trim() !== value || hasAsciiControl(value)) {
    return {
      ok: false,
      error: {
        type: "decode",
        code: "invalid-identity",
        identity,
        value,
      },
    };
  }
  return { ok: true, value: value as T };
}

function hasAsciiControl(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export function createIntentIdentity(
  value: string,
): AttributionResult<IntentIdentity, DecodeError> {
  return createIdentity("intent", value);
}

export function createCandidateId(
  value: string,
): AttributionResult<CandidateId, DecodeError> {
  return createIdentity("candidate", value);
}

export function createEventSetId(
  value: string,
): AttributionResult<EventSetId, DecodeError> {
  return createIdentity("event-set", value);
}

export function createAttributionWindowId(
  value: string,
): AttributionResult<AttributionWindowId, DecodeError> {
  return createIdentity("attribution-window", value);
}

export function createLifecycleIdentity(
  value: string,
): AttributionResult<LifecycleIdentity, DecodeError> {
  return createIdentity("lifecycle", value);
}
