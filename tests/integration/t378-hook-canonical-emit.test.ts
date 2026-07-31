// covers: hook:amadeus-audit-logger, hook:amadeus-session-end,
//   hook:amadeus-session-start, hook:amadeus-validate-state,
//   function:appendAuditEntryViaEvents
// size: medium
//
// G1 (call-site migration) — four of the five hook emitters travel the
// canonical Event path. amadeus-log-subagent stays on the legacy writer for
// now: SUBAGENT_COMPLETED's only REQUIRED attribute is `Agent Type`, and the
// default-deny redaction policy admits safe keys only, so the canonical path
// would silently drop the `Agent ID` and `Message` the hook also records.
// Migrating it awaits the ruling on the redaction vocabulary.
//
// The migrated four each swapped `appendAuditEntry` for the migration Adapter
// plus the one-per-process bootstrap seam (FR-MIG-1), so the row each writes
// is a schema v2 journal record naming a registered Event rather than a v1 row
// naming a legacy audit event type.
//
// WHY THE SUBJECT IS THE SPAWNED HOOK. Every one of these files RUNS on
// import: the module top level drains stdin, resolves its own project dir and
// exits. There is no importable function to drive, so the twin fires the real
// shipped hook exactly as Claude Code does — the same reasoning t07 records.
//
// WHAT IS ASSERTED. Two things a v1 write cannot satisfy:
//   - the shard line decodes as schemaVersion 2 and carries the registered
//     `eventName` (the canonical path's signature);
//   - the v1 readers still resolve it under the LEGACY event type, because
//     the exporter rides that type as the `Event` attribute — a migrated hook
//     is invisible to every downstream consumer.
// And one thing the migration must not change: the fail-open contract. A hook
// whose emit throws records a drop and still exits 0.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seedStateFile,
  seededAuditDir,
} from "../harness/fixtures.ts";

const BUN = process.execPath;

const PINNED_CLONE_ID = "testcloneid01";

function pinnedShardName(): string {
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  return `${host}-${PINNED_CLONE_ID}.jsonl`;
}

let proj: string;
let auditDir: string;

beforeEach(() => {
  proj = createTestProject();
  seedStateFile(proj, join(FIXTURES_DIR, "state-construction.md"));
  writeFileSync(join(proj, "amadeus", ".amadeus-clone-id"), `${PINNED_CLONE_ID}\n`, "utf-8");
  auditDir = seededAuditDir(proj);
  mkdirSync(auditDir, { recursive: true });
  writeFileSync(join(auditDir, pinnedShardName()), "", "utf-8");
});

afterEach(() => {
  cleanupTestProject(proj);
});

type ShardRecord = {
  schemaVersion?: number;
  eventName?: string;
  event?: string;
  attributes?: Record<string, unknown>;
};

function records(): ShardRecord[] {
  return readdirSync(auditDir)
    .filter((n) => n.endsWith(".jsonl"))
    .sort()
    .flatMap((n) => readFileSync(join(auditDir, n), "utf-8").split("\n"))
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as ShardRecord);
}

function fire(hookFile: string, payload: unknown): number {
  const r = Bun.spawnSync({
    cmd: [BUN, amadeusToolTarget(join(AMADEUS_SRC, "hooks", hookFile))],
    stdin: Buffer.from(JSON.stringify(payload)),
    cwd: proj,
    env: { ...process.env, CLAUDE_PROJECT_DIR: proj },
    stdout: "pipe",
    stderr: "pipe",
  });
  return r.exitCode;
}

// The one assertion pair that separates a canonical write from a legacy one:
// v2 envelope + registered name, AND the legacy type still readable.
function expectCanonical(eventName: string, legacyEvent: string): void {
  const rows = records();
  const canonical = rows.filter((r) => r.schemaVersion === 2 && r.eventName === eventName);
  expect(canonical.length).toBe(1);
  expect(canonical[0]?.attributes?.Event).toBe(legacyEvent);
  // No v1 row for the same event type: the hook has ONE emitter, and it moved.
  expect(rows.filter((r) => r.schemaVersion !== 2 && r.event === legacyEvent).length).toBe(0);
}

describe("the artifact hook emits through the canonical path", () => {
  test("a Write under the record emits amadeus.artifact.created", () => {
    const file = join(docsRoot(proj), "ideation", "intent-capture", "intent-statement.md");
    mkdirSync(join(docsRoot(proj), "ideation", "intent-capture"), { recursive: true });
    writeFileSync(file, "seed\n", "utf-8");
    const code = fire("amadeus-audit-logger.ts", {
      tool_name: "Write",
      tool_input: { file_path: file },
      cwd: proj,
    });
    expect(code).toBe(0);
    expectCanonical("amadeus.artifact.created", "ARTIFACT_CREATED");
  });
});

describe("the session hooks emit through the canonical path", () => {
  test("SessionStart source=startup emits amadeus.session.started", () => {
    const code = fire("amadeus-session-start.ts", { source: "startup", cwd: proj });
    expect(code).toBe(0);
    expectCanonical("amadeus.session.started", "SESSION_STARTED");
  });

  test("SessionEnd emits amadeus.session.ended", () => {
    const code = fire("amadeus-session-end.ts", { reason: "logout", cwd: proj });
    expect(code).toBe(0);
    expectCanonical("amadeus.session.ended", "SESSION_ENDED");
  });

  test("PreCompact emits amadeus.session.compacted", () => {
    const code = fire("amadeus-validate-state.ts", { cwd: proj });
    expect(code).toBe(0);
    expectCanonical("amadeus.session.compacted", "SESSION_COMPACTED");
  });
});

describe("the fail-open contract survives the migration", () => {
  // The canonical path THROWS where the legacy writer threw (an unwritable
  // shard dir), and the hook's own try/catch is what turns that into a
  // recorded drop plus exit 0. Removing the emit from inside that try is the
  // regression this pins.
  test("an unwritable audit dir still exits 0 and records the drop", () => {
    const shard = join(auditDir, pinnedShardName());
    // A directory where the shard file must be: every append path fails.
    Bun.spawnSync({ cmd: ["rm", "-f", shard] });
    mkdirSync(shard, { recursive: true });
    const code = fire("amadeus-session-end.ts", { reason: "logout", cwd: proj });
    expect(code).toBe(0);
    const dropDir = join(proj, "amadeus");
    // The drop record is what --doctor surfaces; its existence is the contract.
    const found = readdirSync(dropDir, { recursive: true, encoding: "utf-8" }).some((n) =>
      n.includes("hooks-health")
    );
    expect(found).toBe(true);
  });
});
