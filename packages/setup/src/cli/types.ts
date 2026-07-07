import type { SetupCommand, SetupError } from "../domain/installer-contracts.ts";

export {
  SUPPORTED_HARNESSES,
  type EntrypointResult,
  type Harness,
  type SetupCommand,
  type SetupCommandName,
  type SetupError,
  type SetupExitCode,
} from "../domain/installer-contracts.ts";

export type HelpRequest = {
  reason: "explicit" | "no-command";
};

export type ParseResult =
  | { ok: true; kind: "command"; command: SetupCommand }
  | { ok: true; kind: "help"; help: HelpRequest }
  | { ok: false; error: SetupError };
