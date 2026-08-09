// covers: function:scanAuditCorpus
//
// t461 — Issue #2279 (U3 subagent-stats). The FS-touching half of the
// aggregation CLI, exercised where it belongs (cid:code-generation:
// fs-tests-integration-first):
//
//   (1) fixture corpora — both audit journal schemas (v1 `event`/`fields` and
//       v2 `attributes.Event`) mixed in one corpus, a parse-broken line, an
//       ignored non-subagent event, and Model / Model Source presence and
//       absence — driven through the real CLI spawn.
//   (2) the CLI contract: --json shape, unknown-flag fail-closed (BR-U3-1),
//       unreadable-shard fail-loud with a non-zero exit (error-model table),
//       empty corpus as a normal zero report.
//   (3) AC-3 corpus sweep, both sides: the REAL audit corpus (byte snapshot at
//       measurement time, so a concurrent append cannot race the comparison)
//       is run through the CLI and checked against an INDEPENDENT oracle — the
//       test's own shard walker plus U1's classifyAgentType, never the CLI
//       under test (BR-U3-6: self-referential comparison is 検証劇場).
//   (4) AC-6: the real output carries the measurement ref and an explicit
//       unresolved bucket.
//
// MECHANISM: cli — the tool's contract is its process boundary (argv, stdout,
// stderr, exit code), so it is spawned as `bun amadeus-subagent-stats.ts`.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BUILTIN_AGENT_TYPES,
  classifyAgentType,
  resolveAllowedAgentTypes,
} from "../../dist/claude/.claude/tools/amadeus-subagent-observability.ts";
import {
  composeStatsReport,
  main as statsMain,
  scanAuditCorpus,
  serializeStatsReport,
} from "../../dist/claude/.claude/tools/amadeus-subagent-stats.ts";
import { AMADEUS_SRC, REPO_ROOT } from "../harness/fixtures.ts";

const BUN = process.execPath;
const STATS_CLI = join(AMADEUS_SRC, "tools", "amadeus-subagent-stats.ts");
// The shipped personas' source of truth (promote:self copies these into
// <harness>/agents). The snapshot uses them directly so the allowed set does
// not depend on whether the checkout has been self-installed.
const SOURCE_AGENTS = join(REPO_ROOT, "packages", "framework", "core", "agents");

const PERSONA = "amadeus-developer-agent";

function agentDefinition(name: string): string {
  return ["---", `name: ${name}`, "description: >", "  A t461 fixture persona.", "---", "", "# Body", ""].join("\n");
}

function seedPersonas(proj: string, names: readonly string[]): void {
  const dir = join(proj, ".claude", "agents");
  mkdirSync(dir, { recursive: true });
  for (const name of names) writeFileSync(join(dir, `${name}.md`), agentDefinition(name), "utf-8");
}

/** A schema-v1 audit line (legacy envelope: top-level `event` + `fields`). */
function v1Row(event: string, fields: Record<string, string>): string {
  return JSON.stringify({
    schemaVersion: 1,
    seq: 1,
    cloneId: "fixturecloneid01",
    intentId: "t461-fixture",
    timestamp: "2026-08-06T00:00:00Z",
    heading: "Fixture",
    event,
    fields,
  });
}

/** A schema-v2 audit line (otel envelope: the event type rides as the `Event` attribute). */
function v2Row(event: string, attributes: Record<string, string>): string {
  return JSON.stringify({
    schemaVersion: 2,
    eventId: "00000000-0000-4000-8000-000000000001",
    seq: 2,
    timestamp: "2026-08-06T00:00:01Z",
    eventName: "amadeus.subagent.completed",
    attributes: { ...attributes, Event: event },
    intentId: "t461-fixture",
    space: "default",
    cloneId: "fixturecloneid01",
    traceId: null,
    spanId: null,
    traceFlags: 0,
    idempotencyKey: "00000000-0000-4000-8000-000000000002",
    canonical: true,
  });
}

function seedShard(proj: string, intent: string, shard: string, lines: readonly string[]): void {
  const dir = join(proj, "amadeus", "spaces", "default", "intents", intent, "audit");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, shard), `${lines.join("\n")}\n`, "utf-8");
}

