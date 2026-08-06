// covers: function:resolvePersonaPin, hook:amadeus-log-subagent, hook:amadeus-log-subagent-start
//
// t454 — Issue #2279 (U2 model-attribution). The halves of U2 that need a real
// filesystem or a real process boundary, which is why they live here rather
// than in t453's unit layer (cid:code-generation:fs-tests-integration-first):
//
//   (1) resolvePersonaPin reads the harness `agents/` dir and matches a
//       persona by its frontmatter `name:` — NEVER by file basename, because
//       basename == name is not guaranteed and a basename shortcut would
//       silently strand the pin forever (FD domain-entities, i2 BLOCKER fix).
//       Every read failure degrades to { pin: undefined, warnings: [...] }
//       instead of throwing — the caller is an audit write (NFR-3).
//   (2) the SubagentStop hook records `Model` / `Model Source` on
//       SUBAGENT_COMPLETED (harness via the Codex fixture, pin via a seeded
//       persona), and records NOTHING when no source supplies a model — the
//       emit continues either way (AC-5, ADR-5).
//   (3) the started half (subagentStartFields via amadeus-log-subagent-start)
//       records `Type Verdict` plus the model pair from `tool_input.model`
//       (request) or the persona pin. Claude Code never fires this seam today
//       (#2303 — CON-2), so the tests drive it by payload shape, exactly as
//       kimi's role-start route does.
//
// MECHANISM: cli for the hooks — a hook's whole contract is process-boundary
// side effects (mirroring t452/t211). resolvePersonaPin is exercised
// in-process so bun --coverage measures its branches.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { resolvePersonaPin } from "../../dist/claude/.claude/tools/amadeus-subagent-observability.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  parseAuditRecords,
  seededAuditDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const LOG_SUBAGENT = join(AMADEUS_SRC, "hooks", "amadeus-log-subagent.ts");
const LOG_SUBAGENT_START = join(AMADEUS_SRC, "hooks", "amadeus-log-subagent-start.ts");
const CODEX_PAYLOADS = join(__dirname, "..", "fixtures", "codex-hook-payloads", "payloads.json");

/** A persona definition; the model pin is omitted when not given. */
function personaDefinition(name: string, model?: string): string {
  const lines = ["---", `name: ${name}`];
  if (model !== undefined) lines.push(`model: ${model}`);
  lines.push("description: >", "  A t454 fixture persona.", "---", "", "# Body", "");
  return lines.join("\n");
}

// ---- (1) resolvePersonaPin over a real dir ----------------------------------

