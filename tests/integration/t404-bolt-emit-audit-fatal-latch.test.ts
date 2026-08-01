// covers: subcommand:amadeus-bolt:set-autonomy, subcommand:amadeus-bolt:approve-batch, otel:audit-emit
// size: medium
//
// t404 — amadeus-bolt's emitAudit must consume the fatal-latch drop (#1959).
//
// The emit path fail-closes as a non-throwing DROP under the fatal health
// latch (logger-provider, #1856). amadeus-bolt's emitAudit wrapper discarded
// that outcome, so every bolt handler's try/catch around emitAudit caught
// nothing and proceeded: set-autonomy and approve-batch wrote state with no
// ledger row behind it. This suite pins the amadeus-state.ts precedent
// (assertMutationAllowed before the emit, re-assert on a fatal-latch drop)
// as lifted into the shared emitAuditEventGuarded seam bolt now calls.
//
// Mechanism: cli for the handler-level pins (a spawned bolt process whose
// bootstrap health probe latches on a corrupted shard), plus in-process
// drives of the guarded seam so the new lines are lcov-measured (bun
// --coverage does not measure spawned subprocesses).

import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { emitAuditEventGuarded } from "../../dist/claude/.claude/otel/audit-emit.ts";
import { resetOtelBootstrapForTests } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { resetFatalLatchForTests, setFatal } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { auditFilePath, birthIntent } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import { cleanupTestProject, createTestProject, setupIntegrationProject } from "../harness/fixtures.ts";

const BUN = process.execPath;

const toolIn = (proj: string, name: string): string => join(proj, ".claude", "tools", name);

function run(proj: string, tool: string, args: string[]): { status: number; out: string } {
  const childEnv: Record<string, string | undefined> = { ...process.env };
  delete childEnv.AMADEUS_SCOPE_MAPPING;
  const res = spawnSync(BUN, [amadeusToolTarget(toolIn(proj, tool)), ...args, "--project-dir", proj], {
    encoding: "utf-8",
    env: childEnv as Record<string, string>,
    cwd: proj,
  });
  return { status: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function recordDirOf(proj: string): string {
  const space = readFileSync(join(proj, "amadeus", "active-space"), "utf-8").trim() || "default";
  const intentsDir = join(proj, "amadeus", "spaces", space, "intents");
  const rec = readFileSync(join(intentsDir, "active-intent"), "utf-8").trim();
  return join(intentsDir, rec);
}

const readState = (proj: string): string =>
  readFileSync(join(recordDirOf(proj), "amadeus-state.md"), "utf-8");

// The intent's audit shard(s), concatenated. Birth writes exactly one shard
// for this clone; reading them all keeps the helper honest either way.
function auditContent(proj: string): string {
  const dir = join(recordDirOf(proj), "audit");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => readFileSync(join(dir, f), "utf-8"))
    .join("");
}

// Corrupt the shard so the NEXT spawned process's bootstrap health probe
// (verifyJournalHealth, FR-EVT-5) latches it: an unparseable journal line.
function corruptAuditShard(proj: string): void {
  const dir = join(recordDirOf(proj), "audit");
  const shard = readdirSync(dir).find((f) => f.endsWith(".jsonl"));
  if (!shard) throw new Error(`no audit shard under ${dir}`);
  appendFileSync(join(dir, shard), "not-a-journal-line\n", "utf-8");
}

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

function bornProject(): string {
  const proj = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  tempDirs.push(proj);
  expect(run(proj, "amadeus-utility.ts", ["intent-birth", "--scope", "feature"]).status).toBe(0);
  return proj;
}

describe("t404 bolt handlers under a latched process (#1959)", () => {
  test("latched set-autonomy fails loudly and writes NO state", () => {
    const proj = bornProject();
    corruptAuditShard(proj);

    const r = run(proj, "amadeus-bolt.ts", ["set-autonomy", "--mode", "gated"]);

    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/fatal health latch/i);
    // The state write behind the dropped emit must NOT have happened.
    expect(readState(proj)).toContain("- **Construction Autonomy Mode**: unset");
    // And no AUTONOMY_MODE_SET row landed on the (corrupted) ledger.
    expect(auditContent(proj)).not.toContain("AUTONOMY_MODE_SET");
  });

  test("latched approve-batch records NO gate approval in state and NO ledger row", () => {
    const proj = bornProject();
    corruptAuditShard(proj);

    const r = run(proj, "amadeus-bolt.ts", ["approve-batch", "--batch", "1"]);

    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/fatal health latch/i);
    expect(readState(proj)).not.toContain("Swarm Gated Batch Approvals");
    expect(auditContent(proj)).not.toContain("GATE_APPROVED");
  });

  test("unlatched set-autonomy behaves as before: state written, audit row present", () => {
    const proj = bornProject();

    const r = run(proj, "amadeus-bolt.ts", ["set-autonomy", "--mode", "gated"]);

    expect(r.status).toBe(0);
    expect(readState(proj)).toContain("- **Construction Autonomy Mode**: gated");
    expect(auditContent(proj)).toContain("AUTONOMY_MODE_SET");
  });
});

