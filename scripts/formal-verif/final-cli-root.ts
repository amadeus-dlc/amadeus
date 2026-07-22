import type { Result } from "./contract.ts";
import { type CommandHandler, type CommandKind, COMMAND_KINDS, CommandRouter, type DispatchCounters, HandlerRegistry } from "./dispatcher.ts";

// The final CLI root is wiring-only. It direct-imports and injects every concrete handler exactly
// once into the U1 dispatcher and owns nothing else: no eligibility, Pareto, Alloy, or report
// logic lives here. Because U3/U4/U5 have not passed a third review and U7 carries two residual
// Major findings, and no final FD human ruling has been given, the composition is permanently
// DESIGNED_BLOCKED and never claims integration readiness or completion.
export type FinalCompositionStatus = "DESIGNED_BLOCKED_ON_FINAL_FD_GATE";
export const FINAL_COMPOSITION_STATUS: FinalCompositionStatus = "DESIGNED_BLOCKED_ON_FINAL_FD_GATE";

export interface HandlerBinding { command: CommandKind; handler: CommandHandler; adapterIdentity: string }
export interface WiringError { kind: "WiringError"; code: "MISSING" | "DUPLICATE" | "UNKNOWN"; message: string }

export interface FinalCliComposition {
  status: FinalCompositionStatus;
  router: CommandRouter;
  registry: HandlerRegistry;
  bindings: readonly HandlerBinding[];
}

export interface WiringVerification { closedCommandSet: boolean; uniqueHandlers: boolean; bindingCount: number; commandCount: number }

export function composeFinalCli(bindings: readonly HandlerBinding[], counters?: DispatchCounters): Result<FinalCliComposition, WiringError> {
  const seen = new Set<CommandKind>();
  for (const binding of bindings) {
    if (!COMMAND_KINDS.includes(binding.command)) return { ok: false, error: { kind: "WiringError", code: "UNKNOWN", message: `unknown command ${binding.command}` } };
    if (seen.has(binding.command)) return { ok: false, error: { kind: "WiringError", code: "DUPLICATE", message: `duplicate handler for ${binding.command}` } };
    seen.add(binding.command);
  }
  const missing = COMMAND_KINDS.filter((command) => !seen.has(command));
  if (missing.length > 0) return { ok: false, error: { kind: "WiringError", code: "MISSING", message: `no handler for ${missing.join(",")}` } };
  const entries = bindings.map((binding) => [binding.command, binding.handler] as const);
  const registry = new HandlerRegistry(entries);
  return { ok: true, value: { status: FINAL_COMPOSITION_STATUS, router: new CommandRouter(registry, counters), registry, bindings } };
}

// Verifies the closed command union and the binding set are exactly equal and that no two bindings
// reuse a handler identity. The root never converts handler typed errors or exit status; the U1
// CommandRouter returns each handler Result unchanged, so error propagation is inherent.
export function verifyWiring(composition: FinalCliComposition): WiringVerification {
  const commands = new Set(composition.bindings.map((binding) => binding.command));
  const closedCommandSet = commands.size === COMMAND_KINDS.length && COMMAND_KINDS.every((command) => commands.has(command));
  const handlerIdentities = composition.bindings.map((binding) => binding.handler.identity);
  const uniqueHandlers = new Set(handlerIdentities).size === handlerIdentities.length;
  return { closedCommandSet, uniqueHandlers, bindingCount: composition.bindings.length, commandCount: COMMAND_KINDS.length };
}
