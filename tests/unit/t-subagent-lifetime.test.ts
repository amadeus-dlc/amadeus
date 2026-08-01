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
// THE TWO UNMATCHED SIDES ARE NOT SYMMETRIC.
//   - An unmatched COMPLETED row is dropped. Only the harnesses that expose a
//     dispatch seam emit the start half, so wherever that seam is absent a
//     completion with no start is the NORMAL steady state, and inventing a
//     start for it would report an interval that never happened.
//   - An unmatched STARTED row is REPORTED, as incomplete. That is the whole
//     point of registering the started half: a subagent that began and never
//     finished is the idle-death signal, and dropping it would hide exactly
//     the condition this Unit exists to surface (FR-SUB-3, BR-U4-3).

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
    expect(lifetimes[0].incomplete).toBe(false);
  });

  test("an Agent ID match wins over recency (tier 1 beats tier 2)", () => {
    // The LATER start carries a different id, so the greedy type rule would
    // have taken it. The exact id match must override that.
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "developer", "Agent ID": "a1" }),
      row("SUBAGENT_STARTED", "2026-08-01T00:00:01Z", { "Agent Type": "developer", "Agent ID": "a2" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:09Z", { "Agent Type": "developer", "Agent ID": "a1" }),
    ]);
    expect(lifetimes[0].agentId).toBe("a1");
    expect(lifetimes[0].startedAt).toBe("2026-08-01T00:00:00Z");
    expect(lifetimes[0].incomplete).toBe(false);
    // a2 started and never finished — reported, not swallowed.
    expect(lifetimes.length).toBe(2);
    expect(lifetimes[1].agentId).toBe("a2");
    expect(lifetimes[1].incomplete).toBe(true);
  });

  test("both sides carry an id but they disagree — no LIFO fallback, both are unmatched", () => {
    // Rule 1 applies only when the ids MATCH; rule 2 is for the case where a
    // side is MISSING an id. Neither holds here, so rule 3 does: the
    // completion is an orphan and the start stays open. Falling back to the
    // type tier would pair a1's start with a2's completion and report an
    // interval between two different agents.
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "developer", "Agent ID": "a1" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:09Z", { "Agent Type": "developer", "Agent ID": "a2" }),
    ]);
    expect(lifetimes.length).toBe(1);
    expect(lifetimes[0].agentId).toBe("a1");
    expect(lifetimes[0].incomplete).toBe(true);
    expect(lifetimes[0].completedAt).toBeNull();
  });

  test("an id-carrying completion still falls back to an id-LESS start", () => {
    // Here a side IS missing an id, so rule 2 applies: the harness supplied an
    // id on the stop seam but not on the start seam.
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "developer" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:09Z", { "Agent Type": "developer", "Agent ID": "a9" }),
    ]);
    expect(lifetimes.length).toBe(1);
    expect(lifetimes[0].incomplete).toBe(false);
    expect(lifetimes[0].agentId).toBe("a9");
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
    expect(lifetimes[0].startedSeq).toBe(11);
    expect(lifetimes[0].incomplete).toBe(false);
    // seq 10 is the loser of the tie-break and stays open.
    expect(lifetimes.length).toBe(2);
    expect(lifetimes[1].startedSeq).toBe(10);
    expect(lifetimes[1].incomplete).toBe(true);
  });

  test("a completed row with no matching start is an orphan and is dropped", () => {
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:05Z", { "Agent Type": "developer" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:06Z", { "Agent Type": "architect", "Agent ID": "zz" }),
    ]);
    expect(lifetimes).toEqual([]);
  });

  test("an unmatched start IS reported, as an incomplete lifetime (FR-SUB-3)", () => {
    // The idle-death signal. `durationMs` is null rather than 0: the interval
    // is unknown, not instantaneous, and 0 would be indistinguishable from a
    // subagent that finished immediately.
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "developer", Purpose: "never returned" }),
    ]);
    expect(lifetimes.length).toBe(1);
    expect(lifetimes[0].incomplete).toBe(true);
    expect(lifetimes[0].completedAt).toBeNull();
    expect(lifetimes[0].durationMs).toBeNull();
    expect(lifetimes[0].startedAt).toBe("2026-08-01T00:00:00Z");
    expect(lifetimes[0].agentType).toBe("developer");
    expect(lifetimes[0].purpose).toBe("never returned");
    expect(lifetimes[0].message).toBeNull();
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
    // The reviewer completion is an orphan (dropped); the developer start is
    // still open (reported).
    expect(lifetimes.length).toBe(1);
    expect(lifetimes[0].agentType).toBe("developer");
    expect(lifetimes[0].incomplete).toBe(true);
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

  test("incomplete entries trail the completed ones, in record order", () => {
    // Completed lifetimes keep their completion order; the still-open ones are
    // appended in the order they were dispatched. A reader scanning for idle
    // deaths finds them contiguous at the end.
    const lifetimes = composeSubagentLifetimes([
      row("SUBAGENT_STARTED", "2026-08-01T00:00:00Z", { "Agent Type": "open-first" }),
      row("SUBAGENT_STARTED", "2026-08-01T00:00:01Z", { "Agent Type": "closed" }),
      row("SUBAGENT_STARTED", "2026-08-01T00:00:02Z", { "Agent Type": "open-second" }),
      row("SUBAGENT_COMPLETED", "2026-08-01T00:00:09Z", { "Agent Type": "closed" }),
    ]);
    expect(lifetimes.map((l) => l.agentType)).toEqual(["closed", "open-first", "open-second"]);
    expect(lifetimes.map((l) => l.incomplete)).toEqual([false, true, true]);
  });
});
