// covers: function:parseIntentStatusTransactionJournal function:withIntentLifecyclePreflight
// @test-size small
import { describe, expect, test } from "bun:test";
import {
  IntentLifecycleJournalError,
  parseIntentStatusTransactionJournal,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const BASE = {
  schemaVersion: 1,
  operationId: "123e4567-e89b-42d3-a456-426614174000",
  verb: "archive",
  intentDir: "260723-example",
  fromStatus: "in-flight",
  toStatus: "archived",
  humanTurn: { shard: "host-clone.md", timestamp: "2026-07-23T10:00:00Z" },
  userInput: "archive it",
  auditCommitted: false,
  registryCommitted: false,
  cursorCommitted: false,
} as const;

describe("lifecycle journal strict parser", () => {
  test.each([
    [false, false, false],
    [true, false, false],
    [true, true, false],
    [true, true, true],
  ])("accepts prefix topology %p/%p/%p", (auditCommitted, registryCommitted, cursorCommitted) => {
    const parsed = parseIntentStatusTransactionJournal({
      ...BASE,
      auditCommitted,
      registryCommitted,
      cursorCommitted,
    });
    expect(parsed.auditCommitted).toBe(auditCommitted);
    expect(parsed.registryCommitted).toBe(registryCommitted);
    expect(parsed.cursorCommitted).toBe(cursorCommitted);
  });

  test.each([
    [false, true, false],
    [false, false, true],
    [false, true, true],
    [true, false, true],
  ])("rejects non-prefix topology %p/%p/%p", (auditCommitted, registryCommitted, cursorCommitted) => {
    expect(() => parseIntentStatusTransactionJournal({
      ...BASE,
      auditCommitted,
      registryCommitted,
      cursorCommitted,
    })).toThrow(IntentLifecycleJournalError);
  });

  test("accepts every archive source", () => {
    for (const fromStatus of ["in-flight", "parked", "complete"] as const) {
      expect(parseIntentStatusTransactionJournal({ ...BASE, fromStatus }).fromStatus).toBe(fromStatus);
    }
  });

  test("accepts the sole unarchive transition", () => {
    const parsed = parseIntentStatusTransactionJournal({
      ...BASE,
      verb: "unarchive",
      fromStatus: "archived",
      toStatus: "in-flight",
    });
    expect(parsed.verb).toBe("unarchive");
  });

  test.each([
    null,
    [],
    { ...BASE, schemaVersion: 2 },
    { ...BASE, operationId: "not-a-uuid" },
    { ...BASE, verb: "restore" },
    { ...BASE, intentDir: "../escape" },
    { ...BASE, fromStatus: "closed" },
    { ...BASE, verb: "unarchive", fromStatus: "complete", toStatus: "in-flight" },
    { ...BASE, humanTurn: { shard: "../audit.md", timestamp: "2026-07-23T10:00:00Z" } },
    { ...BASE, humanTurn: { shard: "audit.md", timestamp: "not-a-date" } },
    { ...BASE, userInput: 42 },
  ].map((value) => [value] as const))("rejects malformed journal %#", (value) => {
    expect(() => parseIntentStatusTransactionJournal(value)).toThrow(IntentLifecycleJournalError);
  });
});
