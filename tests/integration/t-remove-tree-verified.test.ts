import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeTreeVerified } from "../harness/live-e2e/testing/remove-tree-verified.ts";

/**
 * Paths whose permissions were tightened by a test. They are restored in
 * afterEach so a failed assertion cannot leave an undeletable tree behind and
 * pollute later suites.
 */
const restorePaths: string[] = [];

function createNestedTree(prefix: string): { root: string; leaf: string } {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const nested = join(root, "a", "b", "c");
  mkdirSync(nested, { recursive: true });
  const leaf = join(nested, "leaf.txt");
  writeFileSync(leaf, "payload", "utf8");
  return { root, leaf };
}

afterEach(() => {
  while (restorePaths.length > 0) {
    const path = restorePaths.pop();
    if (path === undefined) continue;
    try {
      chmodSync(path, 0o755);
    } catch {
      // The path may already be gone; restoration is best-effort cleanup only.
    }
  }
});

describe("removeTreeVerified", () => {
  test("removes a nested tree and proves it is gone", () => {
    const { root, leaf } = createNestedTree("remove-tree-verified-happy-");
    expect(existsSync(leaf)).toBe(true);

    removeTreeVerified(root);

    expect(existsSync(root)).toBe(false);
  });

  test("is idempotent on an absent path", () => {
    const root = mkdtempSync(join(tmpdir(), "remove-tree-verified-absent-"));
    rmSync(root, { recursive: true, force: true });
    expect(existsSync(root)).toBe(false);

    expect(() => removeTreeVerified(root)).not.toThrow();
  });

  test("throws loudly when the tree cannot be removed", () => {
    if (process.getuid?.() === 0) return;

    const parent = mkdtempSync(join(tmpdir(), "remove-tree-verified-loud-"));
    const target = join(parent, "target");
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "pinned.txt"), "payload", "utf8");
    // A read-only parent blocks unlinking `target` itself, so removal cannot succeed.
    chmodSync(parent, 0o555);
    restorePaths.push(parent);

    // `force: true` swallows only ENOENT, so this surfaces as a propagated
    // EACCES rather than the retry-exhaustion throw — both are loud, and this
    // pins the contract that non-ENOENT failures are never swallowed.
    expect(() => removeTreeVerified(target)).toThrow(target);
    expect(() => removeTreeVerified(target)).toThrow("EACCES");
    expect(existsSync(target)).toBe(true);

    chmodSync(parent, 0o755);
    rmSync(parent, { recursive: true, force: true });
  });
});
