// covers: function:isEngineToolCall, function:isEngineEngagementSegment
// t209 — Stop-hook tier-3 carve-out: amadeus-state verb classification (#758).
//
// THE BUG. isEngineEngagementSegment (packages/framework/core/hooks/
// amadeus-stop.ts) classified an `amadeus-state <verb>` segment by enumerating
// MUTATING verbs in a hand-written regex. The amadeus-state.ts dispatch switch
// carries 8 mutating verbs the enumeration missed (delegate-approval /
// delegate-rejection / acknowledge-compaction / reuse-artifact /
// practices-event / practices-promote / fork / merge), so a turn that ran one
// of them was misread as "no engine engagement" and the tier-3 conversational
// carve-out released the stop without a nudge — the exact opposite of the
// documented fail-toward-engagement invariant.
//
// THE FIX (E-B4a Q1=A). The classification is INVERTED: the READ-ONLY
// subcommands (get / count / lookup — the amadeus-state.ts switch's pure
// reads) are the enumeration, and every other subcommand — including verbs
// that do not exist yet — is engagement. Fail-toward-engagement becomes
// structural: a future mutating verb is engaged-by-default the day it lands.
//
// MECHANISM. In-process import of the classifier, which #758 moved from the
// hook into amadeus-lib.ts (bun --coverage cannot observe the spawned-hook
// path t121 exercises, and importing the hook itself would drag its whole
// uncovered main path into the coverage population). A source-derived sync
// case parses the REAL amadeus-state.ts dispatch switch so the read-only
// enumeration can never silently drift from the tool.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isEngineEngagementSegment,
  isEngineToolCall,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_TOOL = join(REPO_ROOT, "packages", "framework", "core", "tools", "amadeus-state.ts");

// The read-only subcommands of the amadeus-state.ts dispatch switch. Everything
// else in that switch mutates workflow state and MUST classify as engagement.
const READ_ONLY_VERBS = ["get", "count", "lookup"];

// The 8 mutating verbs the pre-#758 enumeration missed — each one must now be
// engagement (these were the RED cases against the un-fixed regex).
const PREVIOUSLY_MISSED_VERBS = [
  "delegate-approval",
  "delegate-rejection",
  "acknowledge-compaction",
  "reuse-artifact",
  "practices-event",
  "practices-promote",
  "fork",
  "merge",
];

/** A realistic Bash tool_use command for one amadeus-state subcommand. */
function stateCmd(verb: string): string {
  return `bun .claude/tools/amadeus-state.ts ${verb} --stage requirements-analysis`;
}

