import type { Result } from "./contract.ts";
import { foldLedger, type ProvenanceEvent } from "./provenance.ts";
import { validateCommandProof, type CommandProof, type PolicyCommandKind } from "./proof-policy.ts";

export const COMMAND_KINDS = ["fixture-seal", "start", "freeze", "reveal", "record-skeleton", "request-promotion", "fetch-tlc", "run", "benchmark", "evaluate", "report"] as const;
export type CommandKind = (typeof COMMAND_KINDS)[number];
type NoArgCommandKind = Exclude<CommandKind, "start" | "freeze" | "record-skeleton" | "run">;
export type ExperimentCommand =
  | { kind: "start" | "freeze"; arm: "tla" | "ts"; args: readonly ["tla" | "ts"]; deadlineIdentity?: string }
  | { kind: "record-skeleton"; outcome: "pass" | "fail"; args: readonly ["pass" | "fail"]; deadlineIdentity?: string }
  | { kind: "run"; fixtureId: string; args: readonly [string]; deadlineIdentity?: string }
  | { kind: NoArgCommandKind; args: readonly []; deadlineIdentity?: string };
export interface CommandContext { ledger: readonly ProvenanceEvent[]; proof: CommandProof; deadlineIdentity?: string }
export interface CommandReceipt { commandIdentity: string; handlerIdentity: string; detail?: string }
export interface ExperimentError { kind: "CommandError" | "HandlerRegistryError" | "DependencyError"; message: string; causeIdentity?: string }
export interface CommandHandler { identity: string; handle(command: ExperimentCommand): Promise<Result<CommandReceipt, ExperimentError>> }
export interface DispatchCounters { handlerCalls: number }

export function decodeCommand(argv: readonly string[]): Result<ExperimentCommand, ExperimentError> {
  const kind = argv[0];
  if (!kind || !COMMAND_KINDS.includes(kind as CommandKind)) return { ok: false, error: { kind: "CommandError", message: "unknown command" } };
  if (argv.some((arg) => arg.length === 0)) return { ok: false, error: { kind: "CommandError", message: "empty argument" } };
  if (kind === "start" || kind === "freeze") {
    if (argv.length !== 2 || (argv[1] !== "tla" && argv[1] !== "ts")) return { ok: false, error: { kind: "CommandError", message: `${kind} requires exactly one arm` } };
    return { ok: true, value: { kind, arm: argv[1], args: [argv[1]] } };
  }
  if (kind === "run") {
    if (argv.length !== 2) return { ok: false, error: { kind: "CommandError", message: "run requires exactly one fixture" } };
    return { ok: true, value: { kind, fixtureId: argv[1]!, args: [argv[1]!] } };
  }
  if (kind === "record-skeleton") {
    if (argv.length !== 2 || (argv[1] !== "pass" && argv[1] !== "fail")) return { ok: false, error: { kind: "CommandError", message: "record-skeleton requires exactly one pass/fail outcome" } };
    return { ok: true, value: { kind, outcome: argv[1], args: [argv[1]] } };
  }
  if (argv.length !== 1) return { ok: false, error: { kind: "CommandError", message: `${kind} accepts no arguments` } };
  return { ok: true, value: { kind: kind as NoArgCommandKind, args: [] } };
}

export class HandlerRegistry {
  readonly handlers: ReadonlyMap<CommandKind, CommandHandler>;
  constructor(entries: readonly (readonly [CommandKind, CommandHandler])[]) {
    const map = new Map(entries);
    if (map.size !== entries.length || map.size !== COMMAND_KINDS.length || COMMAND_KINDS.some((kind) => !map.has(kind))) throw new Error("handler registry must contain every command exactly once");
    this.handlers = map;
  }
}

export class CommandRouter {
  constructor(private readonly registry: HandlerRegistry, private readonly counters?: DispatchCounters) {}
  async dispatch(argv: readonly string[], context: CommandContext): Promise<Result<CommandReceipt, ExperimentError>> {
    const decoded = decodeCommand(argv);
    if (!decoded.ok) return decoded;
    const folded = foldLedger(context.ledger);
    if (!folded.ok) return { ok: false, error: { kind: "CommandError", message: folded.error.message } };
    const command = { ...decoded.value, deadlineIdentity: context.deadlineIdentity };
    if (["start", "freeze", "reveal", "record-skeleton", "request-promotion"].includes(command.kind)) {
      const arm = command.kind === "start" || command.kind === "freeze" ? command.arm : undefined;
      const proof = validateCommandProof(command.kind as PolicyCommandKind, folded.value.state, context.proof, arm, folded.value.head);
      if (!proof.ok) return { ok: false, error: { kind: "CommandError", message: proof.error.message } };
      if (command.kind === "reveal" && context.proof.frozenEventId !== folded.value.head) return { ok: false, error: { kind: "CommandError", message: "freeze proof must bind the current ledger head" } };
      if (command.kind === "request-promotion" && context.proof.promotionLedgerHead !== folded.value.head) return { ok: false, error: { kind: "CommandError", message: "promotion proof must bind the current ledger head" } };
    }
    const handler = this.registry.handlers.get(command.kind);
    if (!handler) return { ok: false, error: { kind: "HandlerRegistryError", message: `missing ${command.kind}` } };
    if (this.counters) this.counters.handlerCalls++;
    return handler.handle(command);
  }
}
