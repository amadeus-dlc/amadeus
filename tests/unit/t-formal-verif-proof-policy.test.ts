import { describe, expect, test } from "bun:test";
import { ProofPolicyRegistry, validateCommandProof } from "../../scripts/formal-verif/proof-policy.ts";

describe("formal verification proof policy", () => {
  const hash = "a".repeat(64);
  const manifest = { ledgerHead: null, publicInputHash: hash, actualInputManifestIdentity: hash, forbiddenMatchCount: 0 };
  test("accepts complete start and freeze proofs in their states", () => { expect(validateCommandProof("start", "READY_FOR_T_AUTHORING", manifest, "tla", null).ok).toBe(true); expect(validateCommandProof("freeze", "T_AUTHORING", { ...manifest, ledgerHead: "head" }, "tla", "head").ok).toBe(true); });
  test("rejects start and freeze from invalid states", () => { expect(validateCommandProof("start", "T_AUTHORING", manifest, "tla", null).ok).toBe(false); expect(validateCommandProof("freeze", "READY_FOR_T_AUTHORING", manifest, "tla", null).ok).toBe(false); });
  test.each([{}, { ...manifest, actualInputManifestIdentity: "x" }, { ...manifest, forbiddenMatchCount: 1 }])("rejects invalid input proof %#", (proof) => expect(validateCommandProof("start", "READY_FOR_T_AUTHORING", proof, "tla", null).ok).toBe(false));
  test("requires freeze receipt to reveal", () => expect(validateCommandProof("reveal", "T_FROZEN", { ledgerHead: "head" }, undefined, "head").ok).toBe(false));
  test("accepts reveal in T_FROZEN with receipt", () => expect(validateCommandProof("reveal", "T_FROZEN", { ledgerHead: "head", frozenEventId: "e" }, undefined, "head").ok).toBe(true));
  test("requires skeleton evidence", () => expect(validateCommandProof("record-skeleton", "SKELETON_REVEALED", { ledgerHead: "head" }, undefined, "head").ok).toBe(false));
  test("requires canonical skeleton evidence identity", () => expect(validateCommandProof("record-skeleton", "SKELETON_REVEALED", { ledgerHead: "head", skeletonEvidenceIdentity: "e".repeat(64) }, undefined, "head").ok).toBe(true));
  test("requires promotion head", () => expect(validateCommandProof("request-promotion", "S_FROZEN", { ledgerHead: "head" }, undefined, "head").ok).toBe(false));
  test("rejects stale ledger head binding", () => expect(validateCommandProof("record-skeleton", "SKELETON_REVEALED", { ledgerHead: "stale", skeletonEvidenceIdentity: "e".repeat(64) }, undefined, "head").ok).toBe(false));
  test("constructs exact default registry", () => expect(new ProofPolicyRegistry().kinds).toHaveLength(5));
  test("rejects a missing policy", () => expect(() => new ProofPolicyRegistry(["start"])).toThrow());
  test("rejects duplicate policies", () => expect(() => new ProofPolicyRegistry(["start", "start", "freeze", "reveal", "record-skeleton", "request-promotion"])).toThrow());
});
