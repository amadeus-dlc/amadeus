// covers: subcommand:amadeus-bolt:preview-autonomy, subcommand:amadeus-bolt:set-autonomy
// size: medium
//
// grant-ceremony (R-2, ADR-7 Q2): `preview-autonomy` must print a paste-ready
// `set-autonomy --mode full --confirmed-display-digest <digest>` line after
// its existing JSON line, so a human can copy the confirmation command
// straight out of the terminal instead of hand-assembling it from the JSON
// field. The existing JSON structure (AutonomyGrantPreview) must stay
// unchanged — this test pins both facts together, and the paste-ready line
// round-trips into a real set-autonomy grant.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const BUN = process.execPath;

function recordDir(projectDir: string): string {
  const intents = join(projectDir, "amadeus", "spaces", "default", "intents");
  const active = readFileSync(join(intents, "active-intent"), "utf8").trim();
  return join(intents, active);
}

function appendHumanTurn(projectDir: string): void {
  const auditDir = join(recordDir(projectDir), "audit");
  mkdirSync(auditDir, { recursive: true });
  const path = join(auditDir, "grant-ceremony-test.jsonl");
  const seq = existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).length + 1 : 1;
  appendFileSync(path, `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "grant-ceremony-test",
    intentId: "grant-ceremony-test",
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

function run(projectDir: string, args: string[]): { readonly status: number; readonly stdout: string; readonly stderr: string } {
  const env = { ...process.env };
  env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
  env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "0";
  const result = spawnSync(
    BUN,
    [join(projectDir, ".claude", "tools", "amadeus-bolt.ts"), ...args, "--project-dir", projectDir],
    { cwd: projectDir, encoding: "utf8", env },
  );
  return { status: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

let projectDir = "";
afterEach(() => {
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

describe("preview-autonomy prints a paste-ready set-autonomy command (grant-ceremony R-2)", () => {
  test("stdout is the unchanged JSON preview line, then the full-mode confirmation command", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);

    const preview = run(projectDir, ["preview-autonomy"]);
    expect(preview.status).toBe(0);
    expect(preview.stderr).toBe("");

    const lines = preview.stdout.split("\n").filter(Boolean);
    expect(lines.length).toBe(2);

    // Line 1: the existing JSON structure, byte-for-byte unchanged shape.
    const parsed = JSON.parse(lines[0] as string) as {
      intentUuid: string;
      principalId: string;
      displayDigest: string;
    };
    expect(typeof parsed.intentUuid).toBe("string");
    expect(typeof parsed.principalId).toBe("string");
    expect(typeof parsed.displayDigest).toBe("string");

    // Line 2: the paste-ready command, carrying the SAME digest as line 1.
    expect(lines[1]).toBe(
      `bun .claude/tools/amadeus-bolt.ts set-autonomy --mode full --confirmed-display-digest ${parsed.displayDigest}`,
    );

    // The printed command actually works when pasted: split on whitespace and
    // execute it (minus the leading "bun") to prove it is not just cosmetic.
    const commandArgs = (lines[1] as string).split(" ").slice(1); // drop "bun"
    commandArgs[0] = join(projectDir, ".claude", "tools", "amadeus-bolt.ts");
    const applied = spawnSync(BUN, [...commandArgs, "--project-dir", projectDir], {
      cwd: projectDir,
      encoding: "utf8",
      env: { ...process.env, AMADEUS_SKIP_ARTIFACT_GUARD: "1", AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "0" },
    });
    expect(applied.status ?? -1).toBe(0);
    expect(JSON.parse((applied.stdout ?? "").trim())).toMatchObject({
      emitted: "INTENT_AUTONOMY_TRANSACTION_COMMITTED",
      mode: "full",
    });
  });
});
