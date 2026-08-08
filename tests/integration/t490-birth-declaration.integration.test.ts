// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-production.ts(applyProductionAutonomyMode), file:packages/framework/core/tools/amadeus-utility.ts(handleIntentBirth), subcommand:amadeus-utility:intent-birth
// size: medium
//
// t490 (integration) — u2-birth-declaration (#2378 FR-1).
//
// `/amadeus --autonomy <mode> "<description>"` must be accepted AT BIRTH. Before
// this unit the declaration was structurally impossible on a fresh intent: the
// canonical write path resolves provenance from the ACTIVE intent's own audit
// shards, and a just-born intent has none — the launching keystroke's HUMAN_TURN
// landed in whatever intent the on-disk cursor named at the time (the PREVIOUS
// one, or nowhere at all on a truly empty workspace). Every declaration
// therefore came back PROVENANCE_REQUIRED.
//
// The ruling (E-U2BLK, user 2026-08-08) widens the REFERENCE rather than minting
// presence: the launch-chain scope may accept the real, already-minted HUMAN_TURN
// that authorized this launch. Nothing new is written, so the forgery surface is
// unchanged. These tests pin the three halves of that contract:
//
//   1. the widened reference is OPT-IN (strict intent scope stays the default)
//      and is refused outright for `full`, whose grant ceremony is never relaxed;
//   2. what it accepts is bounded — a REAL, UNCONSUMED human turn that precedes
//      this birth, not any older presence lying around;
//   3. with no such turn anywhere (a truly new workspace) it fails LOUD, leaving
//      the mode unset and the first declaration still available.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handleIntentBirth } from "../../packages/framework/core/tools/amadeus-utility.ts";
import {
  applyProductionAutonomyMode,
  readProductionAutonomyProjection,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { getField } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { AMADEUS_SRC, cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const BUN = process.execPath;

function intentsDir(projectDir: string): string {
  return join(projectDir, "amadeus", "spaces", "default", "intents");
}

function activeRecordDir(projectDir: string): string {
  const active = readFileSync(join(intentsDir(projectDir), "active-intent"), "utf8").trim();
  return join(intentsDir(projectDir), active);
}

function stateOf(projectDir: string): string {
  return readFileSync(join(activeRecordDir(projectDir), "amadeus-state.md"), "utf8");
}

function birth(projectDir: string, extra: string[] = []): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(
    BUN,
    [
      join(projectDir, ".claude", "tools", "amadeus-utility.ts"),
      "intent-birth",
      "--scope",
      "feature",
      "--project-dir",
      projectDir,
      ...extra,
    ],
    { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
  );
  return { status: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

// Append a REAL audit block to one record's shard — the same shape the
// UserPromptSubmit hook mints for HUMAN_TURN. `at` lets a test place the event
// before or after a birth so the ordering bound is exercised rather than assumed.
function appendAuditBlock(recordDir: string, event: string, heading: string, at: string): void {
  const auditDir = join(recordDir, "audit");
  mkdirSync(auditDir, { recursive: true });
  const path = join(auditDir, "t490-presence.jsonl");
  const seq = existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).length + 1 : 1;
  appendFileSync(
    path,
    `${JSON.stringify({
      schemaVersion: 1,
      seq,
      cloneId: "t490-presence",
      intentId: "t490-presence",
      timestamp: at,
      heading,
      event,
      fields: {},
    })}\n`,
  );
}

function appendHumanTurn(recordDir: string, at: string): void {
  appendAuditBlock(recordDir, "HUMAN_TURN", "Human Turn", at);
}

// A GATE_APPROVED after the turn is what CONSUMES it in the presence ledger —
// the existing "the human acted and nothing has resolved it since" ordering.
function appendGateApproved(recordDir: string, at: string): void {
  appendAuditBlock(recordDir, "GATE_APPROVED", "Gate Approved", at);
}

// The realistic launch shape: a workspace that already holds an intent (whose
// shard therefore carries the keystroke's HUMAN_TURN), then a SECOND birth that
// makes a brand-new intent active. Returns both record dirs.
function workspaceWithPriorTurn(): { projectDir: string; prior: string; born: string } {
  const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  expect(birth(projectDir, ["--label", "prior work"]).status).toBe(0);
  const prior = activeRecordDir(projectDir);
  appendHumanTurn(prior, "2000-01-01T00:00:00.000Z");
  expect(birth(projectDir, ["--label", "new work"]).status).toBe(0);
  const born = activeRecordDir(projectDir);
  expect(born).not.toBe(prior);
  return { projectDir, prior, born };
}

// `next` as the conductor runs it: spawned, so the whole chain below is the real
// CLI rather than an in-process approximation.
function next(projectDir: string, args: string[]): { status: number; stdout: string; stderr: string } {
  const env = { ...process.env };
  delete env.AMADEUS_DEFAULT_SCOPE;
  const result = spawnSync(
    BUN,
    [
      join(projectDir, ".claude", "tools", "amadeus-orchestrate.ts"),
      "next",
      ...args,
      "--project-dir",
      projectDir,
    ],
    { cwd: projectDir, encoding: "utf8", env },
  );
  return { status: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function directiveOf(stdout: string): Record<string, unknown> {
  const line = stdout.split("\n").find((l) => l.trim().startsWith("{"));
  expect(line).toBeDefined();
  return JSON.parse(line as string) as Record<string, unknown>;
}

// The birth handler driven IN-PROCESS. The spawned `birth()` above is the real
// user-facing chain, but bun's coverage cannot see inside a child, so the wiring
// between the flag and the declaration is exercised here as well
// (bun-coverage-spawn-blindspot). stdout is captured because the declaration
// reports through it.
function birthInProcess(projectDir: string, flags: Record<string, string>): string {
  const original = process.stdout.write.bind(process.stdout);
  // The canonical tree ships no data/ dir (the packager writes it), so the
  // graph/grid/scopes are pinned at the built copy the spawned half already uses.
  const pins = {
    AMADEUS_STAGE_GRAPH: join(AMADEUS_SRC, "tools", "data", "stage-graph.json"),
    AMADEUS_SCOPE_GRID: join(AMADEUS_SRC, "tools", "data", "scope-grid.json"),
    AMADEUS_SCOPES_DIR: join(AMADEUS_SRC, "scopes"),
  };
  const saved = new Map(Object.keys(pins).map((k) => [k, process.env[k]]));
  Object.assign(process.env, pins);
  let out = "";
  process.stdout.write = ((chunk: unknown) => {
    out += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  try {
    handleIntentBirth(projectDir, { ...flags, "project-dir": projectDir });
  } finally {
    process.stdout.write = original;
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  return out;
}

let proj: string | undefined;
afterEach(() => {
  resetOtelPerProject();
  cleanupTestProject(proj);
  proj = undefined;
});

describe("t490 launch-chain provenance (ruling condition 1: opt-in, fail-closed default)", () => {
  test("the default scope still refuses a just-born intent — nothing was relaxed by accident", () => {
    const w = workspaceWithPriorTurn();
    proj = w.projectDir;
    expect(
      applyProductionAutonomyMode({ projectDir: proj, stateContent: stateOf(proj), mode: "semi" }),
    ).toEqual({ ok: false, error: "PROVENANCE_REQUIRED" });
  });

  test("the launch-chain scope accepts the real turn that authorized the launch", () => {
    const w = workspaceWithPriorTurn();
    proj = w.projectDir;
    expect(
      applyProductionAutonomyMode({
        projectDir: proj,
        stateContent: stateOf(proj),
        mode: "semi",
        provenanceScope: "launch-chain",
      }),
    ).toMatchObject({ ok: true, projection: { mode: "semi" } });
    expect(getField(stateOf(proj), "Intent Autonomy Mode")?.trim()).toBe("semi");
  });

  test("`full` may never use it — the grant ceremony is not on this path", () => {
    const w = workspaceWithPriorTurn();
    proj = w.projectDir;
    expect(
      applyProductionAutonomyMode({
        projectDir: proj,
        stateContent: stateOf(proj),
        mode: "full",
        provenanceScope: "launch-chain",
      }),
    ).toEqual({ ok: false, error: "PROVENANCE_SCOPE_FORBIDDEN" });
    expect(readProductionAutonomyProjection(proj)?.mode).toBe("none");
  });
});

describe("t490 launch-chain provenance (ruling condition 2: bounded, real turns only)", () => {
  test("a turn a gate already consumed is not resurrected", () => {
    const w = workspaceWithPriorTurn();
    proj = w.projectDir;
    appendGateApproved(w.prior, "2000-01-01T00:00:01.000Z");
    expect(
      applyProductionAutonomyMode({
        projectDir: proj,
        stateContent: stateOf(proj),
        mode: "semi",
        provenanceScope: "launch-chain",
      }),
    ).toEqual({ ok: false, error: "PROVENANCE_REQUIRED" });
  });

  test("a turn recorded AFTER this birth did not authorize it", () => {
    const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    proj = projectDir;
    expect(birth(projectDir, ["--label", "prior work"]).status).toBe(0);
    const prior = activeRecordDir(projectDir);
    expect(birth(projectDir, ["--label", "new work"]).status).toBe(0);
    // Minted only after the new intent exists — a later, unrelated keystroke.
    appendHumanTurn(prior, "2999-01-01T00:00:00.000Z");
    expect(
      applyProductionAutonomyMode({
        projectDir,
        stateContent: stateOf(projectDir),
        mode: "semi",
        provenanceScope: "launch-chain",
      }),
    ).toEqual({ ok: false, error: "PROVENANCE_REQUIRED" });
  });
});

describe("t490 intent-birth --autonomy (FR-1a/FR-1b, BR-U2-3, BR-U2-4)", () => {
  test("a semi declaration is applied through the canonical write path at birth", () => {
    const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    proj = projectDir;
    expect(birth(projectDir, ["--label", "prior work"]).status).toBe(0);
    appendHumanTurn(activeRecordDir(projectDir), "2000-01-01T00:00:00.000Z");

    const run = birth(projectDir, ["--label", "new work", "--autonomy", "semi"]);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("Intent autonomy: semi");
    expect(getField(stateOf(projectDir), "Intent Autonomy Mode")?.trim()).toBe("semi");
  });

  test("`full` births the intent but never applies — it prints the ceremony and stops", () => {
    const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    proj = projectDir;
    expect(birth(projectDir, ["--label", "prior work"]).status).toBe(0);
    appendHumanTurn(activeRecordDir(projectDir), "2000-01-01T00:00:00.000Z");

    const run = birth(projectDir, ["--label", "new work", "--autonomy", "full"]);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("Intent born:");
    expect(run.stdout).toContain("preview-autonomy");
    expect(run.stdout).toContain("set-autonomy --mode full");
    expect(getField(stateOf(projectDir), "Intent Autonomy Mode")?.trim()).toBe("none");
  });

  test("an unusable mode name dies before anything is minted", () => {
    const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    proj = projectDir;
    const run = birth(projectDir, ["--autonomy", "bogus"]);
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("bogus");
    expect(existsSync(join(intentsDir(projectDir), "active-intent"))).toBe(false);
  });

  test("with no human turn anywhere the declaration fails LOUD and stays re-declarable", () => {
    // Ruling condition 3: a truly new workspace mints no presence (the hook
    // self-gates on the state file), so there is nothing real to reference.
    const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    proj = projectDir;
    const run = birth(projectDir, ["--label", "new work", "--autonomy", "semi"]);
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("--autonomy semi");
    // The intent IS born, the mode is NOT set, and the first declaration was not
    // spent — re-declaring against the now-live intent still works (BR-U2-4).
    const projection = readProductionAutonomyProjection(projectDir);
    expect(projection?.mode).toBe("none");
    expect(projection?.modeProvenance.kind).not.toBe("human-command");
    appendHumanTurn(activeRecordDir(projectDir), new Date().toISOString());
    expect(
      applyProductionAutonomyMode({ projectDir, stateContent: stateOf(projectDir), mode: "semi" }),
    ).toMatchObject({ ok: true, projection: { mode: "semi" } });
  });
});

describe("t490 the birth handler's own declaration wiring (in-process)", () => {
  test("a semi declaration reaches the canonical write path and is reported", () => {
    const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    proj = projectDir;
    expect(birth(projectDir, ["--label", "prior work"]).status).toBe(0);
    appendHumanTurn(activeRecordDir(projectDir), "2000-01-01T00:00:00.000Z");

    const out = birthInProcess(projectDir, { scope: "feature", label: "new work", autonomy: "semi" });
    expect(out).toContain("Intent autonomy: semi");
    expect(getField(stateOf(projectDir), "Intent Autonomy Mode")?.trim()).toBe("semi");
  });

  test("full is reported without being applied", () => {
    const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    proj = projectDir;
    expect(birth(projectDir, ["--label", "prior work"]).status).toBe(0);
    appendHumanTurn(activeRecordDir(projectDir), "2000-01-01T00:00:00.000Z");

    const out = birthInProcess(projectDir, { scope: "feature", label: "new work", autonomy: "full" });
    expect(out).toContain("preview-autonomy");
    expect(getField(stateOf(projectDir), "Intent Autonomy Mode")?.trim()).toBe("none");
  });

  test("a birth with no declaration reports nothing about autonomy", () => {
    const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    proj = projectDir;
    const out = birthInProcess(projectDir, { scope: "feature", label: "plain work" });
    expect(out).toContain("Intent born:");
    expect(out).not.toContain("Intent autonomy:");
  });

  // The MINOR from the independent review: a flat-layout migration returns
  // before the birth pipeline, so the declaration cannot land. It used to vanish
  // without a word — the exact shape this unit exists to close.
  test("a declaration alongside a flat-layout migration is reported, never dropped in silence", () => {
    const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    proj = projectDir;
    // Seed the pre-workspace flat layout migrateFlatLayout looks for.
    const flat = join(projectDir, "amadeus-docs");
    mkdirSync(flat, { recursive: true });
    writeFileSync(
      join(flat, "amadeus-state.md"),
      "# AI-DLC State Tracking\n## Project Information\n- **Scope**: feature\n- **Project**: Legacy App\n",
      "utf-8",
    );

    const out = birthInProcess(projectDir, { scope: "feature", autonomy: "semi" });
    expect(out).toContain("Migrated flat workspace into intent:");
    // Loud about the drop, and about how to finish the job.
    expect(out).toContain("Intent autonomy: semi NOT applied");
    expect(out).toContain("migrated an existing flat workspace");
    expect(out).toContain("remedy:");
    expect(out).toContain("/amadeus --autonomy semi");
    // The skeleton is unchanged: migration still does NOT apply the mode, and
    // the first declaration stays unspent (BR-U2-4).
    const projection = readProductionAutonomyProjection(projectDir);
    expect(projection?.mode).toBe("none");
    expect(projection?.modeProvenance.kind).not.toBe("human-command");
  });
});

describe("t490 launch-chain provenance reads a damaged shard without blowing up", () => {
  test("a shard that cannot be read is skipped, not fatal", () => {
    const w = workspaceWithPriorTurn();
    proj = w.projectDir;
    // A dangling symlink is the portable way to make readFileSync throw: a
    // directory returns "" on Linux and throws only on macOS
    // (bun-readfilesync-dir-platform-divergence).
    symlinkSync(join(w.born, "audit", "does-not-exist"), join(w.born, "audit", "zz-dangling.jsonl"));
    // The readable shards still bound the birth, so the sibling turn is found.
    expect(
      applyProductionAutonomyMode({
        projectDir: proj,
        stateContent: stateOf(proj),
        mode: "semi",
        provenanceScope: "launch-chain",
      }),
    ).toMatchObject({ ok: true, projection: { mode: "semi" } });
  });
});

describe("t490 one command declares and runs (FR-1d, BR-U2-7)", () => {
  test("`next --new-intent --autonomy semi` births, applies, and the FIRST stage directive carries the mode", () => {
    const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    proj = projectDir;
    // A workspace already in flight — the shape a real declaration launches from,
    // and the reason the launching keystroke's turn lives in a sibling record.
    expect(birth(projectDir, ["--label", "prior work"]).status).toBe(0);
    appendHumanTurn(activeRecordDir(projectDir), "2000-01-01T00:00:00.000Z");

    // 1. The engine NAMES the birth move and threads the declaration onto it.
    const named = next(projectDir, ["--new-intent", "--scope", "feature", "--autonomy", "semi", "widget shop"]);
    expect(named.status).toBe(0);
    const birthDirective = directiveOf(named.stdout);
    expect(birthDirective.kind).toBe("print");
    expect(String(birthDirective.message)).toContain("--autonomy semi");

    // 2. The conductor runs it. The mode is applied inside birth, through the
    //    canonical write path, against the intent birth just created.
    const born = birth(projectDir, ["--label", "widget shop", "--arguments", "widget shop", "--autonomy", "semi"]);
    expect(born.status).toBe(0);
    expect(getField(stateOf(projectDir), "Intent Autonomy Mode")?.trim()).toBe("semi");

    // 3. Re-running `next` lands on the first stage — carrying the mode the same
    //    command declared, with no second human step in between.
    const first = next(projectDir, []);
    expect(first.status).toBe(0);
    const stageDirective = directiveOf(first.stdout);
    expect(stageDirective.kind).toBe("run-stage");
    expect(stageDirective.intent_autonomy_mode).toBe("semi");
  });
});
