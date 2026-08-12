// covers: subcommand:amadeus-state:approve
// size: medium
//
// t-autonomy-phase-boundary-artifact — Issue #2143 FR-4.
//
// #2211 gave the workflow an autonomy `full` grant that auto-approves gates,
// including phase boundaries. The phase-check state guard predates it and knows
// nothing about autonomy: it refuses a boundary completion unless
// `<record>/verification/phase-check-<phase>.md` already exists. Nothing in the
// stage protocol told the conductor that the auto-approve route still has to
// write that artifact FIRST, so an auto-approved boundary would fail closed on
// a grant that was perfectly valid.
//
// These tests pin the intersection on the real production path: a live `full`
// Intent grant, the human-presence guard ACTIVE (so authorization genuinely
// comes from the grant and not from a test carve-out), and the artifact guard
// ACTIVE (so the phase-check gate is real). The grant authorizes; the artifact
// gate still fires; writing the artifact first is what makes the auto-approve
// land. The guard itself is unchanged (#2143 C-1) — what changed is the
// protocol text that tells the conductor the order.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const BUN = process.execPath;

// The suite-wide artifact-guard bypass MUST stay off here: it is the same
// off-switch the phase-check gate honours, so leaving it on would make every
// assertion below vacuous.
function run(
  projectDir: string,
  tool: string,
  args: string[],
  { humanPresenceGuard = true }: { humanPresenceGuard?: boolean } = {},
): { readonly status: number; readonly output: string } {
  const env = { ...process.env };
  delete env.AMADEUS_SKIP_ARTIFACT_GUARD;
  env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = humanPresenceGuard ? "0" : "1";
  const result = spawnSync(
    BUN,
    [join(projectDir, ".claude", "tools", tool), ...args, "--project-dir", projectDir],
    { cwd: projectDir, encoding: "utf8", env },
  );
  return { status: result.status ?? -1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function recordDir(projectDir: string): string {
  const intents = join(projectDir, "amadeus", "spaces", "default", "intents");
  return join(intents, readFileSync(join(intents, "active-intent"), "utf8").trim());
}

function statePath(projectDir: string): string {
  return join(recordDir(projectDir), "amadeus-state.md");
}

function appendHumanTurn(projectDir: string): void {
  const auditDir = join(recordDir(projectDir), "audit");
  mkdirSync(auditDir, { recursive: true });
  const path = join(auditDir, "autonomy-boundary-test.jsonl");
  const seq = existsSync(path)
    ? readFileSync(path, "utf8").split("\n").filter(Boolean).length + 1
    : 1;
  appendFileSync(path, `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "autonomy-boundary-test",
    intentId: "autonomy-boundary-test",
    timestamp: new Date().toISOString(),
    heading: "Human Turn",
    event: "HUMAN_TURN",
    fields: {},
  })}\n`);
}

function bornProjectWithFullAutonomy(): string {
  const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  const birth = run(projectDir, "amadeus-utility.ts", [
    "intent-birth",
    "--scope",
    "feature",
  ], { humanPresenceGuard: false });
  if (birth.status !== 0) throw new Error(birth.output);

  const preview = run(projectDir, "amadeus-bolt.ts", ["preview-autonomy"], {
    humanPresenceGuard: false,
  });
  if (preview.status !== 0) throw new Error(preview.output);
  const digest = (JSON.parse(preview.output.trim()) as { displayDigest: string }).displayDigest;
  appendHumanTurn(projectDir);
  const selected = run(projectDir, "amadeus-bolt.ts", [
    "set-autonomy",
    "--mode",
    "full",
    "--confirmed-display-digest",
    digest,
  ]);
  if (selected.status !== 0) throw new Error(selected.output);
  expect(readFileSync(statePath(projectDir), "utf8")).toContain("- **Intent Autonomy Mode**: full");
  return projectDir;
}

// Park the workflow on the last in-scope Ideation stage with its gate open, so
// the next approve is an Ideation→Inception boundary crossing.
const IDEATION_STAGES = [
  "intent-capture",
  "market-research",
  "feasibility",
  "scope-definition",
  "team-formation",
  "rough-mockups",
];

function parkAtIdeationBoundary(projectDir: string): void {
  const path = statePath(projectDir);
  let content = readFileSync(path, "utf8");
  for (const slug of IDEATION_STAGES) {
    content = content.replace(new RegExp(`^- \\[[^x\\]]\\] ${slug} `, "m"), `- [x] ${slug} `);
  }
  content = content.replace(/^- \[[^?\]]\] approval-handoff /m, "- [?] approval-handoff ");
  content = content.replace(/^- \*\*Current Stage\*\*: .*$/m, "- **Current Stage**: approval-handoff");
  content = content.replace(/^- \*\*Next Stage\*\*: .*$/m, "- **Next Stage**: reverse-engineering");
  content = content.replace(/^- \*\*Completed\*\*: .*$/m, "- **Completed**: 9");
  writeFileSync(path, content);

  const producesDir = join(recordDir(projectDir), "ideation", "approval-handoff");
  mkdirSync(producesDir, { recursive: true });
  writeFileSync(join(producesDir, "initiative-brief.md"), "# initiative brief\n");
  writeFileSync(join(producesDir, "decision-log.md"), "# decision log\n");
  writeFileSync(join(producesDir, "approval-handoff-questions.md"), "# approval handoff questions\n");
}

function writePhaseCheck(projectDir: string, phase: string): void {
  const dir = join(recordDir(projectDir), "verification");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `phase-check-${phase}.md`), `# phase-check ${phase}\n`);
}

let projectDir = "";
afterEach(() => {
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

describe("autonomy full × phase boundary: the phase-check artifact is not waived (#2143 FR-4)", () => {
  test("an auto-approved boundary is refused when the phase-check artifact is absent", () => {
    projectDir = bornProjectWithFullAutonomy();
    parkAtIdeationBoundary(projectDir);
    const before = readFileSync(statePath(projectDir), "utf8");

    // No HUMAN_TURN since the grant was issued: authorization here can only come
    // from the Intent grant, which is exactly the auto-approve route.
    const approved = run(projectDir, "amadeus-state.ts", ["approve", "approval-handoff"]);

    expect(approved.status).not.toBe(0);
    expect(approved.output).toContain("phase-check-ideation.md");
    expect(readFileSync(statePath(projectDir), "utf8")).toBe(before);
  });

  test("the same auto-approve lands once the artifact is written first", () => {
    projectDir = bornProjectWithFullAutonomy();
    parkAtIdeationBoundary(projectDir);
    writePhaseCheck(projectDir, "ideation");

    const approved = run(projectDir, "amadeus-state.ts", ["approve", "approval-handoff"]);

    if (approved.status !== 0) throw new Error(approved.output);
    const after = readFileSync(statePath(projectDir), "utf8");
    expect(after).toContain("- **Ideation**: Verified");
    expect(after).toContain("- [x] approval-handoff");
  });
});