/** The fixture corpus: personas, a builtin, an ad-hoc name, a missing type,
 *  both journal schemas, a parse-broken line, and a WORKFLOW_STARTED whose
 *  Request mentions SUBAGENT_COMPLETED (equality matching must ignore it). */
function seedFixtureCorpus(proj: string): void {
  seedShard(proj, "t461-a-deadbeef01", "host-aaa.jsonl", [
    v1Row("SUBAGENT_COMPLETED", { "Agent Type": PERSONA }),
    v1Row("SUBAGENT_COMPLETED", { "Agent Type": "builder-x1" }),
    v1Row("SUBAGENT_COMPLETED", { "Agent Type": "coder" }),
    v2Row("SUBAGENT_COMPLETED", {
      "Agent Type": PERSONA,
      "Type Verdict": "persona",
      Model: "opus",
      "Model Source": "agent-pin",
    }),
    v1Row("SUBAGENT_COMPLETED", { Message: "no type attribute at all" }),
    v1Row("WORKFLOW_STARTED", { Request: "please run SUBAGENT_COMPLETED analysis" }),
    "{ this line is not json",
  ]);
  seedShard(proj, "t461-b-deadbeef02", "host-bbb.jsonl", [v1Row("SUBAGENT_STARTED", { "Agent Type": "coder" })]);
}

function runStats(proj: string, args: readonly string[] = []) {
  return spawnSync(BUN, [STATS_CLI, "--project-dir", proj, ...args], { encoding: "utf-8" });
}

