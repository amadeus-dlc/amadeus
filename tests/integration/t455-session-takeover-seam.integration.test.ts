// covers: function:readSessionTakeoverFacts, function:applySessionTakeover,
//         function:handleSessionTakeover, function:parseActiveSubagents
// size: medium
//
// t455 — the takeover verb driven IN-PROCESS. t453 pins the same contracts at
// the spawned argv boundary, which is where the operator meets them; this file
// drives the three seams directly so the carrier read, the carrier write and
// the handler's own refusal/no-op/rebind arms are exercised by the parent
// process (spawned execution is not attributed to the parent LCOV report).
//
// Real filesystem, so: integration layer. The only spawn here is SETUP — the
// Kimi SessionStart baseline that mints the carrier this file then reads.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  authorizeMainConductor,
  KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH,
  KIMI_SESSION_ENDED_DENY_RELATIVE_PATH,
  KIMI_SUBAGENT_DENY_RELATIVE_PATH,
} from "../../packages/framework/core/tools/amadeus-caller-authorization.ts";
import {
  applySessionTakeover,
  CURRENT_SESSION_RELATIVE_PATH,
  readSessionTakeoverFacts,
} from "../../packages/framework/core/tools/amadeus-session-takeover.ts";
import {
  enforceCallerAuthorization,
  handleSessionTakeover,
} from "../../packages/framework/core/tools/amadeus-state.ts";
import { readAllAuditShards } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { runAdapter } from "../../packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts";
import {
  AMADEUS_SRC,
  createTestProject,
  REPO_ROOT,
  seededAuditShard,
  seededRecordDir,
  seedStateFile,
} from "../harness/fixtures.ts";

const SESSION_START = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-session-start.ts",
);
const MINT = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-mint-presence.ts",
);
const GRAPH = join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
const MAIN_SESSION = "main-session";

const roots: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function setEnv(key: string, value: string): void {
  if (!(key in savedEnv)) savedEnv[key] = process.env[key];
  process.env[key] = value;
}

beforeEach(() => {
  resetOtelPerProject();
  setEnv("AMADEUS_HARNESS_TYPE", "kimi");
  setEnv("AMADEUS_HARNESS_DIR", ".kimi-code");
  setEnv("AMADEUS_STAGE_GRAPH", GRAPH);
  setEnv("AMADEUS_SKIP_ARTIFACT_GUARD", "1");
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    delete savedEnv[key];
  }
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

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

/** A workspace whose Kimi carrier names this process as the main conductor. */
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
    env: { ...process.env },
  });
  if (child.exitCode !== 0) {
    throw new Error(child.stderr.toString() || child.stdout.toString());
  }
  setEnv("CLAUDE_PROJECT_DIR", root);
  return root;
}

/** A real human prompt turn, minted by the hook that owns HUMAN_TURN. */
function mintHumanTurn(root: string, prompt = "take over this workflow"): void {
  const child = Bun.spawnSync(
    [process.execPath, MINT, "--project-dir", root],
    {
      cwd: root,
      stdin: Buffer.from(
        JSON.stringify({
          hook_event_name: "UserPromptSubmit",
          session_id: MAIN_SESSION,
          prompt,
        }),
        "utf-8",
      ),
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env },
    },
  );
  expect(child.exitCode).toBe(0);
}

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

