import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTlaAuthoring } from "../../plugins/formal-model-check/tools/tla-authoring.ts";

// FR-4 + D3 (#2766): `applicability receipt` judged a terminal route and printed
// the receipt, but nothing wrote it to the evidence store, so FR-005 had no
// owner and a non-target judgement could never release the authoring hold.
// `--persist true` gives the judge's own CLI flow that owner. The stage keeps
// refusing terminal routes (t450) — the receipt is issued outside it.

let workspace = "";
let storeRoot = "";
let modelMapPath = "";
let requirementsPath = "";
let approvalPath = "";

const HUMAN_TURN_BLOCK = JSON.stringify({
  schemaVersion: 2,
  timestamp: "2026-08-10T00:00:00Z",
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

async function governedIdentity(): Promise<string> {
  const { exitCode, body } = await run([
    "identity", "extract",
    "--doc", requirementsPath,
    "--doc-kind", "requirements",
  ]);
  expect(exitCode).toBe(0);
  return body.aggregateDigest as string;
}

function receiptArgv(kind: string, identity: string, approval: string, persist: readonly string[]): string[] {
  return [
    "applicability", "receipt",
    "--declaration", writeJson(`${kind}.json`, { subjects: ["FR-1"], kind, rationale: "fixture" }),
    "--identity", identity,
    "--approval", approval,
    "--model-map", modelMapPath,
    "--store", storeRoot,
    "--audit-dir", workspace,
    "--generated-at", "2026-08-10T00:00:00Z",
    ...persist,
  ];
}

async function holdArgv(identity: string): Promise<string[]> {
  const { exitCode, body } = await run(["applicability", "series", "--subjects", "FR-1"]);
  expect(exitCode).toBe(0);
  return [
    "hold",
    "--identity", identity,
    "--series", body.series as string,
    "--store", storeRoot,
    "--model-map", modelMapPath,
  ];
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "terminal-receipt-"));
  storeRoot = join(workspace, "tla-evidence");
  modelMapPath = join(workspace, "model-map.json");
  requirementsPath = join(workspace, "requirements.md");
  mkdirSync(storeRoot, { recursive: true });
  writeFileSync(requirementsPath, "### FR-1\ngoverned body\n", "utf8");
  writeFileSync(modelMapPath, JSON.stringify({ schemaVersion: 2, models: [] }), "utf8");
  writeFileSync(join(workspace, "clone.jsonl"), `${HUMAN_TURN_BLOCK}\n`, "utf8");
  approvalPath = writeJson("approval.json", {
    shard: "clone.jsonl",
    timestamp: "2026-08-10T00:00:00Z",
    eventIdentity: createHash("sha256").update(HUMAN_TURN_BLOCK).digest("hex"),
  });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("t527 terminal route receipt persistence", () => {
  test("a persisted non-target receipt releases the authoring hold", async () => {
    const identity = await governedIdentity();
    const held = await run(await holdArgv(identity));
    expect(held.exitCode).toBe(1);
    expect((held.body.verdict as { kind: string }).kind).toBe("hold");

    const persisted = await run(receiptArgv("non-target", identity, approvalPath, ["--persist", "true"]));
    expect(persisted.exitCode).toBe(0);
    const digest = persisted.body.digest as string;
    expect(digest).toMatch(/^sha256:[0-9a-f]{64}$/);

    const read = await run(["bundle", "read", "--ref", digest, "--store", storeRoot]);
    expect(read.exitCode).toBe(0);
    expect((read.body.evidence as { kind: string }).kind).toBe("terminal-route-receipt");

    const released = await run(await holdArgv(identity));
    expect(released.exitCode).toBe(0);
    expect(released.body.verdict).toEqual({ kind: "no-hold", basis: { digest } });
  });

  test("without --persist a terminal route is rejected before a receipt can be lost", async () => {
    const identity = await governedIdentity();
    const refused = await run(receiptArgv("non-target", identity, approvalPath, []));
    expect(refused.exitCode).toBe(1);
    expect(refused.body.failure).toEqual({ kind: "terminal-route-receipt-required", route: "non-target" });
    const listed = await run(["bundle", "list", "--store", storeRoot]);
    expect(listed.body.refs).toEqual([]);
  });

  test("a non-terminal route refuses to persist rather than storing the wrong kind", async () => {
    const identity = await governedIdentity();
    const refused = await run(receiptArgv("new-subject", identity, "none", ["--persist", "true"]));
    expect(refused.exitCode).toBe(1);
    expect((refused.body.failure as { kind: string }).kind).toBe("not-a-terminal-route");
    const listed = await run(["bundle", "list", "--store", storeRoot]);
    expect(listed.body.refs).toEqual([]);
  });

  test("a terminal route with no verified approval persists nothing", async () => {
    const identity = await governedIdentity();
    const refused = await run(receiptArgv("non-target", identity, "none", ["--persist", "true"]));
    expect(refused.exitCode).toBe(1);
    expect((refused.body.failure as { kind: string }).kind).toBe("approval-missing");
    const listed = await run(["bundle", "list", "--store", storeRoot]);
    expect(listed.body.refs).toEqual([]);
  });

  test("--persist only accepts the explicit true value the flag grammar allows", async () => {
    const identity = await governedIdentity();
    const refused = await run(receiptArgv("non-target", identity, approvalPath, ["--persist", "yes"]));
    expect(refused.exitCode).toBe(2);
    const listed = await run(["bundle", "list", "--store", storeRoot]);
    expect(listed.body.refs).toEqual([]);
  });
});
