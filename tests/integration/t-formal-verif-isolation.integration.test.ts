import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateCommandProof } from "../../scripts/formal-verif/proof-policy.ts";
import { validateRepositoryPath } from "../../scripts/formal-verif/repository-path-policy.ts";

describe("formal verification isolation seam", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));
  const root = () => { const value = mkdtempSync(join(tmpdir(), "fv-isolation-")); roots.push(value); mkdirSync(join(value, "scripts/formal-verif"), { recursive: true }); writeFileSync(join(value, "scripts/formal-verif/public.json"), "{}"); return value; };
  test("joins verified path and manifest proof", () => { const repo = root(); const hash = "a".repeat(64); expect(validateRepositoryPath(repo, "scripts/formal-verif/public.json", ["scripts/formal-verif"]).ok).toBe(true); expect(validateCommandProof("start", "READY_FOR_T_AUTHORING", { ledgerHead: null, publicInputHash: hash, actualInputManifestIdentity: hash, forbiddenMatchCount: 0 }, "tla", null).ok).toBe(true); });
  test.each([1, 2, 7])("rejects %i forbidden matches", (count) => expect(validateCommandProof("start", "READY_FOR_T_AUTHORING", { ledgerHead: null, publicInputHash: "h", actualInputManifestIdentity: "h", forbiddenMatchCount: count }, "tla", null).ok).toBe(false));
  test("rejects manifest identity drift", () => expect(validateCommandProof("freeze", "T_AUTHORING", { ledgerHead: "head", publicInputHash: "h", actualInputManifestIdentity: "other", forbiddenMatchCount: 0 }, "tla", "head").ok).toBe(false));
  test("rejects private path outside ownership", () => expect(validateRepositoryPath(root(), "scripts/formal-verif/public.json", ["tests/formal-verif"]).ok).toBe(false));
  test("rejects an external symlink", () => { const repo = root(); symlinkSync(tmpdir(), join(repo, "scripts/formal-verif/external")); expect(validateRepositoryPath(repo, "scripts/formal-verif/external", ["scripts/formal-verif"]).ok).toBe(false); });
  test("does not authorize reveal with a start proof", () => expect(validateCommandProof("reveal", "T_FROZEN", { ledgerHead: "head", publicInputHash: "h", actualInputManifestIdentity: "h", forbiddenMatchCount: 0 }, undefined, "head").ok).toBe(false));
  test("does not authorize promotion before S freeze", () => expect(validateCommandProof("request-promotion", "S_AUTHORING", { ledgerHead: "h", promotionLedgerHead: "h" }, undefined, "h").ok).toBe(false));
  test("accepts promotion proof only in S_FROZEN", () => expect(validateCommandProof("request-promotion", "S_FROZEN", { ledgerHead: "h", promotionLedgerHead: "h" }, undefined, "h").ok).toBe(true));
});
