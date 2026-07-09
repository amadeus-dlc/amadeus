// covers: domain:setup-command
// size: small
//
// ParsedCommand.parse (CLI Contract symmetric grammar, flag validation) and
// InstallInputs.fromFlags. BR-I01~I06, FR-003/009/011.

import { describe, expect, test } from "bun:test";
import { InstallInputs, ParsedCommand } from "../../packages/setup/src/domain/command.ts";

function parseOk(argv: string[]) {
  const result = ParsedCommand.parse(argv);
  if (result.type === "err") throw new Error(`expected ok, got err: ${JSON.stringify(result.error)}`);
  return result.value;
}

describe("ParsedCommand.parse — symmetric grammar (BR-I01)", () => {
  test("no arguments parses as help, not an implicit install", () => {
    const parsed = parseOk([]);
    expect(parsed.subcommand).toBe("help");
  });

  test("edge case: an unrecognized first token is a usage error, not help", () => {
    const result = ParsedCommand.parse(["frobnicate"]);
    expect(result.type).toBe("err");
    if (result.type === "err") {
      expect(result.error.type).toBe("unknown-subcommand");
      if (result.error.type === "unknown-subcommand") expect(result.error.raw).toBe("frobnicate");
    }
  });

  test("install and upgrade both parse as their own subcommand", () => {
    expect(parseOk(["install", "--harness", "claude", "--target", "/tmp/x"]).subcommand).toBe("install");
    expect(parseOk(["upgrade", "--harness", "claude", "--target", "/tmp/x"]).subcommand).toBe("upgrade");
  });
});

describe("ParsedCommand.parse — flags", () => {
  test("edge case: an unknown flag is a usage error", () => {
    const result = ParsedCommand.parse(["install", "--bogus"]);
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.type).toBe("unknown-flag");
  });

  test("edge case: an invalid --harness value is a usage error", () => {
    const result = ParsedCommand.parse(["install", "--harness", "bogus"]);
    expect(result.type).toBe("err");
    if (result.type === "err") {
      expect(result.error.type).toBe("invalid-harness");
      if (result.error.type === "invalid-harness") expect(result.error.raw).toBe("bogus");
    }
  });

  test("edge case: two --harness flags is a multiple-harnesses usage error (FR-003)", () => {
    const result = ParsedCommand.parse(["install", "--harness", "claude", "--harness", "codex"]);
    expect(result.type).toBe("err");
    if (result.type === "err") {
      expect(result.error.type).toBe("multiple-harnesses");
      if (result.error.type === "multiple-harnesses") expect(result.error.raws).toEqual(["claude", "codex"]);
    }
  });

  test("edge case: an invalid --version value is a usage error", () => {
    const result = ParsedCommand.parse(["install", "--version", "not-a-version"]);
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.type).toBe("invalid-version");
  });

  test("a valid harness/target/version/yes/force combination parses cleanly", () => {
    const parsed = parseOk(["install", "--harness", "kiro", "--target", "/tmp/x", "--version", "1.2.3", "--yes", "--force"]);
    expect(parsed.harness as string | null).toBe("kiro");
    expect(parsed.target).toBe("/tmp/x");
    expect(parsed.yes).toBe(true);
    expect(parsed.force).toBe(true);
  });

  test("omitted --version defaults to VersionSpec.latest()", () => {
    const parsed = parseOk(["install", "--harness", "claude", "--target", "/tmp/x"]);
    expect(parsed.version.kind).toBe("latest");
  });
});

describe("ParsedCommand#isNonInteractive (BR-I02)", () => {
  test("--yes forces non-interactive even on a TTY", () => {
    const parsed = parseOk(["install", "--harness", "claude", "--target", "/tmp/x", "--yes"]);
    expect(parsed.isNonInteractive(true)).toBe(true);
  });

  test("a non-TTY stdin is non-interactive even without --yes", () => {
    const parsed = parseOk(["install", "--harness", "claude", "--target", "/tmp/x"]);
    expect(parsed.isNonInteractive(false)).toBe(true);
  });

  test("a TTY without --yes is interactive", () => {
    const parsed = parseOk(["install", "--harness", "claude", "--target", "/tmp/x"]);
    expect(parsed.isNonInteractive(true)).toBe(false);
  });

  test("--force alone does not imply non-interactive (FR-009)", () => {
    const parsed = parseOk(["install", "--harness", "claude", "--target", "/tmp/x", "--force"]);
    expect(parsed.isNonInteractive(true)).toBe(false);
  });
});

describe("ParsedCommand#missingRequiredFor (BR-I03)", () => {
  test("reports both harness and target missing", () => {
    const parsed = parseOk(["install"]);
    expect([...parsed.missingRequiredFor("non-interactive")].sort()).toEqual(["harness", "target"]);
  });

  test("reports nothing missing once both are supplied", () => {
    const parsed = parseOk(["install", "--harness", "claude", "--target", "/tmp/x"]);
    expect(parsed.missingRequiredFor("non-interactive")).toEqual([]);
  });
});

describe("InstallInputs.fromFlags (BR-I03 precondition)", () => {
  test("builds InstallInputs once harness and target are both present", () => {
    const parsed = parseOk(["install", "--harness", "claude", "--target", "/tmp/x"]);
    const inputs = InstallInputs.fromFlags(parsed);
    expect(inputs.target).toBe("/tmp/x");
    expect(inputs.harness as string).toBe("claude");
  });

  test("edge case: throws if harness/target are not both present (defect, not a user-facing error)", () => {
    const parsed = parseOk(["install"]);
    expect(() => InstallInputs.fromFlags(parsed)).toThrow();
  });
});
