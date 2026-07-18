// covers: harness-instrument:amadeus-mirror
//
// t232 — amadeus-mirror CLI pure functions (intent 260717-mirror-issue-tool).
//
// Drives the exported pure functions in-process (no spawn, no fs): the args
// parser's usage rejections (S-3 falling proofs), the Stage Progress checkbox
// counter (ADR-3a, [S] excluded from the denominator), and the fixed
// three-section template (FR-5: nothing but 概要/Record/状態; R-2 idempotence:
// same snapshot -> byte-identical body). The fs/gh boundary lives in
// tests/integration/t232-amadeus-mirror.integration.test.ts.

import { describe, expect, test } from "bun:test";
import {
  countStageProgress,
  type MirrorSnapshot,
  parseArgs,
  renderBody,
  renderStatusLine,
  renderTitle,
} from "../../scripts/amadeus-mirror";

function snapshot(over: Partial<MirrorSnapshot> = {}): MirrorSnapshot {
  return {
    dirName: "260717-mirror-issue-tool",
    slug: "mirror-issue-tool",
    projectSummary: "amadeus-mirror ツール: ミラー Issue を作成・同期・クローズする CLI",
    recordPath: "amadeus/spaces/default/intents/260717-mirror-issue-tool/",
    phase: "INCEPTION",
    stage: "reverse-engineering",
    stagesApproved: 7,
    stagesTotal: 18,
    parked: false,
    parkedAtStage: null,
    workflowStatus: "Running",
    intentStatus: "in-flight",
    lastUpdated: "2026-07-17T13:23:34Z",
    mirrorIssue: null,
    ...over,
  };
}

describe("t232 parseArgs (C1, S-3 boundary)", () => {
  test("accepts the three subcommands without flags", () => {
    expect(parseArgs(["create"])).toEqual({ kind: "create", intentDir: null });
    expect(parseArgs(["sync"])).toEqual({ kind: "sync", intentDir: null });
    expect(parseArgs(["close"])).toEqual({ kind: "close", intentDir: null });
  });

  test("accepts --intent <dirName>", () => {
    expect(parseArgs(["sync", "--intent", "260717-mirror-issue-tool"])).toEqual({
      kind: "sync",
      intentDir: "260717-mirror-issue-tool",
    });
  });

  test("rejects unknown subcommand, missing subcommand, unknown flag, dangling --intent", () => {
    expect(parseArgs(["destroy"]).kind).toBe("usage");
    expect(parseArgs([]).kind).toBe("usage");
    expect(parseArgs(["create", "--force"]).kind).toBe("usage");
    expect(parseArgs(["create", "--intent"]).kind).toBe("usage");
    expect(parseArgs(["create", "--intent", "--intent"]).kind).toBe("usage");
  });
});

