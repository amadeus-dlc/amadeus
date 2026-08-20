import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTlaAuthoring } from "../../plugins/formal-model-check/tools/tla-authoring.ts";

// t3186 tier (ii): the arms as the applicability *pipeline* runs them — through
// `intersectsRegisteredModel`, the model map's own schema, and the CLI's typed
// output. The fixture model is generic (no real model name anywhere), which is
// what FR-ARM-4 asks of the arm: it applies to every registered model
// (business-rules.md BR-2).

let workspace = "";
let storeRoot = "";
let specDir = "";
let modelMapPath = "";
let toolsDir = "";

const IDENTITY = `sha256:${"1".repeat(64)}`;

const HUMAN_TURN_BLOCK = JSON.stringify({
  schemaVersion: 2,
  timestamp: "2026-08-20T00:00:00Z",
  eventName: "amadeus.human.turn",
  attributes: { Event: "HUMAN_TURN" },
});

const FIXTURE_MODULE = [
  "---- MODULE Fixture ----",
  "EXTENDS Integers",
  "",
  "VARIABLES kind",
  "",
  'Kinds == {"created", "converged"}',
  "",
  "TypeOK == kind \\in Kinds",
  "====",
  "",
].join("\n");

const FIXTURE_CFG = ["SPECIFICATION Spec", "", "INVARIANT TypeOK", ""].join("\n");

// The drifting implementation: it enumerates the whole declared value set and
// one state the model has never heard of.
const DRIFTED_SOURCE = [
  "export function transitionAllowed(next: string): boolean {",
  '  return next === "created" || next === "converged" || next === "landed";',
  "}",
  "",
].join("\n");

const ALIGNED_SOURCE = [
  "export function known(next: string): boolean {",
  '  return next === "created" || next === "converged";',
  "}",
  "",
].join("\n");

const DRIFTED_PATH = "plugins/formal-model-check/tools/fixture-drifted.ts";
const ALIGNED_PATH = "plugins/formal-model-check/tools/fixture-aligned.ts";

