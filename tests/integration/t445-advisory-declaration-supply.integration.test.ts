// covers: function:resolveEvaluatorArgv, function:resolvePluginManifest
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  advisoriesForHost,
  declaredAdvisoriesForPlugin,
  declaredHandoffStage,
  parseAdvisoryDeclarations,
  resolveEvaluatorArgv,
  resolvePluginManifest,
  spawnEvaluator,
  type DeclarationFs,
  type DeclarationWarn,
  type RunEvaluator,
} from "../../packages/framework/core/tools/amadeus-advisory-declaration.ts";
import {
  advisoryChoicePresentationFields,
  advisoryReportHoldReason,
  guardAdvisoryChoices,
  choiceFromExactPrompt,
  recordAdvisoryChoice,
  type AdvisoryChoiceStore,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import {
  auditFilePath,
  auditShardName,
  docsRoot,
  findAllEvents,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import { cleanupTestProject, createTestProject, FIXTURES_DIR, seedStateFile } from "../harness/fixtures.ts";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";

// #2253 replaced the prompt-classifying acceptance entry point with one that
// takes an already-classified choice and a provenance union. These tests were
// written against the prompt shape, and what they pin — which prompts count and
// which provenance is refused — is unchanged, so they keep exercising the same
// route through the same two steps the hook now performs.
function recordAdvisoryChoiceViaPrompt(
  projectDir: string,
  prompt: string,
  humanTurn: { timestamp: string; shard: string; eventIdentity: string },
  now?: string,
): boolean {
  const choice = choiceFromExactPrompt(prompt);
  if (choice === null) return false;
  // True only when a receipt was WRITTEN, which is what this boolean has always
  // meant; an already-settled replay stays false here (#2967 FR-ADV-4).
  const outcome = now === undefined
    ? recordAdvisoryChoice(projectDir, choice, { kind: "human-turn", ...humanTurn })
    : recordAdvisoryChoice(projectDir, choice, { kind: "human-turn", ...humanTurn }, now);
  return outcome.kind === "recorded";
}


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

// The consumer layout: no `<projectRoot>/plugins/` authoring face at all, the
// manifest lives only on the staging face under the host root.
function declareAdvisoriesInStaging(advisories: unknown): void {
  mkdirSync(join(hostRoot, ".amadeus-plugin-src", "demo"), { recursive: true });
  writeFileSync(
    join(hostRoot, ".amadeus-plugin-src", "demo", "plugin.json"),
    JSON.stringify({ name: "demo", tools: [], advisories }),
    "utf8",
  );
}

// Evaluator argv paths are plugin-root-relative (FR-2): the engine joins them
// to the located plugin root before running the evaluator.
const HOLD_DECLARATION = [
  {
    code: "demo-hold",
    checkpoints: ["requirements-analysis"],
    evaluator: { argv: ["bun", "tools/evaluate.ts", "hold"] },
  },
];

function advisoriesFor(stage: string, stdout: string, status = 1, warn?: DeclarationWarn) {
  const seen: string[][] = [];
  const raised = advisoriesForHost(hostRoot, stage, undefined, (argv) => {
    seen.push([...argv]);
    return { status, stdout };
  }, warn);
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
    expect(String(raised[0]?.code)).toBe("demo-hold");
    expect(raised[0]?.message).toContain("no-applicability-receipt");
    // argv only: the declaration is executed as a vector, never a shell string.
    // The relative script path resolves against the located plugin root (FR-2).
    expect(seen).toEqual([["bun", join(projectRoot, "plugins", "demo", "tools", "evaluate.ts"), "hold"]]);
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

  test("an unknown evaluator token raises an actionable declaration advisory", () => {
    composeDemo();
    declareAdvisories([{
      ...HOLD_DECLARATION[0],
      evaluator: { argv: ["bun", "tools/evaluate.ts", "{unknown-token}"] },
    }]);
    const { raised, seen } = advisoriesFor("requirements-analysis", "");
    expect(seen).toEqual([]);
    expect(raised).toHaveLength(1);
    expect(raised[0]?.message).toContain("unknown token");
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

  // FR-4: the pin's essence is that no advisory fires (fail-open) — but the
  // absence is loud now: exactly one warning per composed plugin per call.
  test("a composed plugin with no manifest on either face raises nothing but warns once", () => {
    composeDemo();
    const warnings: string[] = [];
    const { raised, seen } = advisoriesFor("requirements-analysis", "", 1, (message) => warnings.push(message));
    expect(raised).toEqual([]);
    expect(seen).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("demo");
    expect(warnings[0]).toContain("no manifest");
  });
});

// FR-7(a): the consumer layout — a workspace with no repo-root `plugins/`
// authoring face at all, where the bundle's manifest lives only under the
// host's staging dir — must supply the declared advisories exactly like the
// dogfood layout does.
describe("declared advisory supply from the staging face (consumer layout)", () => {
  test("raises the declared advisory with argv resolved against the staging plugin root", () => {
    composeDemo();
    declareAdvisoriesInStaging(HOLD_DECLARATION);
    const warnings: string[] = [];
    const { raised, seen } = advisoriesFor(
      "requirements-analysis",
      JSON.stringify({ ok: false, verdict: { kind: "hold", reasons: [{ kind: "no-applicability-receipt" }] } }),
      1,
      (message) => warnings.push(message),
    );
    expect(raised).toHaveLength(1);
    expect(String(raised[0]?.code)).toBe("demo-hold");
    expect(seen).toEqual([["bun", join(hostRoot, ".amadeus-plugin-src", "demo", "tools", "evaluate.ts"), "hold"]]);
    expect(warnings).toEqual([]);
  });

  test("the authoring face wins when both faces carry a manifest", () => {
    composeDemo();
    declareAdvisories(HOLD_DECLARATION);
    declareAdvisoriesInStaging([
      {
        code: "staging-only-hold",
        checkpoints: ["requirements-analysis"],
        evaluator: { argv: ["bun", "tools/other.ts", "hold"] },
      },
    ]);
    const { raised, seen } = advisoriesFor(
      "requirements-analysis",
      JSON.stringify({ ok: false, verdict: { kind: "hold", reasons: [{ kind: "no-applicability-receipt" }] } }),
    );
    expect(raised).toHaveLength(1);
    expect(String(raised[0]?.code)).toBe("demo-hold");
    expect(seen).toEqual([["bun", join(projectRoot, "plugins", "demo", "tools", "evaluate.ts"), "hold"]]);
  });

  // FR-5: the run-now lookup paths read the staging face too, so a consumer
  // workspace's directive does not silently drop handoff_stage.
  test("declaredHandoffStage resolves from the staging face", () => {
    composeDemo();
    declareAdvisoriesInStaging([
      {
        code: "demo-hold",
        checkpoints: ["requirements-analysis"],
        evaluator: { argv: ["bun", "tools/evaluate.ts", "hold"] },
        handoff: { stage: "tla-authoring" },
      },
    ]);
    expect(declaredHandoffStage(projectRoot, "demo", "demo-hold", undefined, join(hostRoot, ".amadeus-plugin-src")))
      .toBe("tla-authoring");
  });

  test("a declaration lookup with no manifest on either face returns null and warns", () => {
    composeDemo();
    const warnings: string[] = [];
    const stage = declaredHandoffStage(
      projectRoot,
      "demo",
      "demo-hold",
      undefined,
      join(hostRoot, ".amadeus-plugin-src"),
      (message) => warnings.push(message),
    );
    expect(stage).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("demo");
  });

  test("an unreadable declaration manifest fails closed", () => {
    const fs: DeclarationFs = {
      existsSync: () => true,
      readFileSync: () => {
        throw new Error("EACCES");
      },
    };

    expect(declaredHandoffStage(projectRoot, "demo", "demo-hold", fs)).toBeNull();
  });
});

describe("the shipped formal-model-check declaration", () => {
  test("parses with no invalid entries", () => {
    const manifest = readFileSync(
      join(import.meta.dir, "..", "..", "plugins", "formal-model-check", "plugin.json"),
      "utf8",
    );
    const parsed = parseAdvisoryDeclarations(manifest);
    expect(parsed.invalid).toEqual([]);
    expect(parsed.declarations.map((declaration) => String(declaration.code))).toEqual(["spec-change"]);
    expect(parsed.declarations[0]?.checkpoints).toEqual([
      "requirements-analysis",
      "functional-design",
      "build-and-test",
    ]);
  });

  // FR-3: the plugin's declared evaluator and handoff implementation exist on
  // its own authoring face.
  test("declared plugin tool paths exist against the located plugin root", () => {
    const repoRoot = join(import.meta.dir, "..", "..");
    const located = resolvePluginManifest(repoRoot, undefined, "formal-model-check");
    expect(located).not.toBeNull();
    if (located === null) return;
    expect(located.pluginRoot).toBe(join(repoRoot, "plugins", "formal-model-check"));
    expect(existsSync(join(located.pluginRoot, "tools", "tla-authoring.ts"))).toBe(true);
    expect(existsSync(join(located.pluginRoot, "tools", "run-model-check.ts"))).toBe(true);
  });
});

// BR-U2-05: a declared advisory is released only by its own evaluator returning
// no-hold. `next` and `report`
// must agree on that — a run-now choice releases neither side.
describe("declared advisory hold symmetry across next and report", () => {
  const projects: string[] = [];

  afterEach(() => {
    for (const project of projects.splice(0)) cleanupTestProject(project);
  });

  const DECLARED_ADVISORY: Advisory = {
    plugin: "demo",
    code: "demo-hold" as Advisory["code"],
    message: "advisory: demo demo-hold — no-applicability-receipt",
    stage: "requirements-analysis",
    target: "amadeus/spaces/default/specs/tla",
    specIdentity: "sha256:hold-1",
  };

  function holdRunner(): RunEvaluator {
    return () => ({
      status: 1,
      stdout: JSON.stringify({
        ok: false,
        verdict: { kind: "hold", reasons: [{ kind: "no-applicability-receipt" }] },
      }),
    });
  }

  function noHoldRunner(): RunEvaluator {
    return () => ({ status: 0, stdout: JSON.stringify({ ok: true, verdict: { kind: "no-hold" } }) });
  }

  function seedDeclaredProject(advisories: unknown = HOLD_DECLARATION): { projectDir: string; hostRoot: string } {
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

  function chooseAtCheckpoint(projectDir: string, prompt: string): void {
    const store = JSON.parse(
      readFileSync(join(docsRoot(projectDir), ".amadeus-advisory-choice.json"), "utf-8"),
    ) as AdvisoryChoiceStore;
    const pending = store.pending[0];
    if (pending === undefined) throw new Error("no pending advisory to choose for");
    const fields = advisoryChoicePresentationFields(
      projectDir,
      pending.identity.checkpoint,
      [pending.identity.advisoryInstance],
    );
    if (!fields.ok) throw new Error(fields.reason);
    plantV1AuditRow("DECISION_RECORDED", fields.value, projectDir);
    const planted = plantV1AuditRow("HUMAN_TURN", {}, projectDir);
    const event = findAllEvents(readFileSync(auditFilePath(projectDir), "utf-8"), "HUMAN_TURN").at(-1);
    if (event === undefined) throw new Error("no HUMAN_TURN was planted");
    const recorded = recordAdvisoryChoiceViaPrompt(projectDir, prompt, {
      shard: auditShardName(projectDir),
      timestamp: planted.timestamp,
      eventIdentity: createHash("sha256").update(event.block).digest("hex"),
    });
    if (!recorded) throw new Error("the advisory choice was not recorded");
  }

  test("run-now holds on both sides while the evaluator keeps holding", () => {
    const { projectDir, hostRoot } = seedDeclaredProject();
    const stage = DECLARED_ADVISORY.stage;
    expect(guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot).kind).toBe("hold");
    chooseAtCheckpoint(projectDir, "run-now");

    const guarded = guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot);
    // Still held, under the settled `handoff` verdict (#2967).
    expect(guarded.kind).toBe("handoff");
    if (guarded.kind === "handoff") {
      expect(guarded.advisories[0]?.result ?? "").toContain("no-hold");
    }

    const reason = advisoryReportHoldReason(projectDir, stage, hostRoot, holdRunner());
    expect(reason ?? "").toContain("demo-hold");
    expect(reason ?? "").not.toContain("formal model check artifacts");
  });

  test("report releases once the evaluator stops raising the advisory", () => {
    const { projectDir, hostRoot } = seedDeclaredProject();
    const stage = DECLARED_ADVISORY.stage;
    guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot);
    chooseAtCheckpoint(projectDir, "run-now");
    expect(advisoryReportHoldReason(projectDir, stage, hostRoot, noHoldRunner())).toBeNull();
  });

  test("an unresolvable host holds the report side closed", () => {
    const { projectDir, hostRoot } = seedDeclaredProject();
    const stage = DECLARED_ADVISORY.stage;
    guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot);
    chooseAtCheckpoint(projectDir, "run-now");
    const reason = advisoryReportHoldReason(projectDir, stage) ?? "";
    expect(reason).toContain("demo-hold");
    expect(reason).toContain("evaluator to return no-hold");
  });

  test("the human's explicit deferral still releases both sides", () => {
    const { projectDir, hostRoot } = seedDeclaredProject();
    const stage = DECLARED_ADVISORY.stage;
    guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot);
    chooseAtCheckpoint(projectDir, "defer-with-risk");
    expect(guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot).kind).toBe("allow");
    expect(advisoryReportHoldReason(projectDir, stage, hostRoot, holdRunner())).toBeNull();
  });
});

