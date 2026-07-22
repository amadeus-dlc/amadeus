import { describe, expect, test } from "bun:test";
import { COMMAND_KINDS, CommandRouter, decodeCommand, HandlerRegistry, type ExperimentCommand } from "../../scripts/formal-verif/dispatcher.ts";
import { handlers } from "../formal-verif/support/contract-provenance-harness.ts";

const emptyContext = { ledger: [], proof: {} } as const;

describe("formal verification generic dispatcher", () => {
  test.each(COMMAND_KINDS.filter((kind) => kind !== "start" && kind !== "freeze" && kind !== "record-skeleton" && kind !== "run"))("decodes %s", (kind) => expect(decodeCommand([kind]).ok).toBe(true));
  test.each([["start", "tla"], ["freeze", "ts"], ["record-skeleton", "pass"], ["record-skeleton", "fail"], ["run", "fixture-1"]])("decodes closed %s command", (kind, argument) => expect(decodeCommand([kind, argument]).ok).toBe(true));
  test.each(["start", "freeze", "record-skeleton", "run"])("rejects missing required %s argument", (kind) => expect(decodeCommand([kind]).ok).toBe(false));
  test("rejects unknown command", () => expect(decodeCommand(["unknown"]).ok).toBe(false));
  test("rejects empty argv", () => expect(decodeCommand([]).ok).toBe(false));
  test("rejects empty arguments", () => expect(decodeCommand(["run", ""]).ok).toBe(false));
  test("rejects surplus arguments", () => expect(decodeCommand(["run", "one", "two"]).ok).toBe(false));
  test("requires exact handlers", () => expect(() => new HandlerRegistry(handlers().slice(1))).toThrow());
  test("rejects duplicate handlers", () => expect(() => new HandlerRegistry([...handlers(), handlers()[0]])).toThrow());
  test("routes exactly once", async () => { const calls: string[] = []; const result = await new CommandRouter(new HandlerRegistry(handlers(calls))).dispatch(["run", "x"], emptyContext); expect(result.ok).toBe(true); expect(calls).toEqual(["run"]); });
  test("counts no more than one handler call", async () => { const counters = { handlerCalls: 0 }; await new CommandRouter(new HandlerRegistry(handlers()), counters).dispatch(["run", "fixture"], emptyContext); expect(counters.handlerCalls).toBe(1); });
  test("never calls a handler after decode, fold, or proof rejection", async () => { const counters = { handlerCalls: 0 }; const router = new CommandRouter(new HandlerRegistry(handlers()), counters); await router.dispatch(["run", "one", "two"], emptyContext); await router.dispatch(["run"], { ledger: [{ eventId: "malformed" }] as never, proof: {} }); await router.dispatch(["start"], emptyContext); expect(counters.handlerCalls).toBe(0); });
  test("preserves dependency error", async () => { const entries = handlers().map(([kind, handler]) => kind === "run" ? [kind, { ...handler, handle: async () => ({ ok: false as const, error: { kind: "DependencyError" as const, message: "down", causeIdentity: "cause" } }) }] as const : [kind, handler] as const); const result = await new CommandRouter(new HandlerRegistry(entries)).dispatch(["run", "fixture"], emptyContext); expect(result).toEqual({ ok: false, error: { kind: "DependencyError", message: "down", causeIdentity: "cause" } }); });
  test("rejects Arm S as the initial authoring command", async () => { const calls: string[] = []; const result = await new CommandRouter(new HandlerRegistry(handlers(calls))).dispatch(["start", "ts"], { ledger: [], proof: { ledgerHead: null, publicInputHash: "a".repeat(64), actualInputManifestIdentity: "a".repeat(64), forbiddenMatchCount: 0 } }); expect(result.ok).toBe(false); expect(calls).toEqual([]); });
  test("passes deadline identity unchanged", async () => { let seen = ""; const entries = handlers().map(([kind, handler]) => kind === "benchmark" ? [kind, { ...handler, handle: async (command: ExperimentCommand) => { seen = command.deadlineIdentity ?? ""; return { ok: true as const, value: { commandIdentity: "x", handlerIdentity: "fake" } }; } }] as const : [kind, handler] as const); await new CommandRouter(new HandlerRegistry(entries)).dispatch(["benchmark"], { ...emptyContext, deadlineIdentity: "120s:abc" }); expect(seen).toBe("120s:abc"); });
});
