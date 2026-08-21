// covers: file:scripts
// size: medium
//
// t3414 (integration) — the deletion-sweep predicates in
// scripts/promote-self.ts (issue #3414). Mechanism: direct imports of the
// script's exported helpers driven against tmpdir fixtures; zero spawn, zero
// LLM. It sits in the integration tier because two of the four predicates
// (authoringPluginNames, pruneEmptySweptDirs) ARE filesystem readers and
// removers — measuring them means touching a real tree, which is a medium
// signal and therefore not a unit-tier test. The end-to-end drive through
// promoteSelfMain lives in
// tests/integration/t3414-promote-self-deletion-sweep.integration.test.ts.
//
// WHAT IS UNDER TEST:
//   1. projectedPluginOwner claims exactly the two per-plugin projection
//      subtrees and nothing else — host-level engine dot-state, tools, skills
//      and non-host paths all answer null.
//   2. authoringPluginNames is the authoring-source identity gate: a directory under
//      plugins/ counts only when it carries a plugin.json.
//   3. isRetiredPluginProjection is false for every live plugin and for every
//      path outside a projection subtree (the carve-outs stay intact), true
//      only for a projection whose identity the source dropped.
//   4. pruneEmptySweptDirs removes only genuinely empty husks, in the three
//      per-identity layers a plugin occupies and nowhere else.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isRetiredPluginProjection,
  authoringPluginNames,
  projectedPluginOwner,
  pruneEmptySweptDirs,
} from "../../scripts/promote-self.ts";

const LIVE = new Set(["kept"]);

describe("t3414 projectedPluginOwner", () => {
  test("claims both per-plugin projection subtrees on any host", () => {
    expect(projectedPluginOwner(".claude/plugins/kept/stages/kept.md")).toBe("kept");
    expect(projectedPluginOwner(".claude/.amadeus-plugin-src/kept/plugin.json")).toBe("kept");
    expect(projectedPluginOwner(".codex/.amadeus-plugin-src/kept/tools/x.ts")).toBe("kept");
    expect(projectedPluginOwner(".kimi-code/plugins/kept/sensors/amadeus-kept.md")).toBe("kept");
  });

  test("claims nothing outside a per-plugin projection subtree", () => {
    // Host-level engine dot-state carries no identity segment.
    expect(projectedPluginOwner(".claude/.amadeus-plugin-composition.json")).toBeNull();
    expect(projectedPluginOwner(".claude/.amadeus-plugin-audit.json")).toBeNull();
    // A bare directory entry (no trailing path) is not a file inside a subtree.
    expect(projectedPluginOwner(".claude/plugins/kept")).toBeNull();
    expect(projectedPluginOwner(".claude/skills/amadeus-kept/SKILL.md")).toBeNull();
    expect(projectedPluginOwner(".claude/tools/data/stage-graph.json")).toBeNull();
    // Repo-root sources are not host projections.
    expect(projectedPluginOwner("plugins/kept/plugin.json")).toBeNull();
  });

  test("normalizes Windows separators before matching", () => {
    expect(projectedPluginOwner(".claude\\plugins\\kept\\stages\\kept.md")).toBe("kept");
  });
});

