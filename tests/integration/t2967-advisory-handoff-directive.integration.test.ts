// covers: file:packages/framework/core/tools/amadeus-orchestrate.ts
// size: medium
//
// t2967 — a settled advisory is handed off, never re-asked (#2967).
//
// The regression: an advisory answered `run-now` came back as a fresh
// `await-advisory-choice` on the very next `next`. A run-now receipt does not
// release the hold — only the declaring plugin's evaluator does — so the guard
// kept holding; the engine then offered that hold to the autonomy ladder again,
// the ladder returned the SAME decision, single-spend refused the duplicate
// receipt, and the refusal fell through to the human route. Under an unattended
// run there is no human, so the workflow stalled on a question it had already
// answered.
//
// PR #2890 removed the typed `run_required` / `formal_checks` execution route
// that used to carry this case, leaving `handoff_stage` emitted but consumed by
// nobody. This pins the successor: a hold that already carries its answer is a
// distinct directive kind, `execute-advisory-handoff`, and never a question.
//
// Driven IN-PROCESS (handleNext imported from source) for the same reason t378
// is — bun --coverage does not instrument spawned children.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { __resetGraphCache } from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests, docsRoot } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { validateDirective } from "../../packages/framework/core/tools/amadeus-directive.ts";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  applyProductionAutonomyMode,
  previewProductionAutonomyGrant,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
  seededStateFile,
} from "../harness/fixtures.ts";
import { chooseRunNow } from "../harness/advisory-choice-fixture.ts";
import { FIXTURE_PLUGIN, seedHoldingHost } from "../harness/conformance-fixture.ts";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STOCK_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const FIX_BUILD_STAGE = join(FIXTURES_DIR, "state-fix-final-construction.md");