function digestOf(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function run(argv: readonly string[]): Promise<{ exitCode: number; body: Record<string, unknown> }> {
  const lines: string[] = [];
  const exitCode = await runTlaAuthoring(argv, (line) => lines.push(line));
  expect(lines).toHaveLength(1);
  return { exitCode, body: JSON.parse(lines[0] as string) as Record<string, unknown> };
}

function writeJson(name: string, value: unknown): string {
  const path = join(workspace, name);
  writeFileSync(path, JSON.stringify(value), "utf8");
  return path;
}

function declaration(kind: string): string {
  return writeJson(`declaration-${kind}.json`, { subjects: ["FR-001"], kind, rationale: "fixture" });
}

interface MapOptions {
  readonly digest: string;
  readonly entries?: readonly string[];
  readonly vocabulary?: { namedInvariants: readonly string[]; traceStateVariables: readonly string[] };
  readonly moduleText?: string;
}

function writeFixtureMap(options: MapOptions): void {
  writeFileSync(join(specDir, "Fixture.tla"), options.moduleText ?? FIXTURE_MODULE, "utf8");
  const sources: Record<string, string> = { [DRIFTED_PATH]: DRIFTED_SOURCE, [ALIGNED_PATH]: ALIGNED_SOURCE };
  const entries = [...(options.entries ?? [DRIFTED_PATH])].sort();
  writeFileSync(
    modelMapPath,
    JSON.stringify({
      schemaVersion: 2,
      models: [
        {
          name: "Fixture",
          model: {
            path: "amadeus/spaces/default/specs/tla/Fixture.tla",
            identity: digestOf(options.moduleText ?? FIXTURE_MODULE),
          },
          cfg: { path: "amadeus/spaces/default/specs/tla/Fixture.cfg", identity: digestOf(FIXTURE_CFG) },
          entries: entries.map((path) => ({ implPath: path, sha256: digestOf(sources[path] as string) })),
          vocabulary: options.vocabulary ?? { namedInvariants: ["TypeOK"], traceStateVariables: ["kind"] },
          evidenceBundle: { digest: options.digest },
        },
      ],
    }),
    "utf8",
  );
}

/** The registration prefix: FR-001 is authored, bundled, and registered. */
async function registerFixtureModel(options: Omit<MapOptions, "digest"> = {}): Promise<void> {
  const receipt = await run([
    "applicability", "receipt",
    "--declaration", declaration("new-subject"),
    "--identity", IDENTITY,
    "--approval", "none",
    "--model-map", modelMapPath,
    "--store", storeRoot,
    "--generated-at", "2026-08-20T00:00:00Z",
  ]);
  expect(receipt.exitCode).toBe(0);
  const parts = writeJson("parts.json", {
    kind: "authoring-bundle",
    parts: {
      applicability: receipt.body.receipt,
      trace: { note: "fixture" },
      proof: { note: "fixture" },
      review: { note: "fixture" },
      approval: { note: "fixture" },
    },
  });
  const built = await run([
    "bundle", "build",
    "--parts", parts,
    "--predecessor", "root",
    "--identity", IDENTITY,
    "--store", storeRoot,
    "--generated-at", "2026-08-20T00:00:00Z",
  ]);
  expect(built.exitCode).toBe(0);
  writeFixtureMap({ digest: built.body.digest as string, ...options });
}

async function judge(kind: string, extra: readonly string[] = []): Promise<{
  exitCode: number;
  body: Record<string, unknown>;
}> {
  return await run([
    "applicability", "judge",
    "--declaration", declaration(kind),
    "--identity", IDENTITY,
    "--model-map", modelMapPath,
    "--store", storeRoot,
    ...extra,
  ]);
}

interface ArmsBody {
  readonly vocabularyDrift: {
    kind: string;
    fired?: boolean;
    detail?: string;
    models?: readonly { model: string; propertyClass: string; findings: readonly Record<string, unknown>[] }[];
  };
  readonly defectRecurrence: Record<string, unknown>;
  readonly coverage: Record<string, unknown>;
  readonly revisionEvaluation: { required: boolean; reasons: readonly string[] };
}

function armsOf(body: Record<string, unknown>): ArmsBody {
  return body.arms as unknown as ArmsBody;
}

function evidenceFile(name: string, sections: readonly { issue: number; title: string; body: string }[]): string {
  const path = join(workspace, name);
  writeFileSync(
    path,
    [
      "# Issue Evidence — fixture",
      "",
      "## メタデータ",
      "",
      "- fetched-at: 2026-08-20T00:00:00Z / repo: amadeus-dlc/amadeus / tool: issue-evidence fetch",
      "",
      ...sections.flatMap((section) => [`## Issue #${section.issue}: ${section.title}`, "", section.body, ""]),
    ].join("\n"),
    "utf8",
  );
  return path;
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "tla-arms-"));
  storeRoot = join(workspace, "tla-evidence");
  specDir = join(workspace, "amadeus", "spaces", "default", "specs", "tla");
  toolsDir = join(workspace, "plugins", "formal-model-check", "tools");
  mkdirSync(storeRoot, { recursive: true });
  mkdirSync(specDir, { recursive: true });
  mkdirSync(toolsDir, { recursive: true });
  modelMapPath = join(specDir, "model-map.json");
  // The pre-registration map: no model yet, which is the state the first
  // authoring receipt is judged against.
  writeFileSync(modelMapPath, JSON.stringify({ schemaVersion: 2, models: [] }), "utf8");
  writeFileSync(join(specDir, "Fixture.cfg"), FIXTURE_CFG, "utf8");
  writeFileSync(join(workspace, DRIFTED_PATH), DRIFTED_SOURCE, "utf8");
  writeFileSync(join(workspace, ALIGNED_PATH), ALIGNED_SOURCE, "utf8");
  writeFileSync(join(workspace, "clone.jsonl"), `${HUMAN_TURN_BLOCK}\n`, "utf8");
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("tier (ii): the arms fire through the applicability pipeline (FR-ARM-1)", () => {
  test("a governed source that enumerates an unknown literal is reported as drift", async () => {
    await registerFixtureModel();
    const { exitCode, body } = await judge("semantic-change");
    expect(exitCode).toBe(0);
    expect(body.route).toBe("revise-model");
    const arms = armsOf(body);
    expect(arms.vocabularyDrift.kind).toBe("evaluated");
    expect(arms.vocabularyDrift.fired).toBe(true);
    const model = arms.vocabularyDrift.models?.[0];
    expect(model?.model).toBe("Fixture");
    expect(model?.propertyClass).toBe("invariants-only");
    expect(model?.findings[0]?.unknownLiterals).toEqual(["landed"]);
    expect(model?.findings[0]?.coveredValueSets).toEqual(["Kinds"]);
    expect(arms.revisionEvaluation.required).toBe(true);
  });

  test("a governed source that stays inside the model's vocabulary does not fire", async () => {
    await registerFixtureModel({ entries: [ALIGNED_PATH] });
    const { exitCode, body } = await judge("semantic-change");
    expect(exitCode).toBe(0);
    const arms = armsOf(body);
    expect(arms.vocabularyDrift.kind).toBe("evaluated");
    expect(arms.vocabularyDrift.fired).toBe(false);
    // Non-vacuous: the model was really evaluated, not skipped.
    expect(arms.vocabularyDrift.models?.map((model) => model.model)).toEqual(["Fixture"]);
    expect(arms.revisionEvaluation).toEqual({ required: false, reasons: [] });
  });

  test("an impl-only route with a firing arm is refused, not answered quietly", async () => {
    await registerFixtureModel();
    const { exitCode, body } = await judge("impl-only");
    expect(exitCode).toBe(1);
    expect(body.route).toBe("impl-only");
    expect((body.failure as { kind: string }).kind).toBe("revision-evaluation-required");
    expect((body.failure as { reasons: string[] }).reasons[0]).toContain("vocabulary drift");
  });

  test("an impl-only route with no arm firing still routes through unchanged (BR-1)", async () => {
    await registerFixtureModel({ entries: [ALIGNED_PATH] });
    const { exitCode, body } = await judge("impl-only");
    expect(exitCode).toBe(0);
    expect(body.route).toBe("impl-only");
  });

  test("the ruling rides the existing terminal-route receipt (FR-ARM-3 / BR-4)", async () => {
    await registerFixtureModel();
    const approval = writeJson("approval.json", {
      shard: "clone.jsonl",
      timestamp: "2026-08-20T00:00:00Z",
      eventIdentity: digestOf(HUMAN_TURN_BLOCK),
    });
    const { exitCode, body } = await run([
      "applicability", "receipt",
      "--declaration", declaration("impl-only"),
      "--identity", IDENTITY,
      "--approval", approval,
      "--model-map", modelMapPath,
      "--store", storeRoot,
      "--audit-dir", workspace,
      "--generated-at", "2026-08-20T00:00:00Z",
      "--persist", "true",
    ]);
    expect(exitCode).toBe(0);
    const receipt = body.receipt as Record<string, unknown>;
    const arms = receipt.arms as unknown as ArmsBody;
    expect(arms.revisionEvaluation.required).toBe(true);
    expect(arms.vocabularyDrift.fired).toBe(true);

    // The stored bundle carries the same evidence, so the ruling is auditable
    // without re-running the arms.
    const read = await run(["bundle", "read", "--ref", body.digest as string, "--store", storeRoot]);
    const stored = (read.body.evidence as { parts: { applicability: Record<string, unknown> } }).parts.applicability;
    expect((stored.arms as ArmsBody).revisionEvaluation.required).toBe(true);
  });
});

