import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export const GOAL_SCHEMA_VERSION = 1 as const;

const SHA256_RE = /^[0-9a-f]{64}$/u;
const VERDICTS = ["ACHIEVED", "DEVIATED", "UNVERIFIED"] as const;
const EVIDENCE_KINDS = ["deterministic-check", "human-ruling"] as const;

export type GoalVerdict = (typeof VERDICTS)[number];
export type GoalEvidenceKind = (typeof EVIDENCE_KINDS)[number];

export type GoalRevision = {
  readonly revision: number;
  readonly parentRevision: number | null;
  readonly statement: string;
  readonly scope: string;
  readonly successMetrics: readonly string[];
  readonly source: "intent-birth" | "approved-change-proposal" | "legacy-migration";
  readonly createdAt: string;
  readonly approvalReference: string;
  readonly digest: string;
};

export type GoalLineage = {
  readonly schemaVersion: typeof GOAL_SCHEMA_VERSION;
  readonly intentId: string;
  readonly goalId: string;
  readonly currentRevision: number;
  readonly revisions: readonly GoalRevision[];
};

export type GoalEvidenceReference = {
  readonly kind: GoalEvidenceKind;
  readonly reference: string;
  readonly digest: string;
};

export type GoalReconciliationItem = {
  readonly id: string;
  readonly verdict: GoalVerdict;
  readonly evidence: readonly GoalEvidenceReference[];
};

export type GoalReconciliationReceipt = {
  readonly schemaVersion: typeof GOAL_SCHEMA_VERSION;
  readonly receiptId: string;
  readonly intentId: string;
  readonly goalId: string;
  readonly goalRevision: number;
  readonly goalDigest: string;
  readonly scope: string;
  readonly finalStage: string;
  readonly completionInstance: string;
  readonly completionContextDigest: string;
  readonly items: readonly GoalReconciliationItem[];
  readonly overallVerdict: GoalVerdict;
  readonly evidenceDigest: string;
  readonly humanRulingReference: string | null;
  readonly createdAt: string;
};

export type GoalChangeProposal = {
  readonly schemaVersion: typeof GOAL_SCHEMA_VERSION;
  readonly proposalId: string;
  readonly intentId: string;
  readonly goalId: string;
  readonly parentRevision: number;
  readonly parentDigest: string;
  readonly statementBefore: string;
  readonly statementAfter: string;
  readonly successMetricsBefore: readonly string[];
  readonly successMetricsAfter: readonly string[];
  readonly reason: string;
  readonly unmetCurrentGoalItems: readonly string[];
  readonly impact: string;
  readonly evidence: readonly GoalEvidenceReference[];
  readonly createdAt: string;
  readonly createdBy: "ai-change-proposal" | "human-change-proposal" | "legacy-reconstruction";
};

export type LegacyGoalMigrationProposal = {
  readonly schemaVersion: typeof GOAL_SCHEMA_VERSION;
  readonly proposalId: string;
  readonly intentId: string;
  readonly statement: string;
  readonly scope: string;
  readonly successMetrics: readonly string[];
  readonly stateProject: string;
  readonly requirementsReference: string | null;
  readonly requirementsDigest: string | null;
  readonly completionAuditDigest: string;
  readonly uncertainties: readonly string[];
  readonly createdAt: string;
};

type JsonObject = { readonly [key: string]: JsonValue };
type JsonValue = string | number | boolean | null | JsonObject | readonly JsonValue[];

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!isObject(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value as number;
}

function requireDigest(value: unknown, label: string): string {
  const digest = requireString(value, label);
  if (!SHA256_RE.test(digest)) throw new Error(`${label} must be a SHA-256 digest`);
  return digest;
}

function requireIsoTimestamp(value: unknown, label: string): string {
  const timestamp = requireString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(timestamp)) {
    throw new Error(`${label} must be an ISO 8601 UTC timestamp`);
  }
  return timestamp;
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((item, index) => requireString(item, `${label}[${index}]`));
}

