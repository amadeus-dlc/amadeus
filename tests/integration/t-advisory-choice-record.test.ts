// covers: subcommand:amadeus-advisory-choice:record
// size: medium
//
// t-advisory-choice-record — Issue #2232.
//
// The original acceptance route for an advisory choice was a prompt matcher: a
// trusted hook read the human's message and accepted it only when the whole
// message was verbatim `1` / `2` / an option label. Everything else — a
// multi-line answer, an AskUserQuestion selection the hook never classified as
// a human turn, a detour between the presentation and the answer — dropped the
// choice silently, and the human was asked the same question again. One human
// entered the same choice five times.
//
// `record` is the deterministic route. The conductor takes the AskUserQuestion
// answer and names the instance and the choice directly; the tool binds the
// receipt to the latest real HUMAN_TURN in the audit trail. Every acceptance
// condition that protects provenance is kept (grounded turn, shard match, no
// double-spend of one turn, an actual recorded presentation); the ONE condition
// that is dropped is the adjacency requirement, because adjacency is exactly
// what a detour breaks and it protects nothing that the other four do not.
//
// The prompt route is untouched and its tests still pass — `record` is an
// additional door, not a replacement.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  advisoryChoicePresentationFields,
  createPendingAdvisory,
  guardAdvisoryChoices,
  recordAdvisoryChoiceDecision,
  choiceFromExactPrompt,
  recordAdvisoryChoice,
  type AdvisoryChoiceStore,
  type PendingAdvisory,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import {
  auditFilePath,
  auditShardName,
  docsRoot,
  findAllEvents,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seedStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";

// #2253 replaced the prompt-classifying acceptance entry point with one that
// takes an already-classified choice and a provenance union. These tests were
// written against the prompt shape, and what they pin — which prompts count and
// which provenance is refused — is unchanged, so they keep exercising the same
// route through the same two steps the hook now performs.
function recordAdvisoryChoiceViaPrompt(
  projectDir: string,
  prompt: string,
  humanTurn: { timestamp: string; shard: string; eventIdentity: string },
  now?: string,
): boolean {
  const choice = choiceFromExactPrompt(prompt);
  if (choice === null) return false;
  // True only when a receipt was WRITTEN, which is what this boolean has always
  // meant; an already-settled replay stays false here (#2967 FR-ADV-4).
  const outcome = now === undefined
    ? recordAdvisoryChoice(projectDir, choice, { kind: "human-turn", ...humanTurn })
    : recordAdvisoryChoice(projectDir, choice, { kind: "human-turn", ...humanTurn }, now);
  return outcome.kind === "recorded";
}


const identity = {
  plugin: "conformance-fixture",
  code: "changed" as const,
  checkpoint: "requirements-analysis",
  target: "conformance-fixture:fixture-change",
  specIdentity: "sha256:abc",
  intentRun: "019fc698-ba1f-7467-b6b6-57c4b5b50140",
  message: "advisory: conformance-fixture FIXTURE CHANGED",
};

const advisory: Advisory = {
  plugin: identity.plugin,
  code: identity.code,
  message: identity.message,
  stage: identity.checkpoint,
  target: identity.target,
  specIdentity: identity.specIdentity,
};

function readStore(projectDir: string): AdvisoryChoiceStore {
  return JSON.parse(
    readFileSync(join(docsRoot(projectDir), ".amadeus-advisory-choice.json"), "utf-8"),
  ) as AdvisoryChoiceStore;
}

function seedPendingProject(): { projectDir: string; pending: PendingAdvisory } {
  const projectDir = createTestProject();
  seedStateFile(projectDir, join(FIXTURES_DIR, "state-mid-inception.md"));
  expect(guardAdvisoryChoices(projectDir, identity.checkpoint, [advisory]).kind).toBe("hold");
  return { projectDir, pending: readStore(projectDir).pending[0]! };
}

function plantHumanTurn(projectDir: string): { timestamp: string; shard: string; eventIdentity: string } {
  const planted = plantV1AuditRow("HUMAN_TURN", {}, projectDir);
  const event = findAllEvents(readFileSync(auditFilePath(projectDir), "utf-8"), "HUMAN_TURN").at(-1)!;
  return {
    timestamp: planted.timestamp,
    shard: auditShardName(projectDir),
    eventIdentity: createHash("sha256").update(event.block).digest("hex"),
  };
}

function plantPresentation(projectDir: string, pending: PendingAdvisory): void {
  const fields = advisoryChoicePresentationFields(
    projectDir,
    pending.identity.checkpoint,
    [pending.identity.advisoryInstance],
  );
  if (!fields.ok) throw new Error(fields.reason);
  plantV1AuditRow("DECISION_RECORDED", fields.value, projectDir);
}

const projects: string[] = [];
function track<T extends { projectDir: string }>(value: T): T {
  projects.push(value.projectDir);
  return value;
}
afterEach(() => {
  resetOtelPerProject();
  for (const dir of projects.splice(0)) cleanupTestProject(dir);
});

describe("advisory choice record: acceptance", () => {
  test("records the choice and binds it to the latest human turn", () => {
    const { projectDir, pending } = track(seedPendingProject());
    plantPresentation(projectDir, pending);
    const turn = plantHumanTurn(projectDir);

    const result = recordAdvisoryChoiceDecision(
      projectDir,
      pending.identity.advisoryInstance,
      "defer-with-risk",
      "2026-08-05T00:00:00.000Z",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.idempotent).toBe(false);
    const receipts = readStore(projectDir).receipts;
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      schema: 2,
      identity: pending.identity,
      choice: "defer-with-risk",
      provenance: { kind: "human-turn", ...turn },
      recordedAt: "2026-08-05T00:00:00.000Z",
    });
  });

  test("a detour between the presentation and the answer does not break acceptance", () => {
    const { projectDir, pending } = track(seedPendingProject());
    plantPresentation(projectDir, pending);
    // The human asked something else first, the conductor answered, and only
    // then came back to the advisory. Under the prompt route the presentation
    // has expired by now; under `record` it has not.
    plantHumanTurn(projectDir);
    plantV1AuditRow("QUESTION_ANSWERED", { Stage: identity.checkpoint }, projectDir);
    plantV1AuditRow("DECISION_RECORDED", { Stage: "unrelated", Decision: "something else" }, projectDir);
    const turn = plantHumanTurn(projectDir);

    const result = recordAdvisoryChoiceDecision(
      projectDir,
      pending.identity.advisoryInstance,
      "run-now",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(readStore(projectDir).receipts[0]).toMatchObject({
      choice: "run-now",
      provenance: { kind: "human-turn", ...turn },
    });
  });

  test("the prompt route still works and is not disturbed by the new one", () => {
    const { projectDir, pending } = track(seedPendingProject());
    plantPresentation(projectDir, pending);
    expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", plantHumanTurn(projectDir))).toBe(true);
    expect(readStore(projectDir).receipts[0]).toMatchObject({
      identity: pending.identity,
      choice: "run-now",
    });
  });
});

