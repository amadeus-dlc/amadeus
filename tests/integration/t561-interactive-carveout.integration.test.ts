// covers: file:packages/framework/core/hooks/amadeus-stop.ts
// size: medium
//
// t561 — interactive-carveout (U4 / ADR-5 / FR-4 / Q11=A, intent
// 260815-rfc-autonomy-modes). RFC-0001 appendix C D10: `full` was equated with
// "unattended", so the Stop hook killed the question and compose carve-outs on
// the mode alone (amadeus-stop.ts:450 isQuestionCarveoutIntent, :485
// isFullyAutonomousIntent). An interactive `full` run therefore had no mechanism
// to hand a ruling back to the human who was sitting right there.
//
// The two axes replacing the mode test are session interactivity (C3's single
// read port, resolveSessionInteractivity) and the ruling-order terminal (a
// non-unique outcome recorded on the ledger). The other two carve-outs —
// human-wait and conversational — are preserved verbatim, and the last two
// describes here are the no-regression pins that prove it.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  isConversationalStop,
  isHumanWaitStop,
  isPendingComposeStop,
  isPendingQuestionStop,
} from "../../packages/framework/core/hooks/amadeus-stop.ts";
import {
  activeIntent,
  activeSpace,
  auditCloneId,
  auditShardDir,
  auditShardName,
  COMPOSE_MARKER_RELATIVE_PATH,
  isoTimestamp,
  stageDir,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { JOURNAL_SCHEMA_VERSION, serializeJournalEntry } from "../../packages/framework/core/tools/amadeus-journal.ts";
import {
  applyProductionAutonomyMode,
  enterProductionWaiting,
  previewProductionAutonomyGrant,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { RecommendationOutcome } from "../../packages/framework/core/tools/amadeus-recommendation.ts";
import { basisFingerprintOf, type WaitingCause } from "../../packages/framework/core/tools/amadeus-waiting.ts";

const SLUG = "requirements-analysis";
const PHASE = "inception";
const PENDING_QUESTIONS = "# Questions\n\n## Q1\nWhich option?\n[Answer]: ___\n";

let proj = "";

/** A project with a real minted Intent — the autonomy projection and the waiting
 *  ledger both hang off one, so there has to be one. Same birth route as t1241. */
function bornProject(): string {
  const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  const birth = spawnSync(
    process.execPath,
    [join(projectDir, ".claude", "tools", "amadeus-utility.ts"), "intent-birth", "--scope", "feature", "--project-dir", projectDir],
    { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
  );
  expect(birth.status).toBe(0);
  return projectDir;
}

/** State at `[-]` in-progress on SLUG, with the Intent Autonomy Mode line the
 *  case under test needs. `mode: null` omits the line entirely (the shape a
 *  record that never declared a mode carries). */
function seedState(mode: "none" | "semi" | "full" | null, checkbox = "-"): string {
  const modeLine = mode === null ? "" : `- **Intent Autonomy Mode**: ${mode}\n`;
  const content =
    "## Current Status\n- **Workflow**: feature\n- **Scope**: feature\n" +
    `- **Lifecycle Phase**: ${PHASE.toUpperCase()}\n- **Construction Autonomy Mode**: unset\n` +
    `- **Current Stage**: ${SLUG}\n${modeLine}` +
    `\n## Stage Progress\n- [${checkbox}] ${SLUG} — EXECUTE\n`;
  writeFileSync(stateFile(), content, "utf-8");
  return content;
}

function stateFile(): string {
  const space = activeSpace(proj);
  const intent = activeIntent(proj, space);
  if (intent === null) throw new Error("test fixture: no active intent");
  return join(proj, "amadeus", "spaces", space, "intents", intent, "amadeus-state.md");
}

/** Write the stage's `<slug>-questions.md` — the tier-2 positive signal. */
function seedQuestions(body = PENDING_QUESTIONS): void {
  const dir = stageDir(proj, PHASE, SLUG);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${SLUG}-questions.md`), body, "utf-8");
}

/** Make the session interactive: plant a real HUMAN_TURN in THIS clone's own
 *  shard, the exact file resolveSessionInteractivity reads. The seq continues
 *  the shard the Intent birth already wrote — the journal health probe rejects a
 *  sequence regression, and a rejected probe latches the process. */
function plantHumanTurn(): void {
  const shardDir = auditShardDir(proj);
  if (shardDir === null) throw new Error("test fixture: no intent resolved");
  mkdirSync(shardDir, { recursive: true });
  const shardPath = join(shardDir, auditShardName(proj));
  let existing = "";
  try {
    existing = readFileSync(shardPath, "utf-8");
  } catch {
    existing = "";
  }
  const line = serializeJournalEntry({
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    seq: nextSeq(existing),
    cloneId: auditCloneId(proj),
    intentId: activeIntent(proj, activeSpace(proj)) ?? "workspace",
    timestamp: isoTimestamp(),
    heading: "Human Turn",
    event: "HUMAN_TURN",
    fields: {},
  });
  writeFileSync(shardPath, `${existing}${line}`, "utf-8");
}

function nextSeq(shardText: string): number {
  let max = 0;
  for (const line of shardText.split("\n")) {
    const parsed = /"seq":\s*(\d+)/.exec(line);
    if (parsed !== null) max = Math.max(max, Number(parsed[1]));
  }
  return max + 1;
}

/** Declare `full` with an active grant through the one human-command write path. */
function grantFull(): void {
  const stateContent = readFileSync(stateFile(), "utf-8");
  const preview = previewProductionAutonomyGrant({ projectDir: proj, stateContent });
  if (!preview.ok) throw new Error(preview.error);
  const applied = applyProductionAutonomyMode({
    projectDir: proj,
    stateContent,
    mode: "full",
    confirmedDisplayDigest: preview.preview.displayDigest,
  });
  if (!applied.ok) throw new Error(applied.error);
}

/** Record a ruling-order-3 terminal on the ledger: a contested outcome the run
 *  stopped at. This is the durable envelope the bound carve-out reads. */
function recordContestedRuling(): void {
  const cause: WaitingCause = {
    occurrenceId: `question-${SLUG}`,
    outcome: RecommendationOutcome.contested(
      [
        { optionId: "narrow", rationale: "the norm points here", rank: 1 },
        { optionId: "broaden", rationale: "the prior ruling points here", rank: 2 },
      ],
      "the norm and the prior ruling point at different options",
    ),
    derivationTranscript: "norm: ambiguous -> past-rulings: conflict -> election: unavailable",
    basisFingerprint: basisFingerprintOf({ norm: "v1", rulings: ["a", "b"] }),
    interactivityBasis: { interactive: false, source: "human-turn-pipeline", measuredAt: "2026-08-15T10:00:00.000Z" },
  };
  const entered = enterProductionWaiting(proj, cause);
  if ("error" in entered) throw new Error(entered.error);
}

/** Compose deps whose marker is genuinely on disk and fresh. `interactive`
 *  drives the injected interactivity port (the seam domain-entities.md puts on
 *  PendingComposeStopDeps). */
function composeDeps(interactive: boolean | "throws") {
  const markerPath = join(proj, COMPOSE_MARKER_RELATIVE_PATH);
  return {
    projectDir: proj,
    nowMs: () => statSync(markerPath).mtimeMs,
    stat: (p: string) => {
      try {
        return { mtimeMs: statSync(p).mtimeMs };
      } catch {
        return undefined;
      }
    },
    unlink: () => {
      throw new Error("a fresh marker must not be swept");
    },
    diagnostic: () => {
      throw new Error("a fresh marker must not raise a janitor diagnostic");
    },
    interactivity: () => {
      if (interactive === "throws") throw new Error("EACCES");
      return { interactive, source: "human-turn-pipeline" as const };
    },
  };
}

function seedComposeMarker(): void {
  writeFileSync(join(proj, COMPOSE_MARKER_RELATIVE_PATH), "", "utf-8");
}

/** A claude transcript whose ending turn answers the human with text only — the
 *  tier-3 conversational shape. */
function seedTranscript(): string {
  const path = join(proj, "transcript.jsonl");
  const human = JSON.stringify({ type: "user", message: { role: "user", content: "What does this stage do?" } });
  const assistant = JSON.stringify({
    type: "assistant",
    message: { role: "assistant", content: [{ type: "text", text: "It analyses the requirements." }] },
  });
  writeFileSync(path, `${human}\n${assistant}\n`, "utf-8");
  return path;
}

beforeEach(() => {
  resetOtelPerProject();
  proj = bornProject();
});

afterEach(() => {
  cleanupTestProject(proj);
  proj = "";
});

// FP-1 / FP-2 in the FD's falling-proof table.
describe("t561 R-4/R-5 — an interactive run reaches its own ruling", () => {
  test("full + active grant + a recorded non-unique terminal returns the turn (FP-1)", () => {
    seedState("full");
    seedQuestions();
    plantHumanTurn();
    grantFull();
    recordContestedRuling();
    expect(isPendingQuestionStop(readFileSync(stateFile(), "utf-8"), proj)).toBe(true);
  });

  test("full + active grant + a fresh compose marker returns the turn (FP-2)", () => {
    seedState("full");
    plantHumanTurn();
    grantFull();
    seedComposeMarker();
    expect(isPendingComposeStop(composeDeps(true))).toBe(true);
  });
});

// FP-4: removing the mode refusal WITHOUT binding the terminal makes `full`
// return the turn on the unanswered tag alone.
describe("t561 R-6 — a unique terminal does not fire the carve-out", () => {
  test("full + active grant + an unanswered tag but NO recorded ruling stays blocked", () => {
    seedState("full");
    seedQuestions();
    plantHumanTurn();
    grantFull();
    expect(isPendingQuestionStop(readFileSync(stateFile(), "utf-8"), proj)).toBe(false);
  });
});

// FP-3: the one narrowing ADR-5 authorises, and its compensation path.
describe("t561 R-8 — a non-interactive session never fires the bound carve-outs", () => {
  test("no HUMAN_TURN: an unanswered tag does NOT release the stop", () => {
    seedState(null);
    seedQuestions();
    expect(isPendingQuestionStop(readFileSync(stateFile(), "utf-8"), proj)).toBe(false);
  });

  test("the SAME record with a HUMAN_TURN does release it (mode none keeps positive-signal-only, R-7)", () => {
    seedState(null);
    seedQuestions();
    plantHumanTurn();
    expect(isPendingQuestionStop(readFileSync(stateFile(), "utf-8"), proj)).toBe(true);
  });

  test("mode none with an ANSWERED tag stays blocked even when interactive", () => {
    seedState("none");
    seedQuestions("# Questions\n\n## Q1\nWhich option?\n[Answer]: the narrow one\n");
    plantHumanTurn();
    expect(isPendingQuestionStop(readFileSync(stateFile(), "utf-8"), proj)).toBe(false);
  });

  test("no HUMAN_TURN: a fresh compose marker does NOT release the stop", () => {
    seedState(null);
    seedComposeMarker();
    expect(isPendingComposeStop(composeDeps(false))).toBe(false);
  });
});

// FP-5: an interactivity judgment that cannot be made is not a licence to ask.
describe("t561 R-2 — interactivity failures fall closed to non-interactive", () => {
  test("a throwing interactivity port keeps the compose carve-out shut", () => {
    seedState(null);
    seedComposeMarker();
    expect(isPendingComposeStop(composeDeps("throws"))).toBe(false);
  });

  test("an unreadable audit shard keeps the question carve-out shut", () => {
    const stateContent = seedState(null);
    seedQuestions();
    // The question is genuinely pending, so the walk reaches the interactivity
    // read; only the evidence is unreadable. A directory at the shard path
    // makes the port's read fail (EISDIR) rather than find nothing, and the
    // port's fail-closed answer keeps the carve-out shut.
    const shardDir = auditShardDir(proj);
    if (shardDir === null) throw new Error("test fixture: no intent resolved");
    const shardPath = join(shardDir, auditShardName(proj));
    rmSync(shardPath, { force: true });
    mkdirSync(shardPath, { recursive: true });
    expect(isPendingQuestionStop(stateContent, proj)).toBe(false);
  });
});

// Pin 6: the preserved human-wait carve-out. isHumanWaitStop takes state and
// nothing else, so mode and session interactivity are structurally unable to
// reach it — the arity assertion is what pins that, and the truth table pins the
// behaviour it must keep.
describe("t561 R-11 — human-wait is unchanged", () => {
  test("takes no projectDir argument, so it reads neither interactivity nor the projection", () => {
    expect(isHumanWaitStop.length).toBe(1);
  });

  test("[?] and [R] allow, [-] does not — for every mode, in either session", () => {
    for (const mode of ["full", "semi", "none", null] as const) {
      const modeLine = mode === null ? "" : `- **Intent Autonomy Mode**: ${mode}\n`;
      const stateOf = (marker: string) =>
        `- **Current Stage**: ${SLUG}\n${modeLine}- [${marker}] ${SLUG} — EXECUTE\n`;
      expect(isHumanWaitStop(stateOf("?"))).toBe(true);
      expect(isHumanWaitStop(stateOf("R"))).toBe(true);
      expect(isHumanWaitStop(stateOf("-"))).toBe(false);
    }
  });

  test("a non-interactive full record still allows its [?] stop end to end", () => {
    seedState("full", "?");
    plantHumanTurn();
    grantFull();
    // The grant is real and active; the carve-out ignores it, which is the
    // point — a full run parked on an external human gate must not be nudged.
    expect(isHumanWaitStop(readFileSync(stateFile(), "utf-8"))).toBe(true);
  });
});

// Pin 7: the preserved conversational carve-out keeps its full-only guard.
describe("t561 R-12 — conversational keeps its current semantics", () => {
  test("semi and none release a chat turn; full + active grant does not", () => {
    seedState(null);
    const transcript = seedTranscript();
    expect(isConversationalStop("- **Intent Autonomy Mode**: semi\n", transcript, "claude", proj)).toBe(true);
    expect(isConversationalStop("- **Intent Autonomy Mode**: none\n", transcript, "claude", proj)).toBe(true);

    seedState("full");
    plantHumanTurn();
    grantFull();
    expect(isConversationalStop(readFileSync(stateFile(), "utf-8"), transcript, "claude", proj)).toBe(false);
  });

  test("semi answers the same in a non-interactive and an interactive session", () => {
    const transcript = seedTranscript();
    const semiState = "- **Intent Autonomy Mode**: semi\n";
    expect(isConversationalStop(semiState, transcript, "claude", proj)).toBe(true);
    plantHumanTurn();
    expect(isConversationalStop(semiState, transcript, "claude", proj)).toBe(true);
  });
});
