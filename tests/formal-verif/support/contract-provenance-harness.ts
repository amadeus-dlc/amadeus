import type { CommandHandler, CommandKind, ExperimentCommand } from "../../../scripts/formal-verif/dispatcher.ts";
import { COMMAND_KINDS, CommandRouter, HandlerRegistry } from "../../../scripts/formal-verif/dispatcher.ts";
import type { ProvenanceEvent } from "../../../scripts/formal-verif/provenance.ts";

export function handlers(calls: string[] = []): readonly (readonly [CommandKind, CommandHandler])[] {
  return COMMAND_KINDS.map((kind) => [kind, { identity: `fake:${kind}`, handle: async (command) => { calls.push(command.kind); return { ok: true, value: { commandIdentity: command.kind, handlerIdentity: `fake:${kind}` } }; } }] as const);
}

export function router(calls: string[] = []): CommandRouter { return new CommandRouter(new HandlerRegistry(handlers(calls))); }

export function event(kind: ProvenanceEvent["kind"], sequence: number, arm?: "tla" | "ts"): ProvenanceEvent {
  const hash = "a".repeat(64);
  const base = {
    eventId: `${sequence}-${kind}`, transactionId: "tx", kind, at: `2026-07-20T00:00:0${sequence}Z`, sequence,
    actorId: "actor", sessionId: "session", worktree: "runs/u1", baseSha: "b".repeat(40), publicInputHash: hash,
  };
  const inputProof = { publicInputHash: hash, actualInputManifestIdentity: hash, actualInputManifestRef: "evidence/public-input.json", forbiddenScanReceiptIdentity: "2".repeat(64), forbiddenMatchCount: 0 as const, clean: true as const };
  if (kind === "ARM_AUTHORING_STARTED") return { ...base, kind, arm: arm ?? "tla", proof: inputProof };
  if (kind === "ARM_FROZEN") return { ...base, kind, arm: arm ?? "tla", proof: { ...inputProof, testsGreen: true, freezeSha: "c".repeat(64), ownedPathsHash: "d".repeat(64), testsReceiptIdentity: "3".repeat(64), freezeCommitVerified: true } };
  if (kind === "FIXTURE_REVEALED") return { ...base, kind, arm: "tla", frozenEventId: "1-ARM_FROZEN", disclosureHash: "e".repeat(64) };
  if (kind === "SKELETON_PASSED") return { ...base, kind, cellResultIdentity: "f".repeat(64), evidenceBundleHash: "1".repeat(64) };
  return { ...base, kind, reason: "skeleton failed", evidenceBundleHash: "1".repeat(64) };
}

export function happyEvents(): ProvenanceEvent[] {
  return [event("ARM_AUTHORING_STARTED", 0, "tla"), event("ARM_FROZEN", 1, "tla"), event("FIXTURE_REVEALED", 2, "tla"), event("SKELETON_PASSED", 3), event("ARM_AUTHORING_STARTED", 4, "ts"), event("ARM_FROZEN", 5, "ts")];
}

