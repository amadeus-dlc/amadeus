// amadeus-unit-disposition.ts — audit-backed Unit lifecycle dispositions

import { appendAuditEntryUnlocked } from "./amadeus-audit.ts";
import {
  auditBlockField,
  getField,
  readAllAuditShards,
  readStateFile,
  validateBoltSlug,
  withAuditLock,
} from "./amadeus-lib.ts";

export type UnitDisposition = "active" | "parked" | "skipped";

export interface UnitDispositionRecord {
  readonly stage: string;
  readonly unit: string;
  readonly disposition: UnitDisposition;
  readonly reason: string;
  readonly timestamp: string;
}

export interface ChangeUnitDispositionInput {
  readonly projectDir: string;
  readonly stage: string;
  readonly unit: string;
  readonly to: UnitDisposition;
  readonly reason: string;
  readonly expectedFrom: UnitDisposition;
  readonly intent?: string;
  readonly space?: string;
}

export interface ChangeUnitDispositionResult {
  readonly changed: boolean;
  readonly from: UnitDisposition;
  readonly to: UnitDisposition;
  readonly timestamp?: string;
}

type OrderedDispositionRecord = UnitDispositionRecord & { readonly order: number };

const VALID_DISPOSITIONS = new Set<UnitDisposition>(["active", "parked", "skipped"]);

export function unitDispositionKey(stage: string, unit: string): string {
  return `${stage}\u0000${unit}`;
}

function auditBlocks(auditContent: string): string[] {
  return auditContent.replace(/\r\n/g, "\n").split(/\n---\n/);
}

function orderedUnitDispositions(auditContent: string): Map<string, OrderedDispositionRecord> {
  const latest = new Map<string, OrderedDispositionRecord>();
  const blocks = auditBlocks(auditContent);
  for (let order = 0; order < blocks.length; order++) {
    const block = blocks[order];
    if (auditBlockField(block, "Event") !== "UNIT_DISPOSITION_CHANGED") continue;
    const stage = auditBlockField(block, "Stage");
    const unit = auditBlockField(block, "Unit");
    const disposition = auditBlockField(block, "To");
    const timestamp = auditBlockField(block, "Timestamp");
    if (!stage || !unit || !timestamp || !isUnitDisposition(disposition)) continue;
    const record: OrderedDispositionRecord = {
      stage,
      unit,
      disposition,
      reason: auditBlockField(block, "Reason") ?? "",
      timestamp,
      order,
    };
    const key = unitDispositionKey(stage, unit);
    const prior = latest.get(key);
    if (!prior || record.timestamp > prior.timestamp ||
      (record.timestamp === prior.timestamp && record.order > prior.order)) {
      latest.set(key, record);
    }
  }
  return latest;
}

export function foldUnitDispositions(
  auditContent: string,
): ReadonlyMap<string, UnitDispositionRecord> {
  const folded = new Map<string, UnitDispositionRecord>();
  for (const [key, record] of orderedUnitDispositions(auditContent)) {
    folded.set(key, Object.freeze({
      stage: record.stage,
      unit: record.unit,
      disposition: record.disposition,
      reason: record.reason,
      timestamp: record.timestamp,
    }));
  }
  return folded;
}

export function latestUnitDispositions(
  projectDir: string,
  intent?: string,
  space?: string,
): ReadonlyMap<string, UnitDispositionRecord> {
  return foldUnitDispositions(readAllAuditShards(projectDir, intent, space));
}

export function currentUnitDisposition(
  projectDir: string,
  stage: string,
  unit: string,
  intent?: string,
  space?: string,
): UnitDisposition {
  return latestUnitDispositions(projectDir, intent, space)
    .get(unitDispositionKey(stage, unit))?.disposition ?? "active";
}

export function changeUnitDisposition(
  input: ChangeUnitDispositionInput,
): ChangeUnitDispositionResult {
  validateInput(input);
  return withAuditLock(
    input.projectDir,
    () => changeUnitDispositionLocked(input),
    input.intent,
    input.space,
  );
}