describe("t209 stop-hook tier-3 carve-out — amadeus-state verb inversion (#758)", () => {
  // =========================================================================
  // (a) The 8 previously-missed mutating verbs are engagement. Before the
  //     inversion each of these returned false (verified red in-process), which
  //     let a state-mutating turn pass the conversational carve-out.
  // =========================================================================
  for (const verb of PREVIOUSLY_MISSED_VERBS) {
    test(`(a) amadeus-state ${verb} is engine engagement (was missed pre-#758)`, () => {
      expect(isEngineToolCall("Bash", { command: stateCmd(verb) })).toBe(true);
    });
  }

  // =========================================================================
  // (b) Future-verb auto-follow: a verb that does not exist today is
  //     engagement BY STRUCTURE (it is not in the read-only enumeration), so
  //     adding a mutating verb to amadeus-state.ts can never reopen this hole.
  // =========================================================================
  test("(b) an unknown future verb classifies as engagement (fail-toward-engagement)", () => {
    expect(isEngineToolCall("Bash", { command: stateCmd("future-mutator") })).toBe(true);
  });

  test("(b) a bare amadeus-state invocation with no parseable subcommand is engagement", () => {
    // No subcommand to prove read-only-ness -> conservative direction (the
    // carve-out is allow-only; falling through to the cap can never trap).
    expect(isEngineEngagementSegment("bun .claude/tools/amadeus-state.ts")).toBe(true);
  });

  // =========================================================================
  // (c) Source-derived sync: parse the REAL dispatch switch of amadeus-state.ts
  //     (its 6-space-indented `case "<verb>":` rows) and assert every verb
  //     classifies on the right side. A verb added to the tool tomorrow lands
  //     in this loop automatically.
  // =========================================================================
  test("(c) every amadeus-state dispatch verb classifies read-only vs engagement per the switch", () => {
    const src = readFileSync(STATE_TOOL, "utf-8");
    const verbs = [...src.matchAll(/^ {6}case "([a-z][a-z-]*)":/gm)].map((m) => m[1]);
    // Guard the parse itself: the dispatch switch has >20 verbs and includes
    // the read-only trio; an indentation refactor must fail loudly, not pass
    // vacuously on an empty list.
    expect(verbs.length).toBeGreaterThan(20);
    for (const ro of READ_ONLY_VERBS) expect(verbs).toContain(ro);
    for (const verb of verbs) {
      const engaged = isEngineToolCall("Bash", { command: stateCmd(verb) });
      expect(`${verb}:${engaged}`).toBe(`${verb}:${!READ_ONLY_VERBS.includes(verb)}`);
    }
  });

  // =========================================================================
  // (d) Read-only non-regression: the chat-legitimate reads and flag queries
  //     must still NOT disqualify the conversational carve-out.
  // =========================================================================
  test("(d) amadeus-state get / count / lookup stay non-engagement", () => {
    expect(isEngineToolCall("Bash", { command: 'bun .claude/tools/amadeus-state.ts get "Current Stage"' })).toBe(false);
    expect(isEngineToolCall("Bash", { command: "bun .claude/tools/amadeus-state.ts count --filter done" })).toBe(false);
    expect(isEngineToolCall("Bash", { command: "bun .claude/tools/amadeus-state.ts lookup phase-of --stage code-generation" })).toBe(false);
  });

  test("(d) amadeus-state --help / --version flag-only queries stay non-engagement", () => {
    expect(isEngineEngagementSegment("bun .claude/tools/amadeus-state.ts --help")).toBe(false);
    expect(isEngineEngagementSegment("bun .claude/tools/amadeus-state.ts --version")).toBe(false);
  });

  test("(d) a read-only flag does NOT launder a mutating verb in the same segment", () => {
    expect(isEngineToolCall("Bash", { command: "bun .claude/tools/amadeus-state.ts fork --slug x --status" })).toBe(true);
  });

  // =========================================================================
  // (e) Surrounding behaviour unchanged: chained segments are judged
  //     independently; orchestrate/jump handling and the fast reject stand.
  // =========================================================================
  test("(e) a chained command with one mutating segment is engagement", () => {
    expect(
      isEngineToolCall("Bash", {
        command: 'bun .claude/tools/amadeus-state.ts get "Current Stage" && bun .claude/tools/amadeus-state.ts delegate-approval --stage x',
      }),
    ).toBe(true);
  });

  test("(e) orchestrate next --status stays read-only; bare next stays engagement", () => {
    expect(isEngineToolCall("Bash", { command: "bun .claude/tools/amadeus-orchestrate.ts next --status" })).toBe(false);
    expect(isEngineToolCall("Bash", { command: "bun .claude/tools/amadeus-orchestrate.ts next" })).toBe(true);
  });

  test("(e) a non-amadeus command is never engagement", () => {
    expect(isEngineToolCall("Bash", { command: "git status && ls -la" })).toBe(false);
  });

  test("(e) amadeus-jump/bolt/swarm: read-only flag query is not engagement, anything else is", () => {
    expect(isEngineToolCall("Bash", { command: "bun .claude/tools/amadeus-jump.ts --help" })).toBe(false);
    expect(isEngineToolCall("Bash", { command: "bun .claude/tools/amadeus-bolt.ts fork --slug b1" })).toBe(true);
    expect(isEngineToolCall("Bash", { command: "bun .claude/tools/amadeus-swarm.ts run" })).toBe(true);
  });
});