describe("defectRecurrence through the CLI (FR-ARM-2)", () => {
  test("a bug issue naming a governed file forces the evaluation", async () => {
    await registerFixtureModel({ entries: [ALIGNED_PATH] });
    const evidence = evidenceFile("evidence-hit.md", [
      { issue: 4242, title: "bug(fixture): 再発", body: `\`${ALIGNED_PATH}\` の分岐。` },
    ]);
    const { exitCode, body } = await judge("semantic-change", ["--issue-evidence", evidence]);
    expect(exitCode).toBe(0);
    expect(armsOf(body).defectRecurrence).toEqual({
      kind: "evaluated",
      fired: true,
      threshold: 1,
      intersections: [ALIGNED_PATH],
      bugIssues: [4242],
    });
    expect(armsOf(body).revisionEvaluation.required).toBe(true);
  });

  test("a bug issue naming nothing governed does not fire", async () => {
    await registerFixtureModel({ entries: [ALIGNED_PATH] });
    const evidence = evidenceFile("evidence-miss.md", [
      { issue: 4243, title: "bug(fixture): 別ファイル", body: "`packages/framework/core/tools/amadeus-other.ts` のみ。" },
    ]);
    const { body } = await judge("semantic-change", ["--issue-evidence", evidence]);
    expect(armsOf(body).defectRecurrence).toMatchObject({ kind: "evaluated", fired: false, intersections: [] });
    expect(armsOf(body).revisionEvaluation.required).toBe(false);
  });

  test("no --issue-evidence is a recorded non-input, never a silent non-fire", async () => {
    await registerFixtureModel({ entries: [ALIGNED_PATH] });
    const { body } = await judge("semantic-change");
    expect(armsOf(body).defectRecurrence).toEqual({
      kind: "not-supplied",
      note: "no --issue-evidence path was supplied",
    });
  });
});

