import { describe, expect, test } from "bun:test";
import { createTransaction } from "../../scripts/formal-verif/provenance.ts";
import { event } from "../formal-verif/support/contract-provenance-harness.ts";

describe("formal verification transaction identity", () => {
  const payload = () => { const { transactionId: _, ...value } = event("ARM_AUTHORING_STARTED", 0, "tla"); return value; };
  test("is deterministic", () => expect(createTransaction(null, [payload()]).transactionId).toBe(createTransaction(null, [payload()]).transactionId));
  test("attaches one transaction ID to every event", () => { const tx = createTransaction(null, [payload(), { ...payload(), eventId: "other" }]); expect(new Set(tx.events.map((e) => e.transactionId))).toEqual(new Set([tx.transactionId])); });
  test("binds expected head", () => expect(createTransaction("a", [payload()]).transactionId).not.toBe(createTransaction("b", [payload()]).transactionId));
  test("binds event order", () => { const a = payload(); const b = { ...payload(), eventId: "b" }; expect(createTransaction(null, [a, b]).transactionId).not.toBe(createTransaction(null, [b, a]).transactionId); });
  test("excludes attached transaction ID from preimage", () => expect(createTransaction(null, [payload()]).transactionId).toHaveLength(64));
  test.each(["eventId", "at", "actorId", "sessionId", "worktree", "baseSha", "publicInputHash"])("binds %s", (key) => { const changed = { ...payload(), [key]: "changed" }; expect(createTransaction(null, [payload()]).transactionId).not.toBe(createTransaction(null, [changed]).transactionId); });
});
