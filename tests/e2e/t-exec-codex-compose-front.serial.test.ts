// covers: file:skills/amadeus/SKILL.md
//
// t-exec-codex-compose-front.serial.test.ts - the INTERACTIVE front-compose
// journey on Codex, expressed in the driver's native turn shape plus the one
// capability the older codex tests never used: `codex exec resume --last`
// continues the SAME recorded session (same session id, same rollout file,
// full context), so a gate that ends turn 1 can be answered by a scripted
// turn 2. Spike-proven 2026-07-02 (three-turn echo continuity + a full live
// beats-1-2 amadeus probe); artefacts under
// tmp/adaptive-workflows/spike-codex-resume/.
//
//   beat 1:  codex exec `/amadeus compose "<task>"` - the conductor dispatches
//            the composer, renders the proposal, and ends the turn AT the
//            approve/edit/reject gate as numbered prose (`request_user_input`
//            returns {} in exec mode, so the SKILL.md numbered-prose arm
//            fires). NOTHING is written: no scope data, no state file, no
//            intent record. JOURNEY TOLERANCE: the live codex conductor
//            sometimes drops the leading verb when forwarding (the known
//            conductor-forwarding variance on this harness), landing on the
//            engine's cold-start compose OFFER instead ("reply with
//            compose..."); when that happens the journey answers "compose"
//            in the same session and expects the gate on the next turn.
//            Either way: gate before write, nothing on disk.
//   beat 2:  codex exec resume --last "Approve" - same session (asserted via
//            the stderr session id), the conductor completes the write +
//            birth arc: intent record, amadeus-state.md, WORKFLOW_STARTED
//            audited.
//
// Deliberately JOURNEY-LEVEL: the composed scope's NAME is the model's
// choice, and the sanctioned `.codex/scopes/` write is sandbox-denied under
// plain codex exec (the conductor self-recovers via the scope-mapping env
// seam - spike section 5), so this test pins the observable contract (gate
// stop with no birth; same-session approve -> birth + audit) and leaves
// scope-file placement to the sandbox-grant design.
//
// `--last` filters recorded sessions by cwd, so beat 2 MUST run with the same
// cwd as beat 1 (both use the project dir).
//
// LIVE GATE: disabled on GitHub Actions. Locally, requires
// AMADEUS_CODEX_EXEC_LIVE=1 + a codex >= 0.139.0 binary
// (AMADEUS_CODEX_BIN or PATH) + AMADEUS_CODEX_EXEC_AUTH_HOME pointing to a
// normal Codex auth.json. Skips cleanly otherwise.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  codexExecChildEnvironment,
  codexExecLiveRequirementsSkipReason,
  setupCodexExecProject,
} from "../harness/codex-exec-live.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CODEX_DIST = process.env.AMADEUS_CODEX_DIST ?? join(REPO_ROOT, "dist", "codex");
const CODEX_BIN = process.env.AMADEUS_CODEX_BIN ?? "codex";
const AUTH_HOME = process.env.AMADEUS_CODEX_EXEC_AUTH_HOME;
const OPENAI_MODEL = process.env.AMADEUS_CODEX_EXEC_MODEL ?? "gpt-5.6-sol";

const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "600", 10);
const PER_BEAT_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 600) * 1000;
// Up to three live turns back to back (the approve beat alone ran ~9 min in
// the spike; the offer-recovery arm adds one), so the envelope covers them
// all plus slack.
const TEST_TIMEOUT_MS = PER_BEAT_TIMEOUT_MS * 3 + 30_000;

const SKIP_REASON = codexExecLiveRequirementsSkipReason({
  env: process.env,
  codexBin: CODEX_BIN,
  distributionDir: CODEX_DIST,
});

const PROJECT_SETUP = {
  prefix: "codex-exec-",
  authHome: AUTH_HOME,
  distributionDir: CODEX_DIST,
  repositoryRoot: REPO_ROOT,
  model: OPENAI_MODEL,
  rulesDir: ".codex/amadeus-rules",
};

