// covers: function:autonomySegment
//
// t448 — FR-DISP-1: the statusline tells the user which autonomy mode the
// active Intent runs under, using the SAME vocabulary as `--status`
// (`none` / `semi` / `full`) — no display-only abbreviation, no second glyph.
//
// SUBJECT is the pure decision function `autonomySegment(stateContent)` in
// amadeus-lib.ts. It reads `Intent Autonomy Mode` out of the state-file text the
// statusline hook has already loaded (so the hook pays no extra I/O) and returns
// the bare mode name, or "" when the field is absent or carries a value outside
// the canonical AutonomyMode domain. The hook's single wiring line supplies the
// display form: `if (autonomy) output += ` @${autonomy}`;`.
//
// WHY IN-PROCESS (not a spawn of the hook): the hook runs `await main()` at
// module top level and is spawn-only, so it cannot host an importable seam. The
// decision therefore lives in amadeus-lib.ts — an already-measured module — and
// this twin imports it from the SHIPPED surface (dist/claude/...), the same
// surface t168 imports, so the assertion tracks what users actually run.
//
// The table below is the whole contract: three canonical modes render, and
// everything else degrades silently to no segment — a warning marker would
// invent the second display vocabulary ADR-10 rejected.

import { describe, expect, test } from "bun:test";

import { autonomySegment } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

function stateWith(mode: string): string {
  return [
    "# Amadeus State",
    "",
    "- **Lifecycle Phase**: Construction",
    `- **Intent Autonomy Mode**: ${mode}`,
    "- **Current Stage**: code-generation",
    "",
  ].join("\n");
}

const STATE_WITHOUT_FIELD = [
  "# Amadeus State",
  "",
  "- **Lifecycle Phase**: Construction",
  "- **Current Stage**: code-generation",
  "",
].join("\n");

describe("t448 autonomySegment — FR-DISP-1 display vocabulary", () => {
  test("renders the bare mode name for none", () => {
    expect(autonomySegment(stateWith("none"))).toBe("none");
  });

  test("renders the bare mode name for semi", () => {
    expect(autonomySegment(stateWith("semi"))).toBe("semi");
  });

  test("renders the bare mode name for full", () => {
    expect(autonomySegment(stateWith("full"))).toBe("full");
  });

  test("degrades to no segment for a value outside the canonical domain", () => {
    expect(autonomySegment(stateWith("FULL"))).toBe("");
  });

  test("degrades to no segment when the field is absent", () => {
    expect(autonomySegment(STATE_WITHOUT_FIELD)).toBe("");
  });
});
