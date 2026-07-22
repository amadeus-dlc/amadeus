import { describe, expect, test } from "bun:test";
import { type CommandHandler, type CommandKind, COMMAND_KINDS } from "../../scripts/formal-verif/dispatcher.ts";
import {
  FINAL_COMPOSITION_STATUS,
  type HandlerBinding,
  composeFinalCli,
  verifyWiring,
} from "../../scripts/formal-verif/final-cli-root.ts";

const handlerFor = (kind: CommandKind, calls: string[] = [], override?: Partial<CommandHandler>): CommandHandler => ({
  identity: `concrete:${kind}`,
  handle: async (command) => { calls.push(command.kind); return { ok: true as const, value: { commandIdentity: command.kind, handlerIdentity: `concrete:${kind}` } }; },
  ...override,
});
const fullBindings = (calls: string[] = []): HandlerBinding[] => COMMAND_KINDS.map((command) => ({ command, handler: handlerFor(command, calls), adapterIdentity: `adapter:${command}` }));

describe("wiring-only final CLI root", () => {
  test("stays DESIGNED_BLOCKED on the final FD gate", () => {
    expect(FINAL_COMPOSITION_STATUS).toBe("DESIGNED_BLOCKED_ON_FINAL_FD_GATE");
    const composed = composeFinalCli(fullBindings());
    expect(composed.ok && composed.value.status).toBe("DESIGNED_BLOCKED_ON_FINAL_FD_GATE");
  });
  test("injects exactly one handler per closed command", () => {
    const composed = composeFinalCli(fullBindings());
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.value.registry.handlers.size).toBe(COMMAND_KINDS.length);
    const verification = verifyWiring(composed.value);
    expect(verification.closedCommandSet).toBe(true);
    expect(verification.uniqueHandlers).toBe(true);
    expect(verification.bindingCount).toBe(COMMAND_KINDS.length);
  });
  test("a missing handler is rejected", () => {
    const result = composeFinalCli(fullBindings().slice(1));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("MISSING");
  });
  test("a duplicate command binding is rejected", () => {
    const bindings = fullBindings();
    const result = composeFinalCli([...bindings, { command: bindings[0]!.command, handler: handlerFor(bindings[0]!.command), adapterIdentity: "dup" }]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("DUPLICATE");
  });
  test("an unknown command binding is rejected", () => {
    const bindings = fullBindings();
    const result = composeFinalCli([...bindings.slice(1), { command: "not-a-command" as CommandKind, handler: handlerFor("evaluate"), adapterIdentity: "x" }]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("UNKNOWN");
  });
  test("handler identity reuse is surfaced as a non-unique wiring", () => {
    const shared = handlerFor("evaluate");
    const bindings = COMMAND_KINDS.map((command) => ({ command, handler: { ...shared, identity: "shared" }, adapterIdentity: `adapter:${command}` }));
    const composed = composeFinalCli(bindings);
    expect(composed.ok && verifyWiring(composed.value).uniqueHandlers).toBe(false);
  });
  test("a handler typed error and exit meaning propagate unchanged through the root", async () => {
    const calls: string[] = [];
    const bindings = fullBindings(calls).map((binding) => binding.command === "evaluate"
      ? { ...binding, handler: { identity: "concrete:evaluate", handle: async () => ({ ok: false as const, error: { kind: "DependencyError" as const, message: "downstream failed" } }) } }
      : binding);
    const composed = composeFinalCli(bindings);
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    const dispatched = await composed.value.router.dispatch(["evaluate"], { ledger: [], proof: {} });
    expect(dispatched.ok).toBe(false);
    expect(!dispatched.ok && dispatched.error.kind).toBe("DependencyError");
    expect(!dispatched.ok && dispatched.error.message).toBe("downstream failed");
  });
});
