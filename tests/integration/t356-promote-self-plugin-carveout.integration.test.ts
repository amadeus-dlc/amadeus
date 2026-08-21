// covers: file:scripts
// size: medium
//
// t356 (integration) — composed-plugin preservation through the real
// promote-self check/apply flow. Mechanism: in-process drive of the exported
// promoteSelfMain(argv, repoRoot) seam against a temp fixture root (t209's
// pattern) — zero spawn (spawned subprocesses are invisible to bun
// --coverage), zero LLM. The pure predicates are pinned by
// tests/unit/t356-promote-self-plugin-carveout.test.ts.
//
// WHAT IS UNDER TEST:
//   1. A composed host (plugin stage body + runner skill + engine dot-state +
//      plugin_source graph node + composition record) passes --check (FR:
//      composed state is committable).
//   2. --apply preserves every composed surface byte-for-byte — the
//      destructive twin that used to delete the composition.
//   3. Falling proofs: without the composition record the same tree is ORPHAN
//      + DIFFERS red; a stray file next to composed surfaces is still an
//      ORPHAN; an unmarked extra graph node is still DIFFERS.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROJECT_INSTRUCTIONS } from "../../packages/framework/harness/claude/project-instructions.ts";
import {
  DistributionRecoveryError,
  DistributionTransactionCoordinator,
} from "../../scripts/distribution-transaction.ts";
import {
  applyDistributionUpdates,
  misplacedPluginProjectionFiles,
  promoteSelfMain,
} from "../../scripts/promote-self.ts";

let root: string;

const write = (rel: string, content: string): void => {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content);
};

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const STOCK_GRAPH = [
  { slug: "intent-capture", phase: "ideation" },
  { slug: "code-generation", phase: "construction" },
];

const PLUGIN_NODE = { slug: "conformance-fixture", phase: "construction", plugin_source: true };

const COMPOSITION_RECORD = {
  ledger: [],
  plugins: [
    [
      "conformance-fixture",
      {
        plugin: "conformance-fixture",
        ownedPaths: ["plugins/conformance-fixture/stages/conformance-fixture.md"],
        stageIndex: [{ slug: "conformance-fixture" }],
      },
    ],
  ],
};

const composedSurfaces = [
  ".claude/plugins/conformance-fixture/stages/conformance-fixture.md",
  ".claude/skills/amadeus-conformance-fixture/SKILL.md",
  ".claude/.amadeus-plugin-composition.json",
  ".claude/.amadeus-plugin-audit.json",
  ".claude/.amadeus-plugin-drops.json",
  ".claude/.amadeus-plugin-src/conformance-fixture/plugin.json",
];

