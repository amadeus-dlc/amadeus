// book-pack drift guard: the book pack (book-pack/) is a passive data
// directory whose apply/verify scripts depend on engine couplings that no
// other gate watches — the bolt_dag fixed artifact path, artifact-producer
// uniqueness, the `for_each` per-unit contract, stage-number bootstrap /
// renumber semantics, the scope transpose, and the frontmatter schema. A
// framework change can break the pack without touching any shipped surface,
// so this test runs the pack's own deterministic verifier (which builds a
// throwaway workspace under the system temp dir, applies the pack, and
// asserts checks A-F) against the current tree on every CI run.
// Provenance: amadeus-dlc/amadeus#643 (ruling), PR #1339 (pack landing).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TESTS_DIR, "..", "..");
const VERIFY_SH = join(REPO_ROOT, "book-pack", "scripts", "verify-dummy.sh");

describe("book-pack verify-dummy (engine-coupling drift guard)", () => {
  test("all pack checks pass against the current framework tree", () => {
    const r = spawnSync("bash", [VERIFY_SH, REPO_ROOT], {
      encoding: "utf-8",
      timeout: 180_000,
      // Explicit env snapshot: bun does not fold runtime process.env
      // mutations into children automatically (bun-spawn-env-snapshot).
      env: process.env,
    });
    if (r.status !== 0) {
      console.error("verify-dummy stdout:\n", r.stdout);
      console.error("verify-dummy stderr:\n", r.stderr);
    }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("ALL CHECKS PASSED");
  }, 120_000);
});
