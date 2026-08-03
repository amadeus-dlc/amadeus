// t148-kiro-file-structure: structural smoke for the dist/kiro harness tree.
//
// covers: file:settings.json
//
// Mirrors t01's pattern for the Kiro shell: the SHIPPED dist/kiro tree has
// the right shape — core dirs present and populated, authored shell files
// present, agent configs are valid JSON with the load-bearing fields the
// design pinned (allowedCommands-only shell grant per findings 0.9b; no
// subagent tool on delegation targets; chat.defaultAgent activation; hooks
// registered through the adapter). Pure fs reads — no spawn, no LLM.

import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KIRO = join(REPO_ROOT, "dist", "kiro");
const K = join(KIRO, ".kiro");

function readJson(p: string): Record<string, unknown> {
  return JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown>;
}

describe("t148 dist/kiro file structure", () => {
  test("core dirs exist and are populated", () => {
    for (const [dir, min] of [
      ["tools", 20],
      ["amadeus-common/stages", 5],
      ["knowledge", 5],
      ["sensors", 4],
      ["scopes", 9],
      ["agents", 11],
      ["hooks", 10],
    ] as Array<[string, number]>) {
      const p = join(K, dir);
      expect(existsSync(p)).toBe(true);
      expect(readdirSync(p).length).toBeGreaterThanOrEqual(min);
    }
  });

  test("ships the method ('memory') tree at the workspace root amadeus/spaces/default/memory/", () => {
    // The AIDLC method relocated OUT of the harness dir (the old .kiro/steering/
    // rule layers) to the workspace root under amadeus/spaces/default/memory/ — one
    // hand-editable source of truth, identical on every harness, read by Kiro via
    // the agent JSON `resources` globs (file://amadeus/spaces/default/memory/**/*.md).
    // It sits beside .kiro/, so resolve from KIRO, not K.
    const mem = (...parts: string[]) =>
      join(KIRO, "amadeus", "spaces", "default", "memory", ...parts);
    for (const f of ["org.md", "team.md", "project.md"]) {
      expect(existsSync(mem(f))).toBe(true);
    }
    for (const p of ["ideation", "inception", "construction", "operation"]) {
      expect(existsSync(mem("phases", `${p}.md`))).toBe(true);
    }
    // The old in-harness rules dir must NOT ship (the relocation is complete).
    expect(existsSync(join(K, "steering"))).toBe(false);
  });

  test("authored shell files present", () => {
    for (const f of [
      "skills/amadeus/SKILL.md",
      "skills/amadeus/question-rendering.md",
      "skills/amadeus/issue-ref-contract.md",
      "hooks/amadeus-kiro-adapter.ts",
      "agents/amadeus.json",
      "agents/amadeus-developer-agent.json",
      "agents/amadeus-architect-agent.json",
      "settings/cli.json",
    ]) {
      expect(existsSync(join(K, f))).toBe(true);
    }
    expect(existsSync(join(KIRO, "AGENTS.md"))).toBe(true);
  });

  test("conductor agent: allowedCommands-only shell grant (findings 0.9b)", () => {
    const a = readJson(join(K, "agents", "amadeus.json"));
    const allowed = (a.allowedTools as string[]) ?? [];
    expect(allowed).not.toContain("execute_bash"); // never blanket shell trust
    const ts = a.toolsSettings as Record<string, { allowedCommands?: string[] }>;
    const cmds = ts.execute_bash?.allowedCommands ?? [];
    expect(cmds.some((c) => c.includes(".kiro/tools/"))).toBe(true);
  });

  test("delegation targets cannot nest (no subagent tool)", () => {
    for (const f of ["amadeus-developer-agent.json", "amadeus-architect-agent.json"]) {
      const a = readJson(join(K, "agents", f));
      expect((a.tools as string[]) ?? []).not.toContain("subagent");
    }
  });

  test("IDE-native tools: builders can write while reviewers remain read-only", () => {
    // The Kiro IDE resolves a delegated subagent's tools from the agent .md
    // frontmatter, not from the agent-v1 JSON the CLI reads (field-proven:
    // a dispatched composer without the grant ran toolless). The kiro-ide
    // manifest injects the grant during projection; it must land on every
    // delegation target there and must NOT leak into any other harness's
    // agents with Kiro's lower-case tool names.
    const IDE_AGENTS = join(REPO_ROOT, "dist", "kiro-ide", ".kiro", "agents");
    const fmToolsOf = (p: string): string | undefined =>
      /^tools:\s*(.+)$/m.exec(
        /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(p, "utf-8"))?.[1] ?? "",
      )?.[1];
    // The delegation-target roster IS the set of hand-authored agent JSONs
    // (minus the conductor amadeus.json) - derive it from disk so a future
    // delegate added without a grant reds here instead of shipping toolless
    // (the original field bug). Builders get read+write+shell. Reviewers get
    // read only; the conductor's validated complete-review adapter owns the
    // Review write. Every NON-delegate kiro-ide agent must have NO grant.
    const delegates = readdirSync(IDE_AGENTS)
      .filter((n) => n.endsWith("-agent.json"))
      .map((n) => n.replace(/\.json$/, ".md"));
    const reviewers = new Set([
      "amadeus-architecture-reviewer-agent.md",
      "amadeus-product-lead-agent.md",
    ]);
    expect(delegates.length).toBeGreaterThanOrEqual(5);
    for (const f of readdirSync(IDE_AGENTS).filter((n) => n.endsWith(".md"))) {
      if (delegates.includes(f)) {
        expect(fmToolsOf(join(IDE_AGENTS, f))).toBe(
          reviewers.has(f) ? `["read"]` : `["read", "write", "shell"]`,
        );
      } else {
        expect(fmToolsOf(join(IDE_AGENTS, f))).toBeUndefined();
      }
    }
    // Kiro's lower-case grant must not leak to other harnesses. Claude uses
    // its own exact-cased read-only allowlist for the same two reviewers.
    const claudeAgents = join(REPO_ROOT, "dist", "claude", ".claude", "agents");
    for (const f of readdirSync(claudeAgents).filter((n) => n.endsWith(".md"))) {
      expect(fmToolsOf(join(claudeAgents, f))).toBe(
        reviewers.has(f) ? "[Read, Grep, Glob]" : undefined,
      );
    }
    for (const tree of [join(K, "agents"), join(REPO_ROOT, "dist", "codex", ".codex", "agents")]) {
      for (const f of readdirSync(tree).filter((n) => n.endsWith(".md"))) {
        expect(fmToolsOf(join(tree, f))).toBeUndefined();
      }
    }
  });

  test("conductor hooks all route through the adapter", () => {
    const a = readJson(join(K, "agents", "amadeus.json"));
    const hooks = a.hooks as Record<string, Array<{ command: string; matcher?: string }>>;
    expect(Object.keys(hooks).sort()).toEqual([
      "agentSpawn",
      "postToolUse",
      "preToolUse",
      "stop",
      "userPromptSubmit",
    ]);
    const all = Object.values(hooks).flat();
    for (const h of all) {
      expect(h.command).toContain("amadeus-kiro-adapter.ts");
    }
    const matchers = (hooks.postToolUse ?? []).map((h) => h.matcher).sort();
    expect(matchers).toEqual(["execute_bash", "fs_write", "subagent", "todo_list"]);
  });

  test("workspace activation ships chat.defaultAgent=amadeus (D-5)", () => {
    const s = readJson(join(K, "settings", "cli.json"));
    expect(s["chat.defaultAgent"]).toBe("amadeus");
  });

  test("workspace defaults opus-4.8 to xhigh effort via chat.modelDefaults", () => {
    // The shipped cli.json raises reasoning effort to xhigh for the pinned
    // orchestrator model (claude-opus-4.8 — exactly as agents/amadeus.json pins
    // it). Kiro's per-model default sub-path is output_config.effort (per
    // kiro.dev/docs/cli/chat/effort). Pin it so the default can't regress.
    const s = readJson(join(K, "settings", "cli.json"));
    const defaults = s["chat.modelDefaults"] as Record<
      string,
      { output_config?: { effort?: string } }
    >;
    expect(defaults?.["claude-opus-4.8"]?.output_config?.effort).toBe("xhigh");
  });

  test("no .kiro.hook files in the CLI kiro harness (#719 re-injection guard)", () => {
    // The Kiro CLI reads hooks from agents/amadeus.json, not from .kiro.hook
    // files (that mechanism is kiro-ide only). The source assert reads the
    // harness tree directly because #719 was unshipped .kiro.hook files that
    // lingered in source, hidden from the orphan scan by a vacuous exemption.
    const srcHooks = join(REPO_ROOT, "packages", "framework", "harness", "kiro", "hooks");
    expect(readdirSync(srcHooks).filter((n) => n.endsWith(".kiro.hook"))).toEqual([]);
    expect(readdirSync(join(K, "hooks")).filter((n) => n.endsWith(".kiro.hook"))).toEqual([]);
  });

  test("kiro skills carry the kiro tool prefix, never the claude one", () => {
    const skill = readFileSync(join(K, "skills", "amadeus", "SKILL.md"), "utf-8");
    expect(skill).toContain("bun .kiro/tools/");
    expect(skill).not.toContain("bun .claude/tools/");
    expect(skill).not.toContain("AskUserQuestion");
  });
});
