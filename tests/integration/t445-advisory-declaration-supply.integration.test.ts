import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  advisoriesForHost,
  parseAdvisoryDeclarations,
} from "../../packages/framework/core/tools/amadeus-advisory-declaration.ts";

// U2 generalization point 1 (ADR-6 revision): the engine supplies advisories a
// composed plugin declares, evaluated by that plugin's own evaluator. The
// spec-hash route is untouched, so this drives a host that composes only the
// declaring plugin (BR-U2-21 — addition, not replacement).

let projectRoot = "";
let hostRoot = "";

function composeDemo(): void {
  writeFileSync(
    join(hostRoot, ".amadeus-plugin-composition.json"),
    JSON.stringify({ ledger: [], plugins: [["demo", { plugin: "demo", stageIndex: [] }]] }),
    "utf8",
  );
}

function declareAdvisories(advisories: unknown): void {
  mkdirSync(join(projectRoot, "plugins", "demo"), { recursive: true });
  writeFileSync(
    join(projectRoot, "plugins", "demo", "plugin.json"),
    JSON.stringify({ name: "demo", tools: [], advisories }),
    "utf8",
  );
}

const HOLD_DECLARATION = [
  {
    code: "authoring-hold",
    checkpoints: ["requirements-analysis"],
    evaluator: { argv: ["bun", "plugins/demo/tools/evaluate.ts", "hold"] },
    formalCheck: null,
  },
];

function advisoriesFor(stage: string, stdout: string, status = 1) {
  const seen: string[][] = [];
  const raised = advisoriesForHost(hostRoot, stage, undefined, (argv) => {
    seen.push([...argv]);
    return { status, stdout };
  });
  return { raised, seen };
}

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), "advisory-declaration-"));
  hostRoot = join(projectRoot, ".harness");
  mkdirSync(hostRoot, { recursive: true });
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

describe("declared advisory supply", () => {
  test("raises the declared advisory when the plugin's evaluator holds", () => {
    composeDemo();
    declareAdvisories(HOLD_DECLARATION);
    const { raised, seen } = advisoriesFor(
      "requirements-analysis",
      JSON.stringify({ ok: false, verdict: { kind: "hold", reasons: [{ kind: "no-applicability-receipt" }] } }),
    );
    expect(raised).toHaveLength(1);
    expect(String(raised[0]?.code)).toBe("authoring-hold");
    expect(raised[0]?.message).toContain("no-applicability-receipt");
    // argv only: the declaration is executed as a vector, never a shell string.
    expect(seen).toEqual([["bun", "plugins/demo/tools/evaluate.ts", "hold"]]);
  });

  test("raises nothing when the evaluator returns no-hold", () => {
    composeDemo();
    declareAdvisories(HOLD_DECLARATION);
    const { raised } = advisoriesFor(
      "requirements-analysis",
      JSON.stringify({ ok: true, verdict: { kind: "no-hold" } }),
      0,
    );
    expect(raised).toEqual([]);
  });

  test("does not run the evaluator at a checkpoint the declaration does not name", () => {
    composeDemo();
    declareAdvisories(HOLD_DECLARATION);
    const { raised, seen } = advisoriesFor("build-and-test", "");
    expect(raised).toEqual([]);
    expect(seen).toEqual([]);
  });

  test("a broken declaration holds instead of reading as no advisory (BR-U2-18)", () => {
    composeDemo();
    declareAdvisories([{ code: "Bad Code", checkpoints: [], evaluator: {} }]);
    const { raised, seen } = advisoriesFor("requirements-analysis", "");
    expect(raised).toHaveLength(1);
    expect(raised[0]?.message).toContain("cannot be read");
    expect(seen).toEqual([]);
  });

  test("a host composing no plugins raises nothing and runs nothing (zero impact)", () => {
    declareAdvisories(HOLD_DECLARATION);
    const { raised, seen } = advisoriesFor("requirements-analysis", "");
    expect(raised).toEqual([]);
    expect(seen).toEqual([]);
  });

  test("a composed plugin with no manifest on disk raises nothing", () => {
    composeDemo();
    const { raised, seen } = advisoriesFor("requirements-analysis", "");
    expect(raised).toEqual([]);
    expect(seen).toEqual([]);
  });
});

describe("the shipped formal-model-check declaration", () => {
  test("parses with no invalid entries", () => {
    const manifest = readFileSync("plugins/formal-model-check/plugin.json", "utf8");
    const parsed = parseAdvisoryDeclarations(manifest);
    expect(parsed.invalid).toEqual([]);
    expect(parsed.declarations.map((declaration) => declaration.code)).toEqual(["authoring-hold"]);
    expect(parsed.declarations[0]?.checkpoints).toEqual([
      "requirements-analysis",
      "functional-design",
      "build-and-test",
    ]);
  });
});