// BR-U2-19: the evaluator is launched as an argv vector with no shell between,
// so nothing a manifest holds can be word-split or expanded.
describe("spawnEvaluator", () => {
  test("returns the launched command's stdout and exit status", () => {
    const result = spawnEvaluator(projectRoot)([
      "bun",
      "-e",
      "process.stdout.write('{\"ok\":true}'); process.exit(3)",
    ]);
    expect(result.status).toBe(3);
    expect(result.stdout).toBe('{"ok":true}');
  });

  test("a command that cannot be launched reads as a failure, not as empty success", () => {
    const result = spawnEvaluator(projectRoot)(["amadeus-no-such-evaluator-t445"]);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
  });

  test("a script removed between existence and realpath checks reads as a failure", () => {
    const result = spawnEvaluator(projectRoot, {
      existsSync: () => true,
      realpathSync: () => {
        throw new Error("ENOENT");
      },
    })(["bun", join(projectRoot, "removed-evaluator.ts")]);
    expect(result).toEqual({ status: 1, stdout: "" });
  });
});

// A manifest that exists but cannot be read is a hold, never a silent release
// (BR-U2-18). The filesystem port is injected, so this stays in the pure layer.
describe("a manifest that exists but cannot be read", () => {
  const unreadable: DeclarationFs = {
    existsSync: () => true,
    readFileSync: () => {
      throw new Error("EACCES");
    },
  };

  test("raises the hold-side advisory instead of reading as no advisory", () => {
    const raised = declaredAdvisoriesForPlugin(
      "/nowhere",
      "demo",
      "requirements-analysis",
      () => {
        throw new Error("the evaluator must not run for an unreadable manifest");
      },
      unreadable,
    );
    expect(raised).toHaveLength(1);
    expect(raised[0]?.message).toContain("cannot be read");
  });

});

