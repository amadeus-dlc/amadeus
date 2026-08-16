// covers: file:scripts/promote-self.ts
// size: medium
//
// t516 — promote-self --apply auto-activates .codex/hooks.json (#2714).
//
// WHY THIS EXISTS: every fresh Codex bootstrap worktree needed a manual
// `bun .codex/tools/amadeus-codex-hooks.ts activate` step after `bun run
// build`, on top of `mise trust` / `bun install` / build itself — one more
// unfriendly failure mode in the 5-step bootstrap chain (#2714). promote-self
// --apply already writes `.codex/hooks.json.example` (the canonical, tracked
// Amadeus hook contract) as part of the managed dist/codex/.codex sync; this
// pins that the SAME --apply pass also creates the ignored, per-clone active
// `.codex/hooks.json` from that canonical example WHEN — and only when — the
// active file is absent, mirroring
// packages/framework/harness/codex/tools/amadeus-codex-hooks-contract.ts's
// activateCodexHooks() COPYFILE_EXCL semantics without its stricter doctor
// validation (a pre-existing active file is preservedRuntime and may be
// deliberately customized; silent auto-activation must never touch or reject
// it — see self-install-allowlist.ts:107).
//
// Mechanism: in-process drive of the promoteSelfMain(argv, repoRoot) seam
// against a temp fixture root (t299/t209 style). Zero spawn, zero LLM, zero
// tokens.
//
// WHAT IS UNDER TEST:
//   (i)   example present, active absent → --apply creates the active file,
//         byte-identical to the example, and logs exactly one creation line.
//   (ii)  active already present with DIFFERENT (customized) bytes → --apply
//         leaves it byte-unchanged (preserved contract) and logs nothing.
//   (iii) example absent from the codex projection (no dist/codex/.codex/
//         hooks.json.example) → --apply creates nothing under .codex/hooks.json
//         and does not throw.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROJECT_INSTRUCTIONS } from "../../packages/framework/harness/claude/project-instructions.ts";
import { activateCodexHooksIfMissing, promoteSelfMain } from "../../scripts/promote-self.ts";

let root: string;

const write = (rel: string, content: string): void => {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content);
};

const HOOKS_EXAMPLE = JSON.stringify(
  { hooks: { Stop: [{ hooks: [{ type: "command", command: "bun .codex/hooks/amadeus-codex-adapter.ts stop" }] }] } },
  null,
  2,
) + "\n";

function seedBaseFixture(): void {
  // Minimal dist fixture covering all managed dirs (claude/codex/agents/cursor/opencode/kimi) —
  // no postApply wiring is exercised here, so no kimi snippet master is needed
  // (promoteSelfMain is driven with postApply = null in every test below).
  write("dist/claude/.claude/tools/a.txt", "alpha\n");
  write("dist/codex/.agents/c.txt", "gamma\n");
  write("dist/cursor/.cursor/d.txt", "delta\n");
  write("dist/opencode/.opencode/e.txt", "epsilon\n");
  write("dist/kimi/.kimi-code/f.txt", "zeta\n");
  write("dist/pi/.pi/g.txt", "eta\n");
  write("dist/codex/AGENTS.md", "# AI-DLC on Codex CLI\n\ngenerated\n");
  write(".claude/CLAUDE.md", "# Claude onboarding\n");
  write("CLAUDE.md", `${PROJECT_INSTRUCTIONS}# Claude onboarding\n`);
  write(
    "AGENTS.md",
    "@.agents/rules/amadeus.md\n@.agents/rules/amadeus-codex-suffix.md\n\n# Project rules\n",
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "t516-promote-self-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("t516 promote-self codex hooks auto-activate (#2714)", () => {
  test("(i) example present, active absent → --apply creates the active file byte-identical to the example, and logs the creation", async () => {
    seedBaseFixture();
    write("dist/codex/.codex/hooks.json.example", HOOKS_EXAMPLE);

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: unknown) => {
      logs.push(String(msg));
    };
    let code: number;
    try {
      code = await promoteSelfMain(["--apply", "--no-build"], root, undefined, null);
    } finally {
      console.log = originalLog;
    }

    expect(code).toBe(0);
    const activePath = join(root, ".codex", "hooks.json");
    expect(existsSync(activePath)).toBe(true);
    expect(readFileSync(activePath, "utf-8")).toBe(HOOKS_EXAMPLE);
    expect(logs.some((line) => line.includes("created .codex/hooks.json"))).toBe(true);
  });

  test("(ii) active already present with customized bytes → --apply leaves it byte-unchanged and logs nothing", async () => {
    seedBaseFixture();
    write("dist/codex/.codex/hooks.json.example", HOOKS_EXAMPLE);
    const customized = JSON.stringify(
      { hooks: { Stop: [{ hooks: [{ type: "command", command: "bun ./my-own-hook.ts" }] }] } },
      null,
      2,
    ) + "\n";
    write(".codex/hooks.json", customized);

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: unknown) => {
      logs.push(String(msg));
    };
    let code: number;
    try {
      code = await promoteSelfMain(["--apply", "--no-build"], root, undefined, null);
    } finally {
      console.log = originalLog;
    }

    expect(code).toBe(0);
    const activePath = join(root, ".codex", "hooks.json");
    expect(readFileSync(activePath, "utf-8")).toBe(customized);
    expect(logs.some((line) => line.includes("created .codex/hooks.json"))).toBe(false);
  });

  test("(iii) codex projection ships no hooks.json.example → --apply creates nothing under .codex/hooks.json and does not throw", async () => {
    seedBaseFixture();
    write("dist/codex/.codex/other.txt", "beta\n"); // codex dist dir exists, but no hooks.json.example

    const code = await promoteSelfMain(["--apply", "--no-build"], root, undefined, null);

    expect(code).toBe(0);
    expect(existsSync(join(root, ".codex", "hooks.json.example"))).toBe(false);
    expect(existsSync(join(root, ".codex", "hooks.json"))).toBe(false);
  });

  test("(iv) a non-EEXIST copy failure is rethrown loud, not swallowed as preserved", () => {
    // Driven through the exported helper directly: inside --apply an unwritable
    // .codex/ already fails the managed sync before activation is reached, so
    // the rethrow arm is only reachable at this seam. The contract it pins is
    // the same: a failure that is NOT a presence verdict must propagate,
    // because swallowing it would report a healthy bootstrap over a broken one.
    write(".codex/hooks.json.example", HOOKS_EXAMPLE);
    chmodSync(join(root, ".codex"), 0o555);
    try {
      expect(() => activateCodexHooksIfMissing(root)).toThrow();
    } finally {
      chmodSync(join(root, ".codex"), 0o755);
    }
    // Writable again: the same call now completes and reports the creation.
    expect(activateCodexHooksIfMissing(root)).toBe("created");
  });
});