// In-process drives of the guarded seam itself, so its lines are measured by
// bun --coverage (spawned subprocesses are not). Fixture shape follows t386.
describe("t404 emitAuditEventGuarded seam (in-process)", () => {
  let proj: string;
  beforeEach(() => {
    proj = createTestProject();
    resetFatalLatchForTests();
    resetLoggerProviderForTests();
    resetOtelBootstrapForTests();
    ensureContextManager();
  });
  afterEach(() => {
    cleanupTestProject(proj);
    resetFatalLatchForTests();
    resetLoggerProviderForTests();
    resetOtelBootstrapForTests();
  });

  test("a latch already set refuses BEFORE the emit", () => {
    birthIntent(proj, "guarded-pre-latched", "default", "feature");
    // Seed the shard with one clean row so the refusal leaves it bit-identical.
    emitAuditEventGuarded("AUTONOMY_MODE_SET", { Mode: "autonomous" }, proj);
    const before = readFileSync(auditFilePath(proj), "utf-8");
    setFatal("journal health probe failed: unparseable journal line");

    expect(() => emitAuditEventGuarded("AUTONOMY_MODE_SET", { Mode: "gated" }, proj)).toThrow(
      /fatal health latch/,
    );
    expect(readFileSync(auditFilePath(proj), "utf-8")).toBe(before);
  });

  test("a latch set INSIDE the bootstrap emit (health probe) still throws — the drop is consumed", () => {
    const intent = birthIntent(proj, "guarded-probe-latch", "default", "feature");
    emitAuditEventGuarded("AUTONOMY_MODE_SET", { Mode: "autonomous" }, proj);
    appendFileSync(auditFilePath(proj), "not-a-journal-line\n", "utf-8");
    // A fresh "process": the next emit's bootstrap re-runs the health probe,
    // which latches AFTER the wrapper's leading assert already passed.
    resetFatalLatchForTests();
    resetLoggerProviderForTests();
    resetOtelBootstrapForTests();

    expect(() =>
      emitAuditEventGuarded("AUTONOMY_MODE_SET", { Mode: "gated" }, proj, intent.dirName, "default"),
    ).toThrow(/fatal health latch/);
    expect(readFileSync(auditFilePath(proj), "utf-8")).not.toContain('"Mode":"gated"');
  });

  test("unlatched: the guarded emit appends and returns the outcome", () => {
    const intent = birthIntent(proj, "guarded-clean", "default", "feature");

    const result = emitAuditEventGuarded(
      "AUTONOMY_MODE_SET",
      { Mode: "gated" },
      proj,
      intent.dirName,
      "default",
    );

    expect(result.appended).toBe(true);
    expect(readFileSync(auditFilePath(proj), "utf-8")).toContain("gated");
  });
});
