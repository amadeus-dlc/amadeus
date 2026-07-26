// covers: modules:setup-kimi-hooks
// size: small
//
// domain/kimi-hooks.ts — the pure managed-block merge logic (FR-3a, FR-7c),
// exercised in-process against a compact snippet fixture. The six FR-7c cases
// (add / noop / replace / duplicate loud-fail / invalid TOML loud-fail /
// removal) plus the Bolt 2 live-finding case: kimi CLI 0.28.1 re-serializes
// config.toml and drops comments, so a marker-stripped config must plan as
// "replace", never as a duplicate-producing "add". The REAL snippet master's
// fidelity cases live in tests/integration/t-kimi-hooks-merge.test.ts (this
// file's unit slot must stay Small: no fs tokens here).

import { describe, expect, test } from "bun:test";
import {
  applyMerge,
  checkTomlSyntax,
  MANAGED_BLOCK_BEGIN,
  MANAGED_BLOCK_END,
  planMerge,
  removeManagedBlock,
  renderManagedBlock,
} from "../../packages/setup/src/domain/kimi-hooks.ts";

// A compact stand-in for the snippet master (2 hooks + 2 permission rules).
const FAKE_SNIPPET = [
  "# preamble comment outside the managed block",
  MANAGED_BLOCK_BEGIN,
  "[[hooks]]",
  'event = "SessionStart"',
  'command = "bun .kimi-code/hooks/amadeus-kimi-adapter.ts session-start"',
  "",
  "[[hooks]]",
  'event = "Stop"',
  'command = "bun .kimi-code/hooks/amadeus-kimi-adapter.ts stop"',
  "",
  "# a comment the CLI re-serialization would drop",
  "[[permission.rules]]",
  'decision = "allow"',
  'pattern = "Bash(bun .kimi-code/tools/*)"',
  "",
  "[[permission.rules]]",
  'decision = "allow"',
  'pattern = "Bash(git commit*)"',
  MANAGED_BLOCK_END,
  "",
].join("\n");

function renderedBlock(): string {
  const result = renderManagedBlock(FAKE_SNIPPET);
  if (result.type === "err") throw new Error(`fixture snippet must render: ${result.error.detail}`);
  return result.value;
}

// Simulates the kimi CLI re-serialization (Bolt 2 finding): every comment
// line — including the markers — is dropped; tables stay as-is.
function stripComments(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
}

// 14 pre-existing user hooks (TC-2's measured count) plus an unrelated key.
function userConfigText(): string {
  const hooks = Array.from(
    { length: 14 },
    (_, i) => `[[hooks]]\nevent = "PostToolUse"\nmatcher = "Tool${i}"\ncommand = "echo hook-${i}"`,
  ).join("\n\n");
  return `model = "kimi-k2"\n\n${hooks}\n`;
}

function mustPlan(configText: string, block: string) {
  const plan = planMerge(configText, block);
  if (plan.type === "err") throw new Error(`planMerge must succeed: ${plan.error.detail}`);
  return plan.value;
}

describe("checkTomlSyntax — the Bun oracle guard", () => {
  test("fails loudly with the bunx guidance when the Bun runtime is absent", () => {
    const result = checkTomlSyntax("anything = 1\n", null);
    expect(result.type).toBe("err");
    if (result.type === "err") {
      expect(result.error.detail).toContain("bunx");
    }
  });
});

describe("planMerge — marker anomalies", () => {
  test("loud-fails when the managed-block markers are reversed", () => {
    const reversed = [
      "# <<< amadeus-kimi-hooks <<<",
      "[[hooks]]",
      "# >>> amadeus-kimi-hooks >>>",
      "",
    ].join("\n");
    const block = renderManagedBlock(FAKE_SNIPPET);
    if (block.type === "err") throw new Error("fixture must render");
    const plan = planMerge(reversed, block.value);
    expect(plan.type).toBe("err");
    if (plan.type === "err") {
      expect(plan.error.detail).toContain("reversed");
    }
  });
});

describe("renderManagedBlock", () => {
  test("extracts the marker-wrapped block and drops any preamble", () => {
    const block = renderedBlock();
    const lines = block.split("\n");
    expect(lines[0]).toBe(MANAGED_BLOCK_BEGIN);
    expect(lines[lines.length - 1]).toBe(MANAGED_BLOCK_END);
    expect(block).not.toContain("preamble");
  });

  test("loud-fails when the snippet has no markers (corrupt distribution)", () => {
    const result = renderManagedBlock('[[hooks]]\nevent = "Stop"\n');
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.type).toBe("content-validation");
  });
});

