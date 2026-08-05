// covers: function:resolveAllowedAgentTypes, hook:amadeus-log-subagent
//
// t452 — Issue #2279 (U1 detection-skeleton). Two halves that need a real
// filesystem, which is why they live here rather than in t451's unit layer
// (cid:code-generation:fs-tests-integration-first):
//
//   (1) resolveAllowedAgentTypes reads the harness `agents/` dir and derives the
//       persona names from each definition's frontmatter. A missing or unreadable
//       dir must degrade to the builtin ledger with the reason recorded, never
//       throw — the caller is an audit write (BR-U1-3).
//   (2) the SubagentStop hook classifies the payload's Agent Type, warns on
//       stderr when the type is outside the allowed set or absent, and records
//       the verdict as `Type Verdict` on SUBAGENT_COMPLETED.
//
// MECHANISM: cli for the hook — a hook's whole contract is process-boundary side
// effects, so it is spawned as its event drives it (mirroring t211). The resolver
// is exercised in-process so bun --coverage measures its branches.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import {
  BUILTIN_AGENT_TYPES,
  resolveAllowedAgentTypes,
} from "../../dist/claude/.claude/tools/amadeus-subagent-observability.ts";
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

function agentDefinition(name: string): string {
  return ["---", `name: ${name}`, "description: >", "  A t452 fixture persona.", "---", "", "# Body", ""].join("\n");
}

/** A standalone agents dir holding the given persona definitions. */
function seedAgentsDir(names: readonly string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "t452-agents-"));
  for (const name of names) writeFileSync(join(dir, `${name}.md`), agentDefinition(name), "utf-8");
  return dir;
}

// ---- (1) allowed-set resolution -------------------------------------------