describe("the coverage check records gaps without reclassifying (FR-ARM-5 / BR-5)", () => {
  test("an uncovered changed file is recorded and proposed for the entries", async () => {
    await registerFixtureModel({ entries: [ALIGNED_PATH] });
    const { exitCode, body } = await judge("semantic-change", ["--changed", `${ALIGNED_PATH},${DRIFTED_PATH}`]);
    expect(exitCode).toBe(0);
    // The route is untouched: a coverage gap never becomes `non-target`.
    expect(body.route).toBe("revise-model");
    expect(armsOf(body).coverage).toEqual({
      kind: "performed",
      uncovered: [DRIFTED_PATH],
      proposal: { kind: "entries-extension", models: ["Fixture"], paths: [DRIFTED_PATH] },
    });
  });

  test("no --changed set is recorded as not performed", async () => {
    await registerFixtureModel({ entries: [ALIGNED_PATH] });
    const { body } = await judge("semantic-change");
    expect(armsOf(body).coverage).toEqual({
      kind: "not-performed",
      note: "coverage check not performed: no --changed file set was supplied",
    });
  });
});

describe("undecidable inputs halt (NFR-2 / BR-3)", () => {
  test("a module the parser cannot read halts instead of reporting no drift", async () => {
    await registerFixtureModel({ moduleText: 'Kinds == {"created", "converged"\n' });
    const { exitCode, body } = await judge("semantic-change");
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("model-source-unparseable");
  });

  test("a registered vocabulary the module does not define halts", async () => {
    await registerFixtureModel({
      vocabulary: { namedInvariants: ["TypeOK", "NeverDefined"], traceStateVariables: ["kind"] },
    });
    const { exitCode, body } = await judge("semantic-change");
    expect(exitCode).toBe(1);
    const failure = body.failure as { kind: string; missingInvariants: string[] };
    expect(failure.kind).toBe("model-vocabulary-inconsistent");
    expect(failure.missingInvariants).toEqual(["NeverDefined"]);
  });

  test("an issue-evidence file that is not one halts", async () => {
    await registerFixtureModel({ entries: [ALIGNED_PATH] });
    const path = join(workspace, "not-evidence.md");
    writeFileSync(path, "# something else\n", "utf8");
    const { exitCode, body } = await judge("semantic-change", ["--issue-evidence", path]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("issue-evidence-unparseable");
  });

  test("an --issue-evidence path that does not exist halts", async () => {
    await registerFixtureModel({ entries: [ALIGNED_PATH] });
    const { exitCode, body } = await judge("semantic-change", ["--issue-evidence", join(workspace, "absent.md")]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("issue-evidence-unreadable");
  });

  test("a map the strict schema cannot read reports the arms as not evaluated", async () => {
    writeFileSync(modelMapPath, JSON.stringify({ schemaVersion: 2, models: [] }), "utf8");
    const { exitCode, body } = await judge("new-subject");
    expect(exitCode).toBe(0);
    expect(body.route).toBe("author-new");
    expect(armsOf(body).vocabularyDrift.kind).toBe("not-evaluated");
    expect(armsOf(body).vocabularyDrift.detail).toContain("models");
  });
});