// ─── Resolver units (FR-1/FR-2) ─────────────────────────────────────────────
// These cases are in-memory, but the fake DeclarationFs literal names the
// existsSync/readFileSync keys, and the layer×size purity classifier is
// token-based — so they live in the integration tier, not tests/unit.

// FR-2: a relative path-like argv element resolves against the located plugin
// root; flags, their values, bare commands, absolute paths, and reserved
// tokens pass through untouched.
describe("resolveEvaluatorArgv", () => {
  const root = "/workspace/plugins/demo";

  test("joins a relative path-like element to the plugin root", () => {
    expect(resolveEvaluatorArgv(["bun", "tools/evaluate.ts", "hold"], root))
      .toEqual(["bun", "/workspace/plugins/demo/tools/evaluate.ts", "hold"]);
  });

  test("leaves flags and their values untouched", () => {
    expect(resolveEvaluatorArgv(["bun", "tools/check.ts", "--model", "MirrorLifecycle"], root))
      .toEqual(["bun", "/workspace/plugins/demo/tools/check.ts", "--model", "MirrorLifecycle"]);
  });

  test("leaves an absolute path untouched", () => {
    expect(resolveEvaluatorArgv(["bun", "/opt/tools/evaluate.ts"], root))
      .toEqual(["bun", "/opt/tools/evaluate.ts"]);
  });

  test("leaves bare words and reserved tokens untouched (no path separator)", () => {
    expect(resolveEvaluatorArgv(["bun", "evaluate.ts", "{out}", "--out"], root))
      .toEqual(["bun", "evaluate.ts", "{out}", "--out"]);
  });
});