/** Run a handler that may `process.exit`, capturing its streams. */
function capture(fn: () => void): {
  exited: boolean;
  code: number;
  output: string;
} {
  let output = "";
  let code = 0;
  let exited = false;
  const originalExit = process.exit.bind(process);
  const originalLog = console.log;
  const originalError = console.error;
  const originalStderr = process.stderr.write.bind(process.stderr);
  process.exit = ((value?: number) => {
    throw new ExitSignal(value ?? 0);
  }) as typeof process.exit;
  console.log = (...parts: unknown[]) => {
    output += `${parts.join(" ")}\n`;
  };
  console.error = (...parts: unknown[]) => {
    output += `${parts.join(" ")}\n`;
  };
  process.stderr.write = ((chunk: unknown) => {
    output += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  try {
    fn();
  } catch (err) {
    if (!(err instanceof ExitSignal)) throw err;
    exited = true;
    code = err.code;
  } finally {
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalError;
    process.stderr.write = originalStderr;
  }
  return { exited, code, output };
}

function writeCarrier(root: string, relative: string, body: string): void {
  writeFileSync(join(root, relative), body, "utf-8");
}

function retainRole(root: string, role: string): void {
  writeCarrier(
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

describe("readSessionTakeoverFacts reads the carrier the guard reads", () => {
  test("reports no denial and no roles for a healthy carrier", () => {
    const root = freshWorkflow();
    expect(readSessionTakeoverFacts(root, true)).toEqual({
      denial: null,
      hostSessionId: MAIN_SESSION,
      retainedRoles: [],
      humanTurnGrounded: true,
    });
  });

  test("carries the denial reason and a grounding flag it was given", () => {
    const root = freshWorkflow();
    rmSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), { force: true });
    const facts = readSessionTakeoverFacts(root, false);
    expect(facts.denial).toEqual({ reason: "marker-absent", role: "unknown" });
    expect(facts.humanTurnGrounded).toBe(false);
    expect(facts.retainedRoles).toEqual([]);
  });

  test("reports a null host session id when .current-session is absent", () => {
    const root = freshWorkflow();
    rmSync(join(root, CURRENT_SESSION_RELATIVE_PATH), { force: true });
    expect(readSessionTakeoverFacts(root, true).hostSessionId).toBeNull();
  });

  test("reports the retained roles, sorted", () => {
    const root = freshWorkflow();
    writeCarrier(
      root,
      KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH,
      `${
        JSON.stringify({
          version: 1,
          mainSessionId: MAIN_SESSION,
          roles: { reviewer: 1, builder: 2 },
        })
      }\n`,
    );
    expect(readSessionTakeoverFacts(root, true).retainedRoles).toEqual([
      "builder",
      "reviewer",
    ]);
  });

  // The roles to acknowledge are read through the guard's own parser, so a
  // carrier the guard rejects wholesale yields nothing to acknowledge — it must
  // not block the takeover that exists to repair it.
  test.each([
    ["an unparseable body", "{not json"],
    ["a wrong version", JSON.stringify({ version: 2, mainSessionId: "x", roles: { r: 1 } })],
    ["a missing main session id", JSON.stringify({ version: 1, roles: { r: 1 } })],
    ["a non-object roles field", JSON.stringify({ version: 1, mainSessionId: "x", roles: [] })],
    ["an invalid role count", JSON.stringify({ version: 1, mainSessionId: "x", roles: { r: 0 } })],
  ])("reports no retained roles for %s", (_label, body) => {
    const root = freshWorkflow();
    writeCarrier(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH, `${body}\n`);
    expect(readSessionTakeoverFacts(root, true).retainedRoles).toEqual([]);
  });
});

describe("applySessionTakeover rebinds every face the guard compares", () => {
  test("retires both latches, drops a residual lock, and writes both faces", () => {
    const root = freshWorkflow();
    writeCarrier(root, KIMI_SUBAGENT_DENY_RELATIVE_PATH, "denied\n");
    writeCarrier(root, KIMI_SESSION_ENDED_DENY_RELATIVE_PATH, "ended\n");
    const markerPath = join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH);
    mkdirSync(`${markerPath}.lock`, { recursive: true });

    applySessionTakeover(root, "adopted-session");

    expect(existsSync(join(root, KIMI_SUBAGENT_DENY_RELATIVE_PATH))).toBe(false);
    expect(existsSync(join(root, KIMI_SESSION_ENDED_DENY_RELATIVE_PATH))).toBe(
      false,
    );
    expect(existsSync(`${markerPath}.lock`)).toBe(false);
    expect(readFileSync(join(root, CURRENT_SESSION_RELATIVE_PATH), "utf-8"))
      .toBe("adopted-session\n");
    expect(JSON.parse(readFileSync(markerPath, "utf-8"))).toEqual({
      version: 1,
      mainSessionId: "adopted-session",
      roles: {},
    });
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });

  test("leaves no temporary file behind (the marker is renamed into place)", () => {
    const root = freshWorkflow();
    applySessionTakeover(root, "adopted-session");
    const markerPath = join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH);
    expect(existsSync(`${markerPath}.${process.pid}.takeover`)).toBe(false);
  });
});

// The gate every other mutating verb sits behind. session-takeover is the one
// mutating verb outside it, and that carve-out is the whole reason a denied
// workspace has an in-band way back — so it is pinned here rather than left to
// the spawned CLI alone.
describe("enforceCallerAuthorization carves out exactly the recovery verb", () => {
  test.each([undefined, "get", "count", "lookup", "session-takeover"])(
    "%s passes through even while the carrier denies this caller",
    (subcommand) => {
      const root = freshWorkflow();
      rmSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), { force: true });
      expect(authorizeMainConductor(root).kind).toBe("denied");

      const result = capture(() => enforceCallerAuthorization(subcommand));
      expect(result.exited).toBe(false);
      expect(result.output).toBe("");
    },
  );

  test("a mutating verb is refused with the diagnosable cause", () => {
    const root = freshWorkflow();
    rmSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), { force: true });

    const result = capture(() => enforceCallerAuthorization("advance"));
    expect(result.exited).toBe(true);
    expect(result.code).toBe(1);
    const reported = JSON.parse(result.output).error;
    expect(reported).toContain("marker-absent");
    expect(reported).toContain("session-takeover");
  });

  test("an authorized caller passes a mutating verb through", () => {
    freshWorkflow();
    const result = capture(() => enforceCallerAuthorization("advance"));
    expect(result.exited).toBe(false);
    expect(result.output).toBe("");
  });
});