describe("planMerge + applyMerge — add", () => {
  test("an absent config (empty text by convention) plans 'add' and applies to just the block", () => {
    const block = renderedBlock();
    const plan = mustPlan("", block);
    expect(plan.action).toBe("add");
    const merged = applyMerge("", plan);
    expect(merged).toBe(`${block}\n`);
    Bun.TOML.parse(merged); // the result must be valid TOML
  });

  test("an existing config (14 user hooks) plans 'add' and preserves every existing byte", () => {
    const block = renderedBlock();
    const config = userConfigText();
    const plan = mustPlan(config, block);
    expect(plan.action).toBe("add");
    const merged = applyMerge(config, plan);
    expect(merged.startsWith(config)).toBe(true); // BR-1: outside bytes untouched
    expect(merged).toContain(block);
    expect(merged.split("[[hooks]]").length - 1).toBe(16); // 14 user + 2 managed
    Bun.TOML.parse(merged);
  });

  test("edge case: a config without a trailing newline still gains a well-formed block", () => {
    const block = renderedBlock();
    const config = 'model = "kimi-k2"'; // no trailing newline
    const plan = mustPlan(config, block);
    const merged = applyMerge(config, plan);
    expect(merged.startsWith('model = "kimi-k2"\n')).toBe(true);
    Bun.TOML.parse(merged);
  });
});

describe("planMerge + applyMerge — noop (BR-3 idempotence)", () => {
  test("re-applying the same block plans 'noop' and apply returns the input verbatim", () => {
    const block = renderedBlock();
    const config = `${userConfigText()}\n${block}\n`;
    const plan = mustPlan(config, block);
    expect(plan.action).toBe("noop");
    expect(applyMerge(config, plan)).toBe(config);
  });

  test("add then plan again is a noop (the install is re-runnable)", () => {
    const block = renderedBlock();
    const first = applyMerge(userConfigText(), mustPlan(userConfigText(), block));
    const second = mustPlan(first, block);
    expect(second.action).toBe("noop");
    expect(applyMerge(first, second)).toBe(first);
  });
});

describe("planMerge + applyMerge — replace", () => {
  test("an outdated block between markers is replaced; everything outside is byte-preserved", () => {
    const oldBlock = [
      MANAGED_BLOCK_BEGIN,
      "[[hooks]]",
      'event = "SessionStart"',
      'command = "bun .kimi-code/hooks/amadeus-kimi-adapter.ts session-start-old"',
      MANAGED_BLOCK_END,
    ].join("\n");
    const block = renderedBlock();
    const config = `${userConfigText()}\n${oldBlock}\n\n[providers.default]\nbase_url = "https://example.invalid"\n`;
    const plan = mustPlan(config, block);
    expect(plan.action).toBe("replace");
    const merged = applyMerge(config, plan);
    expect(merged).toContain(block);
    expect(merged).not.toContain("session-start-old");
    expect(merged.startsWith(`${userConfigText()}\n`)).toBe(true);
    expect(merged.endsWith(`[providers.default]\nbase_url = "https://example.invalid"\n`)).toBe(true);
    expect(merged.split(MANAGED_BLOCK_BEGIN).length - 1).toBe(1); // no duplicate block
    Bun.TOML.parse(merged);
  });
});

