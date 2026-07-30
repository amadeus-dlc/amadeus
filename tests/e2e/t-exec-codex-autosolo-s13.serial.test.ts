// covers: file:dist/codex/.codex/amadeus-common/protocols/stage-protocol.md
//
// t-exec-codex-autosolo-s13.serial.test.ts — the LIVE probe for issue #1735:
// a conductor that never opens the election SKILL still reaches the auto-solo
// election, because the trigger is baked into the harness-neutral stage
// protocol §13 that every stage loads.
//
// t369 pins the TEXT across canonical, dist, and self-install. It cannot show
// that the text actually changes conductor behaviour. This test does: it drives
// the SHIPPED dist/codex tree through one `codex exec` turn that is told only
// "finish this stage per the protocol", and checks the election store on disk
// afterwards. Nothing in the prompt names an election, a trigger, or the
// auto-solo config — if the hook were only in the SKILL, the turn would end at
// a question to the user and the store would stay empty.
//
// EVIDENCE. `amadeus/spaces/default/elections/elections.json` is written only by
// a real `open`; the disabled envelope writes nothing. Its presence, plus the
// `--trigger auto-solo` invocation in the transcript, is the execution proof.
//
// LIVE GATE: disabled on GitHub Actions. Locally, requires
// AMADEUS_CODEX_EXEC_LIVE=1 + a codex >= 0.139.0 binary (AMADEUS_CODEX_BIN or
// PATH) + AMADEUS_CODEX_EXEC_AUTH_HOME pointing to a normal Codex auth.json.
// Skips cleanly otherwise.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  codexExecChildEnvironment,
  codexExecLiveRequirementsSkipReason,
  setupCodexExecProject,
} from "../harness/codex-exec-live.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CODEX_DIST = join(REPO_ROOT, "dist", "codex");
const CODEX_BIN = process.env.AMADEUS_CODEX_BIN ?? "codex";
const AUTH_HOME = process.env.AMADEUS_CODEX_EXEC_AUTH_HOME;
const OPENAI_MODEL = process.env.AMADEUS_CODEX_EXEC_MODEL ?? "gpt-5.6-sol";

const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "600", 10);
const TEST_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 600) * 1000;

const STAGE_SLUG = "functional-design";
const RECORD_DIR = join("amadeus", "spaces", "default", "intents", "s13-probe-0000abcd");
const DIARY_DIR = join(RECORD_DIR, "construction", STAGE_SLUG);
const PAYLOAD_NAME = "s13-payload.json";
const ELECTIONS_DIR = join("amadeus", "spaces", "default", "elections");

const SKIP_REASON = codexExecLiveRequirementsSkipReason({
  env: process.env,
  codexBin: CODEX_BIN,
  distributionDir: CODEX_DIST,
});

const PROJECT_SETUP = {
  prefix: "codex-autosolo-s13-",
  authHome: AUTH_HOME,
  distributionDir: CODEX_DIST,
  repositoryRoot: REPO_ROOT,
  model: OPENAI_MODEL,
  prepareProject: (proj: string): void => {
    mkdirSync(join(proj, DIARY_DIR), { recursive: true });
    mkdirSync(join(proj, ELECTIONS_DIR), { recursive: true });

    // Solo auto-election is opt-in; this is the layered config the §13 hook reads.
    writeFileSync(
      join(proj, "amadeus", "config.json"),
      `${JSON.stringify({ "auto-solo-election": true }, null, 2)}\n`,
      "utf-8",
    );

    // One candidate for the ritual to surface — a Deviation entry in the diary.
    writeFileSync(
      join(proj, DIARY_DIR, "memory.md"),
      [
        "# Stage memory",
        "",
        "## Interpretations",
        "",
        "## Deviations",
        "",
        "- 2026-07-30T00:00:00Z — Kept the port interface in the domain module;" +
          " splitting it would have broken the adapter's import path.",
        "",
        "## Tradeoffs",
        "",
        "## Open questions",
        "",
      ].join("\n"),
      "utf-8",
    );

    // A ready-made payload so the turn is not spent authoring a store schema.
    // Deliberately named and described without election vocabulary: what is
    // under test is whether the protocol routes the selection to an election at
    // all, not whether the model can compose the store's JSON.
    writeFileSync(
      join(proj, PAYLOAD_NAME),
      `${JSON.stringify(
        {
          electionId: "E-S13-PROBE",
          kind: "zero-confirm",
          question: "この学習候補を採用してよいか",
          choices: [{ internalNo: 1, label: "採用" }],
          voters: ["subagent-1", "subagent-2"],
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );
  },
};

const PROMPT = [
  `You are the AI-DLC conductor and you have just finished the ${STAGE_SLUG} stage`,
  `of this project, working solo. Its diary is at ${join(DIARY_DIR, "memory.md")}.`,
  "Run the learnings ritual that .codex/amadeus-common/protocols/stage-protocol.md",
  "section 13 mandates, following that section exactly and to the letter.",
  `If any step needs a prepared JSON payload as a --file argument, use ./${PAYLOAD_NAME}.`,
  "Do not ask me anything and do not stop to wait for me: carry out every command",
  "the section names, then report in one line which commands you ran.",
].join(" ");

function execCodex(proj: string, home: string, prompt: string): { rc: number; out: string } {
  const r = spawnSync(CODEX_BIN, ["exec", prompt], {
    cwd: proj,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: codexExecChildEnvironment(home),
    timeout: TEST_TIMEOUT_MS,
  });
  return { rc: r.status ?? -1, out: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
}

describe("t-exec-codex-autosolo-s13 — §13 reaches the auto-solo election without the SKILL (#1735)", () => {
  test.skipIf(SKIP_REASON !== null)(
    `a protocol-only §13 run opens the election with --trigger auto-solo${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    () => {
      const { proj, home, cleanup } = setupCodexExecProject(PROJECT_SETUP);
      try {
        const r = execCodex(proj, home, PROMPT);
        expect(r.rc).toBe(0);
        // The transcript shows the invocation; the store shows it took effect.
        expect(r.out).toContain("--trigger auto-solo");
        expect(existsSync(join(proj, ELECTIONS_DIR, "elections.json"))).toBe(true);
        // The disabled envelope writes nothing — seeing it would mean the hook
        // fired but the config layer was not read.
        expect(r.out).not.toContain("auto-solo-election-disabled");
      } finally {
        cleanup();
      }
    },
    TEST_TIMEOUT_MS,
  );
});
