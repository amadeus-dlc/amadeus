import { describe, expect, test } from "bun:test";
import { foldLedger, promotionPermission } from "../../scripts/formal-verif/provenance.ts";
import { receiptIdentity } from "../../scripts/formal-verif/receipt.ts";
import { happyEvents, router } from "../formal-verif/support/contract-provenance-harness.ts";

describe("formal verification contract dispatch seam", () => {
  test("decodes and dispatches one command", async () => { const calls: string[] = []; expect((await router(calls).dispatch(["run", "healthy"], { ledger: [], proof: {} })).ok).toBe(true); expect(calls).toEqual(["run"]); });
  test("folds the complete public lifecycle", () => { const result = foldLedger(happyEvents()); expect(result.ok && result.value.state).toBe("S_FROZEN"); });
  test("derives permission without invoking promotion", () => { const result = foldLedger(happyEvents()); if (!result.ok) throw new Error("fold"); expect(promotionPermission(result.value).ok).toBe(true); });
  test("creates a safe trace identity", () => expect(receiptIdentity({ commandIdentity: "run", preState: "T_FROZEN", postState: "T_FROZEN", secret: "drop" }).safe).not.toHaveProperty("secret"));
  test.each(["fixture-seal", "fetch-tlc", "run", "benchmark", "evaluate", "report"])("routes non-policy %s to only its fake port", async (kind) => { const calls: string[] = []; await router(calls).dispatch(kind === "run" ? [kind, "fixture"] : [kind], { ledger: [], proof: {} }); expect(calls).toEqual([kind]); });
  test.each([
    [["start", "tla"], [], { ledgerHead: null, publicInputHash: "a".repeat(64), actualInputManifestIdentity: "a".repeat(64), forbiddenMatchCount: 0 }],
    [["freeze", "tla"], happyEvents().slice(0, 1), { ledgerHead: "0-ARM_AUTHORING_STARTED", publicInputHash: "a".repeat(64), actualInputManifestIdentity: "a".repeat(64), forbiddenMatchCount: 0 }],
    [["reveal"], happyEvents().slice(0, 2), { ledgerHead: "1-ARM_FROZEN", frozenEventId: "1-ARM_FROZEN" }],
    [["record-skeleton", "pass"], happyEvents().slice(0, 3), { ledgerHead: "2-FIXTURE_REVEALED", skeletonEvidenceIdentity: "e".repeat(64) }],
    [["request-promotion"], happyEvents(), { ledgerHead: "5-ARM_FROZEN", promotionLedgerHead: "5-ARM_FROZEN" }],
  ] as const)("runs fold and proof before policy handler %s", async (argv, ledger, proof) => { const calls: string[] = []; expect((await router(calls).dispatch(argv, { ledger, proof })).ok).toBe(true); expect(calls).toEqual([argv[0]]); });
  test("rejects stale reveal and promotion proof heads before handler", async () => { const calls: string[] = []; expect((await router(calls).dispatch(["reveal"], { ledger: happyEvents().slice(0, 2), proof: { ledgerHead: "1-ARM_FROZEN", frozenEventId: "stale" } })).ok).toBe(false); expect((await router(calls).dispatch(["request-promotion"], { ledger: happyEvents(), proof: { ledgerHead: "5-ARM_FROZEN", promotionLedgerHead: "stale" } })).ok).toBe(false); expect(calls).toEqual([]); });
});
