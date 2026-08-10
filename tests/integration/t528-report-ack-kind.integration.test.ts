// covers: file:packages/framework/core/tools/amadeus-orchestrate.ts, function:validateDirective
// size: medium
//
// Issue #2762 — `report`'s success ack used the SAME `kind:"done"` the terminal
// completion directives use. The forwarding-loop contract (every harness
// SKILL.md) reads `done` as "the workflow is complete — present the completion
// summary and STOP the loop", so a conductor obeying the contract literally
// stops mid-workflow on a commit ack whose own reason says "run next to
// continue". The only discriminator was the free-text `reason`, which defeats
// the typed-directive design (branch on `kind`).
//
// The fix splits the vocabulary: a non-terminal commit ack is `kind:"committed"`
// and `done` means workflow/single-stage completion only. Three engine sites
// emit the non-terminal ack (the authorized-carrier approval, the normal report
// commit, and the idempotent stale re-report); the terminal sites keep `done`.
//
// MECHANISM: in-process. `handleReport` / `handleNext` are driven directly from
// the canonical module so the changed emit lines register in lcov
// (spawn-blindspot-seam-export); the state mutations they dispatch still go
// through the real spawned `amadeus-state.ts`, so the transitions are real.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  VALID_KINDS,
  validateDirective,
} from "../../packages/framework/core/tools/amadeus-directive.ts";
import {
  handleNext,
  handleReport,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
// The canonical module resolves its stage graph relative to its own directory,
// which carries no compiled data file; point it at the shipped stock graph the
// packager writes (same seam t321 uses to drive the handlers in-process).
const STOCK_GRAPH = join(
  REPO_ROOT,
  "dist",
  "claude",
  ".claude",
  "tools",
  "data",
  "stage-graph.json",
);
const MID_IDEATION = join(FIXTURES_DIR, "state-mid-ideation.md");

let proj = "";
let logs: string[] = [];
const realLog = console.log;
const realErr = console.error;
const realStderrWrite = process.stderr.write.bind(process.stderr);

beforeEach(() => {
  resetAidlcEnv();
  process.env.AMADEUS_STAGE_GRAPH = STOCK_GRAPH;
  process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
  process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
  proj = "";
  logs = [];
  console.log = (...a: unknown[]) => {
    logs.push(a.join(" "));
  };
  console.error = () => {};
  process.stderr.write = (() => true) as typeof process.stderr.write;
});

afterEach(() => {
  console.log = realLog;
  console.error = realErr;
  process.stderr.write = realStderrWrite;
  cleanupTestProject(proj);
  resetAidlcEnv();
});

/** The last JSON directive the handler printed to stdout. */
function lastDirective(): Record<string, unknown> {
  for (let i = logs.length - 1; i >= 0; i--) {
    const line = logs[i]?.trim();
    if (line?.startsWith("{")) return JSON.parse(line) as Record<string, unknown>;
  }
  throw new Error(`no directive JSON on stdout:\n${logs.join("\n")}`);
}

function freshProject(): string {
  const p = createTestProject();
  seedStateFile(p, MID_IDEATION);
  return p;
}

describe("t528 the `committed` directive is part of the frozen contract", () => {
  test("`committed` is a valid kind carrying a reason", () => {
    expect(VALID_KINDS as readonly string[]).toContain("committed");
    const result = validateDirective({
      kind: "committed",
      reason: 'Committed approve for "feasibility". Run next to continue.',
    });
    expect(result.valid).toBe(true);
  });

  test("`committed` requires `reason` and rejects unknown fields", () => {
    const missing = validateDirective({ kind: "committed" });
    expect(missing.valid).toBe(false);
    const extra = validateDirective({
      kind: "committed",
      reason: "ok",
      terminal: false,
    });
    expect(extra.valid).toBe(false);
  });
});

describe("t528 report's commit ack is non-terminal", () => {
  test("a failed result remains a typed error directive", () => {
    handleReport(["--stage", "code-generation", "--result", "failed"], undefined);

    const directive = lastDirective();
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain('Unknown --result "failed"');
  });

  test("a gated approve acks with `committed`, never the terminal `done`", () => {
    proj = freshProject();

    handleReport(
      ["--stage", "feasibility", "--result", "approved", "--user-input", "Approve"],
      proj,
    );

    const directive = lastDirective();
    expect(directive.kind).toBe("committed");
    expect(String(directive.reason)).toContain("Run next to continue.");
  }, 30000);

  test("the idempotent stale re-report acks with `committed`", () => {
    proj = freshProject();

    // First report commits feasibility and advances Current Stage to
    // scope-definition, which leaves pending — so the second report of the same
    // slug takes the stale re-report guard.
    handleReport(["--stage", "feasibility", "--result", "approved"], proj);
    expect(lastDirective().kind).toBe("committed");

    logs = [];
    handleReport(["--stage", "feasibility", "--result", "approved"], proj);

    const replay = lastDirective();
    expect(replay.kind).toBe("committed");
    expect(String(replay.reason)).toContain("idempotent re-report");
  }, 30000);
});

describe("t528 terminal `done` is unchanged", () => {
  test("the read-only latch still swallows a bare advancing next to `done`", () => {
    proj = freshProject();
    const amadeus = join(proj, "amadeus");
    mkdirSync(amadeus, { recursive: true });
    writeFileSync(join(amadeus, ".amadeus-turn-counter"), "3\n", "utf-8");
    writeFileSync(
      join(amadeus, ".amadeus-readonly-latch"),
      `${JSON.stringify({ turn: 3, flag: "status", source: "read-only-flag", ts: 1 })}\n`,
      "utf-8",
    );

    handleNext([], proj);

    expect(lastDirective().kind).toBe("done");
  }, 30000);
});
