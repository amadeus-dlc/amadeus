// covers: subcommand:amadeus-state:session-takeover, function:handleSessionTakeover,
//         function:planSessionTakeover, function:authorizeMainConductor
// size: medium
//
// t453 — the MANUAL recovery layer (FR-4). When SessionStart cannot be re-fired
// (an unwired hook, a session that must not be restarted, a workflow left
// running in another worktree), the takeover verb is the only in-band way out
// of a denial: every mutating verb — `unpark` included — sits behind the same
// guard, so without it a denied session has no path back (RE 260805 §所見A).
//
// The verb is deliberately NOT a lock pick. Each of its six contracts is pinned
// below: (a) human confirmation, non-replayable; (b) recovery from each carrier
// denial reason; (c) a retained subagent role must be named, never seized;
// (d) an audit row derived from the achieved result; (e) `--project-dir`
// targeting; (f) the workflow verbs pass afterwards.
//
// Mechanism: the shipped state CLI is spawned (so argv, exit code and stdout are
// the real contract surface), the carrier is read back through the real guard
// in-process, and the human turn is minted by the real UserPromptSubmit hook —
// never hand-written into the ledger.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  CURRENT_SESSION_RELATIVE_PATH,
  authorizeMainConductor,
  KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH,
  KIMI_SESSION_ENDED_DENY_RELATIVE_PATH,
  KIMI_SUBAGENT_DENY_RELATIVE_PATH,
} from "../../packages/framework/core/tools/amadeus-caller-authorization.ts";
import { runAdapter } from "../../packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts";
import { readAllAuditShards } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  AMADEUS_SRC,
  createTestProject,
  REPO_ROOT,
  seededRecordDir,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const ENGINE = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-orchestrate.ts",
);
const STATE = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-state.ts",
);
const MINT = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-mint-presence.ts",
);
const SESSION_START = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-session-start.ts",
);
const GRAPH = join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
const MAIN_SESSION = "main-session";

const roots: string[] = [];
let previousHarnessType: string | undefined;

beforeEach(() => {
  resetOtelPerProject();
  previousHarnessType = process.env.AMADEUS_HARNESS_TYPE;
  process.env.AMADEUS_HARNESS_TYPE = "kimi";
});

afterEach(() => {
  if (previousHarnessType === undefined) {
    delete process.env.AMADEUS_HARNESS_TYPE;
  } else {
    process.env.AMADEUS_HARNESS_TYPE = previousHarnessType;
  }
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function environment(): Record<string, string | undefined> {
  return {
    ...process.env,
    AMADEUS_HARNESS_DIR: ".kimi-code",
    AMADEUS_HARNESS_TYPE: "kimi",
    AMADEUS_STAGE_GRAPH: GRAPH,
    AMADEUS_SKIP_ARTIFACT_GUARD: "1",
  };
}

function runTool(
  root: string,
  tool: string,
  args: string[],
  options: { cwd?: string; stdin?: string } = {},
) {
  const child = Bun.spawnSync(
    [process.execPath, tool, ...args, "--project-dir", root],
    {
      cwd: options.cwd ?? root,
      ...(options.stdin === undefined
        ? {}
        : { stdin: Buffer.from(options.stdin, "utf-8") }),
      stdout: "pipe",
      stderr: "pipe",
      env: environment(),
    },
  );
  return {
    code: child.exitCode,
    stdout: child.stdout.toString(),
    stderr: child.stderr.toString(),
  };
}

function alignSeededRegistry(root: string): void {
  const registryPath = join(
    root,
    "amadeus",
    "spaces",
    "default",
    "intents",
    "intents.json",
  );
  const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
  registry[0].dirName = seededRecordDir(root).split("/").at(-1);
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
}

function freshWorkflow(): string {
  const root = createTestProject();
  roots.push(root);
  seedStateFile(root, "state-mid-inception.md");
  alignSeededRegistry(root);
  mkdirSync(join(root, ".kimi-code", "tools"), { recursive: true });
  const payload = JSON.stringify({
    hook_event_name: "SessionStart",
    source: "startup",
    session_id: MAIN_SESSION,
    cwd: root,
  });
  runAdapter("session-start", payload, root, () => ({ stdout: "", code: 0 }));
  const child = Bun.spawnSync([process.execPath, SESSION_START], {
    cwd: root,
    stdin: Buffer.from(payload, "utf-8"),
    stdout: "pipe",
    stderr: "pipe",
    env: environment(),
  });
  if (child.exitCode !== 0) {
    throw new Error(child.stderr.toString() || child.stdout.toString());
  }
  return root;
}

/** A real human prompt turn, minted by the hook that owns HUMAN_TURN. */
function mintHumanTurn(root: string, prompt = "take over this workflow"): void {
  const minted = runTool(root, MINT, [], {
    stdin: JSON.stringify({
      hook_event_name: "UserPromptSubmit",
      session_id: MAIN_SESSION,
      prompt,
    }),
  });
  expect(minted.code).toBe(0);
}

function writeCarrierFile(root: string, relative: string, body: string): void {
  writeFileSync(join(root, relative), body, "utf-8");
}

// Every break reason is handled explicitly and an unknown one throws: a
// fall-through default would let a typo in a `test.each` table silently run the
// deny-latch case while claiming to cover another reason.
function breakCarrier(root: string, reason: string): void {
  switch (reason) {
    case "marker-absent":
      rmSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), { force: true });
      return;
    case "session-mismatch":
      writeCarrierFile(
        root,
        CURRENT_SESSION_RELATIVE_PATH,
        "claude-code-session\n",
      );
      return;
    case "deny-latch":
      writeCarrierFile(
        root,
        KIMI_SESSION_ENDED_DENY_RELATIVE_PATH,
        "session-ended\n",
      );
      writeCarrierFile(
        root,
        KIMI_SUBAGENT_DENY_RELATIVE_PATH,
        "session-ended\n",
      );
      return;
    default:
      throw new Error(`breakCarrier: unknown denial reason "${reason}"`);
  }
}

