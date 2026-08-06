// Maintenance retention for the no-silent-drop event ledger (Issue #2338).
// Fail-closed: one unreadable/invalid event aborts with zero deletions.
// Writes a snapshot that embeds the effective set, then deletes only the ULIDs
// listed in that snapshot. Feature PRs must never invoke --apply.

import { mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  encodeEvent,
  EVENTS_DIR,
  type FoldedLedger,
  foldEvents,
  type LoadedEvents,
  loadEventsFromDir,
  type SnapshotEvent,
  type SnapshotEffectiveEntry,
} from "../tests/no-silent-drop/events.ts";
import { isUlid, mintUlid, type Ulid } from "../tests/no-silent-drop/ulid.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "Usage: bun scripts/no-silent-drop-retention.ts [--apply]";
/** Pending snapshot path is not a ULID filename, so loadEventsFromDir ignores it. */
const PENDING_NAME = ".retention-pending.json";

type ArgsOutcome = { kind: "ok"; apply: boolean } | { kind: "usage"; reason: string };

export function parseArgs(argv: string[]): ArgsOutcome {
  if (argv.length === 0) return { kind: "ok", apply: false };
  if (argv.length === 1 && argv[0] === "--apply") return { kind: "ok", apply: true };
  return { kind: "usage", reason: `unexpected arguments: ${argv.join(" ")}` };
}

function loadOrFail(eventsDir: string): LoadedEvents | null {
  try {
    return loadEventsFromDir(eventsDir);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("refusing to prune: event ledger load failed");
    return null;
  }
}

function foldOrFail(loaded: LoadedEvents): FoldedLedger | null {
  try {
    return foldEvents(loaded.byUlid.values());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("refusing to prune: fold failed");
    return null;
  }
}

function compactableUlids(loaded: LoadedEvents): Ulid[] {
  // Compact prior snapshots together with grants/revokes; the new snapshot embeds
  // the effective set, so older snapshots are safe to enumerate for deletion.
  return [...loaded.byUlid.keys()].filter((ulid): ulid is Ulid => isUlid(ulid)).sort();
}

function materializeEffective(folded: FoldedLedger): SnapshotEffectiveEntry[] {
  const grandfather = folded.grandfather.map((entry) => ({
    fingerprint: entry.fingerprint,
    kind: "grandfather" as const,
    ruleId: entry.ruleId,
    file: entry.file,
    reason: entry.reason,
    issues: entry.issues,
  }));
  const exemptions = folded.exemptions.map((entry) => ({
    fingerprint: entry.fingerprint,
    kind: "exemption" as const,
    ruleId: "NSD002" as const,
    file: "unknown",
    reason: entry.reason,
    issues: ["#1979"],
  }));
  return [...grandfather, ...exemptions].sort((a, b) =>
    a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0);
}

function applyDeletes(eventsDir: string, deleteUlids: readonly Ulid[]): boolean {
  for (const ulid of deleteUlids) {
    try {
      unlinkSync(join(eventsDir, `${ulid}.json`));
    } catch (error) {
      console.error(`failed to delete ${ulid}.json: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  return true;
}

function verifyPostApply(eventsDir: string, expectedDigest: string): boolean {
  try {
    const after = foldEvents(loadEventsFromDir(eventsDir).byUlid.values());
    if (after.effectiveDigest !== expectedDigest) {
      console.error("post-apply effectiveDigest drift — retention aborted after partial write");
      return false;
    }
    return true;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

function removeIfPresent(path: string): void {
  try {
    unlinkSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

export function main(argv: string[]): number {
  const parsed = parseArgs(argv);
  if (parsed.kind === "usage") {
    console.error(parsed.reason);
    console.error(USAGE);
    return 2;
  }
  const eventsDir = join(process.env.AMADEUS_NSD_ROOT ?? ROOT, EVENTS_DIR);
  const loaded = loadOrFail(eventsDir);
  if (loaded === null) return 1;
  const folded = foldOrFail(loaded);
  if (folded === null) return 1;

  const deleteUlids = compactableUlids(loaded);
  if (deleteUlids.length === 0) {
    console.log("retention ok — no grant/revoke events to compact");
    return 0;
  }

  const snapshotUlid = mintUlid();
  const snapshot: SnapshotEvent = {
    schemaVersion: 1,
    ulid: snapshotUlid,
    op: "snapshot",
    effectiveDigest: folded.effectiveDigest,
    effective: materializeEffective(folded),
    deleteUlids,
  };

  if (!parsed.apply) {
    console.log(`would write snapshot ${snapshotUlid} and delete ${deleteUlids.length} event(s):`);
    for (const ulid of deleteUlids) console.log(`${ulid}.json`);
    console.log("dry-run: no files changed");
    return 0;
  }

  mkdirSync(eventsDir, { recursive: true });
  const pendingPath = join(eventsDir, PENDING_NAME);
  const finalPath = join(eventsDir, `${snapshotUlid}.json`);
  // Pending name is ignored by loadEventsFromDir (not a ULID). Write it first so a
  // mid-delete crash never leaves a published snapshot that still lists live files.
  writeFileSync(pendingPath, encodeEvent(snapshot));
  if (!applyDeletes(eventsDir, deleteUlids)) {
    removeIfPresent(pendingPath);
    return 1;
  }
  try {
    renameSync(pendingPath, finalPath);
  } catch (error) {
    console.error(`failed to publish snapshot: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  if (!verifyPostApply(eventsDir, folded.effectiveDigest)) return 1;
  console.log(`wrote snapshot ${snapshotUlid}; deleted ${deleteUlids.length} event(s)`);
  return 0;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