describe("t232 countStageProgress (ADR-3a, #1172)", () => {
  const state = [
    "## Stage Progress",
    "",
    "### IDEATION PHASE",
    "- [x] intent-capture — EXECUTE",
    "- [x] feasibility — EXECUTE",
    // scope-skipped rows keep a live checkbox but carry the ` — SKIP` suffix
    // (real setStageSuffix format); they leave the denominator (#1172).
    "- [ ] market-research — SKIP",
    "- [-] scope-definition — EXECUTE",
    "- [ ] approval-handoff — EXECUTE",
    "- [?] team-formation — EXECUTE",
    "",
    "## Current Status",
    "- [x] this checkbox is outside Stage Progress and must not count",
  ].join("\n");

  test("counts [x] as approved and excludes scope-SKIP rows from the denominator", () => {
    expect(countStageProgress(state)).toEqual({ approved: 2, total: 5 });
  });

  test("excludes both skip forms: [S] jump-skip and ` — SKIP` scope-skip", () => {
    // A jump-skipped stage that (unusually) carries an EXECUTE suffix is still
    // excluded via the `[S]` mark; a scope-skipped stage that keeps a live
    // checkbox is excluded via the ` — SKIP` suffix. Only the two EXECUTE rows
    // with live checkboxes remain in the denominator.
    const mixed = [
      "## Stage Progress",
      "",
      "- [S] market-research — EXECUTE",
      "- [ ] feasibility — SKIP",
      "- [x] intent-capture — EXECUTE",
      "- [ ] scope-definition — EXECUTE",
    ].join("\n");
    expect(countStageProgress(mixed)).toEqual({ approved: 1, total: 2 });
  });

  test("18 approved EXECUTE stages + 14 SKIP stages -> 18/18 (#1172)", () => {
    // A synthetic full-workflow state: 18 in-scope stages all approved,
    // 14 scope-skipped stages (real ` — SKIP` suffix). The template header and
    // a phase comment row bracket them. SKIP rows must all leave the
    // denominator so progress reads 18/18, not 18/32.
    const executeStages = [
      "workspace-scaffold",
      "workspace-detection",
      "state-init",
      "intent-capture",
      "scope-definition",
      "reverse-engineering",
      "requirements-analysis",
      "practices-discovery",
      "functional-design",
      "nfr-requirements",
      "nfr-design",
      "infrastructure-design",
      "units-generation",
      "delivery-planning",
      "code-generation",
      "ci-pipeline",
      "build-and-test",
      "approval-handoff",
    ];
    const skipStages = [
      "market-research",
      "feasibility",
      "team-formation",
      "rough-mockups",
      "refined-mockups",
      "user-stories",
      "application-design",
      "deployment-pipeline",
      "environment-provisioning",
      "deployment-execution",
      "observability-setup",
      "incident-response",
      "performance-validation",
      "feedback-optimization",
    ];
    expect(executeStages.length).toBe(18);
    expect(skipStages.length).toBe(14);
    const lines = [
      "## Stage Progress",
      "",
      "<!-- checkbox: [ ] pending, [x] approved, [S] skipped -->",
      "### CONSTRUCTION PHASE",
      ...executeStages.map((s) => `- [x] ${s} — EXECUTE`),
      ...skipStages.map((s) => `- [ ] ${s} — SKIP`),
    ];
    expect(lines.length).toBe(4 + 18 + 14); // 36 total lines
    expect(countStageProgress(lines.join("\n"))).toEqual({
      approved: 18,
      total: 18,
    });
  });

  test("returns zeros for content without a Stage Progress section", () => {
    expect(countStageProgress("# nothing here\n- [x] stray\n")).toEqual({
      approved: 0,
      total: 0,
    });
  });
});

describe("t232 template (C3, FR-5)", () => {
  test("body contains exactly the three fixed sections and nothing more", () => {
    const body = renderBody(snapshot());
    const headings = body.split("\n").filter((l) => l.startsWith("## "));
    expect(headings).toEqual(["## 概要", "## Record(正本)", "## 状態"]);
    expect(body).toContain("amadeus/spaces/default/intents/260717-mirror-issue-tool/");
  });

  test("body is deterministic for the same snapshot (R-2 idempotence)", () => {
    const s = snapshot();
    expect(renderBody(s)).toBe(renderBody(s));
  });

  test("status line renders in-flight, parked, and complete states (ADR-3)", () => {
    expect(renderStatusLine(snapshot())).toBe(
      "**in-flight** — INCEPTION/reverse-engineering(approved 7/18)、更新 2026-07-17T13:23:34Z",
    );
    expect(
      renderStatusLine(snapshot({ parked: true, parkedAtStage: "reverse-engineering" })),
    ).toStartWith("**parked @ reverse-engineering**");
    expect(renderStatusLine(snapshot({ workflowStatus: "Completed" }))).toStartWith(
      "**complete**",
    );
  });

  test("title carries slug and dirName", () => {
    expect(renderTitle(snapshot())).toBe(
      "intent: mirror-issue-tool(260717-mirror-issue-tool)",
    );
  });

  test("overlong project summaries are truncated, keeping the card small", () => {
    const body = renderBody(snapshot({ projectSummary: "あ".repeat(500) }));
    expect(body).toContain("…");
    expect(body.length).toBeLessThan(700);
  });
});