describe("advisory choice record: idempotence (#2143 plan D-1)", () => {
  test("recording the same choice twice returns the saved receipt without appending", () => {
    const { projectDir, pending } = track(seedPendingProject());
    plantPresentation(projectDir, pending);
    plantHumanTurn(projectDir);
    const instance = pending.identity.advisoryInstance;

    const first = recordAdvisoryChoiceDecision(projectDir, instance, "defer-with-risk");
    const second = recordAdvisoryChoiceDecision(projectDir, instance, "defer-with-risk");

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.value.idempotent).toBe(false);
    expect(second.value.idempotent).toBe(true);
    expect(second.value.receipt).toEqual(first.value.receipt);
    expect(readStore(projectDir).receipts).toHaveLength(1);
  });

  test("a second record with a different choice is a conflict, not a silent overwrite", () => {
    const { projectDir, pending } = track(seedPendingProject());
    plantPresentation(projectDir, pending);
    plantHumanTurn(projectDir);
    const instance = pending.identity.advisoryInstance;
    expect(recordAdvisoryChoiceDecision(projectDir, instance, "defer-with-risk").ok).toBe(true);

    const conflicting = recordAdvisoryChoiceDecision(projectDir, instance, "run-now");

    expect(conflicting.ok).toBe(false);
    if (conflicting.ok) return;
    expect(conflicting.reason).toContain("different choice");
    expect(readStore(projectDir).receipts).toHaveLength(1);
    expect(readStore(projectDir).receipts[0]?.choice).toBe("defer-with-risk");
  });
});

