// arm-s-universe.ts — U6 ts-arm (B2): closed enumerable universe for the blind
// Arm S checker. Owns the seven ordered axes, the mixed-radix streaming iterator
// over the 5,760 direct-product tuples, the core coverage proof, and the 160-cell
// identity-precedence validation matrix. Subject-agnostic: no election model, no
// Arm T / skeleton / fixture import (blind boundary BR-20/BR-21).

import { createHash } from "node:crypto";
import { type CanonicalIdentity, canonicalIdentity } from "./canonical.ts";
import { type Result, err, ok } from "./arm-s-result.ts";

// --- closed axes (BR-01) ----------------------------------------------------

export type UniverseAxis =
  | "VOTER"
  | "CHOICE_INPUT"
  | "SUBMITTED_TOKEN"
  | "RECEIVED_TOKEN"
  | "BALLOT_KIND"
  | "REF_CLASS"
  | "GOA";

// Ordered axes and ordered values — the identity of the universe. Any reorder or
// value drift changes the descriptor hash and must fail an arm run (BR-01/BR-04).
export const AXES: ReadonlyArray<{ axis: UniverseAxis; values: readonly string[] }> = [
  { axis: "VOTER", values: ["V1", "V2", "V3"] },
  { axis: "CHOICE_INPUT", values: ["C1", "C2", "C3", "UNKNOWN_CHOICE"] },
  { axis: "SUBMITTED_TOKEN", values: ["T0", "T1", "T2", "INVALID_FORMAT", "INVALID_DATE"] },
  { axis: "RECEIVED_TOKEN", values: ["T0", "T1", "T2"] },
  { axis: "BALLOT_KIND", values: ["ORIGINAL", "AMEND"] },
  { axis: "REF_CLASS", values: ["ACCEPTED_REF", "UNKNOWN_REF"] },
  { axis: "GOA", values: ["1", "2", "3", "4", "5", "6", "7", "8"] },
];

export const EXPECTED_CORE_CARDINALITY = 5760n;

// Fixed token → wire value mapping (BR-08). Kept next to the axes so the
// descriptor identity binds the mapping.
export const TIMESTAMP_TOKEN_MAP: Readonly<Record<string, string>> = {
  T0: "2026-07-20T00:00:00Z",
  T1: "2026-07-20T00:00:01Z",
  T2: "2026-07-20T00:00:02Z",
  INVALID_FORMAT: "__INVALID_FORMAT__",
  INVALID_DATE: "2026-02-30T00:00:00Z",
};

export type UniverseTuple = Record<UniverseAxis, string>;

export type UniverseError = {
  kind: "axis" | "count" | "round-trip" | "projection" | "precedence";
  detail: string;
};

const RADICES = AXES.map((a) => a.values.length);

// --- mixed-radix codec ------------------------------------------------------

function decode(index: number): UniverseTuple {
  const tuple = {} as UniverseTuple;
  let rest = index;
  for (let i = AXES.length - 1; i >= 0; i--) {
    const axis = AXES[i]!;
    tuple[axis.axis] = axis.values[rest % RADICES[i]!]!;
    rest = Math.floor(rest / RADICES[i]!);
  }
  return tuple;
}

function encode(tuple: UniverseTuple): number {
  let index = 0;
  for (let i = 0; i < AXES.length; i++) {
    const axis = AXES[i]!;
    const pos = axis.values.indexOf(tuple[axis.axis]!);
    if (pos < 0) return -1;
    index = index * RADICES[i]! + pos;
  }
  return index;
}

// Canonical key keeps every axis — including REF_CLASS and BALLOT_KIND — so an
// ORIGINAL tuple that drops its ref from the runtime payload still owns a
// distinct coverage key per ref projection class (BR-05).
export function canonicalKey(tuple: UniverseTuple): string {
  return AXES.map((a) => `${a.axis}=${tuple[a.axis]}`).join("|");
}

export function* streamUniverse(): Generator<{ index: number; tuple: UniverseTuple; key: string }> {
  const total = RADICES.reduce((p, r) => p * r, 1);
  for (let index = 0; index < total; index++) {
    const tuple = decode(index);
    yield { index, tuple, key: canonicalKey(tuple) };
  }
}

// --- core coverage proof (BR-02/BR-03/BR-04) --------------------------------

export interface CoreUniverseCoverageProof {
  descriptorIdentity: string;
  expectedCount: string;
  actualCount: number;
  uniqueKeyCount: number;
  axisHistograms: Record<UniverseAxis, Record<string, number>>;
  firstKey: string;
  lastKey: string;
  rollingHash: string;
}

function emptyHistograms(): Record<UniverseAxis, Record<string, number>> {
  const h = {} as Record<UniverseAxis, Record<string, number>>;
  for (const a of AXES) h[a.axis] = Object.fromEntries(a.values.map((v) => [v, 0]));
  return h;
}

export function descriptorIdentity(): CanonicalIdentity {
  return canonicalIdentity({ axes: AXES, tokens: TIMESTAMP_TOKEN_MAP, version: 1 });
}

