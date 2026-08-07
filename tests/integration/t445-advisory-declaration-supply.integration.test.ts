import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  advisoriesForHost,
  declaredAdvisoriesForPlugin,
  declaredFormalCheckArgv,
  parseAdvisoryDeclarations,
  spawnEvaluator,
  type DeclarationFs,
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
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-activation.ts";
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
  return now === undefined
    ? recordAdvisoryChoice(projectDir, choice, { kind: "human-turn", ...humanTurn })
    : recordAdvisoryChoice(projectDir, choice, { kind: "human-turn", ...humanTurn }, now);
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
    const manifest = readFileSync(
      join(import.meta.dir, "..", "..", "plugins", "formal-model-check", "plugin.json"),
      "utf8",
    );
    const parsed = parseAdvisoryDeclarations(manifest);
    expect(parsed.invalid).toEqual([]);
    expect(parsed.declarations.map((declaration) => String(declaration.code))).toEqual(["authoring-hold"]);
    expect(parsed.declarations[0]?.checkpoints).toEqual([
      "requirements-analysis",
      "functional-design",
      "build-and-test",
    ]);
  });
});

// BR-U2-05: a declared advisory with no runnable check (formalCheck: null) is
// released only by its own evaluator returning no-hold. `next` and `report`
// must agree on that — a run-now choice releases neither side.
describe("declared advisory hold symmetry across next and report", () => {
  const projects: string[] = [];

  afterEach(() => {
    for (const project of projects.splice(0)) cleanupTestProject(project);
  });

  const DECLARED_ADVISORY: Advisory = {
    plugin: "demo",
    code: "authoring-hold" as Advisory["code"],
    message: "advisory: demo authoring-hold — no-applicability-receipt",
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
    expect(guarded.kind).toBe("hold");
    if (guarded.kind === "hold") {
      expect(guarded.runRequired).toBe(false);
      expect(guarded.formalChecks).toEqual([]);
      expect(guarded.advisories[0]?.result ?? "").toContain("no-hold");
    }

    const reason = advisoryReportHoldReason(projectDir, stage, hostRoot, holdRunner());
    expect(reason ?? "").toContain("authoring-hold");
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
    expect(reason).toContain("authoring-hold");
    expect(reason).toContain("evaluator to return no-hold");
  });

  // Generalization point 2: a declaration that DOES carry a runnable check keeps
  // the run-now route, resolved from its own manifest through the reserved
  // tokens rather than from anything the engine hard-codes.
  const RUNNABLE_DECLARATION = [
    {
      code: "authoring-hold",
      checkpoints: ["requirements-analysis"],
      evaluator: { argv: ["bun", "plugins/demo/tools/evaluate.ts", "hold"] },
      formalCheck: { argv: ["bun", "plugins/demo/tools/check.ts", "--out", "{out}", "--id", "{advisory-instance}"] },
    },
  ];

  test("a declared runnable check becomes the run-now route with its tokens resolved", () => {
    const { projectDir, hostRoot } = seedDeclaredProject(RUNNABLE_DECLARATION);
    const stage = DECLARED_ADVISORY.stage;
    guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot);
    chooseAtCheckpoint(projectDir, "run-now");

    const guarded = guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot);
    expect(guarded.kind).toBe("hold");
    if (guarded.kind !== "hold") return;
    expect(guarded.runRequired).toBe(true);
    const route = guarded.formalChecks[0];
    expect(route?.command).toContain("plugins/demo/tools/check.ts");
    expect(route?.command).not.toContain("{out}");
    expect(route?.command).toContain(JSON.stringify(route?.output_dir));
    expect(route?.command).toContain(JSON.stringify(route?.advisory_instance));
    expect(guarded.advisories[0]?.result).toBeUndefined();
  });

  test("a declared check whose argv holds an unknown token contributes no route", () => {
    const { projectDir, hostRoot } = seedDeclaredProject([
      { ...RUNNABLE_DECLARATION[0], formalCheck: { argv: ["bun", "check.ts", "{nowhere}"] } },
    ]);
    const stage = DECLARED_ADVISORY.stage;
    guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot);
    chooseAtCheckpoint(projectDir, "run-now");

    const guarded = guardAdvisoryChoices(projectDir, stage, [DECLARED_ADVISORY], hostRoot);
    expect(guarded.kind).toBe("hold");
    if (guarded.kind !== "hold") return;
    expect(guarded.runRequired).toBe(false);
    expect(guarded.advisories[0]?.result ?? "").toContain("no-hold");
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

  test("yields no declared run-now argv", () => {
    expect(declaredFormalCheckArgv("/nowhere", "demo", "authoring-hold", unreadable)).toBeNull();
  });
});