describe("t3414 authoringPluginNames", () => {
  test("counts a source directory only when it carries a manifest", () => {
    const root = mkdtempSync(join(tmpdir(), "t3414-live-"));
    try {
      mkdirSync(join(root, "plugins", "declared"), { recursive: true });
      writeFileSync(join(root, "plugins", "declared", "plugin.json"), "{}\n");
      mkdirSync(join(root, "plugins", "manifestless"), { recursive: true });
      expect([...(authoringPluginNames(root) ?? [])]).toEqual(["declared"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an absent plugins/ root is `null` — no authoring layout, nothing retired", () => {
    const root = mkdtempSync(join(tmpdir(), "t3414-live-absent-"));
    try {
      expect(authoringPluginNames(root)).toBeNull();
      // The safety consequence, pinned here rather than inferred: a tree with
      // no authoring source never treats a composed projection as drift.
      expect(isRetiredPluginProjection(".claude/plugins/anything/stages/x.md", null)).toBe(false);
      expect(isRetiredPluginProjection(".claude/.amadeus-plugin-src/anything/plugin.json", null)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("t3414 isRetiredPluginProjection", () => {
  test("is true only for a projection the source no longer declares", () => {
    expect(isRetiredPluginProjection(".claude/plugins/gone/stages/gone.md", LIVE)).toBe(true);
    expect(isRetiredPluginProjection(".claude/.amadeus-plugin-src/gone/plugin.json", LIVE)).toBe(true);
  });

  test("leaves every live-plugin carve-out intact", () => {
    expect(isRetiredPluginProjection(".claude/plugins/kept/stages/kept.md", LIVE)).toBe(false);
    expect(isRetiredPluginProjection(".claude/.amadeus-plugin-src/kept/plugin.json", LIVE)).toBe(false);
  });

  test("never claims a path outside a projection subtree", () => {
    expect(isRetiredPluginProjection(".claude/.amadeus-plugin-composition.json", LIVE)).toBe(false);
    expect(isRetiredPluginProjection(".claude/skills/amadeus-gone/SKILL.md", LIVE)).toBe(false);
    expect(isRetiredPluginProjection(".claude/scopes/amadeus-composed.md", LIVE)).toBe(false);
  });
});

describe("t3414 pruneEmptySweptDirs", () => {
  test("removes the emptied husk of all three layers and keeps everything else", () => {
    const root = mkdtempSync(join(tmpdir(), "t3414-prune-"));
    try {
      for (const dir of [
        ".claude/plugins/gone/stages",
        ".claude/.amadeus-plugin-src/gone/tools",
        ".claude/skills/amadeus-gone",
        ".claude/plugins/kept/stages",
      ]) mkdirSync(join(root, dir), { recursive: true });
      writeFileSync(join(root, ".claude/plugins/kept/stages/kept.md"), "live\n");
      pruneEmptySweptDirs(root, [
        ".claude/plugins/gone/stages/gone.md",
        ".claude/.amadeus-plugin-src/gone/tools/x.ts",
        ".claude/skills/amadeus-gone/SKILL.md",
        ".claude/plugins/kept/stages/kept.md",
      ]);
      expect(existsSync(join(root, ".claude/plugins/gone"))).toBe(false);
      expect(existsSync(join(root, ".claude/.amadeus-plugin-src/gone"))).toBe(false);
      expect(existsSync(join(root, ".claude/skills/amadeus-gone"))).toBe(false);
      expect(existsSync(join(root, ".claude/plugins/kept/stages/kept.md"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("keeps a husk root that still holds a file", () => {
    const root = mkdtempSync(join(tmpdir(), "t3414-prune-keep-"));
    try {
      mkdirSync(join(root, ".claude/plugins/gone/stages"), { recursive: true });
      writeFileSync(join(root, ".claude/plugins/gone/survivor.txt"), "kept\n");
      pruneEmptySweptDirs(root, [".claude/plugins/gone/stages/gone.md"]);
      expect(existsSync(join(root, ".claude/plugins/gone/survivor.txt"))).toBe(true);
      // The empty descendant still goes; only the populated ancestor survives.
      expect(existsSync(join(root, ".claude/plugins/gone/stages"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("never reaches a layer it does not own, or a host root itself", () => {
    const root = mkdtempSync(join(tmpdir(), "t3414-prune-scope-"));
    try {
      mkdirSync(join(root, ".claude/tools/data"), { recursive: true });
      mkdirSync(join(root, ".claude/scopes"), { recursive: true });
      pruneEmptySweptDirs(root, [
        ".claude/tools/data/stage-graph.json",
        ".claude/scopes/amadeus-composed.md",
        ".claude/CLAUDE.md",
      ]);
      expect(existsSync(join(root, ".claude/tools/data"))).toBe(true);
      expect(existsSync(join(root, ".claude/scopes"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