if (import.meta.main) {
  const { createTransaction, foldLedger, promotionPermission } = await import("../../../scripts/formal-verif/provenance.ts");
  const { decodeCommand } = await import("../../../scripts/formal-verif/dispatcher.ts");
  const scenario = process.argv[2] ?? "happy";
  let result: unknown;
  if (scenario === "happy") {
    const folded = foldLedger(happyEvents());
    result = folded.ok ? promotionPermission(folded.value) : folded;
  } else if (scenario === "skeleton-failure") {
    result = foldLedger([...happyEvents().slice(0, 3), event("SKELETON_FAILED", 3)]);
  } else if (scenario === "dirty-freeze") {
    const events = happyEvents().slice(0, 2); const frozen = events[1]; events[1] = { ...frozen, proof: { ...("proof" in frozen ? frozen.proof : {}), clean: false } } as never; result = foldLedger(events);
  } else if (scenario === "private-input") {
    const events = happyEvents().slice(0, 1); const started = events[0]; events[0] = { ...started, proof: { ...("proof" in started ? started.proof : {}), forbiddenMatchCount: 1 } } as never; result = foldLedger(events);
  } else if (scenario === "retry") {
    const payload = happyEvents().slice(0, 1).map(({ transactionId: _, ...value }) => value);
    const first = createTransaction(null, payload).transactionId;
    const second = createTransaction(null, payload.map((value) => ({ ...value }))).transactionId;
    result = { ok: true, same: first === second };
  } else if (scenario === "bad-order") {
    result = foldLedger([event("ARM_FROZEN", 0, "tla")]);
  } else if (scenario === "capacity") {
    result = foldLedger([...happyEvents(), event("SKELETON_PASSED", 6)]);
  } else if (scenario === "unknown-command") {
    result = decodeCommand(["unknown"]);
  } else if (scenario === "single-dispatch") {
    const calls: string[] = []; result = await router(calls).dispatch(["run", "fixture"], { ledger: [], proof: {} }).then((value) => ({ ...value, calls }));
  } else if (scenario === "pipeline") {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { FsProvenanceStoreAdapter } = await import("../../../scripts/formal-verif/fs-provenance-store.ts");
    const root = mkdtempSync(join(tmpdir(), "fv-pipeline-"));
    const calls: string[] = [];
    const entries = handlers(calls).map(([kind, handler]) => kind === "request-promotion" ? [kind, { ...handler, handle: async (command: ExperimentCommand) => {
      calls.push(command.kind);
      const store = new FsProvenanceStoreAdapter(root);
      const payload = happyEvents().slice(0, 1).map(({ transactionId: _, ...value }) => value);
      const tx = createTransaction(null, payload);
      const committed = await store.appendBatch(null, tx.transactionId, tx.events);
      return committed.ok
        ? { ok: true as const, value: { commandIdentity: command.kind, handlerIdentity: "filesystem-store", detail: committed.value.head } }
        : { ok: false as const, error: { kind: "DependencyError" as const, message: committed.error.message } };
    } }] as const : [kind, handler] as const);
    const dispatched = await new CommandRouter(new HandlerRegistry(entries)).dispatch(["request-promotion"], { ledger: happyEvents(), proof: { ledgerHead: "5-ARM_FROZEN", promotionLedgerHead: "5-ARM_FROZEN" } });
    result = { ...dispatched, calls };
    rmSync(root, { recursive: true, force: true });
  } else if (scenario === "store-crash-child") {
    const { FsProvenanceStoreAdapter } = await import("../../../scripts/formal-verif/fs-provenance-store.ts");
    const root = process.argv[3];
    const targetKind = process.argv[4];
    const targetPhase = process.argv[5];
    if (!root || !targetKind || !targetPhase) throw new Error("missing crash scenario arguments");
    const payload = [event("ARM_AUTHORING_STARTED", 0, "tla")].map(({ transactionId: _, ...value }) => value);
    const tx = createTransaction(null, payload);
    const store = new FsProvenanceStoreAdapter(root, "default", (kind, phase) => {
      if (kind === targetKind && phase === targetPhase) process.kill(process.pid, "SIGKILL");
    });
    result = await store.appendBatch(null, tx.transactionId, tx.events);
  } else if (scenario === "response-loss") {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { FsProvenanceStoreAdapter } = await import("../../../scripts/formal-verif/fs-provenance-store.ts");
    const root = mkdtempSync(join(tmpdir(), "fv-response-loss-"));
    let injected = false;
    const store = new FsProvenanceStoreAdapter(root, "default", (kind, phase) => { if (!injected && kind === "successor" && phase === "after-rename") { injected = true; throw new Error("response-lost"); } });
    const payload = [event("ARM_AUTHORING_STARTED", 0, "tla")].map(({ transactionId: _, ...value }) => value);
    const tx = createTransaction(null, payload);
    const first = await store.appendBatch(null, tx.transactionId, tx.events);
    const recovered = await store.findTransaction(tx.transactionId);
    result = { ok: !first.ok && recovered.ok && recovered.value !== null, recoveredHead: recovered.ok ? recovered.value?.head : null };
    rmSync(root, { recursive: true, force: true });
  } else {
    result = { ok: false, error: { kind: "ScenarioError" } };
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