const composeHost = (): void => {
  write(".claude/tools/data/stage-graph.json", json([STOCK_GRAPH[0], STOCK_GRAPH[1], PLUGIN_NODE]));
  write(".claude/plugins/conformance-fixture/stages/conformance-fixture.md", "# stage body\n");
  write(".claude/skills/amadeus-conformance-fixture/SKILL.md", "# runner\n");
  write(".claude/.amadeus-plugin-composition.json", json(COMPOSITION_RECORD));
  write(".claude/.amadeus-plugin-audit.json", json([{ event: "composed" }]));
  write(".claude/.amadeus-plugin-drops.json", json({ plugins: { "conformance-fixture": [] } }));
  write(".claude/.amadeus-plugin-src/conformance-fixture/plugin.json", json({ name: "conformance-fixture" }));
};

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "t356-plugin-carveout-"));
  // Minimal dist fixture covering all managed dirs, with a compiled graph.
  write("dist/claude/.claude/tools/data/stage-graph.json", json(STOCK_GRAPH));
  write("dist/codex/.codex/b.txt", "beta\n");
  write("dist/codex/.agents/c.txt", "gamma\n");
  write("dist/cursor/.cursor/d.txt", "delta\n");
  write("dist/opencode/.opencode/e.txt", "epsilon\n");
  write("dist/kimi/.kimi-code/f.txt", "zeta\n");
  write("dist/pi/.pi/g.txt", "eta\n");
  write("dist/codex/AGENTS.md", "@.agents/rules/amadeus.md\n\n# AI-DLC on Codex CLI\n\ngenerated\n");
  const claudeOnboarding = "@.claude/rules/amadeus.md\n\n# Claude onboarding\n";
  write(".claude/CLAUDE.md", claudeOnboarding);
  write("CLAUDE.md", `${PROJECT_INSTRUCTIONS}${claudeOnboarding}`);
  write(
    "AGENTS.md",
    "@.agents/rules/amadeus.md\n@.agents/rules/amadeus-codex-suffix.md\n\n# Project rules\n",
  );
  // Materialize an in-sync stock self install first.
  expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
  expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("t356 composed-plugin state through promote-self", () => {
  test("a composed host passes --check", async () => {
    composeHost();
    expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("--apply preserves every composed surface byte-for-byte", async () => {
    composeHost();
    const before = new Map(
      composedSurfaces.map((rel) => [rel, readFileSync(join(root, rel), "utf-8")]),
    );
    const graphBefore = readFileSync(join(root, ".claude/tools/data/stage-graph.json"), "utf-8");
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    for (const [rel, bytes] of before) {
      expect(existsSync(join(root, rel))).toBe(true);
      expect(readFileSync(join(root, rel), "utf-8")).toBe(bytes);
    }
    expect(readFileSync(join(root, ".claude/tools/data/stage-graph.json"), "utf-8")).toBe(
      graphBefore,
    );
    expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("--apply re-anchors the plugin node when dist content moved", async () => {
    composeHost();
    // dist gained a field on every stock node — the composed graph is now out
    // of sync and apply must merge rather than clobber.
    const fresh = STOCK_GRAPH.map((n) => ({ ...n, fresh: true }));
    write("dist/claude/.claude/tools/data/stage-graph.json", json(fresh));
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    const merged = JSON.parse(
      readFileSync(join(root, ".claude/tools/data/stage-graph.json"), "utf-8"),
    ) as Array<{ slug: string; fresh?: boolean }>;
    expect(merged.map((n) => n.slug)).toEqual([
      "intent-capture",
      "code-generation",
      "conformance-fixture",
    ]);
    expect(merged[0]?.fresh).toBe(true);
    expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("falling proof: the same tree without the composition record is red", async () => {
    composeHost();
    rmSync(join(root, ".claude/.amadeus-plugin-composition.json"));
    // Graph node unauthorised (DIFFERS) + plugin body/skill orphaned (ORPHAN).
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
  });

  test("falling proof: a stray file beside composed surfaces is still an ORPHAN", async () => {
    composeHost();
    write(".claude/plugins/conformance-fixture/stages/stray.md", "not owned\n");
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
  });

  test("falling proof: an unmarked extra graph node is still DIFFERS", async () => {
    composeHost();
    write(
      ".claude/tools/data/stage-graph.json",
      json([STOCK_GRAPH[0], STOCK_GRAPH[1], { slug: "conformance-fixture" }]),
    );
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
  });

  test("detects Codex runner and Kiro self-install misplacements without flagging local files", () => {
    write(".codex/skills/amadeus-conformance-fixture/SKILL.md", "misplaced runner");
    write(".kiro/plugins/conformance-fixture/stages/conformance-fixture.md", "misplaced plugin");
    write(".codex/local/user.txt", "unmanaged local file");
    const expected = new Map<string, Buffer>([
      [".codex/.amadeus-plugin-src/conformance-fixture/plugin.json", Buffer.from("{}")],
      [".codex/.amadeus-plugin-composition.json", Buffer.from(json(COMPOSITION_RECORD))],
      [".agents/skills/amadeus-conformance-fixture/SKILL.md", Buffer.from("runner")],
    ]);
    expect(misplacedPluginProjectionFiles(expected, root)).toEqual([
      ".codex/skills/amadeus-conformance-fixture/SKILL.md",
      ".kiro/plugins/conformance-fixture/stages/conformance-fixture.md",
    ]);
  });

  test("a mid-transaction failure is recovered to every preimage before returning", () => {
    write("a.txt", "old-a");
    write("b.txt", "old-b");
    let injected = false;
    const coordinator = new DistributionTransactionCoordinator(root, {
      checkpoint: (checkpoint) => {
        if (!injected && checkpoint === "target-renamed") {
          injected = true;
          throw new Error("injected projection failure");
        }
      },
    });
    expect(() => applyDistributionUpdates(root, [
      { path: "a.txt", bytes: Buffer.from("new-a") },
      { path: "b.txt", bytes: Buffer.from("new-b") },
    ], coordinator)).toThrow("injected projection failure");
    expect(readFileSync(join(root, "a.txt"), "utf-8")).toBe("old-a");
    expect(readFileSync(join(root, "b.txt"), "utf-8")).toBe("old-b");
    expect(coordinator.pendingJournalCount()).toBe(0);
  });

  test("a recovery failure retains the original apply error as its cause", () => {
    write("a.txt", "old-a");
    const applyError = new Error("injected projection failure");
    const recoveryError = new Error("injected recovery failure");
    const coordinator = new DistributionTransactionCoordinator(root, {
      checkpoint: (checkpoint) => {
        if (checkpoint === "target-renamed") throw applyError;
        if (checkpoint === "recovery-restore") throw recoveryError;
      },
    });

    let caught: unknown;
    try {
      applyDistributionUpdates(root, [{ path: "a.txt", bytes: Buffer.from("new-a") }], coordinator);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(DistributionRecoveryError);
    expect(caught).toHaveProperty("message", `Error: ${recoveryError.message}`);
    expect(caught).toHaveProperty("cause", applyError);
    expect(coordinator.pendingJournalCount()).toBe(1);
  });
});
