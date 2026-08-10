// covers: file:scripts/depth-artifact-census.ts
//
// t521 (fs) — depth-artifact-census.ts CLI entry must drain stdout before
// exiting (Issue #2732, same class as #2700/#2702/#2706).
//
// THE BUG: `if (import.meta.main) process.exit(main(process.argv.slice(2)));`
// calls process.exit() synchronously, which can truncate buffered stdout
// writes on a piped fd before the pipe drains (Node/Bun stdout-pipe-exit
// truncation). The fix mirrors the four already-corrected sibling entry
// points (e.g. packages/framework/core/tools/amadeus-finding.ts:295-297):
// set `process.exitCode` and let the event loop drain stdout naturally before
// the process exits on its own.
//
// Mechanism: none (structural/content check), but the check reads the shipped
// script file from real disk (readFileSync) — a real filesystem touch, hence
// integration / medium per test-size classification (size-purity ratchet
// keeps fs-touching checks out of the unit allowlist:
// cid:code-generation:c2-doctor-seam). This is a pure structural/content check
// over the shipped bytes — no process boundary, no argv/exit/stdout seam, no
// LLM — mirroring the existing static-shape checks (t46, t28) rather than
// reproducing the 64KiB pipe-truncation scenario itself: the census's current
// bounded output (~9.7KB, well under the 64KiB pipe buffer) makes the
// truncation latent, not reproducible via `wc -c`. The full pipe-truncation
// reproduction is the review-confirmed rationale for pinning the entry-point
// *form* instead (cross-review xrev2732).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const SOURCE_PATH = join(import.meta.dir, "..", "..", "scripts", "depth-artifact-census.ts");

describe("t521 depth-artifact-census.ts CLI entry drains stdout before exit", () => {
  test("never calls process.exit(main(...)) — the drain-unsafe idiom", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");
    expect(source).not.toMatch(/process\.exit\(main\(/);
  });

  test("sets process.exitCode = main(...) — the drain-safe idiom", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");
    expect(source).toMatch(/process\.exitCode\s*=\s*main\(process\.argv\.slice\(2\)\);/);
  });
});