function retainRole(root: string, role: string): void {
  writeCarrierFile(
    root,
    KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH,
    `${
      JSON.stringify({
        version: 1,
        mainSessionId: MAIN_SESSION,
        roles: { [role]: 1 },
      })
    }\n`,
  );
}

function takeover(root: string, args: string[] = [], cwd?: string) {
  return runTool(root, STATE, ["session-takeover", ...args], {
    ...(cwd === undefined ? {} : { cwd }),
  });
}

describe("session-takeover requires human confirmation (FR-4a)", () => {
  test("refuses without --confirm and leaves the carrier and audit untouched", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    breakCarrier(root, "marker-absent");
    const stateBefore = readFileSync(seededStateFile(root), "utf-8");

    const refused = takeover(root);
    expect(refused.code).not.toBe(0);
    expect(refused.stdout || refused.stderr).toContain("--confirm");
    expect(authorizeMainConductor(root).kind).toBe("denied");
    // A refusal records the failed attempt (the ordinary ERROR_LOGGED row every
    // tool writes) but must never record a recovery: nothing was recovered.
    expect(readAllAuditShards(root)).not.toContain("RECOVERY_COMPLETED");
    expect(readFileSync(seededStateFile(root), "utf-8")).toBe(stateBefore);
  });

  test("refuses when no human turn grounds the request", () => {
    const root = freshWorkflow();
    breakCarrier(root, "marker-absent");

    const refused = takeover(root, ["--confirm"]);
    expect(refused.code).not.toBe(0);
    expect(refused.stdout || refused.stderr).toContain("HUMAN_TURN");
    expect(authorizeMainConductor(root).kind).toBe("denied");
    expect(readAllAuditShards(root)).not.toContain("RECOVERY_COMPLETED");
  });

  test("one human turn cannot authorize a second takeover", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    breakCarrier(root, "marker-absent");
    expect(takeover(root, ["--confirm"]).code).toBe(0);

    breakCarrier(root, "marker-absent");
    const replayed = takeover(root, ["--confirm"]);
    expect(replayed.code).not.toBe(0);
    expect(replayed.stdout || replayed.stderr).toContain("HUMAN_TURN");
    expect(authorizeMainConductor(root).kind).toBe("denied");

    mintHumanTurn(root, "yes, take it over again");
    expect(takeover(root, ["--confirm"]).code).toBe(0);
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });
});

describe("session-takeover rebinds every carrier denial reason (FR-4b)", () => {
  test.each(["marker-absent", "session-mismatch", "deny-latch"])(
    "recovers from %s",
    (reason) => {
      const root = freshWorkflow();
      mintHumanTurn(root);
      breakCarrier(root, reason);
      expect(authorizeMainConductor(root).kind).toBe("denied");

      const result = takeover(root, ["--confirm"]);
      expect(result.code).toBe(0);
      expect(JSON.parse(result.stdout).taken_over).toBe(true);
      expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
    },
  );

  test("an already-authorized session is a no-op, not a rebind", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    const auditBefore = readAllAuditShards(root);

    const result = takeover(root, ["--confirm"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).taken_over).toBe(false);
    expect(readAllAuditShards(root)).toBe(auditBefore);
  });
});

