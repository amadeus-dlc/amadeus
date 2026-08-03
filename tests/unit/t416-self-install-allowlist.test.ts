// covers: file:packages/framework/core/tools/data/self-install-allowlist.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  gitattributesExpectation,
  gitignoreExpectation,
  preserved,
  SELF_INSTALL_ALLOWLIST,
  type SelfInstallAllowlist,
} from "../../packages/framework/core/tools/data/self-install-allowlist.ts";

function withTrackedPath(path: string, depth: 1 | 2 = 1): SelfInstallAllowlist {
  return {
    ...SELF_INSTALL_ALLOWLIST,
    tracked: [{ path, depth }],
  };
}

describe("t416 self-install allowlist canonical catalog", () => {
  test("classifies the measured tracked, runtime-preserved, and per-user entries", () => {
    expect(SELF_INSTALL_ALLOWLIST.tracked).toEqual([
      { path: ".claude/CLAUDE.md", depth: 1 },
      { path: ".claude/settings.json", depth: 1 },
      { path: ".codex/config.toml", depth: 1 },
      { path: ".cursor/hooks.json", depth: 1 },
      { path: ".opencode/opencode.json", depth: 1 },
      { path: ".claude/hooks/amadeus-dispatch.ts", depth: 2 },
    ]);
    expect(SELF_INSTALL_ALLOWLIST.preservedRuntime).toEqual([
      ".claude/settings.local.json",
      ".claude/worktrees/",
      ".codex/hooks.json",
      ".codex/agmsg-delivery-mode",
      ".codex/local/",
    ]);
    expect(SELF_INSTALL_ALLOWLIST.perUserPatterns).toHaveLength(4);
  });
});

describe("t416 gitattributes expectation", () => {
  test("derives tracked review exceptions plus the historical Codex hooks exception", () => {
    expect(gitattributesExpectation(SELF_INSTALL_ALLOWLIST)).toEqual([
      ".claude/CLAUDE.md -linguist-generated",
      ".claude/hooks/amadeus-dispatch.ts -linguist-generated",
      ".claude/settings.json -linguist-generated",
      ".codex/config.toml -linguist-generated",
      ".codex/hooks.json -linguist-generated",
      ".cursor/hooks.json -linguist-generated",
      ".opencode/opencode.json -linguist-generated",
    ]);
  });
});

describe("t416 gitignore expectation", () => {
  test("derives generated faces, depth-one exceptions, and dispatcher parent re-inclusion", () => {
    expect(gitignoreExpectation(SELF_INSTALL_ALLOWLIST)).toEqual([
      "/.agents/**",
      "/.claude/**",
      "!/.claude/CLAUDE.md",
      "!/.claude/hooks/",
      "!/.claude/hooks/amadeus-dispatch.ts",
      "!/.claude/settings.json",
      "/.codex/**",
      "!/.codex/config.toml",
      "/.cursor/**",
      "!/.cursor/hooks.json",
      "/.kimi-code/**",
      "/.opencode/**",
      "!/.opencode/opencode.json",
    ]);
  });
});

describe("t416 promote-self preserved compatibility view", () => {
  test("is the union of tracked paths and runtime-preserved paths", () => {
    expect(preserved(SELF_INSTALL_ALLOWLIST)).toEqual([
      ".claude/CLAUDE.md",
      ".claude/settings.json",
      ".codex/config.toml",
      ".cursor/hooks.json",
      ".opencode/opencode.json",
      ".claude/hooks/amadeus-dispatch.ts",
      ".claude/settings.local.json",
      ".claude/worktrees/",
      ".codex/hooks.json",
      ".codex/agmsg-delivery-mode",
      ".codex/local/",
    ]);
  });

  test("rejects duplicate categories and unsafe repository paths", () => {
    const duplicate: SelfInstallAllowlist = {
      ...SELF_INSTALL_ALLOWLIST,
      tracked: [{ path: ".codex/hooks.json", depth: 1 }],
    };
    expect(() => preserved(duplicate)).toThrow("multiple allowlist categories");

    for (const invalidPath of ["/absolute", ".claude/../escape", ".claude/*.json", ".claude/a\0b"]) {
      expect(() => preserved(withTrackedPath(invalidPath))).toThrow("invalid allowlist path");
    }
    expect(() => gitignoreExpectation(withTrackedPath(".claude/hooks/x.ts", 1))).toThrow(
      "does not match depth",
    );
  });
});
