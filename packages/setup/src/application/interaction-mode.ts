import type { SetupCommand } from "../domain/installer-contracts.ts";
import type { InteractionMode } from "../domain/plan-types.ts";

export function interactionAllowsPrompts(command: SetupCommand, stdinIsTTY: boolean): boolean {
  return !command.yes && stdinIsTTY;
}

export function interactionMode(command: SetupCommand, stdinIsTTY: boolean): InteractionMode {
  return command.yes || !stdinIsTTY ? "non-interactive" : "interactive";
}
