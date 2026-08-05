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
