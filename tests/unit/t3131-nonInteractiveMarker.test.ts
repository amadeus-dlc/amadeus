// covers: function:nonInteractiveMarker
//
// t3131 — RFC-0001 C8 / FR-8: the statusline shows a minimal, judgment-free
// marker directly after the `@<mode>` segment when the session is
// non-interactive (business-logic-model.md "(B) C8" processing flow). The
// pure DECISION (given interactive: boolean, what string renders) lives in
// amadeus-lib.ts, mirroring autonomySegment (t448) — the hook itself is
// spawn-only and supplies the interactivity FACT via a separate I/O read
// (resolveSessionInteractivity), never duplicated here.
//
// WHY IN-PROCESS (not a spawn of the hook): same rationale as t448 — this
// twin imports from the SHIPPED surface (dist/claude/...) so the assertion
// tracks what users actually run.

import { describe, expect, test } from "bun:test";

import { nonInteractiveMarker } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

describe("t3131 nonInteractiveMarker — FR-8 statusline non-interactive marker", () => {
  test("renders nothing when the session is interactive", () => {
    expect(nonInteractiveMarker(true)).toBe("");
  });

  test("renders a marker when the session is non-interactive", () => {
    expect(nonInteractiveMarker(false)).toBe("!");
  });
});
