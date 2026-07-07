import { SUPPORTED_HARNESSES, type Harness, type ParseResult, type SetupCommandName, type SetupError } from "./types.ts";

const ACTION_COMMANDS = ["install", "upgrade"] as const;
const HELP_ALIASES = new Set(["--help", "-h", "help"]);

function isSupportedHarness(value: string): value is Harness {
  return (SUPPORTED_HARNESSES as readonly string[]).includes(value);
}

function setupError(error: Omit<SetupError, "noFilesModified">): ParseResult {
  return { ok: false, error: { ...error, noFilesModified: true } };
}

function optionValue(argv: string[], index: number, option: string): { ok: true; value: string; nextIndex: number } | { ok: false; error: ParseResult } {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    return {
      ok: false,
      error: setupError({
        code: "missing-option-value",
        message: `${option} requires a value.`,
        nextAction: "Run amadeus-setup --help for accepted options.",
        details: { option },
      }),
    };
  }
  return { ok: true, value, nextIndex: index + 1 };
}

function splitOption(token: string): { option: string; value?: string } {
  const equalsIndex = token.indexOf("=");
  if (equalsIndex === -1) {
    return { option: token };
  }
  return {
    option: token.slice(0, equalsIndex),
    value: token.slice(equalsIndex + 1),
  };
}

export function parseCommand(argv: string[]): ParseResult {
  if (argv.length === 0) {
    return { ok: true, kind: "help", help: { reason: "no-command" } };
  }
  if (argv.some((token) => HELP_ALIASES.has(token))) {
    return { ok: true, kind: "help", help: { reason: "explicit" } };
  }

  let command: SetupCommandName | undefined;
  let harness: Harness | undefined;
  let hasHarness = false;
  let target: string | undefined;
  let version: string | undefined;
  let yes = false;
  let force = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith("-")) {
      if (token === "init") {
        return setupError({
          code: "unsupported-command",
          message: "`init` is not a setup command in this release. Use `install` for first-time setup.",
          nextAction: "Run amadeus-setup install.",
          details: { command: token },
        });
      }
      if ((ACTION_COMMANDS as readonly string[]).includes(token)) {
        if (command !== undefined) {
          return setupError({
            code: "multiple-commands",
            message: "Run exactly one setup action per invocation.",
            nextAction: "Run one command with either install or upgrade.",
            details: { firstCommand: command, extraCommand: token },
          });
        }
        command = token as SetupCommandName;
        continue;
      }
      return setupError({
        code: "unknown-command",
        message: `Unknown setup command: ${token}. Supported commands are install and upgrade.`,
        nextAction: "Run amadeus-setup --help.",
        details: { command: token },
      });
    }

    const { option, value } = splitOption(token);
    if (option === "--yes" || option === "-y") {
      yes = true;
      continue;
    }
    if (option === "--force") {
      force = true;
      continue;
    }
    if (option === "--harness") {
      if (hasHarness) {
        return setupError({
          code: "duplicate-harness",
          message: "Only one --harness value is allowed per invocation.",
          nextAction: "Run one command per harness.",
        });
      }
      const parsedValue = value === undefined ? optionValue(argv, i, option) : { ok: true as const, value, nextIndex: i };
      if (!parsedValue.ok) {
        return parsedValue.error;
      }
      i = parsedValue.nextIndex;
      if (!isSupportedHarness(parsedValue.value)) {
        return setupError({
          code: "unsupported-harness",
          message: `Unsupported harness: ${parsedValue.value}. Supported harnesses are ${SUPPORTED_HARNESSES.join(", ")}.`,
          nextAction: "Pick claude, codex, kiro, or kiro-ide.",
          details: { harness: parsedValue.value },
        });
      }
      harness = parsedValue.value;
      hasHarness = true;
      continue;
    }
    if (option === "--target") {
      const parsedValue = value === undefined ? optionValue(argv, i, option) : { ok: true as const, value, nextIndex: i };
      if (!parsedValue.ok) {
        return parsedValue.error;
      }
      i = parsedValue.nextIndex;
      target = parsedValue.value;
      continue;
    }
    if (option === "--version") {
      const parsedValue = value === undefined ? optionValue(argv, i, option) : { ok: true as const, value, nextIndex: i };
      if (!parsedValue.ok) {
        return parsedValue.error;
      }
      i = parsedValue.nextIndex;
      version = parsedValue.value;
      continue;
    }

    return setupError({
      code: "unknown-option",
      message: `Unknown option: ${option}.`,
      nextAction: "Run amadeus-setup --help for accepted options.",
      details: { option },
    });
  }

  if (command === undefined) {
    return { ok: true, kind: "help", help: { reason: "no-command" } };
  }

  return {
    ok: true,
    kind: "command",
    command: {
      command,
      harness,
      target,
      version,
      yes,
      force,
    },
  };
}