describe("handleSessionTakeover drives the decision table", () => {
  test("rejects a malformed argument vector before reading anything", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    rmSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), { force: true });

    const result = capture(() =>
      handleSessionTakeover(["--confirm", "--session-id"])
    );
    expect(result.exited).toBe(true);
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("--session-id");
    expect(authorizeMainConductor(root).kind).toBe("denied");
  });

  test("refuses an unconfirmed request without touching the carrier", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    rmSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), { force: true });

    const result = capture(() => handleSessionTakeover([]));
    expect(result.exited).toBe(true);
    expect(result.output).toContain("--confirm");
    expect(authorizeMainConductor(root).kind).toBe("denied");
    expect(readAllAuditShards(root)).not.toContain("RECOVERY_COMPLETED");
  });

  test("reports a no-op for an already-authorized caller", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    const auditBefore = readAllAuditShards(root);

    const result = capture(() => handleSessionTakeover(["--confirm"]));
    expect(result.exited).toBe(false);
    expect(JSON.parse(result.output)).toEqual({
      taken_over: false,
      reason: "already-authorized",
    });
    expect(readAllAuditShards(root)).toBe(auditBefore);
  });

  test("rebinds a denied carrier and records what it achieved", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    writeCarrier(root, CURRENT_SESSION_RELATIVE_PATH, "another-harness\n");
    expect(authorizeMainConductor(root).kind).toBe("denied");

    const result = capture(() => handleSessionTakeover(["--confirm"]));
    expect(result.exited).toBe(false);
    const payload = JSON.parse(result.output);
    expect(payload.taken_over).toBe(true);
    expect(payload.reason).toBe("session-mismatch");
    expect(payload.session_id).toBe("another-harness");
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
    const audit = readAllAuditShards(root);
    expect(audit).toContain("RECOVERY_COMPLETED");
    expect(audit).toContain("session-mismatch");
  });

  test("binds the session named by --session-id, not the host stamp", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    rmSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), { force: true });

    const result = capture(() =>
      handleSessionTakeover(["--confirm", "--session-id", "operator-session"])
    );
    expect(result.exited).toBe(false);
    expect(JSON.parse(result.output).session_id).toBe("operator-session");
    expect(
      JSON.parse(
        readFileSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), "utf-8"),
      ).mainSessionId,
    ).toBe("operator-session");
  });

  test("refuses to seize a retained role that was not acknowledged", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    retainRole(root, "amadeus-quality-agent");

    const refused = capture(() => handleSessionTakeover(["--confirm"]));
    expect(refused.exited).toBe(true);
    expect(refused.output).toContain("amadeus-quality-agent");

    const accepted = capture(() =>
      handleSessionTakeover([
        "--confirm",
        "--confirm-roles",
        "amadeus-quality-agent",
      ])
    );
    expect(accepted.exited).toBe(false);
    expect(JSON.parse(accepted.output).acknowledged_roles).toEqual([
      "amadeus-quality-agent",
    ]);
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });

  test("refuses when no human turn on this ledger grounds the request", () => {
    const root = freshWorkflow();
    rmSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), { force: true });

    const result = capture(() => handleSessionTakeover(["--confirm"]));
    expect(result.exited).toBe(true);
    expect(result.output).toContain("HUMAN_TURN");
    expect(authorizeMainConductor(root).kind).toBe("denied");
  });

  // An unreadable shard grounds nothing: absence of evidence is not evidence of
  // a human turn.
  test("refuses when this clone's ledger cannot be read at all", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    rmSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), { force: true });
    rmSync(seededAuditShard(root), { force: true });

    const result = capture(() => handleSessionTakeover(["--confirm"]));
    expect(result.exited).toBe(true);
    expect(result.output).toContain("HUMAN_TURN");
    expect(authorizeMainConductor(root).kind).toBe("denied");
  });

  // Grounding is positional against the LAST takeover on this shard, so the
  // recovery row a successful takeover writes is what disarms the approval.
  test("the recovery row it wrote stops the same human turn authorizing a second", () => {
    const root = freshWorkflow();
    mintHumanTurn(root);
    rmSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), { force: true });
    expect(capture(() => handleSessionTakeover(["--confirm"])).exited).toBe(
      false,
    );

    rmSync(join(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH), { force: true });
    const replayed = capture(() => handleSessionTakeover(["--confirm"]));
    expect(replayed.exited).toBe(true);
    expect(replayed.output).toContain("HUMAN_TURN");

    mintHumanTurn(root, "yes, take it over again");
    expect(capture(() => handleSessionTakeover(["--confirm"])).exited).toBe(
      false,
    );
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });
});