// FR-1: the manifest is located on the authoring face first, the staging face
// second; the plugin root is the located manifest's own directory.
describe("resolvePluginManifest", () => {
  const fsFor = (existing: readonly string[]): DeclarationFs => ({
    existsSync: (path) => existing.includes(path),
    readFileSync: () => {
      throw new Error("not needed for location");
    },
  });

  test("the authoring face wins when both faces carry a manifest", () => {
    const resolved = resolvePluginManifest("/repo", "/repo/.harness/.amadeus-plugin-src", "demo", fsFor([
      "/repo/plugins/demo/plugin.json",
      "/repo/.harness/.amadeus-plugin-src/demo/plugin.json",
    ]));
    expect(resolved).toEqual({
      manifestPath: "/repo/plugins/demo/plugin.json",
      pluginRoot: "/repo/plugins/demo",
    });
  });

  test("falls back to the staging face when the authoring face is absent", () => {
    const resolved = resolvePluginManifest("/repo", "/repo/.harness/.amadeus-plugin-src", "demo", fsFor([
      "/repo/.harness/.amadeus-plugin-src/demo/plugin.json",
    ]));
    expect(resolved).toEqual({
      manifestPath: "/repo/.harness/.amadeus-plugin-src/demo/plugin.json",
      pluginRoot: "/repo/.harness/.amadeus-plugin-src/demo",
    });
  });

  test("returns null when neither face carries a manifest", () => {
    expect(resolvePluginManifest("/repo", "/repo/.harness/.amadeus-plugin-src", "demo", fsFor([]))).toBeNull();
  });

  test("no staging root means the authoring face only (backward compatible)", () => {
    expect(resolvePluginManifest("/repo", undefined, "demo", fsFor([
      "/repo/.harness/.amadeus-plugin-src/demo/plugin.json",
    ]))).toBeNull();
    expect(resolvePluginManifest("/repo", undefined, "demo", fsFor([
      "/repo/plugins/demo/plugin.json",
    ]))?.pluginRoot).toBe("/repo/plugins/demo");
  });
});