describe("planMerge + applyMerge — marker-stripped config (Bolt 2 live finding)", () => {
  test("a config whose markers the kimi CLI stripped still plans 'replace', never a duplicating 'add'", () => {
    const block = renderedBlock();
    const stripped = stripComments(block); // what the CLI leaves behind
    const config = `${userConfigText()}\n${stripped}\n`;
    const plan = mustPlan(config, block);
    expect(plan.action).toBe("replace");
    const merged = applyMerge(config, plan);
    // Exactly one managed block afterwards: 2 adapter command lines, markers restored.
    expect(merged.split("amadeus-kimi-adapter.ts").length - 1).toBe(2);
    expect(merged.split(MANAGED_BLOCK_BEGIN).length - 1).toBe(1);
    expect(merged.split(MANAGED_BLOCK_END).length - 1).toBe(1);
    expect(merged).toContain(block);
    // The user's own hooks survive byte-for-byte; the managed git pre-allow is
    // absorbed by identity (adjacent to a signature table), not duplicated.
    expect(merged.startsWith(userConfigText())).toBe(true);
    expect(merged.split("[[hooks]]").length - 1).toBe(16);
    expect(merged.split("Bash(git commit*)").length - 1).toBe(1);
    Bun.TOML.parse(merged);
    // And the repaired config is a stable noop from then on.
    expect(mustPlan(merged, block).action).toBe("noop");
  });

  test("content detection never fires without the adapter signature: a user's own .kimi-code rule alone stays an 'add'", () => {
    const block = renderedBlock();
    const config = ["[[permission.rules]]", 'decision = "allow"', 'pattern = "Bash(bun .kimi-code/my-own-tool*)"', ""].join(
      "\n",
    );
    const plan = mustPlan(config, block);
    expect(plan.action).toBe("add");
    const merged = applyMerge(config, plan);
    expect(merged).toContain("my-own-tool"); // the user's rule survives verbatim
    expect(merged.startsWith(config)).toBe(true);
  });
});

describe("planMerge — loud fail", () => {
  test("two or more managed blocks (past anomaly) is a content-validation error, never an auto-repair", () => {
    const block = renderedBlock();
    const config = `${block}\n\n${userConfigText()}\n${block}\n`;
    const plan = planMerge(config, block);
    expect(plan.type).toBe("err");
    if (plan.type === "err") {
      expect(plan.error.type).toBe("content-validation");
      expect(plan.error.detail).toContain("manual");
    }
  });

  test("an unpaired marker is a content-validation error", () => {
    const block = renderedBlock();
    const config = `${userConfigText()}\n${MANAGED_BLOCK_BEGIN}\n[[hooks]]\nevent = "Stop"\n`;
    const plan = planMerge(config, block);
    expect(plan.type).toBe("err");
    if (plan.type === "err") expect(plan.error.type).toBe("content-validation");
  });

  test("markerless managed content alongside a marker-wrapped block is a duplicate, not a silent merge", () => {
    const block = renderedBlock();
    const stripped = stripComments(block);
    const config = `${stripped}\n\n${block}\n`;
    const plan = planMerge(config, block);
    expect(plan.type).toBe("err");
    if (plan.type === "err") expect(plan.error.type).toBe("content-validation");
  });

  test("an unreadable (syntactically invalid) TOML config is an IoError loud fail", () => {
    const plan = planMerge("[[hooks]]\nevent = \n", renderedBlock());
    expect(plan.type).toBe("err");
    if (plan.type === "err") expect(plan.error.type).toBe("io");
  });
});

describe("removeManagedBlock", () => {
  test("removes exactly the marker region and leaves the rest byte-identical", () => {
    const block = renderedBlock();
    const config = userConfigText();
    const withBlock = applyMerge(config, mustPlan(config, block));
    const removal = removeManagedBlock(withBlock, block);
    expect(removal.type).toBe("ok");
    if (removal.type !== "ok") return;
    expect(removal.value.removed).toBe(true);
    expect(removal.value.text).toBe(config); // full round-trip back to the pre-install bytes
  });

  test("no managed block is a noop", () => {
    const config = userConfigText();
    const removal = removeManagedBlock(config, renderedBlock());
    expect(removal.type).toBe("ok");
    if (removal.type !== "ok") return;
    expect(removal.value.removed).toBe(false);
    expect(removal.value.text).toBe(config);
  });

  test("works content-wise when the markers were stripped (Bolt 2 finding)", () => {
    const block = renderedBlock();
    const config = `${userConfigText()}\n${stripComments(block)}\n`;
    const removal = removeManagedBlock(config, block);
    expect(removal.type).toBe("ok");
    if (removal.type !== "ok") return;
    expect(removal.value.removed).toBe(true);
    expect(removal.value.text).not.toContain("amadeus-kimi-adapter.ts");
    // The managed git pre-allow goes with the block; the user's hooks survive.
    expect(removal.value.text).not.toContain("Bash(git commit*)");
    expect(removal.value.text.split("[[hooks]]").length - 1).toBe(14);
    Bun.TOML.parse(removal.value.text);
  });

  test("duplicate blocks are a loud fail here too", () => {
    const block = renderedBlock();
    const config = `${block}\n\n${block}\n`;
    const removal = removeManagedBlock(config, block);
    expect(removal.type).toBe("err");
    if (removal.type === "err") expect(removal.error.type).toBe("content-validation");
  });
});