let host = "";
let proj = "";
const savedEnv: Record<string, string | undefined> = {};
function setEnv(key: string, value: string | undefined): void {
  if (!(key in savedEnv)) savedEnv[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

// A composed host with no recorded verdict, so the plugin's declared evaluator
// raises its advisory at every checkpoint.
function makeChangedHost(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t2967-host-"));
  const harnessRoot = join(root, ".claude");
  seedHoldingHost(root, harnessRoot);
  return harnessRoot;
}

let logs: string[] = [];
const realLog = console.log;
const realErr = console.error;
const realStderrWrite = process.stderr.write.bind(process.stderr);

beforeEach(() => {
  resetAidlcEnv();
  host = "";
  proj = "";
  logs = [];
  console.log = (...parts: unknown[]) => { logs.push(parts.join(" ")); };
  console.error = () => {};
  (process.stderr as unknown as { write: (s: string) => boolean }).write = () => true;
});

afterEach(() => {
  console.log = realLog;
  console.error = realErr;
  (process.stderr as unknown as { write: typeof realStderrWrite }).write = realStderrWrite;
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  for (const key of Object.keys(savedEnv)) delete savedEnv[key];
  __resetGraphCache();
  _resetStageGraphForTests();
  resetAidlcEnv();
  resetOtelPerProject();
  if (host) rmSync(host, { recursive: true, force: true });
  cleanupTestProject(proj);
});

type EmittedDirective = {
  kind: string;
  stage?: string;
  handoff_stages?: string[];
  advisories?: Array<{ advisory_instance: string; result?: string; handoff_stage?: string }>;
};

function nextDirective(): EmittedDirective {
  logs = [];
  handleNext([], proj);
  return JSON.parse(logs.join("\n").trim()) as EmittedDirective;
}

function seedHeldProject(): void {
  host = makeChangedHost();
  setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
  setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
  __resetGraphCache();
  _resetStageGraphForTests();
  proj = createTestProject();
  seedStateFile(proj, FIX_BUILD_STAGE);
}

function grantAutonomy(mode: "semi" | "full"): void {
  plantV1AuditRow("HUMAN_TURN", {}, proj);
  const stateContent = readFileSync(seededStateFile(proj), "utf8");
  const preview = previewProductionAutonomyGrant({ projectDir: proj, stateContent });
  expect(preview.ok).toBe(true);
  if (!preview.ok) return;
  expect(applyProductionAutonomyMode({
    projectDir: proj,
    stateContent,
    mode,
    confirmedDisplayDigest: preview.preview.displayDigest,
  })).toMatchObject({ ok: true, projection: { mode } });
}

function receipts(): Array<{ choice: string; provenance: { kind: string } }> {
  const path = join(docsRoot(proj), ".amadeus-advisory-choice.json");
  if (!existsSync(path)) return [];
  return (JSON.parse(readFileSync(path, "utf-8")) as {
    receipts: Array<{ choice: string; provenance: { kind: string } }>;
  }).receipts;
}

describe("t2967 settled advisory is handed off, not re-asked", () => {
  // FR-ADV-1 / FR-ADV-2: the whole regression, in the order it happens.
  test("full grant: 裁定済みadvisoryの次のpassはawait-advisory-choiceを返さない", () => {
    seedHeldProject();
    grantAutonomy("full");

    // Pass 1 — the ladder rules run-now, the receipt lands, the stage runs.
    const first = nextDirective();
    expect(first.kind).toBe("run-stage");
    expect(receipts()).toHaveLength(1);
    expect(receipts()[0]).toMatchObject({ choice: "run-now", provenance: { kind: "auto-decision" } });

    // Pass 2 — the plugin still raises, so the hold stands. It must NOT become
    // a question again: the choice is on the record.
    const second = nextDirective();
    expect(second.kind).not.toBe("await-advisory-choice");
    expect(second.kind).toBe("execute-advisory-handoff");
    expect(second.stage).toBe("build-and-test");
    expect(validateDirective(second as unknown as Record<string, unknown>).valid).toBe(true);
    // No second receipt was written for the same standing choice.
    expect(receipts()).toHaveLength(1);
  });

  test("full grant: 再提示しないpassを繰り返してもhandoffのまま安定する", () => {
    seedHeldProject();
    grantAutonomy("full");
    expect(nextDirective().kind).toBe("run-stage");
    expect(nextDirective().kind).toBe("execute-advisory-handoff");
    expect(nextDirective().kind).toBe("execute-advisory-handoff");
    expect(receipts()).toHaveLength(1);
  });

  // FR-ADV-6: the semi ladder reaches the same place as full.
  test("semi grant: ladder裁定後のpassもhandoffで、人間へは戻らない", () => {
    seedHeldProject();
    grantAutonomy("semi");

    const first = nextDirective();
    // Semi may or may not rule on the first pass; whichever way, once a run-now
    // receipt exists the next pass is a handoff, never a question.
    if (first.kind === "await-advisory-choice") {
      chooseRunNow(proj);
    }
    expect(receipts().some((receipt) => receipt.choice === "run-now")).toBe(true);

    const second = nextDirective();
    expect(second.kind).toBe("execute-advisory-handoff");
  });

  // FR-ADV-7: provenance-independent. A human's own run-now is settled too.
  test("human-turn provenance: 人が答えたrun-nowも再提示されずhandoffになる", () => {
    seedHeldProject();

    const first = nextDirective();
    expect(first.kind).toBe("await-advisory-choice");
    chooseRunNow(proj);
    expect(receipts()).toHaveLength(1);
    expect(receipts()[0]).toMatchObject({ choice: "run-now", provenance: { kind: "human-turn" } });

    const second = nextDirective();
    expect(second.kind).toBe("execute-advisory-handoff");
    expect(receipts()).toHaveLength(1);
  });

  // The directive has to be machine-consumable: the conductor is told which
  // stage to open, not left to re-derive it from prose.
  test("directiveはhandoff先を機械可読に運び、holdの継続理由も運ぶ", () => {
    seedHeldProject();
    const first = nextDirective();
    expect(first.kind).toBe("await-advisory-choice");
    chooseRunNow(proj);

    const handoff = nextDirective();
    expect(handoff.kind).toBe("execute-advisory-handoff");
    expect(handoff.advisories?.length).toBe(1);
    // BR-U2-05 is unchanged: opening the stage is an entry point, not a release.
    expect(handoff.advisories?.[0]?.result ?? "").toContain("evaluator to return no-hold");
    // The literal destination the composed manifest declares for its advisory,
    // not a value re-derived from the directive itself.
    expect(handoff.advisories?.[0]?.handoff_stage).toBe(FIXTURE_PLUGIN);
    expect(handoff.handoff_stages).toEqual([FIXTURE_PLUGIN]);
  });

  // The unresolved case is untouched: an advisory with no receipt is still a
  // question for the human when the ladder cannot rule.
  test("receiptの無いadvisoryは従来どおりawait-advisory-choiceで人間へ出る", () => {
    seedHeldProject();
    const first = nextDirective();
    expect(first.kind).toBe("await-advisory-choice");
    expect(receipts()).toHaveLength(0);
  });
});
