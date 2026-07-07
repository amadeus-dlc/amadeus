import { stdin as processStdin } from "node:process";
import { createInteractivePromptPort } from "../adapters/interactive-prompt.ts";
import { parseCommand } from "../cli/command-parser.ts";
import { renderError, renderHelp } from "../cli/reporter.ts";
import { renderSetupResult } from "../cli/setup-result-renderer.ts";
import type { EntrypointResult, SetupCommand, SetupError } from "../cli/types.ts";

export type RunSetupDeps = {
  executeCommand?: (command: SetupCommand) => Promise<EntrypointResult>;
};

function unexpectedErrorResult(): EntrypointResult {
  const error: SetupError = {
    code: "unexpected-error",
    message: "An unexpected setup package error occurred.",
    nextAction: "Run amadeus-setup --help or retry with a supported command.",
    noFilesModified: true,
  };
  return {
    code: 1,
    stdout: "",
    stderr: `${renderError(error)}\n`,
  };
}

async function defaultExecuteCommand(command: SetupCommand): Promise<EntrypointResult> {
  const { executeSetupCommand } = await import("../application/setup-service.ts");
  const stdinIsTTY = processStdin.isTTY === true;
  const result = await executeSetupCommand(command, {
    stdinIsTTY,
    promptPort: createInteractivePromptPort(stdinIsTTY),
  });
  return renderSetupResult(result);
}

export async function runSetup(argv: string[], _env: Record<string, string | undefined>, deps: RunSetupDeps = {}): Promise<EntrypointResult> {
  try {
    const parsed = parseCommand(argv);
    if (!parsed.ok) {
      return {
        code: 2,
        stdout: "",
        stderr: `${renderError(parsed.error)}\n`,
      };
    }
    if (parsed.kind === "help") {
      return {
        code: 0,
        stdout: `${renderHelp()}\n`,
        stderr: "",
      };
    }
    const executeCommand = deps.executeCommand ?? defaultExecuteCommand;
    return await executeCommand(parsed.command);
  } catch {
    return unexpectedErrorResult();
  }
}