function requireVerdict(value: unknown, label: string): GoalVerdict {
  if (typeof value !== "string" || !(VERDICTS as readonly string[]).includes(value)) {
    throw new Error(`${label} has an unknown verdict`);
  }
  return value as GoalVerdict;
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

export function goalDigest(value: JsonValue): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function revisionDigest(input: Omit<GoalRevision, "digest">): string {
  return goalDigest(input as unknown as JsonObject);
}

function parseRevision(value: unknown, index: number): GoalRevision {
  const row = requireObject(value, `revisions[${index}]`);
  const revision = requireInteger(row.revision, `revisions[${index}].revision`);
  const parentRevision = row.parentRevision === null
    ? null
    : requireInteger(row.parentRevision, `revisions[${index}].parentRevision`);
  const parsed: Omit<GoalRevision, "digest"> = {
    revision,
    parentRevision,
    statement: requireString(row.statement, `revisions[${index}].statement`),
    scope: requireString(row.scope, `revisions[${index}].scope`),
    successMetrics: requireStringArray(
      row.successMetrics,
      `revisions[${index}].successMetrics`,
    ),
    source: requireRevisionSource(row.source, `revisions[${index}].source`),
    createdAt: requireIsoTimestamp(row.createdAt, `revisions[${index}].createdAt`),
    approvalReference: requireString(
      row.approvalReference,
      `revisions[${index}].approvalReference`,
    ),
  };
  const digest = requireDigest(row.digest, `revisions[${index}].digest`);
  if (revisionDigest(parsed) !== digest) {
    throw new Error(`revisions[${index}] digest does not match approved content`);
  }
  return { ...parsed, digest };
}

function requireRevisionSource(
  value: unknown,
  label: string,
): GoalRevision["source"] {
  const sources: readonly GoalRevision["source"][] = [
    "intent-birth",
    "approved-change-proposal",
    "legacy-migration",
  ];
  if (typeof value !== "string" || !(sources as readonly string[]).includes(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value as GoalRevision["source"];
}

export function createInitialGoalLineage(input: {
  readonly intentId: string;
  readonly statement: string;
  readonly scope: string;
  readonly createdAt: string;
  readonly successMetrics?: readonly string[];
}): GoalLineage {
  return createRevisionZeroLineage({
    ...input,
    source: "intent-birth",
    approvalReference: `intent-birth:${input.intentId}`,
  });
}

function createRevisionZeroLineage(input: {
  readonly intentId: string;
  readonly statement: string;
  readonly scope: string;
  readonly createdAt: string;
  readonly successMetrics?: readonly string[];
  readonly source: "intent-birth" | "legacy-migration";
  readonly approvalReference: string;
}): GoalLineage {
  const intentId = requireString(input.intentId, "intentId");
  const statement = requireString(input.statement, "statement");
  const scope = requireString(input.scope, "scope");
  const createdAt = requireIsoTimestamp(input.createdAt, "createdAt");
  const revisionWithoutDigest: Omit<GoalRevision, "digest"> = {
    revision: 0,
    parentRevision: null,
    statement,
    scope,
    successMetrics: [...(input.successMetrics ?? [])],
    source: input.source,
    createdAt,
    approvalReference: requireString(input.approvalReference, "approvalReference"),
  };
  const revision: GoalRevision = {
    ...revisionWithoutDigest,
    digest: revisionDigest(revisionWithoutDigest),
  };
  return {
    schemaVersion: GOAL_SCHEMA_VERSION,
    intentId,
    goalId: `goal-${goalDigest({ intentId, statement, scope }).slice(0, 32)}`,
    currentRevision: 0,
    revisions: [revision],
  };
}

export function createLegacyGoalLineage(input: {
  readonly intentId: string;
  readonly statement: string;
  readonly scope: string;
  readonly createdAt: string;
  readonly successMetrics: readonly string[];
  readonly approvalReference: string;
}): GoalLineage {
  return createRevisionZeroLineage({
    ...input,
    source: "legacy-migration",
  });
}

export function parseGoalLineage(raw: string): GoalLineage {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (cause) {
    throw new Error(`Goal lineage is not valid JSON: ${String(cause)}`);
  }
  const row = requireObject(decoded, "Goal lineage");
  if (row.schemaVersion !== GOAL_SCHEMA_VERSION) {
    throw new Error(`Goal lineage schemaVersion must be ${GOAL_SCHEMA_VERSION}`);
  }
  if (!Array.isArray(row.revisions) || row.revisions.length === 0) {
    throw new Error("Goal lineage revisions must be non-empty");
  }
  const revisions = row.revisions.map(parseRevision);
  for (let index = 0; index < revisions.length; index++) {
    const revision = revisions[index];
    if (revision.revision !== index) throw new Error("Goal revisions must be contiguous");
    const expectedParent = index === 0 ? null : index - 1;
    if (revision.parentRevision !== expectedParent) {
      throw new Error("Goal revision parent does not match the immutable lineage");
    }
  }
  const currentRevision = requireInteger(row.currentRevision, "currentRevision");
  if (currentRevision !== revisions.length - 1) {
    throw new Error("currentRevision must identify the latest approved revision");
  }
  return {
    schemaVersion: GOAL_SCHEMA_VERSION,
    intentId: requireString(row.intentId, "intentId"),
    goalId: requireString(row.goalId, "goalId"),
    currentRevision,
    revisions,
  };
}

function parseEvidence(value: unknown, itemIndex: number, evidenceIndex: number): GoalEvidenceReference {
  const label = `items[${itemIndex}].evidence[${evidenceIndex}]`;
  const row = requireObject(value, label);
  if (
    typeof row.kind !== "string" ||
    !(EVIDENCE_KINDS as readonly string[]).includes(row.kind)
  ) {
    throw new Error(`${label}.kind is invalid`);
  }
  return {
    kind: row.kind as GoalEvidenceKind,
    reference: requireString(row.reference, `${label}.reference`),
    digest: requireDigest(row.digest, `${label}.digest`),
  };
}

function parseItem(value: unknown, index: number): GoalReconciliationItem {
  const row = requireObject(value, `items[${index}]`);
  if (!Array.isArray(row.evidence) || row.evidence.length === 0) {
    throw new Error(`items[${index}].evidence must be non-empty`);
  }
  return {
    id: requireString(row.id, `items[${index}].id`),
    verdict: requireVerdict(row.verdict, `items[${index}].verdict`),
    evidence: row.evidence.map((entry, evidenceIndex) =>
      parseEvidence(entry, index, evidenceIndex)
    ),
  };
}

function aggregateVerdict(items: readonly GoalReconciliationItem[]): GoalVerdict {
  if (items.every((item) => item.verdict === "ACHIEVED")) return "ACHIEVED";
  if (items.some((item) => item.verdict === "DEVIATED")) return "DEVIATED";
  return "UNVERIFIED";
}

export function parseGoalReconciliationItems(raw: string): GoalReconciliationItem[] {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (cause) {
    throw new Error(`Goal reconciliation items are not valid JSON: ${String(cause)}`);
  }
  if (!Array.isArray(decoded) || decoded.length === 0) {
    throw new Error("Goal reconciliation items must be a non-empty array");
  }
  return decoded.map(parseItem);
}

export function parseGoalReconciliationReceipt(raw: string): GoalReconciliationReceipt {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (cause) {
    throw new Error(`Goal reconciliation receipt is not valid JSON: ${String(cause)}`);
  }
  const row = requireObject(decoded, "Goal reconciliation receipt");
  if (row.schemaVersion !== GOAL_SCHEMA_VERSION) {
    throw new Error(`Goal reconciliation receipt schemaVersion must be ${GOAL_SCHEMA_VERSION}`);
  }
  if (!Array.isArray(row.items) || row.items.length === 0) {
    throw new Error("Goal reconciliation receipt items must be non-empty");
  }
  const items = row.items.map(parseItem);
  const overallVerdict = requireVerdict(row.overallVerdict, "overallVerdict");
  if (aggregateVerdict(items) !== overallVerdict) {
    throw new Error("overall verdict does not match the item verdicts");
  }
  const humanRulingReference = row.humanRulingReference === null
    ? null
    : requireString(row.humanRulingReference, "humanRulingReference");
  if (
    items.some((item) => item.evidence.some((evidence) => evidence.kind === "human-ruling")) &&
    humanRulingReference === null
  ) {
    throw new Error("human-ruling evidence requires humanRulingReference");
  }
  return {
    schemaVersion: GOAL_SCHEMA_VERSION,
    receiptId: requireString(row.receiptId, "receiptId"),
    intentId: requireString(row.intentId, "intentId"),
    goalId: requireString(row.goalId, "goalId"),
    goalRevision: requireInteger(row.goalRevision, "goalRevision"),
    goalDigest: requireDigest(row.goalDigest, "goalDigest"),
    scope: requireString(row.scope, "scope"),
    finalStage: requireString(row.finalStage, "finalStage"),
    completionInstance: requireString(row.completionInstance, "completionInstance"),
    completionContextDigest: requireDigest(
      row.completionContextDigest,
      "completionContextDigest",
    ),
    items,
    overallVerdict,
    evidenceDigest: requireDigest(row.evidenceDigest, "evidenceDigest"),
    humanRulingReference,
    createdAt: requireIsoTimestamp(row.createdAt, "createdAt"),
  };
}

export function goalCompletionContextDigest(input: {
  readonly scope: string;
  readonly finalStage: string;
  readonly executionProjection: string;
}): string {
  return goalDigest({
    scope: requireString(input.scope, "scope"),
    finalStage: requireString(input.finalStage, "finalStage"),
    executionProjection: input.executionProjection,
  });
}

export type GoalCompletionAuthorization =
  | { readonly kind: "authorized"; readonly receipt: GoalReconciliationReceipt }
  | { readonly kind: "rejected"; readonly reason: string };

export function authorizeGoalCompletion(input: {
  readonly intentId: string;
  readonly lineage: GoalLineage;
  readonly receipt: GoalReconciliationReceipt;
  readonly scope: string;
  readonly finalStage: string;
  readonly completionInstance: string;
  readonly completionContextDigest: string;
}): GoalCompletionAuthorization {
  const current = input.lineage.revisions[input.lineage.currentRevision];
  if (input.receipt.overallVerdict !== "ACHIEVED") {
    return {
      kind: "rejected",
      reason: `receipt verdict is ${input.receipt.overallVerdict}`,
    };
  }
  if (input.lineage.intentId !== input.intentId || input.receipt.intentId !== input.intentId) {
    return { kind: "rejected", reason: "receipt belongs to another Intent" };
  }
  if (input.receipt.goalId !== input.lineage.goalId) {
    return { kind: "rejected", reason: "receipt Goal identity does not match" };
  }
  if (input.receipt.goalRevision !== input.lineage.currentRevision) {
    return { kind: "rejected", reason: "receipt Goal revision is stale" };
  }
  if (input.receipt.goalDigest !== current.digest) {
    return { kind: "rejected", reason: "receipt Goal digest does not match" };
  }
  if (input.receipt.scope !== input.scope || input.receipt.finalStage !== input.finalStage) {
    return { kind: "rejected", reason: "receipt scope or final stage does not match" };
  }
  if (input.receipt.completionInstance !== input.completionInstance) {
    return { kind: "rejected", reason: "receipt completion instance does not match" };
  }
  if (input.receipt.completionContextDigest !== input.completionContextDigest) {
    return { kind: "rejected", reason: "receipt completion context has changed" };
  }
  return { kind: "authorized", receipt: input.receipt };
}

export function goalLineagePath(recordDir: string): string {
  return join(recordDir, "goal", "goal-lineage.json");
}

export function goalReceiptPath(recordDir: string, completionInstance: string): string {
  const safeInstance = goalDigest(completionInstance).slice(0, 32);
  return join(
    recordDir,
    "goal",
    "reconciliation-receipts",
    `${safeInstance}.json`,
  );
}

export function goalProposalPath(recordDir: string, proposalId: string): string {
  return join(recordDir, "goal", "proposals", `${proposalId}.json`);
}

export function legacyGoalProposalPath(recordDir: string, proposalId: string): string {
  return join(recordDir, "goal", "legacy-proposals", `${proposalId}.json`);
}

function writeJsonAtomic(path: string, value: JsonValue): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${canonicalJson(value)}\n`, "utf8");
  renameSync(temporary, path);
}

export function writeInitialGoalLineage(recordDir: string, lineage: GoalLineage): void {
  const path = goalLineagePath(recordDir);
  if (existsSync(path)) throw new Error("Initial Goal lineage already exists");
  writeJsonAtomic(path, lineage as unknown as JsonObject);
}

export function readGoalLineage(recordDir: string): GoalLineage {
  const path = goalLineagePath(recordDir);
  if (!existsSync(path)) throw new Error("Goal lineage is missing");
  return parseGoalLineage(readFileSync(path, "utf8"));
}

export function writeGoalReconciliationReceipt(
  recordDir: string,
  receipt: GoalReconciliationReceipt,
): void {
  const parsed = parseGoalReconciliationReceipt(JSON.stringify(receipt));
  writeJsonAtomic(
    goalReceiptPath(recordDir, parsed.completionInstance),
    parsed as unknown as JsonObject,
  );
}

export function readGoalReconciliationReceipt(
  recordDir: string,
  completionInstance: string,
): GoalReconciliationReceipt {
  const path = goalReceiptPath(recordDir, completionInstance);
  if (!existsSync(path)) throw new Error("Goal reconciliation receipt is missing");
  return parseGoalReconciliationReceipt(readFileSync(path, "utf8"));
}

export function createGoalChangeProposal(input: {
  readonly lineage: GoalLineage;
  readonly statementAfter: string;
  readonly successMetricsAfter: readonly string[];
  readonly reason: string;
  readonly unmetCurrentGoalItems: readonly string[];
  readonly impact: string;
  readonly evidence: readonly GoalEvidenceReference[];
  readonly createdAt: string;
  readonly createdBy?: GoalChangeProposal["createdBy"];
}): GoalChangeProposal {
  const current = input.lineage.revisions[input.lineage.currentRevision];
  const identity = {
    intentId: input.lineage.intentId,
    goalId: input.lineage.goalId,
    parentRevision: input.lineage.currentRevision,
    parentDigest: current.digest,
    statementAfter: requireString(input.statementAfter, "statementAfter"),
    successMetricsAfter: [...input.successMetricsAfter],
    reason: requireString(input.reason, "reason"),
    createdAt: requireIsoTimestamp(input.createdAt, "createdAt"),
  };
  return {
    schemaVersion: GOAL_SCHEMA_VERSION,
    proposalId: `proposal-${goalDigest(identity).slice(0, 32)}`,
    ...identity,
    statementBefore: current.statement,
    successMetricsBefore: [...current.successMetrics],
    unmetCurrentGoalItems: [...input.unmetCurrentGoalItems],
    impact: requireString(input.impact, "impact"),
    evidence: [...input.evidence],
    createdBy: input.createdBy ?? "ai-change-proposal",
  };
}

export function parseGoalChangeProposal(raw: string): GoalChangeProposal {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (cause) {
    throw new Error(`Goal change proposal is not valid JSON: ${String(cause)}`);
  }
  const row = requireObject(decoded, "Goal change proposal");
  if (row.schemaVersion !== GOAL_SCHEMA_VERSION) {
    throw new Error(`Goal change proposal schemaVersion must be ${GOAL_SCHEMA_VERSION}`);
  }
  if (!Array.isArray(row.evidence)) throw new Error("proposal evidence must be an array");
  const evidence = row.evidence.map((entry, index) => parseEvidence(entry, 0, index));
  const createdByValues: readonly GoalChangeProposal["createdBy"][] = [
    "ai-change-proposal",
    "human-change-proposal",
    "legacy-reconstruction",
  ];
  if (
    typeof row.createdBy !== "string" ||
    !(createdByValues as readonly string[]).includes(row.createdBy)
  ) {
    throw new Error("proposal createdBy is invalid");
  }
  const proposal: GoalChangeProposal = {
    schemaVersion: GOAL_SCHEMA_VERSION,
    proposalId: requireString(row.proposalId, "proposalId"),
    intentId: requireString(row.intentId, "intentId"),
    goalId: requireString(row.goalId, "goalId"),
    parentRevision: requireInteger(row.parentRevision, "parentRevision"),
    parentDigest: requireDigest(row.parentDigest, "parentDigest"),
    statementBefore: requireString(row.statementBefore, "statementBefore"),
    statementAfter: requireString(row.statementAfter, "statementAfter"),
    successMetricsBefore: requireStringArray(
      row.successMetricsBefore,
      "successMetricsBefore",
    ),
    successMetricsAfter: requireStringArray(
      row.successMetricsAfter,
      "successMetricsAfter",
    ),
    reason: requireString(row.reason, "reason"),
    unmetCurrentGoalItems: requireStringArray(
      row.unmetCurrentGoalItems,
      "unmetCurrentGoalItems",
    ),
    impact: requireString(row.impact, "impact"),
    evidence,
    createdAt: requireIsoTimestamp(row.createdAt, "createdAt"),
    createdBy: row.createdBy as GoalChangeProposal["createdBy"],
  };
  const expectedId = `proposal-${goalDigest({
    intentId: proposal.intentId,
    goalId: proposal.goalId,
    parentRevision: proposal.parentRevision,
    parentDigest: proposal.parentDigest,
    statementAfter: proposal.statementAfter,
    successMetricsAfter: proposal.successMetricsAfter,
    reason: proposal.reason,
    createdAt: proposal.createdAt,
  }).slice(0, 32)}`;
  if (proposal.proposalId !== expectedId) throw new Error("proposal identity digest does not match");
  return proposal;
}

export function writeGoalChangeProposal(recordDir: string, proposal: GoalChangeProposal): void {
  const parsed = parseGoalChangeProposal(JSON.stringify(proposal));
  const path = goalProposalPath(recordDir, parsed.proposalId);
  if (existsSync(path)) {
    const existing = parseGoalChangeProposal(readFileSync(path, "utf8"));
    if (canonicalJson(existing as unknown as JsonObject) !== canonicalJson(parsed as unknown as JsonObject)) {
      throw new Error("Goal change proposal identity collision");
    }
    return;
  }
  writeJsonAtomic(path, parsed as unknown as JsonObject);
}

export function readGoalChangeProposal(recordDir: string, proposalId: string): GoalChangeProposal {
  const path = goalProposalPath(recordDir, proposalId);
  if (!existsSync(path)) throw new Error("Goal change proposal is missing");
  return parseGoalChangeProposal(readFileSync(path, "utf8"));
}

export function createLegacyGoalMigrationProposal(input: {
  readonly intentId: string;
  readonly statement: string;
  readonly scope: string;
  readonly successMetrics: readonly string[];
  readonly stateProject: string;
  readonly requirementsReference: string | null;
  readonly requirementsDigest: string | null;
  readonly completionAuditDigest: string;
  readonly uncertainties: readonly string[];
  readonly createdAt: string;
}): LegacyGoalMigrationProposal {
  const content = {
    intentId: requireString(input.intentId, "intentId"),
    statement: requireString(input.statement, "statement"),
    scope: requireString(input.scope, "scope"),
    successMetrics: [...input.successMetrics],
    stateProject: requireString(input.stateProject, "stateProject"),
    requirementsReference: input.requirementsReference,
    requirementsDigest: input.requirementsDigest,
    completionAuditDigest: requireDigest(
      input.completionAuditDigest,
      "completionAuditDigest",
    ),
    uncertainties: [...input.uncertainties],
    createdAt: requireIsoTimestamp(input.createdAt, "createdAt"),
  };
  if ((content.requirementsReference === null) !== (content.requirementsDigest === null)) {
    throw new Error("requirements reference and digest must both be present or absent");
  }
  if (content.requirementsDigest !== null) {
    requireDigest(content.requirementsDigest, "requirementsDigest");
  }
  return {
    schemaVersion: GOAL_SCHEMA_VERSION,
    proposalId: `legacy-${goalDigest(content).slice(0, 32)}`,
    ...content,
  };
}

export function parseLegacyGoalMigrationProposal(
  raw: string,
): LegacyGoalMigrationProposal {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (cause) {
    throw new Error(`Legacy Goal proposal is not valid JSON: ${String(cause)}`);
  }
  const row = requireObject(decoded, "Legacy Goal proposal");
  if (row.schemaVersion !== GOAL_SCHEMA_VERSION) {
    throw new Error(`Legacy Goal proposal schemaVersion must be ${GOAL_SCHEMA_VERSION}`);
  }
  const proposal = createLegacyGoalMigrationProposal({
    intentId: requireString(row.intentId, "intentId"),
    statement: requireString(row.statement, "statement"),
    scope: requireString(row.scope, "scope"),
    successMetrics: requireStringArray(row.successMetrics, "successMetrics"),
    stateProject: requireString(row.stateProject, "stateProject"),
    requirementsReference: row.requirementsReference === null
      ? null
      : requireString(row.requirementsReference, "requirementsReference"),
    requirementsDigest: row.requirementsDigest === null
      ? null
      : requireDigest(row.requirementsDigest, "requirementsDigest"),
    completionAuditDigest: requireDigest(
      row.completionAuditDigest,
      "completionAuditDigest",
    ),
    uncertainties: requireStringArray(row.uncertainties, "uncertainties"),
    createdAt: requireIsoTimestamp(row.createdAt, "createdAt"),
  });
  if (row.proposalId !== proposal.proposalId) {
    throw new Error("Legacy Goal proposal identity digest does not match");
  }
  return proposal;
}

export function writeLegacyGoalMigrationProposal(
  recordDir: string,
  proposal: LegacyGoalMigrationProposal,
): void {
  const parsed = parseLegacyGoalMigrationProposal(JSON.stringify(proposal));
  const path = legacyGoalProposalPath(recordDir, parsed.proposalId);
  if (existsSync(path)) {
    const existing = parseLegacyGoalMigrationProposal(readFileSync(path, "utf8"));
    if (canonicalJson(existing as unknown as JsonObject) !== canonicalJson(parsed as unknown as JsonObject)) {
      throw new Error("Legacy Goal proposal identity collision");
    }
    return;
  }
  writeJsonAtomic(path, parsed as unknown as JsonObject);
}

export function readLegacyGoalMigrationProposal(
  recordDir: string,
  proposalId: string,
): LegacyGoalMigrationProposal {
  const path = legacyGoalProposalPath(recordDir, proposalId);
  if (!existsSync(path)) throw new Error("Legacy Goal proposal is missing");
  return parseLegacyGoalMigrationProposal(readFileSync(path, "utf8"));
}

export function buildApprovedGoalRevision(input: {
  readonly lineage: GoalLineage;
  readonly proposal: GoalChangeProposal;
  readonly approvalReference: string;
  readonly approvedAt: string;
}): GoalLineage {
  const lineage = input.lineage;
  const current = lineage.revisions[lineage.currentRevision];
  if (
    input.proposal.intentId !== lineage.intentId ||
    input.proposal.goalId !== lineage.goalId ||
    input.proposal.parentRevision !== lineage.currentRevision ||
    input.proposal.parentDigest !== current.digest
  ) {
    throw new Error("Goal change proposal is stale or belongs to another Intent");
  }
  const nextWithoutDigest: Omit<GoalRevision, "digest"> = {
    revision: lineage.currentRevision + 1,
    parentRevision: lineage.currentRevision,
    statement: input.proposal.statementAfter,
    scope: current.scope,
    successMetrics: [...input.proposal.successMetricsAfter],
    source: input.proposal.createdBy === "legacy-reconstruction"
      ? "legacy-migration"
      : "approved-change-proposal",
    createdAt: requireIsoTimestamp(input.approvedAt, "approvedAt"),
    approvalReference: requireString(input.approvalReference, "approvalReference"),
  };
  const next: GoalRevision = {
    ...nextWithoutDigest,
    digest: revisionDigest(nextWithoutDigest),
  };
  return {
    ...lineage,
    currentRevision: next.revision,
    revisions: [...lineage.revisions, next],
  };
}

export function writeGoalLineage(recordDir: string, lineage: GoalLineage): void {
  const parsed = parseGoalLineage(JSON.stringify(lineage));
  writeJsonAtomic(goalLineagePath(recordDir), parsed as unknown as JsonObject);
}

export function approveGoalRevision(input: {
  readonly recordDir: string;
  readonly proposal: GoalChangeProposal;
  readonly approvalReference: string;
  readonly approvedAt: string;
}): GoalLineage {
  const updated = buildApprovedGoalRevision({
    lineage: readGoalLineage(input.recordDir),
    proposal: input.proposal,
    approvalReference: input.approvalReference,
    approvedAt: input.approvedAt,
  });
  writeGoalLineage(input.recordDir, updated);
  return updated;
}

export function createGoalReconciliationReceipt(input: {
  readonly lineage: GoalLineage;
  readonly scope: string;
  readonly finalStage: string;
  readonly completionInstance: string;
  readonly completionContextDigest: string;
  readonly items: readonly GoalReconciliationItem[];
  readonly humanRulingReference: string | null;
  readonly createdAt: string;
}): GoalReconciliationReceipt {
  if (input.items.length === 0) throw new Error("Reconciliation items must be non-empty");
  const current = input.lineage.revisions[input.lineage.currentRevision];
  const requiredIds = new Set([
    "goal-statement",
    ...current.successMetrics.map((_, index) => `success-metric-${index + 1}`),
  ]);
  const actualIds = new Set(input.items.map((item) => item.id));
  if (
    requiredIds.size !== actualIds.size ||
    [...requiredIds].some((required) => !actualIds.has(required))
  ) {
    throw new Error("Reconciliation items do not cover every current Goal item");
  }
  const evidenceDigest = goalDigest(input.items as unknown as readonly JsonValue[]);
  const identity = {
    intentId: input.lineage.intentId,
    goalId: input.lineage.goalId,
    goalRevision: input.lineage.currentRevision,
    goalDigest: current.digest,
    completionInstance: input.completionInstance,
    completionContextDigest: input.completionContextDigest,
    evidenceDigest,
  };
  return parseGoalReconciliationReceipt(JSON.stringify({
    schemaVersion: GOAL_SCHEMA_VERSION,
    receiptId: `receipt-${goalDigest(identity).slice(0, 32)}`,
    ...identity,
    scope: input.scope,
    finalStage: input.finalStage,
    items: input.items,
    overallVerdict: aggregateVerdict(input.items),
    humanRulingReference: input.humanRulingReference,
    createdAt: input.createdAt,
  }));
}
