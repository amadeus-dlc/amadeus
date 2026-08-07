// covers: file:packages/framework/core/tools/amadeus-log.ts, subcommand:amadeus-log:answer
// size: medium
//
// u3-question-route-observability (FR-3, #2378) integration: the
// QUESTION_ANSWERED emit point records a derived Resolution Route attribute
// ("ladder" when --decision-id is passed, "human" otherwise) so ladder and
// direct-human answers are machine-discriminable in the audit shard (FR-3a),
// the after-the-fact bypass predicate detects human answers under semi mode
// with a fixture-rewrite falling proof (FR-3b), and the existing checkpoint
// guards are unchanged by the new flag (BR-U3-3). Success paths drive the
// CANONICAL main() in process (lcov-measured seam per the bolt-main idiom);
// the loud-error path spawns the dist copy to observe the exit code.

import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  findBypassedQuestionAnswers,
  main as logMain,
} from "../../packages/framework/core/tools/amadeus-log.ts";
import {
  auditBlockField,
  findAllEvents,
  readAllAuditShards,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  autonomyDigest,
  createAutonomyProjection,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  createIntentAutonomyCoordinator,
  createMemoryIntentAutonomyRepository,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts";
import { encodeIntentAutonomyTransaction } from "../../packages/framework/core/tools/amadeus-intent-autonomy-replay.ts";
import {
  cleanupTestProject,
  createTestProject,
  seedStateFile,
  seededAuditDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const BUN = process.execPath;
const REPO_ROOT = join(import.meta.dir, "..", "..");
const DIST_TOOL = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-log.ts");

const tempDirs: string[] = [];
let savedGuard: string | undefined;

beforeAll(() => {
  savedGuard = process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
  process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
});

afterAll(() => {
  if (savedGuard === undefined) delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
  else process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = savedGuard;
  for (const d of tempDirs) cleanupTestProject(d);
});

afterEach(() => {
  resetOtelPerProject();
});

function proj(): string {
  const p = createTestProject();
  tempDirs.push(p);
  seedStateFile(p, "state-mid-ideation.md");
  return p;
}

function answerInProcess(p: string, extra: string[] = []): void {
  logMain(["answer", "--stage", "feasibility", "--details", "picked option A", ...extra, "--project-dir", p]);
}

// The shard file the in-process emitter wrote QUESTION_ANSWERED rows into —
// autonomy fixture rows are appended to the SAME file so buffer order equals
// ledger order for the after-the-fact sweep.
function emittedShardPath(p: string): string {
  const dir = seededAuditDir(p);
  const shardName = readdirSync(dir).find((name) =>
    readFileSync(join(dir, name), "utf-8").includes("QUESTION_ANSWERED")
  );
  if (shardName === undefined) throw new Error("no emitted shard found");
  return join(dir, shardName);
}

function answeredField(p: string, key: string, index = 0): string {
  const hits = findAllEvents(readAllAuditShards(p), "QUESTION_ANSWERED");
  const hit = hits[index];
  return hit === undefined ? "" : (auditBlockField(hit.block, key) ?? "");
}

describe("t486 FR-3a: two answer routes are machine-discriminable in the shard", () => {
  test("a direct human answer (no --decision-id) records Resolution Route=human and no Decision Id", () => {
    const p = proj();
    answerInProcess(p);
    expect(answeredField(p, "Resolution Route")).toBe("human");
    expect(answeredField(p, "Decision Id")).toBe("");
  });

  test("a decide-question answer (--decision-id) records Resolution Route=ladder with the id", () => {
    const p = proj();
    answerInProcess(p, ["--decision-id", "auto-decision-0123abcd"]);
    expect(answeredField(p, "Resolution Route")).toBe("ladder");
    expect(answeredField(p, "Decision Id")).toBe("auto-decision-0123abcd");
  });

  test("the two routes are discriminable side by side in one shard", () => {
    const p = proj();
    answerInProcess(p);
    answerInProcess(p, ["--decision-id", "auto-decision-0123abcd"]);
    expect(answeredField(p, "Resolution Route", 0)).toBe("human");
    expect(answeredField(p, "Resolution Route", 1)).toBe("ladder");
  });
});

function spawnAnswer(p: string, extra: string[]): { status: number; out: string } {
  const res = spawnSync(
    BUN,
    [DIST_TOOL, "answer", "--stage", "feasibility", "--details", "picked option A", ...extra, "--project-dir", p],
    { encoding: "utf-8", env: { ...process.env, AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1" } }
  );
  return { status: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

describe("t486 FR-3 malformed --decision-id is the only new refusal", () => {
  test("a malformed decision id exits 1 loudly and emits no QUESTION_ANSWERED", () => {
    const p = proj();
    const r = spawnAnswer(p, ["--decision-id", "not-a-ladder-id"]);
    expect(r.status).toBe(1);
    expect(r.out).toContain("auto-decision-");
    expect(findAllEvents(readAllAuditShards(p), "QUESTION_ANSWERED")).toHaveLength(0);
  });
});

// BR-U3-3 contrast pin: the pre-existing checkpoint guard branches are
// UNCHANGED by the new flag — an open approval gate refuses the answer with
// the same message whether or not --decision-id is passed, and nothing is
// emitted on either path.
describe("t486 BR-U3-3: existing checkpoint guards are route-agnostic", () => {
  function projWithOpenGate(): string {
    const p = proj();
    const statePath = seededStateFile(p);
    const content = readFileSync(statePath, "utf-8");
    writeFileSync(statePath, content.replace("- [-] feasibility", "- [?] feasibility"));
    return p;
  }

  test("open gate refuses a human-route answer (pre-u3 behaviour, unchanged)", () => {
    const p = projWithOpenGate();
    const r = spawnAnswer(p, []);
    expect(r.status).toBe(1);
    expect(r.out).toContain("an approval gate is open");
    expect(findAllEvents(readAllAuditShards(p), "QUESTION_ANSWERED")).toHaveLength(0);
  });

  test("open gate refuses a ladder-route answer with the identical guard message", () => {
    const p = projWithOpenGate();
    const r = spawnAnswer(p, ["--decision-id", "auto-decision-0123abcd"]);
    expect(r.status).toBe(1);
    expect(r.out).toContain("an approval gate is open");
    expect(findAllEvents(readAllAuditShards(p), "QUESTION_ANSWERED")).toHaveLength(0);
  });
});

describe("t486 FR-3b: bypass detection over real shards, with falling proof", () => {
  test("a human answer under semi mode is detected; rewriting its route to ladder detects nothing", () => {
    const p = proj();
    // Answer once BEFORE any autonomy transaction: mode none, never a violation.
    answerInProcess(p);

    // Mint a real semi-mode transaction and append it to the SAME shard file
    // the emitter wrote, so buffer order matches ledger order.
    const intentUuid = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
    const initial = createAutonomyProjection({ intentUuid });
    const repository = createMemoryIntentAutonomyRepository();
    const coordinator = createIntentAutonomyCoordinator({ initialProjection: initial, repository });
    const commanded = coordinator.applyHumanCommand(
      { kind: "set-mode", mode: "semi", policies: [] },
      {
        targetIntentUuid: intentUuid,
        principalId: "principal-1",
        humanTurn: { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "human-turn-1" },
        commandOccurrenceId: "semi-command-1",
        expectedProjectionRevision: initial.projectionRevision,
        confirmedDisplayDigest: autonomyDigest("semi-display"),
      }
    );
    if ("error" in commanded) throw new Error(String(commanded.error));
    const transaction = repository.readTransactions(intentUuid).at(-1);
    if (!transaction) throw new Error("no transaction committed");
    const shard = emittedShardPath(p);
    appendFileSync(
      shard,
      `${JSON.stringify({
        schemaVersion: 1,
        seq: 90,
        cloneId: "t486-clone",
        intentId: "t486-intent",
        timestamp: new Date().toISOString(),
        heading: "Intent Autonomy Transaction Committed",
        event: "INTENT_AUTONOMY_TRANSACTION_COMMITTED",
        fields: { Transaction: encodeIntentAutonomyTransaction(transaction) },
      })}\n`
    );

    // Ladder answer under semi: never a violation.
    answerInProcess(p, ["--decision-id", "auto-decision-0123abcd"]);
    // Direct human answer under semi: THE violation FR-3b must surface.
    answerInProcess(p);

    const hits = findBypassedQuestionAnswers(readAllAuditShards(p));
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ route: "human", autonomyMode: "semi", stage: "feasibility" });

    // Falling proof: rewrite the fixture's violating Route to ladder on disk —
    // the detection count must drop to zero.
    writeFileSync(shard, readFileSync(shard, "utf-8").replaceAll('"Resolution Route":"human"', '"Resolution Route":"ladder"'));
    expect(findBypassedQuestionAnswers(readAllAuditShards(p))).toHaveLength(0);
  });
});
