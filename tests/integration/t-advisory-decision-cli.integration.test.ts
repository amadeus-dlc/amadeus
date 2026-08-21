// covers: subcommand:amadeus-log:advisory-decision
// size: medium
//
// `amadeus-log advisory-decision` records the exact advisory question a moment
// before it is shown, so the prompt hook can tell an ordinal answer apart from
// an unrelated reply. That makes it a boundary with two obligations:
//
//   * it records only a question that is really open — an instance the store
//     does not hold as pending at that checkpoint must be refused, or the audit
//     would carry a decision for a question nobody asked;
//   * the row it writes is the presentation itself (stage, question, options),
//     not a summary of it.
//
// Driven as the SHIPPED CLI (a real subprocess), because the refusals exit the
// process and the whole point of the subcommand is what a hook invoking it sees.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { guardAdvisoryChoices } from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import type { AdvisoryChoiceStore } from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import {
  auditFilePath,
  docsRoot,
  findAllEvents,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import {
  FIXTURE_ADVISORY_CODE,
  FIXTURE_PLUGIN,
  composeFixturePlugin,
  installFixturePlugin,
} from "../harness/conformance-fixture.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seedStateFile,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const LOG_TOOL = join(REPO_ROOT, "packages", "framework", "core", "tools", "amadeus-log.ts");
const CHECKPOINT = "requirements-analysis";

const ADVISORY: Advisory = {
  plugin: FIXTURE_PLUGIN,
  code: FIXTURE_ADVISORY_CODE,
  message: `advisory: ${FIXTURE_PLUGIN} ${FIXTURE_ADVISORY_CODE} — held`,
  stage: CHECKPOINT,
  target: `${FIXTURE_PLUGIN}:${FIXTURE_ADVISORY_CODE}`,
  specIdentity: "sha256:hold-1",
};

const projects: string[] = [];

afterEach(() => {
  for (const project of projects.splice(0)) cleanupTestProject(project);
});

/** A project holding one open advisory at CHECKPOINT. Returns its instance id. */
function projectWithOpenAdvisory(): { projectDir: string; instance: string } {
  const projectDir = createTestProject();
  projects.push(projectDir);
  seedStateFile(projectDir, join(FIXTURES_DIR, "state-mid-inception.md"));
  const hostRoot = join(projectDir, ".harness");
  mkdirSync(hostRoot, { recursive: true });
  installFixturePlugin(projectDir);
  composeFixturePlugin(hostRoot);

  expect(guardAdvisoryChoices(projectDir, CHECKPOINT, [ADVISORY], hostRoot).kind).toBe("hold");
  const store = JSON.parse(
    readFileSync(join(docsRoot(projectDir), ".amadeus-advisory-choice.json"), "utf-8"),
  ) as AdvisoryChoiceStore;
  const instance = store.pending[0]?.identity.advisoryInstance;
  if (instance === undefined) throw new Error("guardAdvisoryChoices left no pending advisory");
  return { projectDir, instance };
}

function runLog(projectDir: string, args: readonly string[]): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(
    "bun",
    [amadeusToolTarget(LOG_TOOL), ...args, "--project-dir", projectDir],
    { encoding: "utf-8", cwd: projectDir },
  );
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function decisionRows(projectDir: string): ReturnType<typeof findAllEvents> {
  const shard = auditFilePath(projectDir);
  // A project that has recorded nothing yet has no shard on disk at all; that
  // is zero rows, not an unreadable audit.
  if (!existsSync(shard)) return [];
  return findAllEvents(readFileSync(shard, "utf-8"), "DECISION_RECORDED");
}

describe("amadeus-log advisory-decision", () => {
  test("records the open advisory question and echoes what it emitted", () => {
    const { projectDir, instance } = projectWithOpenAdvisory();
    expect(decisionRows(projectDir)).toHaveLength(0);

    const run = runLog(projectDir, ["advisory-decision", "--stage", CHECKPOINT, "--instances", instance]);
    expect(run.status).toBe(0);
    expect(JSON.parse(run.stdout.trim())).toEqual({
      emitted: "DECISION_RECORDED",
      stage: CHECKPOINT,
      advisory_instances: [instance],
    });

    const rows = decisionRows(projectDir);
    expect(rows).toHaveLength(1);
    // The row carries the presentation, not a summary of it.
    expect(rows[0].block).toContain(CHECKPOINT);
    expect(rows[0].block).toContain(ADVISORY.message);
  });

  test("an instance that is not open at the checkpoint is refused, and nothing is recorded", () => {
    const { projectDir } = projectWithOpenAdvisory();
    const run = runLog(projectDir, [
      "advisory-decision",
      "--stage",
      CHECKPOINT,
      "--instances",
      "019fc698-ba1f-7000-8000-00000000dead",
    ]);
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("Invalid advisory presentation");
    expect(decisionRows(projectDir)).toHaveLength(0);
  });

  test("an open instance offered at the wrong checkpoint is refused", () => {
    const { projectDir, instance } = projectWithOpenAdvisory();
    const run = runLog(projectDir, ["advisory-decision", "--stage", "build-and-test", "--instances", instance]);
    expect(run.status).not.toBe(0);
    expect(decisionRows(projectDir)).toHaveLength(0);
  });

  test("each required flag is named when it is missing", () => {
    const { projectDir, instance } = projectWithOpenAdvisory();
    const noStage = runLog(projectDir, ["advisory-decision", "--instances", instance]);
    expect(noStage.status).not.toBe(0);
    expect(noStage.stderr).toContain("--stage");

    const noInstances = runLog(projectDir, ["advisory-decision", "--stage", CHECKPOINT]);
    expect(noInstances.status).not.toBe(0);
    expect(noInstances.stderr).toContain("--instances");
    expect(decisionRows(projectDir)).toHaveLength(0);
  });
});
