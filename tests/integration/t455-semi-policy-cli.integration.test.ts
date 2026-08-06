// covers: subcommand:amadeus-bolt:set-autonomy, file:packages/framework/core/tools/amadeus-intent-autonomy-production.ts, file:packages/framework/core/tools/amadeus-intent-autonomy.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  applyProductionAutonomyMode,
  commitProductionQuestionDecision,
  readProductionAutonomyProjection,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import {
  autonomyDigest,
  autonomyScopeFingerprint,
  SEMI_POLICY_SCOPE_ID,
  semiPoliciesOf,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";

const BUN = process.execPath;
const SELECTOR = "repair-strategy";
const OPTION = "minimal-fix";
const POLICY_JSON = JSON.stringify([
  { sourceText: "Always take the minimal fix", selector: SELECTOR, optionId: OPTION },
]);

function run(
  projectDir: string,
  tool: string,
  args: string[],
): { readonly status: number; readonly stdout: string; readonly stderr: string } {
  const env = { ...process.env };
  env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
  env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
  const result = spawnSync(BUN, [join(projectDir, ".claude", "tools", tool), ...args, "--project-dir", projectDir], {
    cwd: projectDir,
    encoding: "utf8",
    env,
  });
  return { status: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function recordDir(projectDir: string): string {
  const intents = join(projectDir, "amadeus", "spaces", "default", "intents");
  return join(intents, readFileSync(join(intents, "active-intent"), "utf8").trim());
}

function state(projectDir: string): string {
  return readFileSync(join(recordDir(projectDir), "amadeus-state.md"), "utf8");
}

function appendHumanTurn(projectDir: string): void {
  const auditDir = join(recordDir(projectDir), "audit");
  mkdirSync(auditDir, { recursive: true });
  const path = join(auditDir, "semi-policy-cli-test.jsonl");
  const seq = existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).length + 1 : 1;
  appendFileSync(path, `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "semi-policy-cli-test",
    intentId: "semi-policy-cli-test",
    timestamp: new Date().toISOString(),
    heading: "Human Turn",
    event: "HUMAN_TURN",
    fields: {},
  })}\n`);
}

function policiesFile(projectDir: string): string {
  const path = join(projectDir, "semi-policies.json");
  writeFileSync(path, POLICY_JSON);
  return path;
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

let projectDir = "";
afterEach(() => {
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

describe("semi policy carrier through the CLI", () => {
  test("--mode semi --policies-file lands a policy that settles the question on the confirmed-policy rung", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);

    const applied = run(projectDir, "amadeus-bolt.ts", [
      "set-autonomy",
      "--mode",
      "semi",
      "--policies-file",
      policiesFile(projectDir),
    ]);
    expect(applied.status).toBe(0);

    const projection = readProductionAutonomyProjection(projectDir);
    expect(projection).not.toBeNull();
    if (projection === null) return;
    expect(projection.mode).toBe("semi");
    expect(projection.currentGrant).toBeNull();
    const stored = semiPoliciesOf(projection);
    expect(stored.length).toBe(1);
    expect(stored[0]!.selector).toBe(SELECTOR);
    expect(stored[0]!.scopeFingerprint).toBe(autonomyScopeFingerprint(projection.intentUuid, SEMI_POLICY_SCOPE_ID));

    const decision = commitProductionQuestionDecision({
      projectDir,
      stage: "code-generation",
      phase: "construction",
      graphRevision: `sha256:${"0".repeat(64)}`,
      questionId: "semi-policy-question-1",
      selector: SELECTOR,
      question: "Which repair strategy?",
      optionIds: [OPTION, "broad-refactor"],
      recommendedOptionId: OPTION,
    });
    expect(decision.kind).toBe("decided");
    if (decision.kind !== "decided") return;
    expect(decision.decision.basisKind).toBe("confirmed-policy");
    expect(decision.decision.selectedOptionId).toBe(OPTION);
  });

  test("the extended set-mode command survives the audit replay unchanged", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);

    const written = applyProductionAutonomyMode({
      projectDir,
      stateContent: state(projectDir),
      mode: "semi",
      policies: JSON.parse(POLICY_JSON),
    });
    expect(written.ok).toBe(true);
    if (!written.ok) return;

    // A fresh read rebuilds the projection from the audit shards, so an
    // identical digest is the replay round trip, not a cached object.
    const replayed = readProductionAutonomyProjection(projectDir);
    expect(replayed).not.toBeNull();
    if (replayed === null) return;
    expect(autonomyDigest(replayed)).toBe(autonomyDigest(written.projection));
    expect(semiPoliciesOf(replayed)).toEqual(semiPoliciesOf(written.projection));
    expect(semiPoliciesOf(replayed).length).toBe(1);
  });

  test("--mode none --policies-file is refused out loud instead of dropping the policies", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);

    const refused = run(projectDir, "amadeus-bolt.ts", [
      "set-autonomy",
      "--mode",
      "none",
      "--policies-file",
      policiesFile(projectDir),
    ]);
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toContain("--policies-file is not accepted with --mode none");
  });

  test("--status counts the semi policies even though there is no grant", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);
    expect(run(projectDir, "amadeus-bolt.ts", [
      "set-autonomy",
      "--mode",
      "semi",
      "--policies-file",
      policiesFile(projectDir),
    ]).status).toBe(0);

    const status = run(projectDir, "amadeus-utility.ts", ["status"]);
    expect(status.status).toBe(0);
    expect(status.stdout).toContain("Autonomy:       semi");
    expect(status.stdout).toContain("Grant:          none");
    expect(status.stdout).toContain("Policies:       1");
  });
});
