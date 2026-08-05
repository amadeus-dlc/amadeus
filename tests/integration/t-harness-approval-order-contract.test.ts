// covers: none (documentation-contract guard over
// packages/framework/harness/*/skills/amadeus/SKILL.md; the engine side is
// packages/framework/core/tools/amadeus-state.ts verifyPhaseCheckArtifact)
// size: medium
//
// t-harness-approval-order-contract — Issue #2143 + #2232.
//
// Integration tier: this reads the real harness tree off disk, which puts it at
// size medium, and the unit tier caps at small. It sits beside t368, the sibling
// documentation-contract guard, for the same reason.
//
// Two conductor contracts have to hold identically on every skill-bearing
// harness, and both were drifting because each SKILL.md was edited on its own:
//
//   1. Phase-boundary order. The state guard refuses a boundary completion
//      unless `<record>/verification/phase-check-<phase>.md` already exists, so
//      a conductor that reports approval first gets a typed error on a
//      perfectly legitimate human approval (#2143). Only pi's SKILL.md stated
//      the order; the other five did not.
//   2. Advisory choice acceptance. The prompt-matching route silently drops a
//      legitimate human choice when the answer is not a verbatim option string
//      (#2232). The deterministic route is the `record` subcommand, and every
//      SKILL.md's `await-advisory-choice` row has to name it.
//
// The scan is enumerative on purpose: it walks packages/framework/harness/ and
// takes every directory that ships skills/amadeus/SKILL.md. No harness name is
// hardcoded, so adding a skill-bearing harness without these contracts reds
// here. Command-form harnesses (cursor, opencode) ship no skills/amadeus tree
// and are excluded by that same condition rather than by an exception list.

import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HARNESS_ROOT = join(import.meta.dir, "..", "..", "packages", "framework", "harness");

function skillBearingHarnesses(): Array<{ harness: string; path: string; text: string }> {
  return readdirSync(HARNESS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      harness: entry.name,
      path: join(HARNESS_ROOT, entry.name, "skills", "amadeus", "SKILL.md"),
    }))
    .filter((candidate) => existsSync(candidate.path))
    .map((candidate) => ({ ...candidate, text: readFileSync(candidate.path, "utf-8") }));
}

// The invariant is deliberately the narrowest triple that cannot survive a
// rewrite which loses the meaning: the directive field that selects the
// boundary, the artifact path fragment the guard checks for, and an ordering
// phrase that puts the artifact before the approval report. Prose around them
// is free to change.
const ORDER_PHRASES = [
  "before reporting approval",
  "before you report approval",
  "before the approval report",
];

function missingRecordRoute(text: string): string[] {
  if (!text.includes("await-advisory-choice")) return ["no await-advisory-choice contract at all"];
  const required: Array<[string, string]> = [
    ["amadeus-advisory-choice.ts record", "`amadeus-advisory-choice.ts record` invocation"],
    ["--advisory-instance", "`--advisory-instance` flag"],
    ["--choice", "`--choice` flag"],
  ];
  return required.filter(([needle]) => !text.includes(needle)).map(([, label]) => label);
}

describe("t-harness-approval-order-contract: skill-bearing harness scan", () => {
  test("the scan finds the skill-bearing harnesses and excludes the command-form ones", () => {
    const found = skillBearingHarnesses().map((entry) => entry.harness).sort();
    expect(found.length).toBeGreaterThanOrEqual(6);
    expect(found).toContain("pi");
    expect(found).not.toContain("cursor");
    expect(found).not.toContain("opencode");
  });

  test("every skill-bearing SKILL.md states the phase-boundary artifact order", () => {
    const offenders: string[] = [];
    for (const { harness, text } of skillBearingHarnesses()) {
      const missing: string[] = [];
      if (!text.includes("phase_boundary")) missing.push("directive field `phase_boundary`");
      if (!text.includes("phase-check-")) missing.push("artifact fragment `phase-check-`");
      if (!ORDER_PHRASES.some((phrase) => text.toLowerCase().includes(phrase))) {
        missing.push(`ordering phrase (one of: ${ORDER_PHRASES.join(" | ")})`);
      }
      if (missing.length > 0) offenders.push(`${harness}: ${missing.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  test("every skill-bearing SKILL.md routes await-advisory-choice through the record subcommand", () => {
    const offenders = skillBearingHarnesses()
      .map(({ harness, text }) => ({ harness, missing: missingRecordRoute(text) }))
      .filter(({ missing }) => missing.length > 0)
      .map(({ harness, missing }) => `${harness}: ${missing.join(", ")}`);
    expect(offenders).toEqual([]);
  });
});