export function compileCoreUniverse(): Result<CoreUniverseCoverageProof, UniverseError> {
  const seen = new Set<string>();
  const histograms = emptyHistograms();
  const rolling = createHash("sha256");
  let firstKey = "";
  let lastKey = "";
  let actualCount = 0;
  for (const { index, tuple, key } of streamUniverse()) {
    if (encode(tuple) !== index) return err({ kind: "round-trip", detail: `index ${index}` });
    seen.add(key);
    for (const a of AXES) histograms[a.axis][tuple[a.axis]!]!++;
    rolling.update(key).update("\n");
    if (actualCount === 0) firstKey = key;
    lastKey = key;
    actualCount++;
  }
  if (BigInt(actualCount) !== EXPECTED_CORE_CARDINALITY || seen.size !== actualCount) {
    return err({ kind: "count", detail: `count ${actualCount} unique ${seen.size}` });
  }
  const histError = checkHistograms(histograms, actualCount);
  if (histError) return histError;
  return ok({
    descriptorIdentity: descriptorIdentity().sha256,
    expectedCount: EXPECTED_CORE_CARDINALITY.toString(),
    actualCount,
    uniqueKeyCount: seen.size,
    axisHistograms: histograms,
    firstKey,
    lastKey,
    rollingHash: rolling.digest("hex"),
  });
}

// Each axis value must appear (total / axis cardinality) times (BR-04).
function checkHistograms(
  histograms: Record<UniverseAxis, Record<string, number>>,
  total: number,
): Result<never, UniverseError> | null {
  for (let i = 0; i < AXES.length; i++) {
    const axis = AXES[i]!;
    const expected = total / RADICES[i]!;
    for (const v of axis.values) {
      if (histograms[axis.axis][v] !== expected) {
        return err({ kind: "axis", detail: `${axis.axis}=${v} count ${histograms[axis.axis][v]}` });
      }
    }
  }
  return null;
}

// --- identity validation matrix (BR-07/BR-12) ------------------------------

const VALIDATION_AXES = {
  election: ["VALID_ELECTION", "UNKNOWN_ELECTION"],
  voter: ["V1", "V2", "V3", "UNKNOWN_VOTER"],
  choice: ["C1", "C2", "C3", "UNKNOWN_CHOICE"],
  submitted: ["T0", "T1", "T2", "INVALID_FORMAT", "INVALID_DATE"],
} as const;

export const EXPECTED_VALIDATION_CARDINALITY = 160;

export type PrecedenceError =
  | "unknown-election"
  | "unknown-voter"
  | "unknown-choice"
  | "invalid-timestamp"
  | null;

export interface ValidationCell {
  election: string;
  voter: string;
  choice: string;
  submitted: string;
  expected: PrecedenceError;
}

// Independent precedence oracle (BR-12): unknown-election → unknown-voter →
// unknown-choice → invalid-timestamp. Returns null for a fully valid cell.
export function expectedPrecedence(cell: Omit<ValidationCell, "expected">): PrecedenceError {
  if (cell.election === "UNKNOWN_ELECTION") return "unknown-election";
  if (cell.voter === "UNKNOWN_VOTER") return "unknown-voter";
  if (cell.choice === "UNKNOWN_CHOICE") return "unknown-choice";
  if (cell.submitted === "INVALID_FORMAT" || cell.submitted === "INVALID_DATE") {
    return "invalid-timestamp";
  }
  return null;
}

export function validationMatrix(): ValidationCell[] {
  const cells: ValidationCell[] = [];
  for (const election of VALIDATION_AXES.election)
    for (const voter of VALIDATION_AXES.voter)
      for (const choice of VALIDATION_AXES.choice)
        for (const submitted of VALIDATION_AXES.submitted) {
          const base = { election, voter, choice, submitted };
          cells.push({ ...base, expected: expectedPrecedence(base) });
        }
  return cells;
}

export interface ValidationMatrixProof {
  uniqueCount: number;
  classCounts: Record<string, number>;
  precedencePairsCovered: number;
}

export function compileValidationMatrix(): Result<ValidationMatrixProof, UniverseError> {
  const cells = validationMatrix();
  const keys = new Set(cells.map((c) => `${c.election}|${c.voter}|${c.choice}|${c.submitted}`));
  if (cells.length !== EXPECTED_VALIDATION_CARDINALITY || keys.size !== cells.length) {
    return err({ kind: "count", detail: `validation ${cells.length}/${keys.size}` });
  }
  const classCounts: Record<string, number> = {
    "unknown-election": 0,
    "unknown-voter": 0,
    "unknown-choice": 0,
    "invalid-timestamp": 0,
    valid: 0,
  };
  for (const c of cells) classCounts[c.expected ?? "valid"]!++;
  const pairs = new Set(cells.filter((c) => c.expected).map((c) => c.expected));
  if (pairs.size !== 4) return err({ kind: "precedence", detail: `classes ${pairs.size}` });
  return ok({ uniqueCount: keys.size, classCounts, precedencePairsCovered: pairs.size });
}
