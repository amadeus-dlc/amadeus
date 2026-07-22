// covers: domain:formal-verif-arm-s-universe
// size: small
//
// Arm S (U6 ts-arm) closed universe: 5,760 direct-product cardinality, mixed-
// radix round-trip, axis histograms, ref projection visibility, token mapping,
// and the 160-cell identity precedence matrix. Pure — no fs/spawn (unit tier).

import { describe, expect, test } from "bun:test";
import {
  AXES,
  EXPECTED_CORE_CARDINALITY,
  EXPECTED_VALIDATION_CARDINALITY,
  TIMESTAMP_TOKEN_MAP,
  canonicalKey,
  compileCoreUniverse,
  compileValidationMatrix,
  descriptorIdentity,
  expectedPrecedence,
  streamUniverse,
  validationMatrix,
} from "../../scripts/formal-verif/arm-s-universe.ts";

describe("arm-s universe — direct-product totality (BR-01/02/03/04)", () => {
  const proof = compileCoreUniverse();

  test("compiles with the exact 5,760 cardinality", () => {
    expect(proof.ok).toBe(true);
    if (!proof.ok) return;
    expect(proof.value.actualCount).toBe(5760);
    expect(proof.value.uniqueKeyCount).toBe(5760);
    expect(proof.value.expectedCount).toBe(EXPECTED_CORE_CARDINALITY.toString());
  });

  test("every axis value appears total/cardinality times", () => {
    if (!proof.ok) throw new Error("universe did not compile");
    for (const axis of AXES) {
      const expected = 5760 / axis.values.length;
      for (const v of axis.values) expect(proof.value.axisHistograms[axis.axis][v]).toBe(expected);
    }
  });

  test("mixed-radix index round-trips over the whole stream", () => {
    let count = 0;
    const keys = new Set<string>();
    for (const { index, key } of streamUniverse()) {
      expect(index).toBe(count);
      keys.add(key);
      count++;
    }
    expect(count).toBe(5760);
    expect(keys.size).toBe(5760);
  });

  test("ref projection class keeps ORIGINAL tuples distinct (BR-05)", () => {
    const base = { VOTER: "V1", CHOICE_INPUT: "C1", SUBMITTED_TOKEN: "T0", RECEIVED_TOKEN: "T0", BALLOT_KIND: "ORIGINAL", GOA: "1" };
    const accepted = canonicalKey({ ...base, REF_CLASS: "ACCEPTED_REF" });
    const unknown = canonicalKey({ ...base, REF_CLASS: "UNKNOWN_REF" });
    expect(accepted).not.toBe(unknown);
  });

  test("token mapping is fixed (BR-08)", () => {
    expect(TIMESTAMP_TOKEN_MAP).toEqual({
      T0: "2026-07-20T00:00:00Z",
      T1: "2026-07-20T00:00:01Z",
      T2: "2026-07-20T00:00:02Z",
      INVALID_FORMAT: "__INVALID_FORMAT__",
      INVALID_DATE: "2026-02-30T00:00:00Z",
    });
  });

  test("descriptor identity matches the measured golden hash", () => {
    // Golden hash of the frozen axes + token map + version 1 descriptor. A drift
    // in any axis, value order, or token mapping changes this literal (BR-01/BR-08).
    expect(descriptorIdentity().sha256).toBe("19ef99e777a395b0ff7a10a7381f8c77b4808da57faf528e361c5a167bf47cd5");
    expect(descriptorIdentity().sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("arm-s identity validation matrix (BR-07/BR-12)", () => {
  test("has exactly 160 unique cells and 4 precedence classes", () => {
    const proof = compileValidationMatrix();
    expect(proof.ok).toBe(true);
    if (!proof.ok) return;
    expect(proof.value.uniqueCount).toBe(EXPECTED_VALIDATION_CARDINALITY);
    expect(proof.value.precedencePairsCovered).toBe(4);
    expect(validationMatrix().length).toBe(160);
  });

  test("precedence is unknown-election → voter → choice → invalid-timestamp", () => {
    expect(expectedPrecedence({ election: "UNKNOWN_ELECTION", voter: "UNKNOWN_VOTER", choice: "UNKNOWN_CHOICE", submitted: "INVALID_DATE" })).toBe("unknown-election");
    expect(expectedPrecedence({ election: "VALID_ELECTION", voter: "UNKNOWN_VOTER", choice: "UNKNOWN_CHOICE", submitted: "INVALID_DATE" })).toBe("unknown-voter");
    expect(expectedPrecedence({ election: "VALID_ELECTION", voter: "V1", choice: "UNKNOWN_CHOICE", submitted: "INVALID_DATE" })).toBe("unknown-choice");
    expect(expectedPrecedence({ election: "VALID_ELECTION", voter: "V1", choice: "C1", submitted: "INVALID_FORMAT" })).toBe("invalid-timestamp");
    expect(expectedPrecedence({ election: "VALID_ELECTION", voter: "V1", choice: "C1", submitted: "T0" })).toBe(null);
  });
});
