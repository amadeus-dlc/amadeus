// covers: function:docsRoot
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  declaredHandoffStage,
  parseAdvisoryDeclarations,
} from "../../packages/framework/core/tools/amadeus-advisory-declaration.ts";
import { guardAdvisoryChoices } from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import { chooseRunNow } from "../harness/advisory-choice-fixture.ts";
import { cleanupTestProject, createTestProject, FIXTURES_DIR, seedStateFile } from "../harness/fixtures.ts";

// FR-3 + D2 (#2766): a declared advisory could raise a hold but had no way to
// name the stage the run-now choice should open. The engine used to hard-code a
// single destination stage, which is the wrong stage for any other hold. The
// declaration now carries `handoff: { stage }`, and the directive carries it as
// `handoff_stage` — an entry point, never a release: BR-U2-05 keeps the
// plugin's own evaluator as the only way out of the hold.

const FIXTURE_PLUGIN = "conformance-fixture";
const FIXTURE_MANIFEST = join(
  import.meta.dir,
  "..",
  "fixtures",
  "conformance-fixture-plugin",
  FIXTURE_PLUGIN,
  "plugin.json",
);

const HANDOFF_DECLARATION = [
  {
    code: "demo-hold",
    checkpoints: ["requirements-analysis"],
    evaluator: { argv: ["bun", "plugins/demo/tools/evaluate.ts", "hold"] },
    handoff: { stage: "demo-stage" },
  },
];

const DECLARED_ADVISORY: Advisory = {
  plugin: "demo",
  code: "demo-hold" as Advisory["code"],
  message: "advisory: demo demo-hold — no-applicability-receipt",
  stage: "requirements-analysis",
  target: "demo:demo-hold",
  specIdentity: "sha256:hold-1",
};

const projects: string[] = [];

afterEach(() => {
  for (const project of projects.splice(0)) cleanupTestProject(project);
});

function seedDeclaredProject(advisories: unknown): { projectDir: string; hostRoot: string } {
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
  mkdirSync(join(projectDir, "plugins", "demo"), { recursive: true });
  writeFileSync(
    join(projectDir, "plugins", "demo", "plugin.json"),
    JSON.stringify({ name: "demo", tools: [], advisories }),
    "utf8",
  );
  return { projectDir, hostRoot: host };
}


describe("t526 declared advisory handoff stage", () => {
  test("the declaration carries the handoff stage through the parser", () => {
    const parsed = parseAdvisoryDeclarations(JSON.stringify({ advisories: HANDOFF_DECLARATION }));
    expect(parsed.invalid).toEqual([]);
    expect(parsed.declarations[0]?.handoffStage).toBe("demo-stage");
  });

  test("a declaration with no handoff carries none", () => {
    const parsed = parseAdvisoryDeclarations(
      JSON.stringify({ advisories: [{ ...HANDOFF_DECLARATION[0], handoff: undefined }] }),
    );
    expect(parsed.invalid).toEqual([]);
    expect(parsed.declarations[0]?.handoffStage).toBeNull();
  });

  test("a handoff that names no stage slug is invalid rather than ignored", () => {
    const parsed = parseAdvisoryDeclarations(
      JSON.stringify({ advisories: [{ ...HANDOFF_DECLARATION[0], handoff: { stage: "Not A Slug" } }] }),
    );
    expect(parsed.declarations).toEqual([]);
    expect(parsed.invalid.join(" ")).toContain("handoff");
  });

  test("the directive names the handoff stage while the hold is offered", () => {
    const { projectDir, hostRoot } = seedDeclaredProject(HANDOFF_DECLARATION);
    const guarded = guardAdvisoryChoices(projectDir, DECLARED_ADVISORY.stage, [DECLARED_ADVISORY], hostRoot);
    expect(guarded.kind).toBe("hold");
    if (guarded.kind !== "hold") return;
    expect(guarded.advisories[0]?.handoff_stage).toBe("demo-stage");
    expect(declaredHandoffStage(projectDir, "demo", "demo-hold")).toBe("demo-stage");
  });

  test("run-now opens the handoff stage without releasing the hold", () => {
    const { projectDir, hostRoot } = seedDeclaredProject(HANDOFF_DECLARATION);
    const stage = DECLARED_ADVISORY.stage;
    guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot);
    chooseRunNow(projectDir);

    const guarded = guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot);
    // Still held, under the settled `handoff` verdict (#2967).
    expect(guarded.kind).toBe("handoff");
    if (guarded.kind !== "handoff") return;
    expect(guarded.advisories[0]?.handoff_stage).toBe("demo-stage");
    // BR-U2-05 stands: the run-now route is an entry point into authoring, and
    // only the plugin's own evaluator returning no-hold releases the hold.
    expect(guarded.advisories[0]?.result ?? "").toContain("evaluator to return no-hold");
  });

  test("an advisory with no declared handoff leaves the field off the directive", () => {
    const { projectDir, hostRoot } = seedDeclaredProject([
      { ...HANDOFF_DECLARATION[0], handoff: undefined },
    ]);
    const guarded = guardAdvisoryChoices(projectDir, DECLARED_ADVISORY.stage, [DECLARED_ADVISORY], hostRoot);
    expect(guarded.kind).toBe("hold");
    if (guarded.kind !== "hold") return;
    expect(guarded.advisories[0]?.handoff_stage).toBeUndefined();
  });

  test("a real manifest hands its declared advisory to its own stage", () => {
    const manifest = JSON.parse(readFileSync(FIXTURE_MANIFEST, "utf8")) as {
      advisories: ReadonlyArray<Record<string, unknown>>;
    };
    expect(manifest.advisories.map((advisory) => advisory.code)).toEqual(["fixture-change"]);
    const declared = manifest.advisories.find((advisory) => advisory.code === "fixture-change");
    expect(declared?.handoff).toEqual({ stage: FIXTURE_PLUGIN });
    expect(declared).not.toHaveProperty("formalCheck");
  });
});
