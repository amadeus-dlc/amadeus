// covers: function:docsRoot
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTlaAuthoring } from "../../plugins/formal-model-check/tools/tla-authoring.ts";
import {
  advisoriesForHost,
  type EvaluatorRun,
} from "../../packages/framework/core/tools/amadeus-advisory-declaration.ts";
import { guardAdvisoryChoices } from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import { docsRoot } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { chooseRunNow } from "../harness/advisory-choice-fixture.ts";
import { cleanupTestProject, createTestProject, FIXTURES_DIR, seedStateFile } from "../harness/fixtures.ts";

// FR-5 + FR-6 (#2766). The whole chain, both sides of the falling proof: the
// advisory declaration is always installed, and with no governed subjects the
// evaluator returns no-hold so the checkpoint passes through exactly as it did
// before; once subjects are declared it holds, hands off to the authoring
// stage, refuses to release on the run-now choice, and releases only once the
// plugin's own evaluator returns no-hold off a persisted terminal receipt.
//
// The evaluator is the real CLI, run in-process and its verdict handed to the
// engine as the evaluator run — the same bytes the spawn would carry, without
// the child process (bun --coverage does not measure spawned children).

const REPO_ROOT = join(import.meta.dir, "..", "..");
const CHECKPOINT = "requirements-analysis";

const HUMAN_TURN_BLOCK = JSON.stringify({
  schemaVersion: 2,
  timestamp: "2026-08-10T00:00:00Z",
  eventName: "amadeus.human.turn",
  attributes: { Event: "HUMAN_TURN" },
});

let fixture = "";
let projectDir = "";
let hostRoot = "";
let subjectsPath = "";
let storeRoot = "";
let modelMapPath = "";
let approvalPath = "";
let evaluatorArgv: string[] = [];

async function cli(argv: readonly string[]): Promise<{ exitCode: number; body: Record<string, unknown> }> {
  const lines: string[] = [];
  const exitCode = await runTlaAuthoring(argv, (line) => lines.push(line));
  expect(lines).toHaveLength(1);
  return { exitCode, body: JSON.parse(lines[0] as string) as Record<string, unknown> };
}

/** Run the declared evaluator argv the way the engine would, minus the spawn. */
async function evaluatorRun(): Promise<EvaluatorRun> {
  const lines: string[] = [];
  const status = await runTlaAuthoring(evaluatorArgv.slice(2), (line) => lines.push(line));
  return { status, stdout: `${lines.join("\n")}\n` };
}

async function raisedAdvisories(): Promise<ReturnType<typeof advisoriesForHost>> {
  const run = await evaluatorRun();
  return advisoriesForHost(hostRoot, CHECKPOINT, undefined, () => run);
}


beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), "authoring-hold-e2e-"));
  subjectsPath = join(fixture, "authoring-subjects.json");
  storeRoot = join(fixture, "tla-evidence");
  modelMapPath = join(fixture, "model-map.json");
  mkdirSync(storeRoot, { recursive: true });
  writeFileSync(join(fixture, "requirements.md"), "### FR-1\ngoverned body\n", "utf8");
  writeFileSync(modelMapPath, JSON.stringify({ schemaVersion: 2, models: [] }), "utf8");
  writeFileSync(join(fixture, "clone.jsonl"), `${HUMAN_TURN_BLOCK}\n`, "utf8");
  approvalPath = join(fixture, "approval.json");
  writeFileSync(
    approvalPath,
    JSON.stringify({
      shard: "clone.jsonl",
      timestamp: "2026-08-10T00:00:00Z",
      eventIdentity: createHash("sha256").update(HUMAN_TURN_BLOCK).digest("hex"),
    }),
    "utf8",
  );
  evaluatorArgv = [
    "bun", "plugins/formal-model-check/tools/tla-authoring.ts",
    "advisory", "hold",
    "--subjects-file", subjectsPath,
    "--store", storeRoot,
    "--model-map", modelMapPath,
  ];

  projectDir = createTestProject();
  seedStateFile(projectDir, join(FIXTURES_DIR, "state-mid-inception.md"));
  hostRoot = join(projectDir, ".harness");
  mkdirSync(hostRoot, { recursive: true });
  writeFileSync(
    join(hostRoot, ".amadeus-plugin-composition.json"),
    JSON.stringify({ ledger: [], plugins: [["demo", { plugin: "demo", stageIndex: [] }]] }),
    "utf8",
  );
  mkdirSync(join(projectDir, "plugins", "demo"), { recursive: true });
  writeFileSync(
    join(projectDir, "plugins", "demo", "plugin.json"),
    JSON.stringify({
      name: "demo",
      tools: [],
      advisories: [
        {
          code: "authoring-hold",
          checkpoints: [CHECKPOINT],
          evaluator: { argv: evaluatorArgv },
          handoff: { stage: "tla-authoring" },
        },
      ],
    }),
    "utf8",
  );
});