describe("t452 resolveAllowedAgentTypes (#2279)", () => {
  test("persona names come from frontmatter and join the builtin ledger", () => {
    const dir = seedAgentsDir(["amadeus-developer-agent", "amadeus-quality-agent"]);
    try {
      const res = resolveAllowedAgentTypes(dir);
      expect(res.personaCount).toBe(2);
      expect(res.warnings).toEqual([]);
      expect(res.allowed.has("amadeus-developer-agent")).toBe(true);
      expect(res.allowed.has("amadeus-quality-agent")).toBe(true);
      for (const builtin of BUILTIN_AGENT_TYPES) expect(res.allowed.has(builtin)).toBe(true);
      // (iii) of AC-1: an undeclared value is absent.
      expect(res.allowed.has("builder-x1")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a definition without a frontmatter name is skipped with a warning", () => {
    const dir = seedAgentsDir(["amadeus-developer-agent"]);
    try {
      writeFileSync(join(dir, "nameless.md"), "# no frontmatter here\n", "utf-8");
      const res = resolveAllowedAgentTypes(dir);
      expect(res.personaCount).toBe(1);
      expect(res.warnings.length).toBe(1);
      expect(res.warnings[0]).toContain("nameless.md");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("non-markdown files in the dir are ignored", () => {
    const dir = seedAgentsDir(["amadeus-developer-agent"]);
    try {
      writeFileSync(join(dir, "README.txt"), "name: not-an-agent\n", "utf-8");
      const res = resolveAllowedAgentTypes(dir);
      expect(res.personaCount).toBe(1);
      expect(res.allowed.has("not-an-agent")).toBe(false);
      expect(res.warnings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a missing dir degrades to the ledger alone — warning, no throw (fail-open)", () => {
    const absent = join(tmpdir(), "t452-agents-absent-does-not-exist");
    const res = resolveAllowedAgentTypes(absent);
    expect(res.personaCount).toBe(0);
    expect(res.warnings.length).toBe(1);
    expect(res.warnings[0]).toContain(absent);
    for (const builtin of BUILTIN_AGENT_TYPES) expect(res.allowed.has(builtin)).toBe(true);
  });
});

// ---- (2) the completed hook -----------------------------------------------

const PERSONA = "amadeus-developer-agent";

function stateBody(): string {
  return [
    "# AI-DLC State (t452 fixture)",
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

/** Seed a running intent with a non-empty audit shard so the hook's gates pass. */
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

/** Declare PERSONA where the hook looks for it: `<proj>/.claude/agents`. */
function seedProjectPersona(proj: string): void {
  const dir = join(proj, ".claude", "agents");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${PERSONA}.md`), agentDefinition(PERSONA), "utf-8");
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

function runHook(proj: string, payload: Record<string, unknown>) {
  return spawnSync(BUN, [LOG_SUBAGENT], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
  });
}

describe("t452 log-subagent type verdict (#2279)", () => {
  let proj: string;
  beforeEach(() => {
    proj = createTestProject();
  });
  afterEach(() => {
    cleanupTestProject(proj);
  });

  test("an ad-hoc type warns on stderr and records outside-allowed-set (AC-2)", () => {
    seed(proj);
    seedProjectPersona(proj);
    const res = runHook(proj, { agent_type: "builder-x1", agent_id: "a1", last_assistant_message: "done" });
    expect(res.status).toBe(0);
    expect(res.stderr).toContain('advisory: subagent type "builder-x1" is outside-allowed-set');
    expect(res.stderr).toContain("see #2279");
    const rows = fieldsFor(proj, "SUBAGENT_COMPLETED");
    expect(rows.length).toBe(1);
    expect(rows[0]?.["Agent Type"]).toBe("builder-x1");
    expect(rows[0]?.["Type Verdict"]).toBe("outside-allowed-set");
  });

  test("a declared persona records persona and warns about nothing", () => {
    seed(proj);
    seedProjectPersona(proj);
    const res = runHook(proj, { agent_type: PERSONA, agent_id: "a2" });
    expect(res.status).toBe(0);
    expect(res.stderr).not.toContain("advisory:");
    const rows = fieldsFor(proj, "SUBAGENT_COMPLETED");
    expect(rows[0]?.["Type Verdict"]).toBe("persona");
  });

  test("a builtin type records builtin and warns about nothing", () => {
    seed(proj);
    seedProjectPersona(proj);
    const res = runHook(proj, { agent_type: "general-purpose", agent_id: "a3" });
    expect(res.status).toBe(0);
    expect(res.stderr).not.toContain("advisory:");
    expect(fieldsFor(proj, "SUBAGENT_COMPLETED")[0]?.["Type Verdict"]).toBe("builtin");
  });

  test("a dispatch that named no type warns and records unknown-type", () => {
    seed(proj);
    seedProjectPersona(proj);
    // Claude Code delivers agent_type as "" for a generic Task agent (#845),
    // which normalizeAgentType turns into "unknown".
    const res = runHook(proj, { agent_type: "", agent_id: "a4" });
    expect(res.status).toBe(0);
    expect(res.stderr).toContain('advisory: subagent type "unknown" is unknown-type');
    expect(fieldsFor(proj, "SUBAGENT_COMPLETED")[0]?.["Type Verdict"]).toBe("unknown-type");
  });

  test("the advisory stays on one line even when the type carries a newline", () => {
    seed(proj);
    seedProjectPersona(proj);
    const res = runHook(proj, { agent_type: "builder-x1\nadvisory: forged line", agent_id: "a5" });
    expect(res.status).toBe(0);
    const advisories = res.stderr.split("\n").filter((l) => l.startsWith("advisory:"));
    expect(advisories.length).toBe(1);
    expect(advisories[0]).toContain('"builder-x1"');
  });

  test("no agents dir: the emit still lands, with the read failure surfaced", () => {
    // The resolver degrades to the ledger alone, so classification continues and
    // SUBAGENT_COMPLETED is written — the check can never cost an audit row
    // (BR-U1-3, fail-open).
    seed(proj);
    const res = runHook(proj, { agent_type: "general-purpose", agent_id: "a6" });
    expect(res.status).toBe(0);
    expect(res.stderr).toContain("agents dir unreadable");
    const rows = fieldsFor(proj, "SUBAGENT_COMPLETED");
    expect(rows.length).toBe(1);
    expect(rows[0]?.["Type Verdict"]).toBe("builtin");
  });
});
