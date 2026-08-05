import { describe, expect, test } from "bun:test";
import {
  InvariantNameCodec,
  TraceCoverage,
} from "../../plugins/formal-model-check/tools/tla-referees.ts";
import { IdentityDigest } from "../../plugins/formal-model-check/tools/tla-evidence.ts";
import type { StableId } from "../../plugins/formal-model-check/tools/tla-evidence.ts";
import type {
  CoverageFailure,
  CoverageProof,
  InvariantName,
  TraceRow,
} from "../../plugins/formal-model-check/tools/tla-referees.ts";

// U3 C3 pin (business-rules.md BR-U3-06..11, business-logic-model.md §1).
// Pure layer only: no filesystem, so this stays a unit-size test
// (cid:code-generation:fs-tests-integration-first).

function unwrap<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

function failure<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): E {
  if (result.ok) throw new Error(`expected failure, got ${JSON.stringify(result.value)}`);
  return result.error;
}

function subject(raw: string): StableId {
  return unwrap(IdentityDigest.normalizeStableId(raw));
}

function invariant(raw: string): InvariantName {
  return unwrap(InvariantNameCodec.parse(raw));
}

function row(subjectRaw: string, invariantRaw: string, rationale = "trace"): TraceRow {
  return { subject: subject(subjectRaw), invariant: invariant(invariantRaw), rationale };
}

describe("InvariantNameCodec.parse", () => {
  test.each(["TypeOK", "NoCloseWithoutLandedSync", "_private", "Inv2"])("accepts %s", (raw) => {
    expect(String(unwrap(InvariantNameCodec.parse(raw)))).toBe(raw);
  });

  test.each(["2Inv", "has space", "dash-name", "", "Inv!"])("rejects %p", (raw) => {
    expect(failure(InvariantNameCodec.parse(raw))).toEqual({
      kind: "invalid-invariant-name",
      tokens: [raw],
    });
  });
});

describe("TraceCoverage.evaluate — full coverage", () => {
  test("mints a CoverageProof when every subject and invariant is bound", () => {
    const proof: CoverageProof = unwrap(
      TraceCoverage.evaluate(
        [subject("FR-006"), subject("FR-008")],
        [row("FR-006", "TypeOK"), row("FR-008", "NoDuplicateCreate")],
        [invariant("TypeOK"), invariant("NoDuplicateCreate")],
      ),
    );
    expect(proof.subjectsDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(proof.rowsDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(proof.invariantsDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("digests ignore input order (NFR-001 determinism)", () => {
    const subjects = [subject("FR-006"), subject("FR-008")];
    const rows = [row("FR-006", "TypeOK"), row("FR-008", "NoDuplicateCreate")];
    const invariants = [invariant("TypeOK"), invariant("NoDuplicateCreate")];
    const forward = unwrap(TraceCoverage.evaluate(subjects, rows, invariants));
    const reversed = unwrap(
      TraceCoverage.evaluate([...subjects].reverse(), [...rows].reverse(), [...invariants].reverse()),
    );
    expect(reversed).toEqual(forward);
  });

  test("a rationale-free row is unresolvable rather than a proof (FR-006 auditability)", () => {
    const failed: CoverageFailure = failure(
      TraceCoverage.evaluate(
        [subject("FR-006")],
        [row("FR-006", "TypeOK", "")],
        [invariant("TypeOK")],
      ),
    );
    expect(failed.unresolvedRows).toHaveLength(1);
  });
});

describe("TraceCoverage.evaluate — the four defect classes", () => {
  test("BR-U3-08: a subject no row names lands in uncoveredSubjects", () => {
    const failed = failure(
      TraceCoverage.evaluate(
        [subject("FR-006"), subject("FR-008")],
        [row("FR-006", "TypeOK")],
        [invariant("TypeOK")],
      ),
    );
    expect(failed).toEqual({
      kind: "coverage-failure",
      uncoveredSubjects: [subject("FR-008")],
      orphanInvariants: [],
      duplicateSubjects: [],
      unresolvedRows: [],
    });
  });

  test("BR-U3-09: a declared invariant no row names lands in orphanInvariants", () => {
    const failed = failure(
      TraceCoverage.evaluate(
        [subject("FR-006")],
        [row("FR-006", "TypeOK")],
        [invariant("TypeOK"), invariant("NoDuplicateCreate")],
      ),
    );
    expect(failed.orphanInvariants).toEqual([invariant("NoDuplicateCreate")]);
    expect(failed.uncoveredSubjects).toEqual([]);
  });

  test("BR-U3-06: a repeated subject lands in duplicateSubjects once", () => {
    const failed = failure(
      TraceCoverage.evaluate(
        [subject("FR-006"), subject("FR-006"), subject("FR-006")],
        [row("FR-006", "TypeOK")],
        [invariant("TypeOK")],
      ),
    );
    expect(failed.duplicateSubjects).toEqual([subject("FR-006")]);
    expect(failed.unresolvedRows).toEqual([]);
  });

  test("BR-U3-07: a row whose subject is unknown lands in unresolvedRows, not duplicateSubjects", () => {
    const stray = row("FR-009", "TypeOK");
    const failed = failure(
      TraceCoverage.evaluate([subject("FR-006")], [row("FR-006", "TypeOK"), stray], [invariant("TypeOK")]),
    );
    expect(failed.unresolvedRows).toEqual([stray]);
    expect(failed.duplicateSubjects).toEqual([]);
  });

  test("BR-U3-07: a row whose invariant is undeclared lands in unresolvedRows", () => {
    const stray = row("FR-006", "Undeclared");
    const failed = failure(
      TraceCoverage.evaluate([subject("FR-006")], [row("FR-006", "TypeOK"), stray], [invariant("TypeOK")]),
    );
    expect(failed.unresolvedRows).toEqual([stray]);
    expect(failed.orphanInvariants).toEqual([]);
  });

  test("BR-U3-10: all four defect classes are enumerated at once, not short-circuited", () => {
    const unknownSubject = row("FR-009", "TypeOK");
    const undeclaredInvariant = row("FR-006", "Undeclared");
    const failed = failure(
      TraceCoverage.evaluate(
        [subject("FR-006"), subject("FR-007"), subject("FR-008"), subject("FR-008")],
        [row("FR-006", "TypeOK"), row("FR-008", "TypeOK"), unknownSubject, undeclaredInvariant],
        [invariant("TypeOK"), invariant("NoDuplicateCreate")],
      ),
    );
    expect(failed).toEqual({
      kind: "coverage-failure",
      uncoveredSubjects: [subject("FR-007")],
      orphanInvariants: [invariant("NoDuplicateCreate")],
      duplicateSubjects: [subject("FR-008")],
      unresolvedRows: [unknownSubject, undeclaredInvariant],
    });
  });
});
