// covers: function:composeSubagentLifetimes
// size: small
//
// U4 (subagent-started) — pairing started rows with completed rows.
//
// WHY A GREEDY LIFO RULE AND NOT A QUEUE. `Agent ID` is optional: only the
// harnesses whose start seam carries an id can supply it, and the ones that
// cannot still emit both halves. So the matcher has an exact tier (id) and a
// fallback tier (type). In the fallback tier the most RECENT unmatched start
// is the right partner, because subagents of one type nest far more often than
// they interleave — a completion belongs to the innermost open dispatch.
//
// ORPHANS ARE DROPPED, NOT SYNTHESIZED. Four of the seven harnesses have no
// start seam at all, so a completed row with no start is the NORMAL steady
// state there. Inventing a zero-length lifetime for it would report a duration
// that never happened.

import { describe, expect, test } from "bun:test";
import { composeSubagentLifetimes } from "../../packages/framework/core/otel/subagent-lifetime.ts";
import type { JournalEntry } from "../../packages/framework/core/tools/amadeus-journal.ts";

let seq = 0;
function row(
  event: "SUBAGENT_STARTED" | "SUBAGENT_COMPLETED",
  timestamp: string,
  fields: Record<string, string>,
  seqOverride?: number,
): JournalEntry {
  seq += 1;
  return {
    schemaVersion: 1,
    seq: seqOverride ?? seq,
    cloneId: "clone-a",
    intentId: "intent-1",
    timestamp,
    heading: event,
    event,
    fields,
  };
}

describe("composeSubagentLifetimes (U4, FR-SUB)", () => {
  test("pairs a started/completed couple and reports the interval", () => {
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "developer", Purpose: "build it" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:05Z", { "Agent Type": "developer", Message: "done" }),
    ]);
    expect(lifetimes.length).toBe(1);
    expect(lifetimes[0].agentType).toBe("developer");
    expect(lifetimes[0].startedAt).toBe("2026-08-01T00:00:00Z");
    expect(lifetimes[0].completedAt).toBe("2026-08-01T00:00:05Z");
    expect(lifetimes[0].durationMs).toBe(5000);
    expect(lifetimes[0].purpose).toBe("build it");
  });

  test("an Agent ID match wins over recency (tier 1 beats tier 2)", () => {
    // The LATER start carries a different id, so the greedy type rule would
    // have taken it. The exact id match must override that.
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "developer", "Agent ID": "a1" }),
      row("SUBAGENT_STARTED", "2026-08-01T00:00:01Z", { "Agent Type": "developer", "Agent ID": "a2" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:09Z", { "Agent Type": "developer", "Agent ID": "a1" }),
    ]);
    expect(lifetimes.length).toBe(1);
    expect(lifetimes[0].agentId).toBe("a1");
    expect(lifetimes[0].startedAt).toBe("2026-08-01T00:00:00Z");
  });

  test("three concurrent agents of one type, ids present on some rows only", () => {
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "reviewer", "Agent ID": "r1" }),
      row("SUBAGENT_STARTED", "2026-08-01T00:00:01Z", { "Agent Type": "reviewer" }),
      row("SUBAGENT_STARTED", "2026-08-01T00:00:02Z", { "Agent Type": "reviewer" }),
      // id-carrying completion binds to r1 regardless of position
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:10Z", { "Agent Type": "reviewer", "Agent ID": "r1" }),
      // id-less completions consume the most recent unmatched starts, newest first
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:11Z", { "Agent Type": "reviewer" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:12Z", { "Agent Type": "reviewer" }),
    ]);
    expect(lifetimes.length).toBe(3);
    const byStart = Object.fromEntries(lifetimes.map((l) => [l.startedAt, l.completedAt]));
    expect(byStart["2026-08-01T00:00:00Z"]).toBe("2026-08-01T00:00:10Z");
    expect(byStart["2026-08-01T00:00:02Z"]).toBe("2026-08-01T00:00:11Z");
    expect(byStart["2026-08-01T00:00:01Z"]).toBe("2026-08-01T00:00:12Z");
  });

  test("same-timestamp starts break the tie on seq, highest first", () => {
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "quality" }, 10),
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "quality" }, 11),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:04Z", { "Agent Type": "quality" }, 12),
    ]);
    expect(lifetimes.length).toBe(1);
    expect(lifetimes[0].startedSeq).toBe(11);
  });

  test("a completed row with no matching start is an orphan and is dropped", () => {
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:05Z", { "Agent Type": "developer" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:06Z", { "Agent Type": "architect", "Agent ID": "zz" }),
    ]);
    expect(lifetimes).toEqual([]);
  });

  test("an unmatched start is not reported (no half-open lifetime)", () => {
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "developer" }),
    ]);
    expect(lifetimes).toEqual([]);
  });

  test("a start is consumed once — a second completion cannot reuse it", () => {
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "developer" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:01Z", { "Agent Type": "developer" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:02Z", { "Agent Type": "developer" }),
    ]);
    expect(lifetimes.length).toBe(1);
    expect(lifetimes[0].completedAt).toBe("2026-08-01T00:00:01Z");
  });

  test("agent types never cross-match", () => {
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "developer" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:01Z", { "Agent Type": "reviewer" }),
    ]);
    expect(lifetimes).toEqual([]);
  });

  test("unrelated events are ignored", () => {
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "developer" }),
      { ...row("SUBAGENT_COMPLETED", "2026-08-01T00:00:01Z", {}), event: "STAGE_STARTED", heading: "STAGE_STARTED" },
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:02Z", { "Agent Type": "developer" }),
    ]);
    expect(lifetimes.length).toBe(1);
    expect(lifetimes[0].completedAt).toBe("2026-08-01T00:00:02Z");
  });

  test("output is ordered by completion, so the result is stable for readers", () => {
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "a" }),
      row("SUBAGENT_STARTED", "2026-08-01T00:00:01Z", { "Agent Type": "b" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:09Z", { "Agent Type": "b" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:10Z", { "Agent Type": "a" }),
    ]);
    expect(lifetimes.map((l) => l.agentType)).toEqual(["b", "a"]);
  });
});
