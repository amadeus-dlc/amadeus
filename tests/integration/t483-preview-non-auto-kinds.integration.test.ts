// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-production.ts(previewProductionAutonomyGrant), subcommand:amadeus-bolt:preview-autonomy
// size: medium
//
// FR-2b (u1-autonomy-core): `preview-autonomy` must say which interaction kinds
// the previewed mode will NOT decide on its own, so a human reads the boundary
// off the preview instead of inferring it. The CLI prints the preview as one
// JSON line, so the assertions below parse that line verbatim rather than the
// in-process return value alone.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  applyProductionAutonomyMode,
  previewProductionAutonomyGrant,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";

const BUN = process.execPath;

function recordDir(projectDir: string): string {
  const intents = join(projectDir, "amadeus", "spaces", "default", "intents");
  const active = readFileSync(join(intents, "active-intent"), "utf8").trim();
  return join(intents, active);
}

function state(projectDir: string): string {
  return readFileSync(join(recordDir(projectDir), "amadeus-state.md"), "utf8");
}

function appendHumanTurn(projectDir: string): void {
  const auditDir = join(recordDir(projectDir), "audit");
  mkdirSync(auditDir, { recursive: true });
  const path = join(auditDir, "preview-non-auto-kinds-test.jsonl");
  const seq = existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).length + 1 : 1;
  appendFileSync(path, `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "preview-non-auto-kinds-test",
    intentId: "preview-non-auto-kinds-test",
    timestamp: new Date().toISOString(),
    heading: "Human Turn",
    event: "HUMAN_TURN",
    fields: {},
  })}\n`);
}

function bornProject(): string {
  const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  const result = spawnSync(
    BUN,
    [
      join(projectDir, ".claude", "tools", "amadeus-utility.ts"),
      "intent-birth",
      "--scope",
      "feature",
      "--project-dir",
      projectDir,
    ],
    { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
  );
  expect(result.status ?? -1).toBe(0);
  return projectDir;
}

// The CLI half: run the real subcommand and read the JSON line it prints.
// preview-autonomy prints two lines (grant-ceremony R-2): the JSON preview,
// then a paste-ready `set-autonomy` confirmation command — only the first is
// JSON.
function previewViaCli(projectDir: string): Record<string, unknown> {
  const result = spawnSync(
    BUN,
    [join(projectDir, ".claude", "tools", "amadeus-bolt.ts"), "preview-autonomy", "--project-dir", projectDir],
    { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
  );
  expect(result.stderr ?? "").toBe("");
  expect(result.status ?? -1).toBe(0);
  const lines = (result.stdout ?? "").split("\n").filter(Boolean);
  expect(lines.length).toBe(2);
  return JSON.parse(lines[0] as string) as Record<string, unknown>;
}

let projectDir = "";
afterEach(() => {
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

describe("preview-autonomy enumerates the kinds a mode will not decide (FR-2b)", () => {
  test("a semi Intent's preview names phase-gate and walking-skeleton", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);
    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent: state(projectDir),
      mode: "semi",
    })).toMatchObject({ ok: true, projection: { mode: "semi" } });

    expect(previewViaCli(projectDir).nonAutoDecidedKinds).toEqual(["phase-gate", "walking-skeleton"]);
  });

  test("a full Intent's preview leaves nothing to the human", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);
    const preview = previewProductionAutonomyGrant({ projectDir, stateContent: state(projectDir) });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent: state(projectDir),
      mode: "full",
      confirmedDisplayDigest: preview.preview.displayDigest,
    })).toMatchObject({ ok: true, projection: { mode: "full" } });

    expect(previewViaCli(projectDir).nonAutoDecidedKinds).toEqual([]);
  });

  test("an undeclared Intent's preview leaves every kind to the human", () => {
    projectDir = bornProject();
    expect(previewViaCli(projectDir).nonAutoDecidedKinds).toEqual([
      "stage-gate",
      "phase-gate",
      "walking-skeleton",
      "question",
    ]);
  });
});
