import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  auditBlockField,
  getField,
  parseRefsList,
  readAllAuditShards,
  readStateFile,
  relativeRecordDir,
  splitAuditRecords,
  worktreePath,
  worktreeStateFilePath,
} from "./amadeus-lib.ts";

export type MergeRecoveryAssessment =
  | { status: "pending" }
  | { status: "verified" }
  | { status: "invalid"; detail: string };

const SHA256 = /^[a-f0-9]{64}$/;

function eventsInCurrentFork(
  audit: string,
  event: string,
  slug: string,
): { timestamp: string; block: string }[] {
  const timeline = splitAuditRecords(audit)
    .map((block, pos) => ({
      block,
      pos,
      timestamp: auditBlockField(block, "Timestamp") ?? "",
      event: auditBlockField(block, "Event") ?? "",
      slug: auditBlockField(block, "Bolt slug") ?? "",
    }))
    .filter((row) => row.timestamp !== "" && row.slug === slug)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.pos - b.pos);
  const currentFork = timeline.findLastIndex((row) => row.event === "STATE_FORKED");
  const currentCycle = currentFork === -1 ? timeline : timeline.slice(currentFork + 1);
  return currentCycle
    .filter((row) => row.event === event)
    .map(({ timestamp, block }) => ({ timestamp, block }));
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function field(block: string, name: string): string {
  return auditBlockField(block, name) ?? "";
}

export function assessBoltCompletionRecovery(
  projectDir: string,
  slug: string,
  boltNames: string,
  batch: string,
  intent?: string,
  space?: string,
): MergeRecoveryAssessment {
  const events = eventsInCurrentFork(
    readAllAuditShards(projectDir, intent, space),
    "BOLT_COMPLETED",
    slug,
  );
  if (events.length === 0) return { status: "pending" };
  const inconsistent = events.some(
    ({ block }) => field(block, "Bolt names") !== boltNames || field(block, "Batch number") !== batch,
  );
  if (inconsistent) {
    return {
      status: "invalid",
      detail: `inconsistent BOLT_COMPLETED evidence for slug ${slug}; existing rows do not all match Bolt names=${boltNames} and Batch number=${batch}`,
    };
  }
  return { status: "verified" };
}

export function assessStateMergeRecovery(
  projectDir: string,
  slug: string,
  intent?: string,
  space?: string,
): MergeRecoveryAssessment {
  let mainState: string;
  try {
    mainState = readStateFile(projectDir, intent, space);
  } catch (error) {
    return { status: "invalid", detail: `cannot read main state: ${String(error)}` };
  }
  const refsValue = getField(mainState, "Bolt Refs");
  if (refsValue === null) {
    return { status: "invalid", detail: "main state is missing the Bolt Refs field" };
  }

  const events = eventsInCurrentFork(
    readAllAuditShards(projectDir, intent, space),
    "STATE_MERGED",
    slug,
  );
  if (parseRefsList(refsValue).includes(slug)) {
    if (events.length !== 0) {
      return {
        status: "invalid",
        detail: `STATE_MERGED evidence exists while slug ${slug} remains in Bolt Refs`,
      };
    }
    return { status: "pending" };
  }
  if (events.length === 0) {
    return {
      status: "invalid",
      detail: `slug ${slug} is absent from Bolt Refs but has no canonical STATE_MERGED evidence`,
    };
  }
  if (events.length !== 1) {
    return {
      status: "invalid",
      detail: `ambiguous STATE_MERGED evidence for slug ${slug}: expected 1 row, found ${events.length}`,
    };
  }

  const expectedWorktree = worktreePath(projectDir, slug);
  const statePath = worktreeStateFilePath(
    expectedWorktree,
    relativeRecordDir(projectDir, intent, space),
  );
  if (!existsSync(statePath)) {
    return {
      status: "invalid",
      detail: `STATE_MERGED evidence cannot be verified because worktree state is missing: ${statePath}`,
    };
  }
  const block = events[0]!.block;
  const sourceHash = field(block, "Source state hash");
  const targetHash = field(block, "Target state hash");
  const conflictResolution = field(block, "Conflict resolution");
  if (field(block, "Worktree path") !== expectedWorktree) {
    return { status: "invalid", detail: `STATE_MERGED Worktree path does not match slug ${slug}` };
  }
  if (sourceHash !== sha256(readFileSync(statePath, "utf-8"))) {
    return { status: "invalid", detail: `STATE_MERGED Source state hash does not match slug ${slug}` };
  }
  if (!SHA256.test(targetHash) || conflictResolution === "") {
    return { status: "invalid", detail: `STATE_MERGED required evidence is malformed for slug ${slug}` };
  }
  return { status: "verified" };
}

export function assessAuditMergeRecovery(
  projectDir: string,
  slug: string,
  anchor: { sourceHash: string; boundary: number },
  expectedEntries: number,
  intent?: string,
  space?: string,
): MergeRecoveryAssessment {
  const events = eventsInCurrentFork(
    readAllAuditShards(projectDir, intent, space),
    "AUDIT_MERGED",
    slug,
  );
  if (events.length === 0) return { status: "pending" };
  if (events.length !== 1) {
    return {
      status: "invalid",
      detail: `ambiguous AUDIT_MERGED evidence for slug ${slug}: expected 1 row, found ${events.length}`,
    };
  }
  const block = events[0]!.block;
  const entries = field(block, "Entries Merged");
  if (
    field(block, "Source Audit Hash") !== anchor.sourceHash ||
    field(block, "Fork Boundary") !== String(anchor.boundary) ||
    entries !== String(expectedEntries)
  ) {
    return { status: "invalid", detail: `AUDIT_MERGED evidence does not match the fork anchor for slug ${slug}` };
  }
  return { status: "verified" };
}