function changeUnitDispositionLocked(
  input: ChangeUnitDispositionInput,
): ChangeUnitDispositionResult {
  assertConductorState(input);
  const audit = readAllAuditShards(input.projectDir, input.intent, input.space);
  const prior = orderedUnitDispositions(audit).get(unitDispositionKey(input.stage, input.unit));
  const actualFrom = prior?.disposition ?? "active";
  if (actualFrom === input.to) return { changed: false, from: actualFrom, to: input.to };
  assertExpectedDisposition(input.expectedFrom, actualFrom);
  assertFreshAnswer(input, audit, latestDispositionEvent(audit, input.stage));
  const appended = appendAuditEntryUnlocked(
    "UNIT_DISPOSITION_CHANGED",
    {
      Stage: input.stage,
      Unit: input.unit,
      From: actualFrom,
      To: input.to,
      Reason: input.reason,
    },
    input.projectDir,
    input.intent,
    input.space,
  );
  return { changed: true, from: actualFrom, to: input.to, timestamp: appended.timestamp };
}

function assertConductorState(input: ChangeUnitDispositionInput): void {
  const state = readStateFile(input.projectDir, input.intent, input.space);
  if ((getField(state, "Worktree Path") ?? "").trim() !== "") {
    throw new Error("Unit disposition changes are conductor-only; Worktree Path must be empty.");
  }
}

function assertExpectedDisposition(expected: UnitDisposition, actual: UnitDisposition): void {
  if (actual !== expected) {
    throw new Error(`Unit disposition compare-and-swap failed: expected ${expected}, found ${actual}.`);
  }
}

function assertFreshAnswer(
  input: ChangeUnitDispositionInput,
  audit: string,
  boundary: OrderedDispositionRecord | undefined,
): void {
  if (process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD === "1") return;
  if (hasFreshAnswer(audit, input.stage, boundary)) return;
  const action = input.to === "parked" ? "Parking" : input.to === "skipped" ? "Skipping" : "Resuming";
  throw new Error(`${action} a Unit requires a fresh QUESTION_ANSWERED event.`);
}

function hasFreshAnswer(
  auditContent: string,
  stage: string,
  prior: OrderedDispositionRecord | undefined,
): boolean {
  const blocks = auditBlocks(auditContent);
  for (let order = 0; order < blocks.length; order++) {
    const block = blocks[order];
    if (auditBlockField(block, "Event") !== "QUESTION_ANSWERED") continue;
    if ((auditBlockField(block, "Stage") ?? "") !== stage) continue;
    const timestamp = auditBlockField(block, "Timestamp") ?? "";
    if (!timestamp) continue;
    if (!prior || timestamp > prior.timestamp ||
      (timestamp === prior.timestamp && order > prior.order)) return true;
  }
  return false;
}

function latestDispositionEvent(
  auditContent: string,
  targetStage: string,
): OrderedDispositionRecord | undefined {
  let latest: OrderedDispositionRecord | undefined;
  const blocks = auditBlocks(auditContent);
  for (let order = 0; order < blocks.length; order++) {
    const block = blocks[order];
    if (auditBlockField(block, "Event") !== "UNIT_DISPOSITION_CHANGED") continue;
    const stage = auditBlockField(block, "Stage");
    const unit = auditBlockField(block, "Unit");
    const disposition = auditBlockField(block, "To");
    const timestamp = auditBlockField(block, "Timestamp");
    if (stage !== targetStage || !unit || !timestamp || !isUnitDisposition(disposition)) continue;
    const candidate: OrderedDispositionRecord = {
      stage,
      unit,
      disposition,
      reason: auditBlockField(block, "Reason") ?? "",
      timestamp,
      order,
    };
    if (!latest || candidate.timestamp > latest.timestamp ||
      (candidate.timestamp === latest.timestamp && candidate.order > latest.order)) {
      latest = candidate;
    }
  }
  return latest;
}

function validateInput(input: ChangeUnitDispositionInput): void {
  if (!input.stage.trim()) throw new Error("Stage must not be empty.");
  if (!input.unit.trim()) throw new Error("Unit must not be empty.");
  const stageError = validateBoltSlug(input.stage);
  if (stageError) throw new Error(`Invalid stage: ${stageError}`);
  const unitError = validateBoltSlug(input.unit);
  if (unitError) throw new Error(`Invalid Unit: ${unitError}`);
  if (!input.reason.trim()) throw new Error("Reason must not be empty.");
  if (!isUnitDisposition(input.to)) {
    throw new Error(`Unknown Unit disposition: ${String(input.to)}.`);
  }
  if (!isUnitDisposition(input.expectedFrom)) {
    throw new Error(`Unknown expected Unit disposition: ${String(input.expectedFrom)}.`);
  }
}

function isUnitDisposition(value: unknown): value is UnitDisposition {
  return typeof value === "string" && VALID_DISPOSITIONS.has(value as UnitDisposition);
}
