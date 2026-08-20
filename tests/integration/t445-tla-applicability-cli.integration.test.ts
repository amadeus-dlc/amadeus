import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTlaAuthoring } from "../../plugins/formal-model-check/tools/tla-authoring.ts";

// U2 CLI pin (business-logic-model.md §5, component-methods.md § common rules:
// one JSON line on stdout, exit 0 success / 1 typed failure / 2 usage error).
// Driven in-process so the handler lines stay measurable
// (cid:code-generation:seam-export-handler-amend).

let workspace = "";
let storeRoot = "";
let modelMapPath = "";

const HUMAN_TURN_BLOCK = JSON.stringify({
  schemaVersion: 2,
  timestamp: "2026-08-05T00:00:00Z",
  eventName: "amadeus.human.turn",
  attributes: { Event: "HUMAN_TURN" },
});

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

function declaration(kind: string, subjects: readonly string[]): string {
  return writeJson(`${kind}-${subjects.join("-")}.json`, { subjects, kind, rationale: "fixture" });
}

function approvalFile(overrides: Record<string, unknown> = {}): string {
  return writeJson("approval.json", {
    shard: "clone.jsonl",
    timestamp: "2026-08-05T00:00:00Z",
    eventIdentity: createHash("sha256").update(HUMAN_TURN_BLOCK).digest("hex"),
    ...overrides,
  });
}

/** The model map U4 will later write: each model names the bundle it was registered from. */
function writeModelMap(models: ReadonlyArray<{ name: string; digest?: string }>): void {
  writeFileSync(
    modelMapPath,
    JSON.stringify({
      schemaVersion: 2,
      models: models.map((model) => ({
        name: model.name,
        ...(model.digest === undefined ? {} : { evidenceBundle: { digest: model.digest } }),
      })),
    }),
    "utf8",
  );
}

const IDENTITY_A = `sha256:${"1".repeat(64)}`;
const IDENTITY_B = `sha256:${"2".repeat(64)}`;

async function judged(argv: readonly string[]): Promise<Record<string, unknown>> {
  const { exitCode, body } = await run(argv);
  expect(exitCode).toBe(0);
  return body;
}

async function receiptFor(
  kind: string,
  subjects: readonly string[],
  identity: string,
  approval: string,
  persist = false,
): Promise<Record<string, unknown>> {
  const body = await judged([
    "applicability", "receipt",
    "--declaration", declaration(kind, subjects),
    "--identity", identity,
    "--approval", approval,
    "--model-map", modelMapPath,
    "--store", storeRoot,
    "--audit-dir", workspace,
    "--generated-at", "2026-08-05T00:00:00Z",
    ...(persist ? ["--persist", "true"] : []),
  ]);
  return body.receipt as Record<string, unknown>;
}

async function buildBundle(
  name: string,
  kind: "authoring-bundle" | "terminal-route-receipt",
  applicability: Record<string, unknown>,
  identity: string,
  predecessor: string,
): Promise<string> {
  const filler = { note: "fixture" };
  const parts = writeJson(`parts-${name}.json`, {
    kind,
    parts: kind === "authoring-bundle"
      ? { applicability, trace: filler, proof: filler, review: filler, approval: filler }
      : { applicability, approval: filler },
  });
  const built = await judged([
    "bundle", "build",
    "--parts", parts,
    "--predecessor", predecessor,
    "--identity", identity,
    "--store", storeRoot,
    "--generated-at", "2026-08-05T00:00:00Z",
  ]);
  return built.digest as string;
}

/**
 * The lifecycle prefix every hold demo starts from: FR-001 is authored as a new
 * subject, stored as an authoring bundle, and registered in the model map.
 */
async function registerFr001(identity = IDENTITY_A): Promise<string> {
  const receipt = await receiptFor("new-subject", ["FR-001"], identity, "none");
  const digest = await buildBundle("registration", "authoring-bundle", receipt, identity, "root");
  writeModelMap([{ name: "Fixture", digest }]);
  return digest;
}

async function series(subjects: readonly string[]): Promise<string> {
  const body = await judged(["applicability", "series", "--subjects", subjects.join(",")]);
  return body.series as string;
}

