// covers: function:docsRoot
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  closeAdvisoryInstancesForStage,
  guardAdvisoryChoices,
  type AdvisoryChoiceStore,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import { docsRoot } from "../../packages/framework/core/tools/amadeus-lib.ts";
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import { cleanupTestProject, createTestProject, FIXTURES_DIR, seedStateFile } from "../harness/fixtures.ts";

// FR-7 + D5 (#2766): `advisoryFromEvaluatorRun` returns null on no-hold, so a
// checkpoint that evaluated and found nothing is indistinguishable from one
// that never ran. D5 rules the trace to the transitions that matter: a hold and
// its release are recorded, a pure no-hold stays trace-free so three
// checkpoints on every `next` do not grow the store without end.

const STORE_FILE = ".amadeus-advisory-choice.json";

const HELD_ADVISORY: Advisory = {
  plugin: "demo",
  code: "demo-hold" as Advisory["code"],
  message: "advisory: demo demo-hold — hold (no-applicability-receipt)",
  stage: "requirements-analysis",
  target: "amadeus/spaces/default/specs/tla",
  specIdentity: "sha256:hold-1",
};

const projects: string[] = [];

afterEach(() => {
  for (const project of projects.splice(0)) cleanupTestProject(project);
});

function seedProject(): { projectDir: string; hostRoot: string } {
  const projectDir = createTestProject();
  projects.push(projectDir);
  seedStateFile(projectDir, join(FIXTURES_DIR, "state-mid-inception.md"));
  const host = join(projectDir, ".harness");
  mkdirSync(host, { recursive: true });
  writeFileSync(
    join(host, ".amadeus-plugin-composition.json"),
    JSON.stringify({ ledger: [], plugins: [["demo", { plugin: "demo", stageIndex: [] }]] }),
    "utf8",
  );
  return { projectDir, hostRoot: host };
}

function storeOf(projectDir: string): AdvisoryChoiceStore {
  return JSON.parse(readFileSync(join(docsRoot(projectDir), STORE_FILE), "utf-8")) as AdvisoryChoiceStore;
}

describe("t529 the advisory hold leaves a trace across its transitions", () => {
  test("a raised hold is recorded with the checkpoint that raised it", () => {
    const { projectDir, hostRoot } = seedProject();
    const guarded = guardAdvisoryChoices(projectDir, HELD_ADVISORY.stage, [HELD_ADVISORY], hostRoot);
    expect(guarded.kind).toBe("hold");

    const pending = storeOf(projectDir).pending;
    expect(pending).toHaveLength(1);
    expect(pending[0]?.identity.checkpoint).toBe("requirements-analysis");
    expect(String(pending[0]?.identity.code)).toBe("demo-hold");
    expect(typeof pending[0]?.createdAt).toBe("string");
    expect(pending[0]?.closedAt).toBeUndefined();
  });

  test("the release of a raised hold is recorded on the same entry", () => {
    const { projectDir, hostRoot } = seedProject();
    guardAdvisoryChoices(projectDir, HELD_ADVISORY.stage, [HELD_ADVISORY], hostRoot);
    // The evaluator stops raising: the advisory is simply absent from the
    // engine's next judgement, which is exactly what a no-hold verdict means.
    const released = guardAdvisoryChoices(projectDir, HELD_ADVISORY.stage, [], hostRoot);
    expect(released.kind).toBe("allow");
    closeAdvisoryInstancesForStage(projectDir, HELD_ADVISORY.stage, "2026-08-10T00:00:00.000Z");

    const pending = storeOf(projectDir).pending;
    expect(pending).toHaveLength(1);
    expect(pending[0]?.closedAt).toBe("2026-08-10T00:00:00.000Z");
  });

  test("a checkpoint that never held writes no advisory trace at all", () => {
    const { projectDir, hostRoot } = seedProject();
    const guarded = guardAdvisoryChoices(projectDir, "requirements-analysis", [], hostRoot);
    expect(guarded.kind).toBe("allow");
    expect(existsSync(join(docsRoot(projectDir), STORE_FILE))).toBe(false);
  });
});