describe("advisory choice record: fail-closed refusals (#2232 FR-5d)", () => {
  test("presentation fields reject missing and duplicate advisory instances", () => {
    const { projectDir, pending } = track(seedPendingProject());

    expect(advisoryChoicePresentationFields(projectDir, "", [])).toMatchObject({ ok: false });
    expect(advisoryChoicePresentationFields(
      projectDir,
      pending.identity.checkpoint,
      [pending.identity.advisoryInstance, pending.identity.advisoryInstance],
    )).toMatchObject({ ok: false });
  });

  test("an empty advisory instance is refused before any store read", () => {
    const { projectDir } = track(seedPendingProject());
    const result = recordAdvisoryChoiceDecision(projectDir, "", "run-now");
    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.reason).toContain("advisory instance is required");
  });

  test("a missing audit trail refuses with the no-human-turn reason", () => {
    const { projectDir, pending } = track(seedPendingProject());
    // No presentation, no human turn — and no audit file at all: the
    // latest-human-turn read must fall to its catch arm and refuse, never
    // synthesize a turn.
    rmSync(auditFilePath(projectDir), { force: true });
    const result = recordAdvisoryChoiceDecision(
      projectDir,
      pending.identity.advisoryInstance,
      "run-now",
    );
    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.reason).toContain("no real human turn");
  });

  test("an unknown choice is refused by name", () => {
    const { projectDir, pending } = track(seedPendingProject());
    plantPresentation(projectDir, pending);
    plantHumanTurn(projectDir);
    const result = recordAdvisoryChoiceDecision(
      projectDir,
      pending.identity.advisoryInstance,
      "approve",
    );
    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.reason).toContain("unknown choice");
  });

  test("an advisory instance with no open pending is refused", () => {
    const { projectDir, pending } = track(seedPendingProject());
    plantPresentation(projectDir, pending);
    plantHumanTurn(projectDir);
    const result = recordAdvisoryChoiceDecision(projectDir, "no-such-instance", "run-now");
    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.reason).toContain("open advisory instance not found");
  });

  test("no human turn in the audit trail refuses rather than inventing provenance", () => {
    const { projectDir, pending } = track(seedPendingProject());
    plantPresentation(projectDir, pending);
    const result = recordAdvisoryChoiceDecision(
      projectDir,
      pending.identity.advisoryInstance,
      "run-now",
    );
    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.reason).toContain("human turn");
  });

  test("a choice with no recorded presentation is refused", () => {
    const { projectDir, pending } = track(seedPendingProject());
    plantHumanTurn(projectDir);
    const result = recordAdvisoryChoiceDecision(
      projectDir,
      pending.identity.advisoryInstance,
      "run-now",
    );
    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.reason).toContain("presentation");
  });

  test("one human turn cannot be spent on two advisory instances", () => {
    const projectDir = createTestProject();
    projects.push(projectDir);
    seedStateFile(projectDir, join(FIXTURES_DIR, "state-mid-inception.md"));
    const second: Advisory = { ...advisory, plugin: "other-check", code: "never-run" };
    expect(guardAdvisoryChoices(projectDir, identity.checkpoint, [advisory, second]).kind).toBe("hold");
    const [first, other] = readStore(projectDir).pending as [PendingAdvisory, PendingAdvisory];
    plantPresentation(projectDir, first);
    plantPresentation(projectDir, other);
    plantHumanTurn(projectDir);

    expect(recordAdvisoryChoiceDecision(projectDir, first.identity.advisoryInstance, "run-now").ok)
      .toBe(true);
    const reused = recordAdvisoryChoiceDecision(projectDir, other.identity.advisoryInstance, "run-now");

    expect(reused).toMatchObject({ ok: false });
    if (reused.ok) return;
    expect(reused.reason).toContain("already consumed");

    // A fresh human turn is what unblocks the second instance — the human said
    // it again, so it is accepted again.
    plantHumanTurn(projectDir);
    expect(recordAdvisoryChoiceDecision(projectDir, other.identity.advisoryInstance, "run-now").ok)
      .toBe(true);
  });
});

describe("advisory choice record: CLI surface (#2232 FR-5a)", () => {
  const TOOL = join(
    import.meta.dir,
    "..",
    "..",
    "packages",
    "framework",
    "core",
    "tools",
    "amadeus-advisory-choice.ts",
  );

  function cli(projectDir: string, args: string[]): { status: number; stdout: string; stderr: string } {
    const result = spawnSync(process.execPath, [TOOL, ...args, "--project-dir", projectDir], {
      encoding: "utf8",
      env: { ...process.env },
    });
    return {
      status: result.status ?? -1,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }

  test("a successful record prints one line of JSON and exits 0", () => {
    const { projectDir, pending } = track(seedPendingProject());
    plantPresentation(projectDir, pending);
    plantHumanTurn(projectDir);

    const result = cli(projectDir, [
      "record",
      "--advisory-instance",
      pending.identity.advisoryInstance,
      "--choice",
      "defer-with-risk",
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout.trimEnd().split("\n")).toHaveLength(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      recorded: true,
      idempotent: false,
      advisory_instance: pending.identity.advisoryInstance,
      choice: "defer-with-risk",
    });
  });

  test("a refusal names its reason on stderr and exits 1", () => {
    const { projectDir, pending } = track(seedPendingProject());
    plantPresentation(projectDir, pending);

    const result = cli(projectDir, [
      "record",
      "--advisory-instance",
      pending.identity.advisoryInstance,
      "--choice",
      "run-now",
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("human turn");
  });

  test("missing flags are refused with the record usage line", () => {
    const { projectDir } = track(seedPendingProject());
    const result = cli(projectDir, ["record", "--choice", "run-now"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--advisory-instance");
  });

  test("the pre-existing correct-misattributed subcommand still routes", () => {
    const { projectDir, pending } = track(seedPendingProject());
    const result = cli(projectDir, [
      "correct-misattributed",
      "--advisory-instance",
      pending.identity.advisoryInstance,
      "--human-turn",
      "0".repeat(64),
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("matching latest receipt not found");
  });
});

// The pending advisory identity factory is deterministic per input; this keeps
// the fixture honest if the identity shape ever changes shape underneath.
test("the fixture's pending advisory matches the shared identity factory", () => {
  const built = createPendingAdvisory(identity, () => "019fc698-ba1f-7000-8000-000000000001");
  expect(Object.keys(built.identity).sort()).toEqual(
    ["advisoryInstance", "checkpoint", "code", "intentRun", "plugin", "specIdentity", "target"],
  );
});