async function hold(identity: string, subjects: readonly string[] = ["FR-001"]): Promise<{
  exitCode: number;
  body: Record<string, unknown>;
}> {
  return await run([
    "hold",
    "--identity", identity,
    "--series", await series(subjects),
    "--store", storeRoot,
    "--model-map", modelMapPath,
  ]);
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "tla-applicability-"));
  storeRoot = join(workspace, "tla-evidence");
  mkdirSync(storeRoot, { recursive: true });
  modelMapPath = join(workspace, "model-map.json");
  writeFileSync(join(workspace, "clone.jsonl"), `${HUMAN_TURN_BLOCK}\n`, "utf8");
  writeModelMap([]);
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("usage errors exit 2", () => {
  test.each([[["applicability"]], [["applicability", "surprise"]]])("rejects %p", async (argv) => {
    const { exitCode, body } = await run(argv as readonly string[]);
    expect(exitCode).toBe(2);
    expect(typeof body.usage).toBe("string");
  });

  test("rejects hold without --series", async () => {
    const { exitCode, body } = await run(["hold", "--identity", IDENTITY_A]);
    expect(exitCode).toBe(2);
    expect(body.error).toContain("--series");
  });
});

describe("applicability judge", () => {
  test("routes a declared semantic change over a registered model to revise-model", async () => {
    await registerFr001();
    const body = await judged([
      "applicability", "judge",
      "--declaration", declaration("semantic-change", ["FR-001"]),
      "--identity", IDENTITY_A,
      "--model-map", modelMapPath,
      "--store", storeRoot,
    ]);
    expect(body.route).toBe("revise-model");
  });

  test("fails closed on a contradicting declaration (exit 1, typed failure)", async () => {
    await registerFr001();
    const { exitCode, body } = await run([
      "applicability", "judge",
      "--declaration", declaration("non-target", ["FR-001"]),
      "--identity", IDENTITY_A,
      "--model-map", modelMapPath,
      "--store", storeRoot,
    ]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("undecidable");
  });

  test("an untraced subject with a new-subject declaration routes to author-new", async () => {
    await registerFr001();
    const body = await judged([
      "applicability", "judge",
      "--declaration", declaration("new-subject", ["FR-900"]),
      "--identity", IDENTITY_A,
      "--model-map", modelMapPath,
      "--store", storeRoot,
    ]);
    expect(body.route).toBe("author-new");
  });

  test("an unreadable model map is missing-evidence, never a route", async () => {
    const { exitCode, body } = await run([
      "applicability", "judge",
      "--declaration", declaration("new-subject", ["FR-900"]),
      "--identity", IDENTITY_A,
      "--model-map", join(workspace, "absent.json"),
      "--store", storeRoot,
    ]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("missing-evidence");
  });

  test("a model map naming an absent bundle is unreadable, not an empty map", async () => {
    writeModelMap([{ name: "Fixture", digest: `sha256:${"9".repeat(64)}` }]);
    const { exitCode, body } = await run([
      "applicability", "judge",
      "--declaration", declaration("new-subject", ["FR-900"]),
      "--identity", IDENTITY_A,
      "--model-map", modelMapPath,
      "--store", storeRoot,
    ]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("missing-evidence");
  });
});

describe("applicability receipt (BR-U2-03/24)", () => {
  test("refuses a terminal route without an approval", async () => {
    await registerFr001();
    const { exitCode, body } = await run([
      "applicability", "receipt",
      "--declaration", declaration("impl-only", ["FR-001"]),
      "--identity", IDENTITY_A,
      "--approval", "none",
      "--persist", "true",
      "--model-map", modelMapPath,
      "--store", storeRoot,
      "--audit-dir", workspace,
    ]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("approval-missing");
  });

  const forged: Array<[string, Record<string, unknown>]> = [
    ["a forged event digest", { eventIdentity: "f".repeat(64) }],
    ["a forged timestamp", { timestamp: "2026-01-01T00:00:00Z" }],
    ["an absent shard", { shard: "other.jsonl" }],
  ];
  test.each(forged)("refuses %s (the falling proof of the provenance check)", async (_label, overrides) => {
    await registerFr001();
    const { exitCode, body } = await run([
      "applicability", "receipt",
      "--declaration", declaration("impl-only", ["FR-001"]),
      "--identity", IDENTITY_A,
      "--approval", approvalFile(overrides),
      "--persist", "true",
      "--model-map", modelMapPath,
      "--store", storeRoot,
      "--audit-dir", workspace,
    ]);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("approval-missing");
  });

  test("accepts an approval grounded in the audit shard", async () => {
    await registerFr001();
    const receipt = await receiptFor("impl-only", ["FR-001"], IDENTITY_A, approvalFile(), true);
    expect(receipt.route).toBe("impl-only");
    expect(receipt.subjectIdentity).toBe(IDENTITY_A);
    expect(String(receipt.reason)).toContain("J4");
    expect(receipt.subjectSeries).toBe(await series(["FR-001"]));
  });
});

describe("hold — the expected demo of Bolt 2", () => {
  test("a subject series with no applicability receipt holds (AC-001)", async () => {
    await registerFr001();
    const { exitCode, body } = await hold(IDENTITY_A, ["AC-004"]);
    expect(exitCode).toBe(1);
    const verdict = body.verdict as { kind: string; reasons: { kind: string }[] };
    expect(verdict.kind).toBe("hold");
    expect(verdict.reasons.map((reason) => reason.kind)).toEqual(["no-applicability-receipt"]);
  });

  test("an authored subject without a registered model holds (AC-002)", async () => {
    const receipt = await receiptFor("new-subject", ["FR-001"], IDENTITY_A, "none");
    await buildBundle("unregistered", "authoring-bundle", receipt, IDENTITY_A, "root");
    const { exitCode, body } = await hold(IDENTITY_A);
    expect(exitCode).toBe(1);
    const verdict = body.verdict as { reasons: { kind: string }[] };
    expect(verdict.reasons.map((reason) => reason.kind)).toEqual(["authoring-incomplete"]);
  });

  test("a current registered authoring bundle releases the hold", async () => {
    await registerFr001();
    const { exitCode, body } = await hold(IDENTITY_A);
    expect(exitCode).toBe(0);
    expect((body.verdict as { kind: string }).kind).toBe("no-hold");
  });

  test("a current terminal receipt releases the hold", async () => {
    const registration = await registerFr001();
    const receipt = await receiptFor("non-target", ["FR-001"], IDENTITY_B, approvalFile(), true);
    await buildBundle("terminal", "terminal-route-receipt", receipt, IDENTITY_B, registration);
    const { exitCode, body } = await hold(IDENTITY_B);
    expect(exitCode).toBe(0);
    expect((body.verdict as { kind: string }).kind).toBe("no-hold");
  });

  test("the same evidence against a changed identity is stale, not a release (AC-006)", async () => {
    await registerFr001();
    const { exitCode, body } = await hold(IDENTITY_B);
    expect(exitCode).toBe(1);
    const verdict = body.verdict as { reasons: { kind: string }[] };
    expect(verdict.reasons.map((reason) => reason.kind)).toEqual(["stale-evidence"]);
  });

  test("a corrupted store fails closed rather than releasing (BR-U2-16)", async () => {
    await registerFr001();
    writeFileSync(join(storeRoot, `${"0".repeat(64)}.json`), "not json", "utf8");
    const { exitCode, body } = await hold(IDENTITY_A);
    expect(exitCode).toBe(1);
    expect((body.failure as { kind: string }).kind).toBe("corrupted-evidence");
  });
});

// #3187: the governed-subjects advisory path is retired outright - no shim and
// no deprecation message, so its verbs are simply unknown to the dispatcher.
describe("the retired governance verbs (#3187)", () => {
  test("the advisory group is rejected as an unknown command", async () => {
    const { exitCode, body } = await run(["advisory", "hold", "--store", storeRoot]);
    expect(exitCode).toBe(2);
    expect(body.error).toBe("unknown command: advisory");
    expect(String(body.usage)).not.toContain("advisory");
  });

  test("the subjects group is rejected as an unknown command", async () => {
    const { exitCode, body } = await run([
      "subjects", "declare",
      "--document", join(workspace, "requirements.md"),
      "--kind", "requirements",
      "--id", "FR-001",
    ]);
    expect(exitCode).toBe(2);
    expect(body.error).toBe("unknown command: subjects");
    expect(String(body.usage)).not.toMatch(/subjects\s+declare/);
  });
});