describe("t454 resolvePersonaPin (#2279)", () => {
  function seedDir(files: Readonly<Record<string, string>>): string {
    const dir = mkdtempSync(join(tmpdir(), "t454-agents-"));
    for (const [file, body] of Object.entries(files)) writeFileSync(join(dir, file), body, "utf-8");
    return dir;
  }

  test("a pinned persona resolves its frontmatter model:", () => {
    const dir = seedDir({ "amadeus-developer-agent.md": personaDefinition("amadeus-developer-agent", "opus") });
    try {
      const res = resolvePersonaPin("amadeus-developer-agent", dir);
      expect(res.pin).toBe("opus");
      expect(res.warnings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the match is the frontmatter name:, never the file basename", () => {
    // THE PIN of the lookup rule: a basename-shortcut implementation
    // (`${dir}/${agentType}.md`) finds nothing here and goes red.
    const dir = seedDir({ "renamed-file.md": personaDefinition("amadeus-developer-agent", "opus") });
    try {
      const res = resolvePersonaPin("amadeus-developer-agent", dir);
      expect(res.pin).toBe("opus");
      expect(res.warnings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a persona without a model pin is legitimate — pin undefined, NO warning", () => {
    const dir = seedDir({ "free-agent.md": personaDefinition("free-agent") });
    try {
      const res = resolvePersonaPin("free-agent", dir);
      expect(res.pin).toBeUndefined();
      expect(res.warnings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("no definition with a matching name: — pin undefined, one warning, no throw", () => {
    const dir = seedDir({ "someone-else.md": personaDefinition("someone-else", "opus") });
    try {
      const res = resolvePersonaPin("ghost-agent", dir);
      expect(res.pin).toBeUndefined();
      expect(res.warnings.length).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a duplicate name: — first in scan order wins, one warning", () => {
    const dir = seedDir({
      "a-first.md": personaDefinition("dup-agent", "opus"),
      "b-second.md": personaDefinition("dup-agent", "sonnet"),
    });
    try {
      const res = resolvePersonaPin("dup-agent", dir);
      expect(res.pin).toBe("opus");
      expect(res.warnings.length).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a missing dir degrades to pin undefined with one warning — never throws (fail-open)", () => {
    const absent = join(tmpdir(), "t454-agents-absent-does-not-exist");
    const res = resolvePersonaPin("amadeus-developer-agent", absent);
    expect(res.pin).toBeUndefined();
    expect(res.warnings.length).toBe(1);
    expect(res.warnings[0]).toContain(absent);
  });
});

// ---- shared project fixture (mirrors t452) -----------------------------------

const PINNED_PERSONA = "t454-pinned-persona";
const PINNED_MODEL = "t454-pin-model";

function stateBody(): string {
  return [
    "# AI-DLC State (t454 fixture)",
    "",
    "## Current Status",
    "",
    "- **Workflow**: fix",
    "- **Scope**: fix",
    "- **Phase**: construction",
    "- **Current Stage**: code-generation",
    "- **Status**: In Progress",
    "",
  ].join("\n");
}

/** Seed a running intent with a non-empty audit shard so the hooks' gates pass. */
function seed(proj: string): void {
  writeFileSync(seededStateFile(proj), stateBody(), "utf-8");
  const auditDir = seededAuditDir(proj);
  mkdirSync(auditDir, { recursive: true });
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  writeFileSync(
    join(auditDir, `${host}-fixturecloneid01.jsonl`),
    `${JSON.stringify({
      schemaVersion: 1,
      seq: 1,
      cloneId: "fixturecloneid01",
      intentId: "test-intent",
      timestamp: "2026-08-05T08:00:00Z",
      heading: "Seed",
      event: "SEED",
      fields: {},
    })}\n`,
    "utf-8",
  );
}

/** Declare the pinned persona where the hooks look for it: `<proj>/.claude/agents`. */
function seedPinnedPersona(proj: string): void {
  const dir = join(proj, ".claude", "agents");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${PINNED_PERSONA}.md`), personaDefinition(PINNED_PERSONA, PINNED_MODEL), "utf-8");
}

function readAllShards(proj: string): string {
  const dir = seededAuditDir(proj);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return "";
  }
  return names
    .filter((n) => n.endsWith(".jsonl"))
    .sort()
    .map((n) => readFileSync(join(dir, n), "utf-8"))
    .join("\n");
}

function fieldsFor(proj: string, event: string): Record<string, string>[] {
  return parseAuditRecords(readAllShards(proj))
    .filter((r) => r.event === event)
    .map((r) => r.fields);
}

function runStopHook(proj: string, payload: Record<string, unknown>) {
  return spawnSync(BUN, [LOG_SUBAGENT], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
  });
}

function runStartHook(proj: string, payload: Record<string, unknown>) {
  return spawnSync(BUN, [LOG_SUBAGENT_START], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
  });
}

let proj: string;
beforeEach(() => {
  proj = createTestProject();
});
afterEach(() => {
  cleanupTestProject(proj);
});

// ---- (2) the completed hook -------------------------------------------------

describe("t454 log-subagent model attribution (#2279)", () => {
  test("the Codex fixture resolves the harness-supplied model (AC-4 harness)", () => {
    // Fixture contract first (BR-U2-8): the verbatim fragment is what AS-1
    // pins. If a fixture regeneration drops it, this assert names the drift
    // before the behavioural one does.
    const raw = readFileSync(CODEX_PAYLOADS, "utf-8");
    expect(raw).toContain('"model": "openai.gpt-5.5"');
    const payload = (JSON.parse(raw) as { subagentStop: Record<string, unknown> }).subagentStop;
    expect(payload.agent_type).toBe("default");

    seed(proj);
    const res = runStopHook(proj, payload);
    expect(res.status).toBe(0);
    const rows = fieldsFor(proj, "SUBAGENT_COMPLETED");
    expect(rows.length).toBe(1);
    expect(rows[0]?.Model).toBe("openai.gpt-5.5");
    expect(rows[0]?.["Model Source"]).toBe("harness");
    expect(rows[0]?.["Type Verdict"]).toBe("builtin");
  });

  test("a pinned persona resolves the declaration (AC-4 pin)", () => {
    seed(proj);
    seedPinnedPersona(proj);
    const res = runStopHook(proj, { agent_type: PINNED_PERSONA, agent_id: "m1" });
    expect(res.status).toBe(0);
    const rows = fieldsFor(proj, "SUBAGENT_COMPLETED");
    expect(rows.length).toBe(1);
    expect(rows[0]?.["Type Verdict"]).toBe("persona");
    expect(rows[0]?.Model).toBe(PINNED_MODEL);
    expect(rows[0]?.["Model Source"]).toBe("pin");
  });

  test("no model supply: both attributes are absent and the emit continues (AC-5)", () => {
    // Claude Code's live shape — no payload model, and a non-persona type so
    // no pin can resolve (every defined persona carries a pin). Absence must
    // be ATTRIBUTE ABSENCE (ADR-5), never a fabricated value.
    seed(proj);
    seedPinnedPersona(proj);
    const res = runStopHook(proj, { agent_type: "general-purpose", agent_id: "m2" });
    expect(res.status).toBe(0);
    const rows = fieldsFor(proj, "SUBAGENT_COMPLETED");
    expect(rows.length).toBe(1);
    expect(rows[0]?.["Agent Type"]).toBe("general-purpose");
    expect(rows[0]?.["Type Verdict"]).toBe("builtin");
    expect("Model" in (rows[0] ?? {})).toBe(false);
    expect("Model Source" in (rows[0] ?? {})).toBe(false);
  });
});

// ---- (3) the started hook -----------------------------------------------------

describe("t454 log-subagent-start model attribution (#2279)", () => {
  test("an explicit tool_input.model resolves as request (AC-4 request)", () => {
    seed(proj);
    const res = runStartHook(proj, {
      hook_event_name: "PreToolUse",
      tool_name: "Task",
      tool_input: { subagent_type: "general-purpose", model: "claude-opus-4-7", prompt: "do the thing" },
    });
    expect(res.status).toBe(0);
    const rows = fieldsFor(proj, "SUBAGENT_STARTED");
    expect(rows.length).toBe(1);
    expect(rows[0]?.["Type Verdict"]).toBe("builtin");
    expect(rows[0]?.Model).toBe("claude-opus-4-7");
    expect(rows[0]?.["Model Source"]).toBe("request");
  });

  test("a pinned persona resolves as pin on the started face (AC-4 pin)", () => {
    // Kimi's SubagentStart shape — the seam that actually fires today
    // (Claude Code's start seam is dormant until #2303/#2297 — CON-2).
    seed(proj);
    seedPinnedPersona(proj);
    const res = runStartHook(proj, {
      hook_event_name: "SubagentStart",
      agent_type: PINNED_PERSONA,
      prompt: "do the thing",
    });
    expect(res.status).toBe(0);
    const rows = fieldsFor(proj, "SUBAGENT_STARTED");
    expect(rows.length).toBe(1);
    expect(rows[0]?.["Type Verdict"]).toBe("persona");
    expect(rows[0]?.Model).toBe(PINNED_MODEL);
    expect(rows[0]?.["Model Source"]).toBe("pin");
  });

  test("a harness-supplied payload model wins over everything (AC-4 harness, started)", () => {
    seed(proj);
    const res = runStartHook(proj, {
      hook_event_name: "SubagentStart",
      agent_type: "coder",
      model: "kimi-k2",
      prompt: "do the thing",
    });
    expect(res.status).toBe(0);
    const rows = fieldsFor(proj, "SUBAGENT_STARTED");
    expect(rows.length).toBe(1);
    expect(rows[0]?.Model).toBe("kimi-k2");
    expect(rows[0]?.["Model Source"]).toBe("harness");
  });

  test("no agents dir: the started row still lands, with the read failure surfaced (fail-open)", () => {
    seed(proj);
    const res = runStartHook(proj, {
      hook_event_name: "SubagentStart",
      agent_type: "general-purpose",
      prompt: "do the thing",
    });
    expect(res.status).toBe(0);
    expect(res.stderr).toContain("agents dir unreadable");
    const rows = fieldsFor(proj, "SUBAGENT_STARTED");
    expect(rows.length).toBe(1);
    expect(rows[0]?.["Type Verdict"]).toBe("builtin");
    expect("Model" in (rows[0] ?? {})).toBe(false);
  });
});
