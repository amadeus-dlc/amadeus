// covers: file:dist/codex/.agents/skills/amadeus/SKILL.md,
//         function:emitPerUnitRunStage
//
// Live Codex proof for #2836. The fixture starts with a covered code-generation
// unit whose primary artifact has no durable Review projection. A real Codex
// conductor must follow the engine's review_only directive, invoke §12a without
// regenerating the stage body, and leave a reviewer verdict on the primary
// artifact before any approval attempt.
//
// LIVE GATE: disabled on GitHub Actions. Locally, requires
// AMADEUS_CODEX_EXEC_LIVE=1, codex >= 0.139.0, and OPENAI_API_KEY.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  codexExecChildEnvironment,
  codexExecLiveRequirementsSkipReason,
  setupCodexExecProject,
} from "../harness/codex-exec-live.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CODEX_DIST = join(REPO_ROOT, "dist", "codex");
const CODEX_BIN = process.env.AMADEUS_CODEX_BIN ?? "codex";
const OPENAI_MODEL = process.env.AMADEUS_CODEX_EXEC_MODEL ?? "gpt-5.6-sol";
const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "600", 10);
const TEST_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 600) * 1000;
const UNIT = "provenance-contract";
const INTENT_UUID = "00000000-0000-7000-8000-000000002836";
const RECORD_DIR = `review-recovery-${INTENT_UUID.replace(/-/g, "").slice(-16)}`;
const INTENTS_REL = join("amadeus", "spaces", "default", "intents");
const RECORD_REL = join(INTENTS_REL, RECORD_DIR);
const PRIMARY_REL = join(
  RECORD_REL,
  "construction",
  UNIT,
  "code-generation",
  "code-generation-plan.md",
);

const SKIP_REASON = codexExecLiveRequirementsSkipReason({
  env: process.env,
  codexBin: CODEX_BIN,
  distributionDir: CODEX_DIST,
});

function seedReviewRecoveryProject(project: string): void {
  cpSync(join(CODEX_DIST, "amadeus"), join(project, "amadeus"), { recursive: true });
  const record = join(project, RECORD_REL);
  const artifactDir = join(record, "construction", UNIT, "code-generation");
  const unitsDir = join(record, "inception", "units-generation");
  const requirementsDir = join(record, "inception", "requirements-analysis");
  mkdirSync(artifactDir, { recursive: true });
  mkdirSync(unitsDir, { recursive: true });
  mkdirSync(requirementsDir, { recursive: true });

  writeFileSync(join(project, "amadeus", "active-space"), "default\n", "utf-8");
  writeFileSync(join(project, "amadeus", ".amadeus-clone-id"), "reviewrecovery00\n", "utf-8");
  writeFileSync(join(project, INTENTS_REL, "active-intent"), `${RECORD_DIR}\n`, "utf-8");
  writeFileSync(
    join(project, INTENTS_REL, "intents.json"),
    `${JSON.stringify(
      [{ uuid: INTENT_UUID, slug: "review-recovery", status: "in-flight" }],
      null,
      2,
    )}\n`,
    "utf-8",
  );

  writeFileSync(
    join(record, "amadeus-state.md"),
    [
      "# AI-DLC State Tracking",
      "",
      "## Project Information",
      "- **Project**: reviewer recovery live probe",
      "- **Project Type**: Greenfield",
      "- **Scope**: self-fix",
      "- **State Version**: 7",
      "- **Skeleton Stance**: on",
      "- **Construction Autonomy Mode**: none",
      "",
      "## Scope Configuration",
      "- **Stages to Execute**: all",
      "- **Stages to Skip**: none",
      "- **Depth**: Minimal",
      "- **Test Strategy**: Focused",
      "",
      "## Stage Progress",
      "",
      "### CONSTRUCTION PHASE",
      "- [x] functional-design — EXECUTE",
      "- [x] nfr-requirements — EXECUTE",
      "- [x] nfr-design — EXECUTE",
      "- [x] infrastructure-design — EXECUTE",
      "- [-] code-generation — EXECUTE",
      "- [ ] build-and-test — EXECUTE",
      "",
      "## Current Status",
      "- **Lifecycle Phase**: CONSTRUCTION",
      "- **Current Stage**: code-generation",
      "- **Status**: Running",
      "",
    ].join("\n"),
    "utf-8",
  );
  writeFileSync(
    join(record, "runtime-graph.json"),
    `${JSON.stringify(
      {
        workflow_id: "review-recovery-live",
        scope: "self-fix",
        bolt_dag: {
          units: [{ name: UNIT, kind: "service", depends_on: [] }],
          batches: [[UNIT]],
        },
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
  writeFileSync(
    join(unitsDir, "unit-of-work-dependency.md"),
    `# Unit dependencies\n\n\`\`\`yaml\nunits:\n  - name: ${UNIT}\n    kind: service\n    depends_on: []\n\`\`\`\n`,
    "utf-8",
  );
  writeFileSync(
    join(unitsDir, "unit-of-work.md"),
    `# Unit of Work\n\n## ${UNIT}\n\nRepair the per-unit reviewer recovery contract.\n`,
    "utf-8",
  );
  writeFileSync(
    join(requirementsDir, "requirements.md"),
    "# Requirements\n\nA covered unit must receive a reviewer verdict before approval.\n",
    "utf-8",
  );
  writeFileSync(
    join(artifactDir, "code-generation-plan.md"),
    "# Code Generation Plan\n\n## Scope\n\nRecover missing reviewer provenance before the gate.\n\n## Verification\n\nRun focused engine and conductor-contract tests.\n",
    "utf-8",
  );
  writeFileSync(
    join(artifactDir, "code-summary.md"),
    "# Code Summary\n\nThe engine emits a reviewer-only run-stage for an otherwise covered unit.\n",
    "utf-8",
  );
}

function execCodex(project: string, home: string): { rc: number; output: string } {
  const prompt = [
    "Use the $amadeus skill to continue the active workflow.",
    "Follow every engine directive automatically until you reach a human approval gate or a true blocker.",
    "Do not hand-write a Review block and do not regenerate an already-covered stage body.",
  ].join(" ");
  const result = spawnSync(CODEX_BIN, ["exec", prompt], {
    cwd: project,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: codexExecChildEnvironment(home),
    timeout: TEST_TIMEOUT_MS,
  });
  return {
    rc: result.status ?? -1,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

describe("t-exec-codex-review-recovery — missing per-unit verdict (#2836)", () => {
  test.skipIf(SKIP_REASON !== null)(
    `runs §12a before approval instead of stopping on the state guard${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    () => {
      const setup = setupCodexExecProject({
        prefix: "codex-review-recovery-",
        distributionDir: CODEX_DIST,
        repositoryRoot: REPO_ROOT,
        model: OPENAI_MODEL,
        prepareProject: seedReviewRecoveryProject,
      });
      try {
        const result = execCodex(setup.proj, setup.home);
        expect(result.rc).toBe(0);
        expect(readFileSync(join(setup.proj, PRIMARY_REL), "utf-8")).toMatch(
          /^## Review — Iteration \d+/m,
        );
        expect(result.output).not.toContain("produced artifacts with no reviewer verdict");
      } finally {
        setup.cleanup();
      }
    },
    TEST_TIMEOUT_MS,
  );
});
