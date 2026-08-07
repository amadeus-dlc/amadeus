// covers: file:packages/framework/core/tools/amadeus-orchestrate.ts, file:packages/framework/core/tools/amadeus-directive.ts
// size: medium
//
// #2425 depth delivery — the run-stage directive carries the workflow's
// resolved depth level. Before this contract the depth mechanism was declared
// (scope frontmatter -> amadeus-state.md **Depth**) but never delivered: no
// directive field, so stage bodies re-derived depth from complexity or ignored
// it entirely, and artifact volume floated free of the declared level. This
// file pins the delivery half:
//
//   1. The directive validator ACCEPTS `depth` on run-stage (strict unknown-key
//      rejecter, so the field must be allowlisted), constrains it to the three
//      canonical values, and treats absence as valid (legacy states).
//   2. `next` reads amadeus-state.md -> **Depth** and emits it verbatim.
//   3. A state with no Depth field falls back to the scope's declared default
//      (scope fix -> Minimal), so --single and no-state paths still deliver.
//   4. A hand-edited lowercase state value is normalized to the canonical
//      Capitalized form before emit.
//
// Driven IN-PROCESS (handleNext imported from source) so the added lines
// register in lcov — bun --coverage does not instrument spawned children
// (bun-coverage-spawn-blindspot).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { __resetGraphCache } from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { validateDirective } from "../../packages/framework/core/tools/amadeus-directive.ts";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
  seededStateFile,
} from "../harness/fixtures.ts";
import { writeActivationModelMap } from "../harness/formal-model-fixture.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STOCK_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const FIX_BUILD_STAGE = join(FIXTURES_DIR, "state-fix-final-construction.md");

let host = "";
let proj = "";
const savedEnv: Record<string, string | undefined> = {};
function setEnv(k: string, v: string | undefined): void {
  if (!(k in savedEnv)) savedEnv[k] = process.env[k];
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

// A NON-composed plugin host (t378 precedent): keeps the activation advisory
// silent so `next` emits a plain run-stage instead of await-advisory-choice.
function makeSilentHost(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t486-host-"));
  const h = join(root, ".claude");
  mkdirSync(h, { recursive: true });
  mkdirSync(join(root, "amadeus", "spaces", "default", "specs", "tla"), { recursive: true });
  writeActivationModelMap(root);
  return h;
}

let logs: string[] = [];
let errs: string[] = [];
const realLog = console.log;
const realErr = console.error;
const realStderrWrite = process.stderr.write.bind(process.stderr);

beforeEach(() => {
  resetAidlcEnv();
  host = "";
  proj = "";
  logs = [];
  errs = [];
  console.log = (...a: unknown[]) => { logs.push(a.join(" ")); };
  console.error = (...a: unknown[]) => { errs.push(a.join(" ")); };
  (process.stderr as unknown as { write: (s: string) => boolean }).write = (s: string) => { errs.push(String(s)); return true; };
});

afterEach(() => {
  console.log = realLog;
  console.error = realErr;
  (process.stderr as unknown as { write: typeof realStderrWrite }).write = realStderrWrite;
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const k of Object.keys(savedEnv)) delete savedEnv[k];
  __resetGraphCache();
  _resetStageGraphForTests();
  resetAidlcEnv();
  resetOtelPerProject();
  if (host) rmSync(host, { recursive: true, force: true });
  cleanupTestProject(proj);
});

// ===========================================================================
// 1. The directive contract: depth is an ALLOWLISTED, ENUM-CHECKED field
// ===========================================================================

function runStageFixture(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: "run-stage",
    stage: "build-and-test",
    phase: "construction",
    lead_agent: "amadeus-quality-agent",
    support_agents: [],
    mode: "inline",
    gate: true,
    memory_path: "x/memory.md",
    consumes: [],
    produces: ["x/out.md"],
    rules_in_context: [],
    sensors_applicable: [],
    stage_file: "stages/x.md",
    ...extra,
  };
}

describe("t486 directive contract: depth field", () => {
  test.each(["Minimal", "Standard", "Comprehensive"])("depth %s is accepted on run-stage", (depth) => {
    const result = validateDirective(runStageFixture({ depth }));
    expect(result.valid).toBe(true);
  });

  test("an unrecognised depth value is rejected", () => {
    const result = validateDirective(runStageFixture({ depth: "banana" }));
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.errors.join("; ")).toContain("depth");
  });

  test("a lowercase depth value is rejected — the wire carries only the canonical form", () => {
    const result = validateDirective(runStageFixture({ depth: "minimal" }));
    expect(result.valid).toBe(false);
  });

  test("depth absence is valid (legacy states with no Depth field, unknown scope)", () => {
    const result = validateDirective(runStageFixture());
    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// 2. next: state **Depth** -> directive.depth, scope fallback, normalization
// ===========================================================================

function seedProject(): void {
  host = makeSilentHost();
  setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
  setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
  __resetGraphCache();
  _resetStageGraphForTests();
  proj = createTestProject();
  seedStateFile(proj, FIX_BUILD_STAGE); // Scope: fix, Depth: Minimal, Current Stage: build-and-test
}

function emittedDirective(): { kind: string; stage?: string; depth?: string } {
  handleNext([], proj);
  return JSON.parse(logs.join("\n").trim()) as { kind: string; stage?: string; depth?: string };
}

function rewriteState(mutate: (content: string) => string): void {
  const p = seededStateFile(proj);
  writeFileSync(p, mutate(readFileSync(p, "utf-8")));
}

describe("t486 next delivers depth", () => {
  test("state **Depth**: Minimal -> run-stage carries depth Minimal", () => {
    seedProject();
    const directive = emittedDirective();
    expect(directive.kind).toBe("run-stage");
    expect(directive.stage).toBe("build-and-test");
    expect(directive.depth).toBe("Minimal");
  });

  test("state **Depth**: Comprehensive (override survives scope default)", () => {
    seedProject();
    rewriteState((c) => c.replace("- **Depth**: Minimal", "- **Depth**: Comprehensive"));
    expect(emittedDirective().depth).toBe("Comprehensive");
  });

  test("state with NO Depth field -> falls back to the scope default (fix -> Minimal)", () => {
    seedProject();
    rewriteState((c) => c.replace(/- \*\*Depth\*\*: Minimal\n/, ""));
    const directive = emittedDirective();
    expect(directive.kind).toBe("run-stage");
    expect(directive.depth).toBe("Minimal");
  });

  test("hand-edited lowercase state value is normalized to the canonical form", () => {
    seedProject();
    rewriteState((c) => c.replace("- **Depth**: Minimal", "- **Depth**: comprehensive"));
    expect(emittedDirective().depth).toBe("Comprehensive");
  });
});