// One codex turn. `resume: true` continues the newest recorded session for
// this cwd (`codex exec resume --last "<prompt>"`) instead of starting fresh.
// stderr is kept separate: the `session id:` line lives there and is the
// deterministic same-session proof.
function codexTurn(
  proj: string,
  home: string,
  prompt: string,
  opts: { resume?: boolean } = {},
): { rc: number; stdout: string; stderr: string } {
  const argv = opts.resume ? ["exec", "resume", "--last", prompt] : ["exec", prompt];
  const r = spawnSync(CODEX_BIN, argv, {
    cwd: proj,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: codexExecChildEnvironment(home),
    timeout: PER_BEAT_TIMEOUT_MS,
  });
  return { rc: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

const sessionIdOf = (stderr: string): string | undefined =>
  /session id:\s*([0-9a-f-]{36})/i.exec(stderr)?.[1];

function intentRecords(proj: string): string[] {
  const dir = join(proj, "amadeus", "spaces", "default", "intents");
  if (!existsSync(dir)) return [];
  // Dot-dirs are hook plumbing (the Stop hook's .amadeus-hooks-health
  // heartbeat lands here on every turn), not intent records.
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name);
}

function packagedTool(proj: string, tool: string, args: string[]): void {
  const r = spawnSync("bun", [join(proj, ".codex", "tools", tool), ...args], {
    cwd: proj,
    encoding: "utf-8",
  });
  if (r.status !== 0) {
    throw new Error(`${tool} failed: ${r.stderr || r.stdout}`);
  }
}

function seedCompletedIntent(proj: string, label: string): string {
  packagedTool(proj, "amadeus-utility.ts", [
    "intent-birth",
    "--scope",
    "fix",
    "--arguments",
    `${label} fixture`,
    "--label",
    label,
  ]);
  const cursor = join(proj, "amadeus", "spaces", "default", "intents", "active-intent");
  const record = readFileSync(cursor, "utf-8").trim();
  const statePath = join(
    proj,
    "amadeus",
    "spaces",
    "default",
    "intents",
    record,
    "amadeus-state.md",
  );
  const completed = readFileSync(statePath, "utf-8")
    .replace(/- \*\*Completed\*\*: \d+/, "- **Completed**: 7")
    .replace(/- \*\*In Progress\*\*: .*/, "- **In Progress**: none")
    .replace(/- \*\*Current Stage\*\*: .*/, "- **Current Stage**: build-and-test")
    .replace(/- \[[- ?R]\] ([^—]+ — EXECUTE)/g, "- [x] $1");
  writeFileSync(statePath, completed, "utf-8");
  return record;
}

describe("t-exec-codex-compose-front - interactive compose over exec + exec resume", () => {
  test.skipIf(SKIP_REASON !== null)(
    `beat 1 stops at the gate with nothing written; beat 2 resume-approves into birth${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    () => {
      const { proj, home, cleanup } = setupCodexExecProject(PROJECT_SETUP);
      try {
        // Beat 1: the compose front. The turn must END at a human question
        // (the proposal gate, or - conductor-forwarding variance - the
        // engine's cold-start compose offer) with NOTHING written.
        const b1 = codexTurn(
          proj,
          home,
          'Use the $amadeus skill to run: /amadeus compose "add a rate limiter middleware to an existing Express API"',
        );
        expect(b1.rc).toBe(0);
        const b1Session = sessionIdOf(b1.stderr);
        expect(b1Session).toBeDefined();
        expect(intentRecords(proj)).toEqual([]);

        // If the verb was dropped and the engine asked the compose OFFER
        // instead of the proposal gate, answer "compose" in-session; the
        // next turn must land on the gate. Still: nothing written yet.
        let gateOut = b1.stdout;
        if (!/approve/i.test(gateOut)) {
          expect(gateOut).toMatch(/compose/i);
          const offerTurn = codexTurn(proj, home, "compose", { resume: true });
          expect(offerTurn.rc).toBe(0);
          expect(sessionIdOf(offerTurn.stderr)).toBe(b1Session);
          gateOut = offerTurn.stdout;
        }
        // The approve/edit/reject gate reached the final message.
        expect(gateOut).toMatch(/approve/i);
        expect(gateOut).toMatch(/reject/i);
        // Nothing written before approval: no state file, no intent record.
        expect(intentRecords(proj)).toEqual([]);
        expect(
          existsSync(join(proj, "amadeus", "spaces", "default", "intents", "active-intent")),
        ).toBe(false);

        // Beat 2: answer the gate in the SAME session.
        const b2 = codexTurn(proj, home, "Approve", { resume: true });
        expect(b2.rc).toBe(0);
        // Same-session proof: resume continued beat 1's conversation.
        expect(sessionIdOf(b2.stderr)).toBe(b1Session);

        // The approve completed the write + birth arc on disk.
        const records = intentRecords(proj);
        expect(records.length).toBe(1);
        const rec = join(proj, "amadeus", "spaces", "default", "intents", records[0]);
        const state = readFileSync(join(rec, "amadeus-state.md"), "utf-8");
        expect(state).toContain("# AI-DLC State Tracking");
        const auditDir = join(rec, "audit");
        const audit = readdirSync(auditDir)
          .filter((f) => f.endsWith(".md"))
          .map((f) => readFileSync(join(auditDir, f), "utf-8"))
          .join("\n");
        expect(audit).toContain("**Event**: WORKFLOW_STARTED");
      } finally {
        cleanup();
      }
    },
    TEST_TIMEOUT_MS,
  );

  test.skipIf(SKIP_REASON !== null)(
    `a full-width ordinal selects the visible intent instead of reaching report as raw input${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    () => {
      const { proj, home, cleanup } = setupCodexExecProject(PROJECT_SETUP);
      try {
        const firstRecord = seedCompletedIntent(proj, "first-intent");
        seedCompletedIntent(proj, "second-intent");
        const cursor = join(
          proj,
          "amadeus",
          "spaces",
          "default",
          "intents",
          "active-intent",
        );
        rmSync(cursor);

        const b1 = codexTurn(
          proj,
          home,
          'Use the $amadeus skill. Run exactly `bun .codex/tools/amadeus-orchestrate.ts next --scope fix "fix a parser regression"` and follow the returned directive.',
        );
        expect(b1.rc, `${b1.stdout}\n${b1.stderr}`).toBe(0);
        const session = sessionIdOf(b1.stderr);
        expect(session).toBeDefined();
        expect(b1.stdout).toContain("first-intent");
        expect(b1.stdout).toContain("second-intent");
        expect(existsSync(cursor)).toBe(false);

        const b2 = codexTurn(proj, home, "１", { resume: true });
        expect(b2.rc, `${b2.stdout}\n${b2.stderr}`).toBe(0);
        expect(sessionIdOf(b2.stderr)).toBe(session);
        expect(readFileSync(cursor, "utf-8").trim()).toBe(firstRecord);
        expect(`${b2.stdout}\n${b2.stderr}`).not.toContain("report requires --result");
      } finally {
        cleanup();
      }
    },
    TEST_TIMEOUT_MS,
  );
});
