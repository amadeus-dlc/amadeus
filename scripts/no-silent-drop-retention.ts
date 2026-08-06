// Maintenance retention for the no-silent-drop event ledger (Issue #2338).
// Fail-closed: one unreadable/invalid event aborts with zero deletions.
// Writes a snapshot that embeds the effective set, then deletes only the ULIDs
// listed in that snapshot. Feature PRs must never invoke --apply.

import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  encodeEvent,
  EVENTS_DIR,
  foldEvents,
  loadEventsFromDir,
  type SnapshotEvent,
  type SnapshotEffectiveEntry,
} from "../tests/no-silent-drop/events.ts";
import { isUlid, mintUlid, type Ulid } from "../tests/no-silent-drop/ulid.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "Usage: bun scripts/no-silent-drop-retention.ts [--apply]";

type ArgsOutcome = { kind: "ok"; apply: boolean } | { kind: "usage"; reason: string };

export function parseArgs(argv: string[]): ArgsOutcome {
  if (argv.length === 0) return { kind: "ok", apply: false };
  if (argv.length === 1 && argv[0] === "--apply") return { kind: "ok", apply: true };
  return { kind: "usage", reason: `unexpected arguments: ${argv.join(" ")}` };
}

export function main(argv: string[]): number {
  const parsed = parseArgs(argv);
  if (parsed.kind === "usage") {
    console.error(parsed.reason);
    console.error(USAGE);
    return 2;
  }
  const root = process.env.AMADEUS_NSD_ROOT ?? ROOT;
  const eventsDir = join(root, EVENTS_DIR);

  let loaded: ReturnType<typeof loadEventsFromDir>;
  try {
    loaded = loadEventsFromDir(eventsDir);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("refusing to prune: event ledger load failed");
    return 1;
  }

  let folded: ReturnType<typeof foldEvents>;
  try {
    folded = foldEvents(loaded.byUlid.values());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("refusing to prune: fold failed");
    return 1;
  }

  const deleteUlids: Ulid[] = [...loaded.byUlid.keys()]
    .filter((ulid): ulid is Ulid => isUlid(ulid) && loaded.byUlid.get(ulid)?.op !== "snapshot")
    .sort();
  if (deleteUlids.length === 0) {
    console.log("retention ok — no grant/revoke events to compact");
    return 0;
  }

  const effective: SnapshotEffectiveEntry[] = [
    ...folded.grandfather.map((entry) => ({
      fingerprint: entry.fingerprint,
      kind: "grandfather" as const,
      ruleId: entry.ruleId,
      file: entry.file,
      reason: entry.reason,
      issues: entry.issues,
    })),
    ...folded.exemptions.map((entry) => ({
      fingerprint: entry.fingerprint,
      kind: "exemption" as const,
      ruleId: "NSD002" as const,
      file: "unknown",
      reason: entry.reason,
      issues: ["#1979"],
    })),
  ].sort((a, b) => (a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0));

  const snapshotUlid = mintUlid();
  const snapshot: SnapshotEvent = {
    schemaVersion: 1,
    ulid: snapshotUlid,
    op: "snapshot",
    effectiveDigest: folded.effectiveDigest,
    effective,
    deleteUlids,
  };

  if (!parsed.apply) {
    console.log(`would write snapshot ${snapshotUlid} and delete ${deleteUlids.length} event(s):`);
    for (const ulid of deleteUlids) console.log(`${ulid}.json`);
    console.log("dry-run: no files changed");
    return 0;
  }

  mkdirSync(eventsDir, { recursive: true });
  writeFileSync(join(eventsDir, `${snapshotUlid}.json`), encodeEvent(snapshot));
  for (const ulid of deleteUlids) {
    try {
      unlinkSync(join(eventsDir, `${ulid}.json`));
    } catch (error) {
      console.error(`failed to delete ${ulid}.json: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
  }

  // Post-apply fold must succeed and preserve the effective digest.
  try {
    const after = foldEvents(loadEventsFromDir(eventsDir).byUlid.values());
    if (after.effectiveDigest !== folded.effectiveDigest) {
      console.error("post-apply effectiveDigest drift — retention aborted after partial write");
      return 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  console.log(`wrote snapshot ${snapshotUlid}; deleted ${deleteUlids.length} event(s)`);
  return 0;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