afterEach(() => {
  rmSync(fixture, { recursive: true, force: true });
  cleanupTestProject(projectDir);
});

describe("t528 the authoring hold end to end", () => {
  test("with no governed subjects the declared evaluator returns no-hold and the checkpoint passes through", async () => {
    expect(await raisedAdvisories()).toEqual([]);
    expect(guardAdvisoryChoices(projectDir, CHECKPOINT, [], hostRoot).kind).toBe("allow");
    expect(existsSync(join(docsRoot(projectDir), ".amadeus-advisory-choice.json"))).toBe(false);
  });

  test("a declared subject holds, hands off, keeps holding on run-now, and releases on the receipt", async () => {
    const declared = await cli([
      "subjects", "declare",
      "--document", join(fixture, "requirements.md"),
      "--kind", "requirements",
      "--id", "FR-1",
      "--out", subjectsPath,
    ]);
    expect(declared.exitCode).toBe(0);

    const raised = await raisedAdvisories();
    expect(raised).toHaveLength(1);
    expect(String(raised[0]?.code)).toBe("authoring-hold");
    expect(raised[0]?.message).toContain("no-applicability-receipt");

    const held = guardAdvisoryChoices(projectDir, CHECKPOINT, raised, hostRoot);
    expect(held.kind).toBe("hold");
    if (held.kind !== "hold") return;
    expect(held.advisories[0]?.handoff_stage).toBe("tla-authoring");

    chooseRunNow(projectDir);
    const afterRunNow = guardAdvisoryChoices(projectDir, CHECKPOINT, raised, hostRoot);
    expect(afterRunNow.kind).toBe("hold");
    if (afterRunNow.kind !== "hold") return;
    expect(afterRunNow.advisories[0]?.result ?? "").toContain("evaluator to return no-hold");

    const declarationPath = join(fixture, "non-target.json");
    writeFileSync(
      declarationPath,
      JSON.stringify({ subjects: ["FR-1"], kind: "non-target", rationale: "fixture" }),
      "utf8",
    );
    const persisted = await cli([
      "applicability", "receipt",
      "--declaration", declarationPath,
      "--identity", declared.body.identity as string,
      "--approval", approvalPath,
      "--model-map", modelMapPath,
      "--store", storeRoot,
      "--audit-dir", fixture,
      "--generated-at", "2026-08-10T00:00:00Z",
      "--persist", "true",
    ]);
    expect(persisted.exitCode).toBe(0);

    const afterReceipt = await raisedAdvisories();
    expect(afterReceipt).toEqual([]);
    expect(guardAdvisoryChoices(projectDir, CHECKPOINT, afterReceipt, hostRoot).kind).toBe("allow");
  });

  test("this repository declares no governed subjects yet, so every intent keeps flowing", async () => {
    const specsRoot = join(REPO_ROOT, "amadeus", "spaces", "default", "specs");
    expect(existsSync(join(specsRoot, "authoring-subjects.json"))).toBe(false);
    expect(existsSync(join(specsRoot, "tla", "authoring-subjects.json"))).toBe(false);

    const absent = await cli(["advisory", "hold", "--subjects-file", join(fixture, "absent.json")]);
    expect(absent.exitCode).toBe(0);
    expect((absent.body.verdict as { kind: string }).kind).toBe("no-hold");
    expect(String(absent.body.reason)).toContain("no governed subjects");
  });
});