describe("session-takeover never seizes a retained role (FR-4c)", () => {
  test("refuses and names the retained role when it is not acknowledged", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    retainRole(root, "amadeus-architecture-reviewer-agent");

    const refused = takeover(root, ["--confirm"]);
    expect(refused.code).not.toBe(0);
    const output = refused.stdout || refused.stderr;
    expect(output).toContain("amadeus-architecture-reviewer-agent");
    expect(output).toContain("--confirm-roles");
    expect(authorizeMainConductor(root).kind).toBe("denied");
  });

  test("rejects a --confirm-roles list that does not match the retained roles", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    retainRole(root, "amadeus-architecture-reviewer-agent");

    const refused = takeover(root, [
      "--confirm",
      "--confirm-roles",
      "amadeus-product-lead-agent",
    ]);
    expect(refused.code).not.toBe(0);
    expect(authorizeMainConductor(root).kind).toBe("denied");
  });

  test("rebinds once the retained role is acknowledged verbatim", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    retainRole(root, "amadeus-architecture-reviewer-agent");

    const result = takeover(root, [
      "--confirm",
      "--confirm-roles",
      "amadeus-architecture-reviewer-agent",
    ]);
    expect(result.code).toBe(0);
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });
});

describe("session-takeover records what it achieved (FR-4d)", () => {
  test("appends a recovery row carrying the denial reason it repaired", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    breakCarrier(root, "session-mismatch");

    expect(takeover(root, ["--confirm"]).code).toBe(0);
    const audit = readAllAuditShards(root);
    expect(audit).toContain("RECOVERY_COMPLETED");
    expect(audit).toContain("session-takeover");
    expect(audit).toContain("session-mismatch");
  });
});

describe("session-takeover binds the session the operator names (FR-4e)", () => {
  test("--session-id is written to the carrier and authorizes this caller", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    breakCarrier(root, "marker-absent");

    const result = takeover(root, [
      "--confirm",
      "--session-id",
      "operator-chosen-session",
    ]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).session_id).toBe("operator-chosen-session");
    expect(
      JSON.parse(
        readFileSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), "utf-8"),
      ).mainSessionId,
    ).toBe("operator-chosen-session");
    expect(
      readFileSync(join(root, CURRENT_SESSION_RELATIVE_PATH), "utf-8").trim(),
    ).toBe("operator-chosen-session");
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });

  // A value-less flag used to be dropped on the floor, so the verb rebound the
  // HOST-stamped session while reporting exit 0 — a different session than the
  // operator named, reported as success.
  test("a --session-id with no value is refused, not silently dropped", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    breakCarrier(root, "marker-absent");

    const refused = takeover(root, ["--confirm", "--session-id"]);
    expect(refused.code).not.toBe(0);
    expect(refused.stdout || refused.stderr).toContain("--session-id");
    expect(authorizeMainConductor(root).kind).toBe("denied");
  });
});

describe("session-takeover targets a record tree (FR-4e)", () => {
  test("repairs the carrier named by --project-dir from an unrelated cwd", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    breakCarrier(root, "marker-absent");

    const result = takeover(root, ["--confirm"], tmpdir());
    expect(result.code).toBe(0);
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });
});

describe("session-takeover reopens the workflow verbs (FR-4f)", () => {
  test("next, park and unpark all pass after a takeover", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    breakCarrier(root, "deny-latch");
    expect(runTool(root, ENGINE, ["park"]).stdout).toContain(
      "is not the main conductor",
    );

    expect(takeover(root, ["--confirm"]).code).toBe(0);

    const next = runTool(root, ENGINE, ["next"]);
    expect(next.stdout).not.toContain("is not the main conductor");
    expect(JSON.parse(next.stdout).kind).toBe("run-stage");

    const parked = runTool(root, ENGINE, ["park"]);
    expect(JSON.parse(parked.stdout).kind).toBe("parked");

    const unparked = runTool(root, STATE, ["unpark"]);
    expect(unparked.code).toBe(0);
    expect(unparked.stdout || unparked.stderr).not.toContain(
      "is not the main conductor",
    );
  });
});
