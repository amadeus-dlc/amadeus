// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-production.ts(nonAutoDecidedKinds)
// size: small
//
// FR-2b (u1-autonomy-core): the kinds a mode does NOT auto-decide, derived as a
// set difference so the literal pair ["phase-gate", "walking-skeleton"] exists
// in exactly one place (BR-U1-7). The assertions below therefore pin the VALUE
// while the implementation is forbidden from spelling it out.

import { describe, expect, test } from "bun:test";
import { nonAutoDecidedKinds } from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import {
  type InteractionKind,
  SEMI_ROUTINE_INTERACTIONS,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";

describe("nonAutoDecidedKinds (FR-2b)", () => {
  test("semi leaves the two gate kinds to the human", () => {
    expect(nonAutoDecidedKinds("semi")).toEqual(["phase-gate", "walking-skeleton"]);
  });

  test("full auto-decides every kind, so nothing is left over", () => {
    expect(nonAutoDecidedKinds("full")).toEqual([]);
  });

  test("none auto-decides nothing, so every kind is left over", () => {
    expect(nonAutoDecidedKinds("none")).toEqual([
      "stage-gate",
      "phase-gate",
      "walking-skeleton",
      "question",
    ]);
  });

  // The derivation, not the literal: semi's leftover set is exactly the
  // complement of SEMI_ROUTINE_INTERACTIONS, so a change to that constant moves
  // this result rather than leaving a stale hand-written pair behind.
  test("semi's result is the complement of SEMI_ROUTINE_INTERACTIONS", () => {
    const semiLeftover = nonAutoDecidedKinds("semi");
    for (const routine of SEMI_ROUTINE_INTERACTIONS) {
      expect(semiLeftover).not.toContain(routine);
    }
    const union: readonly InteractionKind[] = [...SEMI_ROUTINE_INTERACTIONS, ...semiLeftover];
    expect([...union].sort()).toEqual([...nonAutoDecidedKinds("none")].sort());
  });
});
