// covers: modules:setup-wizard
// size: small
//
// runWizard — asks only for missing fields (BR-I17), confirms before
// returning, and rejecting confirmation is an explicit abort (BR-I18).

import { describe, expect, test } from "bun:test";
import { runWizard } from "../../packages/setup/src/modules/wizard.ts";
import type { TtyIO } from "../../packages/setup/src/ports/tty.ts";
import { ParsedCommand } from "../../packages/setup/src/domain/command.ts";

function parseOk(argv: string[]) {
  const result = ParsedCommand.parse(argv);
  if (result.type === "err") throw new Error("fixture setup: unexpected parse error");
  return result.value;
}

function fakeTty(overrides: Partial<TtyIO> = {}): { tty: TtyIO; calls: string[] } {
  const calls: string[] = [];
  const tty: TtyIO = {
    isTTY: true,
    async select(prompt, options) {
      calls.push(`select:${prompt}`);
      return options[0] as string;
    },
    async input(prompt, defaultValue) {
      calls.push(`input:${prompt}`);
      return defaultValue;
    },
    async confirm() {
      calls.push("confirm");
      return true;
    },
    ...overrides,
  };
  return { tty, calls };
}

describe("runWizard — asks only for missing fields (BR-I17)", () => {
  test("asks for harness and target when both are missing", async () => {
    const parsed = parseOk(["install"]);
    const { tty, calls } = fakeTty();
    const result = await runWizard(parsed, ["harness", "target"], tty);
    expect(result.type).toBe("ok");
    expect(calls.some((c) => c.startsWith("select:"))).toBe(true);
    expect(calls.some((c) => c.startsWith("input:"))).toBe(true);
  });

  test("does not re-prompt for a harness the user already supplied", async () => {
    const parsed = parseOk(["install", "--harness", "claude"]);
    const { tty, calls } = fakeTty();
    const result = await runWizard(parsed, ["target"], tty);
    expect(result.type).toBe("ok");
    if (result.type === "ok") expect(result.value.harness as string).toBe("claude");
    expect(calls.some((c) => c.startsWith("select:"))).toBe(false);
    expect(calls.some((c) => c.startsWith("input:"))).toBe(true);
  });
});

describe("runWizard — subcommand-specific confirmation wording (U3)", () => {
  test("an install command asks to 'Install ... into ...'", async () => {
    const parsed = parseOk(["install", "--harness", "claude", "--target", "/tmp/x"]);
    let prompt = "";
    const { tty } = fakeTty({
      async confirm(p: string) {
        prompt = p;
        return true;
      },
    });
    await runWizard(parsed, [], tty);
    expect(prompt).toContain("Install");
    expect(prompt).toContain("into");
  });

  test("an upgrade command asks to 'Upgrade ... in ...' instead", async () => {
    const parsed = parseOk(["upgrade", "--harness", "claude", "--target", "/tmp/x"]);
    let prompt = "";
    const { tty } = fakeTty({
      async confirm(p: string) {
        prompt = p;
        return true;
      },
    });
    await runWizard(parsed, [], tty);
    expect(prompt).toContain("Upgrade");
    expect(prompt).not.toContain("Install");
  });
});

describe("runWizard — confirmation (BR-I18)", () => {
  test("rejecting the final confirmation aborts (no InstallInputs is returned)", async () => {
    const parsed = parseOk(["install"]);
    const { tty } = fakeTty({
      async confirm() {
        return false;
      },
    });
    const result = await runWizard(parsed, ["harness", "target"], tty);
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error).toBe("wizard-aborted");
  });

  test("edge case: a fully-specified command still confirms before returning", async () => {
    const parsed = parseOk(["install", "--harness", "claude", "--target", "/tmp/x"]);
    const { tty, calls } = fakeTty();
    const result = await runWizard(parsed, [], tty);
    expect(result.type).toBe("ok");
    expect(calls).toEqual(["confirm"]);
  });
});
