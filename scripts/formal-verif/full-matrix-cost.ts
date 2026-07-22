import { canonicalIdentity } from "./canonical.ts";
import { isUtcInstant, type ArmId, type Result } from "./contract.ts";
import type { ProvenanceEvent } from "./provenance.ts";

// Cost is measured from authoritative sources only: arm-owned numstat rows for LOC and the
// Coordinator ARM_AUTHORING_STARTED -> ARM_FROZEN event delta for elapsed. Commit timestamps,
// mtime, and conversation time are never used. Shared harness paths are billed separately and
// never apportioned to an arm.

export interface NumstatRow { additions: number; deletions: number; path: string }
export type NumstatOutcome = { kind: "rows"; rows: readonly NumstatRow[] } | { kind: "binary"; path: string };

export interface NumstatPort {
  numstat(baselineSha: string, freezeSha: string): NumstatOutcome;
}

export interface LocMeasurement {
  kind: "LocMeasurement";
  arm: ArmId;
  baselineSha: string;
  freezeSha: string;
  ownedRows: readonly NumstatRow[];
  sharedRows: readonly NumstatRow[];
  ownedTotal: number;
  sharedTotal: number;
  measurementIdentity: string;
}

export interface LocMeasurementError { kind: "LocMeasurementError"; message: string }
export interface ElapsedMeasurementError { kind: "ElapsedMeasurementError"; message: string }

const SHA = /^[0-9a-f]{64}$/;

function classify(path: string, ownedAllowlist: readonly string[], sharedAllowlist: readonly string[]): "owned" | "shared" | "unknown" {
  const owned = ownedAllowlist.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  const shared = sharedAllowlist.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  if (owned && shared) return "unknown";
  return owned ? "owned" : shared ? "shared" : "unknown";
}

export function measureArmAuthoredLoc(input: { arm: ArmId; baselineSha: string; freezeSha: string; ownedAllowlist: readonly string[]; sharedAllowlist: readonly string[] }, port: NumstatPort): Result<LocMeasurement, LocMeasurementError> {
  if (!SHA.test(input.baselineSha) || !SHA.test(input.freezeSha)) return { ok: false, error: { kind: "LocMeasurementError", message: "baseline and freeze SHAs must be SHA-256" } };
  const outcome = port.numstat(input.baselineSha, input.freezeSha);
  if (outcome.kind === "binary") return { ok: false, error: { kind: "LocMeasurementError", message: `binary numstat row rejected: ${outcome.path}` } };
  const ownedRows: NumstatRow[] = [];
  const sharedRows: NumstatRow[] = [];
  for (const row of outcome.rows) {
    if (!Number.isSafeInteger(row.additions) || !Number.isSafeInteger(row.deletions) || row.additions < 0 || row.deletions < 0) return { ok: false, error: { kind: "LocMeasurementError", message: "numstat counts must be non-negative integers" } };
    if (row.path.length === 0 || row.path.includes("\0") || / => |\{.*=>.*\}/.test(row.path)) return { ok: false, error: { kind: "LocMeasurementError", message: `rename-ambiguous or unsafe path rejected: ${row.path}` } };
    const bucket = classify(row.path, input.ownedAllowlist, input.sharedAllowlist);
    if (bucket === "unknown") return { ok: false, error: { kind: "LocMeasurementError", message: `path is outside both arm-owned and shared allowlists: ${row.path}` } };
    (bucket === "owned" ? ownedRows : sharedRows).push(row);
  }
  const ownedTotal = ownedRows.reduce((sum, row) => sum + row.additions + row.deletions, 0);
  const sharedTotal = sharedRows.reduce((sum, row) => sum + row.additions + row.deletions, 0);
  const measurementIdentity = canonicalIdentity({ arm: input.arm, baselineSha: input.baselineSha, freezeSha: input.freezeSha, ownedRows, sharedRows }, "amadeus.formal-verif.loc-measurement.v1").sha256;
  return { ok: true, value: { kind: "LocMeasurement", arm: input.arm, baselineSha: input.baselineSha, freezeSha: input.freezeSha, ownedRows, sharedRows, ownedTotal, sharedTotal, measurementIdentity } };
}

export interface AuthoringElapsed {
  kind: "AuthoringElapsed";
  arm: ArmId;
  startedEventId: string;
  frozenEventId: string;
  startedAt: string;
  frozenAt: string;
  durationMs: number;
  measurementIdentity: string;
}

const CONTINUITY: readonly (keyof ProvenanceEvent)[] = ["actorId", "worktree", "publicInputHash"];

export function measureAuthoringElapsed(events: readonly ProvenanceEvent[], arm: ArmId): Result<AuthoringElapsed, ElapsedMeasurementError> {
  const started = events.find((event) => event.kind === "ARM_AUTHORING_STARTED" && event.arm === arm);
  const frozen = events.find((event) => event.kind === "ARM_FROZEN" && event.arm === arm);
  if (!started || !frozen) return { ok: false, error: { kind: "ElapsedMeasurementError", message: "authoring start and freeze events are required" } };
  if (!isUtcInstant(started.at) || !isUtcInstant(frozen.at)) return { ok: false, error: { kind: "ElapsedMeasurementError", message: "event instants must be real UTC" } };
  if (CONTINUITY.some((key) => started[key] !== frozen[key])) return { ok: false, error: { kind: "ElapsedMeasurementError", message: "start/freeze continuity does not hold" } };
  const durationMs = Date.parse(frozen.at) - Date.parse(started.at);
  if (durationMs < 0 || frozen.sequence <= started.sequence) return { ok: false, error: { kind: "ElapsedMeasurementError", message: "freeze must follow start in time and sequence" } };
  const measurementIdentity = canonicalIdentity({ arm, startedEventId: started.eventId, frozenEventId: frozen.eventId, durationMs }, "amadeus.formal-verif.authoring-elapsed.v1").sha256;
  return { ok: true, value: { kind: "AuthoringElapsed", arm, startedEventId: started.eventId, frozenEventId: frozen.eventId, startedAt: started.at, frozenAt: frozen.at, durationMs, measurementIdentity } };
}
