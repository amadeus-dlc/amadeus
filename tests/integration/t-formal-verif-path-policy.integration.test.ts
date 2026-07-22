import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateRepositoryPath } from "../../scripts/formal-verif/repository-path-policy.ts";

describe("formal verification repository path policy", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));
  const fixture = () => { const root = mkdtempSync(join(tmpdir(), "fv-path-")); roots.push(root); mkdirSync(join(root, "scripts/formal-verif"), { recursive: true }); writeFileSync(join(root, "scripts/formal-verif/x.ts"), "x"); return root; };
  test("accepts owned file", () => expect(validateRepositoryPath(fixture(), "scripts/formal-verif/x.ts", ["scripts/formal-verif"]).ok).toBe(true));
  test.each(["", "../x", "scripts/../x", "/tmp/x", "scripts/\0x"])("rejects lexical path %p", (path) => expect(validateRepositoryPath(fixture(), path, ["scripts"]).ok).toBe(false));
  test("rejects missing path", () => expect(validateRepositoryPath(fixture(), "scripts/missing", ["scripts"]).ok).toBe(false));
  test("rejects outside allowlist", () => expect(validateRepositoryPath(fixture(), "scripts/formal-verif/x.ts", ["tests"]).ok).toBe(false));
  test("rejects symlink escape", () => { const root = fixture(); symlinkSync(tmpdir(), join(root, "scripts/formal-verif/out")); expect(validateRepositoryPath(root, "scripts/formal-verif/out", ["scripts/formal-verif"]).ok).toBe(false); });
  test("normalizes returned separator", () => { const result = validateRepositoryPath(fixture(), "scripts/formal-verif/x.ts", ["scripts"]); expect(result.ok && result.value).toBe("scripts/formal-verif/x.ts"); });
  test("accepts an exact owned prefix file", () => { const root = fixture(); writeFileSync(join(root, "owned"), "x"); expect(validateRepositoryPath(root, "owned", ["owned"]).ok).toBe(true); });
});