describe("t461 subagent-stats CLI — fixture corpus (#2279)", () => {
  let proj: string;
  beforeEach(() => {
    proj = mkdtempSync(join(tmpdir(), "t461-proj-"));
    seedPersonas(proj, [PERSONA]);
    seedFixtureCorpus(proj);
  });
  afterEach(() => {
    rmSync(proj, { recursive: true, force: true });
  });

  test("both journal schemas aggregate into one report; the non-subagent line is ignored", () => {
    const res = runStats(proj);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("5 completed");
    expect(res.stdout).toContain("1 started");
    expect(res.stdout).toContain("unresolved");
    // The ad-hoc name lands in the warning bucket; the in-set types do not.
    expect(res.stdout).toContain("outside-allowed-set");
    expect(res.stdout).toContain("builder-x1");
  });

  test("--json carries the measurement ref and every tally axis (AC-6 shape)", () => {
    const res = runStats(proj, ["--json"]);
    expect(res.status).toBe(0);
    const report = JSON.parse(res.stdout) as {
      measuredAt: string;
      scanScope: string;
      shardCount: number;
      completedTotal: number;
      startedTotal: number;
      parseSkippedCount: number;
      byVerdict: Record<string, number>;
      byType: { agentType: string; verdict: string; count: number }[];
      byModel: Record<string, number>;
      byModelSource: Record<string, number>;
      unresolvedModelCount: number;
    };
    expect(report.measuredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(report.scanScope).toContain("default");
    expect(report.shardCount).toBe(2);
    expect(report.completedTotal).toBe(5);
    expect(report.startedTotal).toBe(1);
    expect(report.parseSkippedCount).toBe(1);
    expect(report.byVerdict).toEqual({ persona: 2, builtin: 1, "unknown-type": 1, "outside-allowed-set": 1 });
    expect(report.byModel).toEqual({ opus: 1 });
    expect(report.byModelSource).toEqual({ "agent-pin": 1 });
    expect(report.unresolvedModelCount).toBe(4);
    // Invariants 3/4 on the wire shape.
    const verdictSum = Object.values(report.byVerdict).reduce((a, b) => a + b, 0);
    expect(verdictSum).toBe(report.completedTotal);
    expect(report.unresolvedModelCount + Object.values(report.byModel).reduce((a, b) => a + b, 0)).toBe(
      report.completedTotal,
    );
    // The ranking is count-descending.
    const counts = report.byType.map((r) => r.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(report.byType.find((r) => r.agentType === PERSONA)).toEqual({
      agentType: PERSONA,
      verdict: "persona",
      count: 2,
    });
  });

  test("injecting an outside-set row raises the outside-allowed-set count (落ちる実証)", () => {
    const before = JSON.parse(runStats(proj, ["--json"]).stdout) as { byVerdict: Record<string, number> };
    expect(before.byVerdict["outside-allowed-set"]).toBe(1);
    seedShard(proj, "t461-c-deadbeef03", "host-ccc.jsonl", [
      v1Row("SUBAGENT_COMPLETED", { "Agent Type": "adhoc-injected" }),
    ]);
    const after = JSON.parse(runStats(proj, ["--json"]).stdout) as { byVerdict: Record<string, number> };
    expect(after.byVerdict["outside-allowed-set"]).toBe(2);
  });

  test("an unknown flag is a loud error with a non-zero exit (BR-U3-1, fail-closed)", () => {
    const res = runStats(proj, ["--bogus"]);
    expect(res.status).not.toBe(0);
    expect(res.stderr.length).toBeGreaterThan(0);
    expect(res.stderr).toContain("--bogus");
  });

  test("an unreadable shard is counted, surfaced, and forces a non-zero exit (fail-loud)", () => {
    const dir = join(proj, "amadeus", "spaces", "default", "intents", "t461-d-deadbeef04", "audit");
    mkdirSync(dir, { recursive: true });
    const locked = join(dir, "host-locked.jsonl");
    writeFileSync(locked, `${v1Row("SUBAGENT_COMPLETED", { "Agent Type": "coder" })}\n`, "utf-8");
    chmodSync(locked, 0o000);
    try {
      const res = runStats(proj, ["--json"]);
      expect(res.status).not.toBe(0);
      expect(res.stderr).toContain("host-locked.jsonl");
      const report = JSON.parse(res.stdout) as { unreadableShardCount: number; completedTotal: number };
      expect(report.unreadableShardCount).toBe(1);
      // The rest of the corpus still aggregates — the fail-loud is the exit
      // code, not a dropped tally.
      expect(report.completedTotal).toBe(5);
    } finally {
      chmodSync(locked, 0o644);
    }
  });

  test("an empty corpus is a normal zero report, not an error", () => {
    const empty = mkdtempSync(join(tmpdir(), "t461-empty-"));
    try {
      seedPersonas(empty, [PERSONA]);
      const res = runStats(empty);
      expect(res.status).toBe(0);
      expect(res.stdout).toContain("0 completed");
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

// ---- AC-3 / AC-6: the real corpus sweep ------------------------------------
//
// The audit corpus is a moving value, so the sweep runs against a byte
// snapshot taken at measurement time: the CLI and the independent oracle read
// the SAME bytes and no concurrent append can race the comparison. The oracle
// walks the shards with its own parser and classifies with U1's
// classifyAgentType — it never touches the module under test (BR-U3-6).

/** Copy the real corpus's audit shards into a snapshot project dir. Returns
 *  the snapshot root and the shard count copied. */
function snapshotCorpus(): { root: string; shardCount: number } {
  const root = mkdtempSync(join(tmpdir(), "t461-corpus-"));
  mkdirSync(join(root, ".claude"), { recursive: true });
  // The personas ARE the allowed set for this sweep. A silent copy failure would
  // leave both sides agreeing on the builtin ledger alone, and AC-3 would pass
  // while proving nothing - so the copy is verified by name before we proceed.
  const snapshotAgents = join(root, ".claude", "agents");
  cpSync(SOURCE_AGENTS, snapshotAgents, { recursive: true });
  const definitionNames = (dir: string): string[] =>
    readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort();
  const sourceNames = definitionNames(SOURCE_AGENTS);
  expect(sourceNames.length).toBeGreaterThan(0);
  expect(definitionNames(snapshotAgents)).toEqual(sourceNames);
  const intentsRoot = join(REPO_ROOT, "amadeus", "spaces", "default", "intents");
  let shardCount = 0;
  for (const intent of readdirSync(intentsRoot).sort()) {
    const auditDir = join(intentsRoot, intent, "audit");
    if (!existsSync(auditDir)) continue;
    const mirror = join(root, "amadeus", "spaces", "default", "intents", intent, "audit");
    mkdirSync(mirror, { recursive: true });
    for (const shard of readdirSync(auditDir).sort()) {
      if (!shard.endsWith(".jsonl")) continue;
      copyFileSync(join(auditDir, shard), join(mirror, shard));
      shardCount += 1;
    }
  }
  return { root, shardCount };
}

/** The independent oracle: its own shard walker + U1's classifier. Never the CLI. */
function oracleTally(root: string): { completed: number; byVerdict: Record<string, number>; allowed: Set<string> } {
  const resolution = resolveAllowedAgentTypes(join(root, ".claude", "agents"));
  const byVerdict: Record<string, number> = { persona: 0, builtin: 0, "unknown-type": 0, "outside-allowed-set": 0 };
  let completed = 0;
  const intentsRoot = join(root, "amadeus", "spaces", "default", "intents");
  for (const intent of readdirSync(intentsRoot).sort()) {
    const auditDir = join(intentsRoot, intent, "audit");
    if (!existsSync(auditDir)) continue;
    for (const shard of readdirSync(auditDir).sort()) {
      if (!shard.endsWith(".jsonl")) continue;
      for (const line of readFileSync(join(auditDir, shard), "utf-8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("{")) continue;
        let raw: Record<string, unknown>;
        try {
          raw = JSON.parse(trimmed) as Record<string, unknown>;
        } catch {
          continue;
        }
        const v2 = raw.schemaVersion === 2;
        const event = v2 ? (raw.attributes as Record<string, unknown>)?.Event : raw.event;
        if (event !== "SUBAGENT_COMPLETED") continue;
        const fields = (v2 ? raw.attributes : raw.fields) as Record<string, unknown>;
        const agentType = fields?.["Agent Type"];
        const normalized = typeof agentType === "string" && agentType.trim() ? agentType : "unknown";
        byVerdict[classifyAgentType(normalized, resolution)] += 1;
        completed += 1;
      }
    }
  }
  return { completed, byVerdict, allowed: new Set(resolution.allowed) };
}

describe("t461 AC-3 corpus sweep — both sides (#2279)", () => {
  let snapshot: { root: string; shardCount: number };
  beforeEach(() => {
    snapshot = snapshotCorpus();
  });
  afterEach(() => {
    rmSync(snapshot.root, { recursive: true, force: true });
  });

  test("no persona shadows a builtin ledger entry (AC-3 step 0)", () => {
    const FRONTMATTER_NAME = /^name:[ \t]*(.+?)[ \t]*$/m;
    const collisions: string[] = [];
    for (const file of readdirSync(SOURCE_AGENTS).sort()) {
      if (!file.endsWith(".md")) continue;
      const name = FRONTMATTER_NAME.exec(readFileSync(join(SOURCE_AGENTS, file), "utf-8"))?.[1]?.trim();
      if (name && BUILTIN_AGENT_TYPES.includes(name)) collisions.push(name);
    }
    expect(collisions).toEqual([]);
  });

  test("in-set types draw zero warnings and the warn counts match the independent oracle (AC-3)", () => {
    const oracle = oracleTally(snapshot.root);
    const res = runStats(snapshot.root, ["--json"]);
    expect(res.status).toBe(0);
    const report = JSON.parse(res.stdout) as {
      completedTotal: number;
      shardCount: number;
      byVerdict: Record<string, number>;
      byType: { agentType: string; verdict: string; count: number }[];
    };
    // The CLI read the whole snapshot.
    expect(report.shardCount).toBe(snapshot.shardCount);
    // (ii) the warn-side tally equals the independent recount, exactly.
    expect(report.completedTotal).toBe(oracle.completed);
    expect(report.byVerdict).toEqual(oracle.byVerdict);
    // (i) no observed in-set type carries a warnable verdict row.
    const warnable = report.byType.filter((r) => r.verdict === "unknown-type" || r.verdict === "outside-allowed-set");
    for (const row of warnable) {
      expect(row.agentType === "unknown" || !oracle.allowed.has(row.agentType)).toBe(true);
    }
  });

  test("the real output prints the measurement ref and the unresolved bucket (AC-6)", () => {
    const res = runStats(snapshot.root);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(res.stdout).toContain('space "default"');
    expect(res.stdout).toContain("completed");
    expect(res.stdout).toContain("unresolved");
  });
});

// The spawn suites above own the process contract (argv, stdout, exit code).
// These call the same seams IN-PROCESS against the same fixture corpus, because
// Bun does not merge a spawned child's coverage: without this the scan, the
// wire shape, and the argv handling would be measured as unexercised even
// though the CLI suite drives them. Same corpus, same assertions in kind - the
// difference is only which side of the process boundary the call happens on.
describe("t461 subagent-stats seams — in-process (#2279)", () => {
  let proj: string;
  beforeEach(() => {
    proj = mkdtempSync(join(tmpdir(), "t461-inproc-"));
    seedPersonas(proj, [PERSONA]);
    seedFixtureCorpus(proj);
  });
  afterEach(() => {
    rmSync(proj, { recursive: true, force: true });
  });

  test("scanAuditCorpus folds both schemas, counts the broken line, and ignores non-subagent rows", () => {
    const scanned = scanAuditCorpus(proj, "default");

    expect(scanned.shardCount).toBe(2);
    expect(scanned.unreadableShardCount).toBe(0);
    expect(scanned.parseSkippedCount).toBe(1);
    expect(scanned.records.filter((r) => r.event === "SUBAGENT_COMPLETED")).toHaveLength(5);
    expect(scanned.records.filter((r) => r.event === "SUBAGENT_STARTED")).toHaveLength(1);
    // The v2 row carries its attributes; the attribute-less row carries none.
    expect(scanned.records.some((r) => r.model === "opus" && r.modelSource === "agent-pin")).toBe(true);
    expect(scanned.records.some((r) => r.agentType === undefined)).toBe(true);
  });

  test("a non-object and a non-record JSON line are skipped, not folded in", () => {
    const solo = mkdtempSync(join(tmpdir(), "t461-shapes-"));
    try {
      seedShard(solo, "t461-c-deadbeef03", "host-ccc.jsonl", [
        "[]",
        '"a string"',
        "42",
        "null",
        v1Row("SUBAGENT_COMPLETED", { "Agent Type": "coder" }),
      ]);
      const scanned = scanAuditCorpus(solo, "default");
      // Well-formed JSON of the wrong shape parses, so it is not a parse skip -
      // it simply yields no record.
      expect(scanned.parseSkippedCount).toBe(0);
      expect(scanned.records).toHaveLength(1);
    } finally {
      rmSync(solo, { recursive: true, force: true });
    }
  });

  test("a missing corpus is an empty scan, not a failure", () => {
    const empty = mkdtempSync(join(tmpdir(), "t461-empty-"));
    try {
      expect(scanAuditCorpus(empty, "default")).toEqual({
        shardCount: 0,
        unreadableShardCount: 0,
        parseSkippedCount: 0,
        records: [],
      });
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  test("serializeStatsReport turns the Maps into the JSON wire shape without losing a tally", () => {
    const scanned = scanAuditCorpus(proj, "default");
    const report = composeStatsReport(
      scanned,
      resolveAllowedAgentTypes(join(proj, ".claude", "agents")),
      "2026-08-06T00:00:00.000Z",
      "probe",
    );
    const wire = serializeStatsReport(report) as Record<string, unknown>;

    expect(wire.measuredAt).toBe("2026-08-06T00:00:00.000Z");
    expect(wire.completedTotal).toBe(report.completedTotal);
    expect(wire.startedTotal).toBe(report.startedTotal);
    // Maps become plain objects; every tally survives the conversion.
    const byVerdict = wire.byVerdict as Record<string, number>;
    expect(Object.values(byVerdict).reduce((a, b) => a + b, 0)).toBe(report.completedTotal);
    const byModel = wire.byModel as Record<string, number>;
    expect(Object.values(byModel).reduce((a, b) => a + b, 0) + (wire.unresolvedModelCount as number)).toBe(
      report.completedTotal,
    );
    expect(JSON.parse(JSON.stringify(wire))).toEqual(wire);
  });

  test("main resolves the project dir and space from argv and reports exit 0", () => {
    expect(statsMain(["--project-dir", proj])).toBe(0);
    expect(statsMain(["--project-dir", proj, "--space", "default"])).toBe(0);
    expect(statsMain(["--project-dir", proj, "--json"])).toBe(0);
  });

  test("main fails closed on an unknown flag, a value-less option, and an unsafe space", () => {
    expect(statsMain(["--nope"])).toBe(2);
    expect(statsMain(["--project-dir"])).toBe(2);
    expect(statsMain(["--space"])).toBe(2);
    expect(statsMain(["--project-dir", proj, "--space", "../escape"])).toBe(2);
  });

  test("main reads the active-space cursor, and falls back to default when it is absent or unsafe", () => {
    // No cursor: the default space still resolves and the corpus is found.
    expect(statsMain(["--project-dir", proj])).toBe(0);

    mkdirSync(join(proj, "amadeus"), { recursive: true });
    writeFileSync(join(proj, "amadeus", "active-space"), "default\n", "utf-8");
    expect(statsMain(["--project-dir", proj])).toBe(0);

    // An unsafe cursor value is ignored rather than obeyed.
    writeFileSync(join(proj, "amadeus", "active-space"), "../escape\n", "utf-8");
    expect(statsMain(["--project-dir", proj])).toBe(0);
  });

  test("an unreadable shard is fail-loud: counted, announced, and a non-zero exit", () => {
    const dir = join(proj, "amadeus", "spaces", "default", "intents", "t461-a-deadbeef01", "audit");
    const locked = join(dir, "locked.jsonl");
    writeFileSync(locked, `${v1Row("SUBAGENT_COMPLETED", { "Agent Type": "coder" })}\n`, "utf-8");
    chmodSync(locked, 0o000);
    try {
      const scanned = scanAuditCorpus(proj, "default");
      expect(scanned.unreadableShardCount).toBe(1);
      expect(statsMain(["--project-dir", proj])).not.toBe(0);
    } finally {
      chmodSync(locked, 0o600);
    }
  });
  test("without --project-dir the CLAUDE_PROJECT_DIR seam wins, then the module's own harness root", () => {
    const previous = process.env.CLAUDE_PROJECT_DIR;
    try {
      process.env.CLAUDE_PROJECT_DIR = proj;
      expect(statsMain([])).toBe(0);

      // Unset: the resolver walks up from the module's own location. The module
      // under test lives in dist/claude/.claude/tools, so the harness-root arm
      // is the one that answers - it must resolve without throwing.
      delete process.env.CLAUDE_PROJECT_DIR;
      expect(statsMain([])).toBe(0);
    } finally {
      if (previous === undefined) delete process.env.CLAUDE_PROJECT_DIR;
      else process.env.CLAUDE_PROJECT_DIR = previous;
    }
  });

  test("JSON of the wrong shape is narrowed away, not parsed as a failure", () => {
    const solo = mkdtempSync(join(tmpdir(), "t461-scalar-"));
    try {
      seedShard(solo, "t461-d-deadbeef04", "host-ddd.jsonl", [
        // Not object-shaped at the envelope: the scan skips them before parsing.
        "true",
        "3.14",
        '"str"',
        // Object-shaped envelope whose attribute bag is NOT an object. This is
        // the line that exercises the narrowing rejection: the envelope parses,
        // but the bag cannot be read as fields and must yield no record.
        '{"schemaVersion":2,"attributes":"not-an-object"}',
        '{"schemaVersion":1,"fields":42,"event":"SUBAGENT_COMPLETED"}',
      ]);
      const scanned = scanAuditCorpus(solo, "default");
      // Well-formed JSON of the wrong shape is not a parse failure.
      expect(scanned.parseSkippedCount).toBe(0);
      expect(scanned.shardCount).toBe(1);
      // v2 carries its event inside the attribute bag, so an unreadable bag
      // leaves no event and the line yields nothing. v1 carries the event on
      // the envelope, so it still records - with no attributes to read.
      expect(scanned.records).toHaveLength(1);
      expect(scanned.records[0]?.event).toBe("SUBAGENT_COMPLETED");
      expect(scanned.records[0]?.agentType).toBeUndefined();
      expect(scanned.records[0]?.model).toBeUndefined();
    } finally {
      rmSync(solo, { recursive: true, force: true });
    }
  });
  test("an unreadable intents tree is an empty corpus, not a crash (no TOCTOU window)", () => {
    // The corpus is written while this runs, so a dir can vanish between a
    // pre-check and the listing. Simulate the same observable state with a dir
    // the process cannot list: the scan must degrade, not throw.
    const locked = mkdtempSync(join(tmpdir(), "t461-locked-"));
    const intentsRoot = join(locked, "amadeus", "spaces", "default", "intents");
    mkdirSync(intentsRoot, { recursive: true });
    mkdirSync(join(intentsRoot, "t461-e-deadbeef05", "audit"), { recursive: true });
    chmodSync(intentsRoot, 0o000);
    try {
      const scanned = scanAuditCorpus(locked, "default");
      expect(scanned.shardCount).toBe(0);
      expect(scanned.records).toHaveLength(0);
      // Nothing was read, so nothing is reported as an unreadable SHARD - the
      // fail-loud counter is for shards that exist and cannot be read.
      expect(scanned.unreadableShardCount).toBe(0);
    } finally {
      chmodSync(intentsRoot, 0o700);
      rmSync(locked, { recursive: true, force: true });
    }
  });
});

// buildOversizedCorpus seeds a shard with enough distinct Agent Type values
// that the --json per-type breakdown exceeds the 64KiB pipe buffer that
// reproduced Issue #2700 (measured: 4000 distinct types -> ~428,612 bytes,
// comfortably past 65536 with margin for renderer changes).
function buildOversizedCorpus(proj: string, count: number): void {
  const models = ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5-20251001"];
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    lines.push(
      v1Row("SUBAGENT_COMPLETED", {
        "Agent Type": `bulk-type-${String(i).padStart(4, "0")}`,
        Model: models[i % models.length],
        "Type Verdict": "unknown-type",
      }),
    );
  }
  seedShard(proj, "t461-bulk-deadbeef09", "host-bulk.jsonl", lines);
}

describe("pipe integrity — Issue #2700, stdout must fully drain before exit", () => {
  const RUN_OPTIONS = { encoding: "utf-8", env: process.env, timeout: 60_000, killSignal: "SIGKILL" } as const;

  test("output bigger than the 64KiB pipe buffer is not truncated when piped", () => {
    const proj = mkdtempSync(join(tmpdir(), "t461-oversized-"));
    seedPersonas(proj, [PERSONA]);
    buildOversizedCorpus(proj, 4000);
    try {
      // Full capture: spawnSync reads the child's stdout pipe to EOF itself,
      // so this number is what a correct, fully-drained run actually
      // produces.
      const full = spawnSync(BUN, [STATS_CLI, "--project-dir", proj, "--json"], { ...RUN_OPTIONS, maxBuffer: 16 * 1024 * 1024 });
      expect(full.status).toBe(0);
      const fullBytes = Buffer.byteLength(full.stdout ?? "", "utf-8");
      // Fixture precondition, checked mechanically rather than assumed: the
      // report must actually exceed the pipe buffer size that reproduced the
      // defect, or the byte-count comparison below proves nothing.
      expect(fullBytes).toBeGreaterThan(65536);

      // Piped capture: reproduce the exact shape from the issue report
      // (`... | wc -c`) — a downstream reader racing the producer's exit.
      // Positional params (`--`) keep the scratch paths out of the shell
      // script string entirely. bash, not sh: on Linux runners sh is dash,
      // which rejects `set -o pipefail` with exit 2.
      const piped = spawnSync(
        "bash",
        ["-c", 'set -o pipefail; "$1" "$2" --project-dir "$3" --json | wc -c', "--", BUN, STATS_CLI, proj],
        RUN_OPTIONS,
      );
      expect(piped.status).toBe(0);
      const pipedBytes = Number((piped.stdout ?? "").trim());
      expect(pipedBytes).toBe(fullBytes);
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });
});
