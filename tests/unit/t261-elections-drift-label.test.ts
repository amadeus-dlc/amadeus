// t261 — U4 doctor-drift-check pure-function tests (Bolt B4 space-record-catalog).
// Layer: unit (no fs, no clock — fs-tests-integration-first). Covers the pure
// drift surface of amadeus-utility: composeElectionsDriftLabel (5 finding
// variants) and the exact-match predicate electionRowMatchesDir. A parity block
// pins the LOCAL predicate against scripts' electionDirMatches (ADR-6: the
// shipped check duplicates the predicate; the test — and only the test — may
// import both to prove the duplication has not drifted).
import { describe, expect, test } from "bun:test";
import {
  composeElectionsDriftLabel,
  type ElectionsDriftFinding,
  electionRowMatchesDir,
  isElectionsRegistryRow,
} from "../../packages/framework/core/tools/amadeus-utility.ts";
// Test-only cross-import (never shipped): the U1 store's exact-match predicate
// and row shape, used to assert parity with the locally-duplicated versions.
import {
  type ElectionRegistryEntry,
  electionDirMatches,
} from "../../packages/framework/core/tools/amadeus-election-store.ts";

describe("t261 composeElectionsDriftLabel — the five finding variants", () => {
  test("absent -> 移行前 label", () => {
    expect(composeElectionsDriftLabel({ kind: "absent" })).toBe(
      "elections registry: elections.json 不在(移行前)",
    );
  });

  test("corrupt -> 要調査 label", () => {
    expect(composeElectionsDriftLabel({ kind: "corrupt" })).toBe(
      "elections registry: elections.json corrupt — 要調査",
    );
  });

  test("readdir-fail -> readdir 失敗 要調査 label", () => {
    expect(composeElectionsDriftLabel({ kind: "readdir-fail" })).toBe(
      "elections registry: elections/ readdir 失敗 — 要調査",
    );
  });

  test("ok with zero drift -> no-drift label naming both counts", () => {
    expect(
      composeElectionsDriftLabel({
        kind: "ok",
        rows: 3,
        dirs: 3,
        rowsWithoutDir: [],
        dirsWithoutRow: [],
      }),
    ).toBe("elections registry: no drift (rows 3 / dirs 3)");
  });

  test("ok with bidirectional drift -> FULL enumeration of every drifted name (no silent cap)", () => {
    const label = composeElectionsDriftLabel({
      kind: "ok",
      rows: 4,
      dirs: 3,
      rowsWithoutDir: ["E-A", "E-B"],
      dirsWithoutRow: ["260722-stray"],
    });
    expect(label).toBe(
      "elections registry: rows 4 / dirs 3 / row→dir欠 2 [E-A,E-B] / dir→row欠 1 [260722-stray]",
    );
    // The enumeration is exhaustive: every id/dir name is present, none elided.
    expect(label).toContain("E-A");
    expect(label).toContain("E-B");
    expect(label).toContain("260722-stray");
  });

  test("ok with only row→dir drift still emits both counters (dir→row欠 0 [])", () => {
    expect(
      composeElectionsDriftLabel({
        kind: "ok",
        rows: 2,
        dirs: 1,
        rowsWithoutDir: ["E-ONLY"],
        dirsWithoutRow: [],
      }),
    ).toBe("elections registry: rows 2 / dirs 1 / row→dir欠 1 [E-ONLY] / dir→row欠 0 []");
  });

  // A large drift is enumerated in full — the no-silent-cap contract under load.
  test("ok enumerates a large drift with no truncation", () => {
    const ids = Array.from({ length: 25 }, (_, i) => `E-${i}`);
    const label = composeElectionsDriftLabel({
      kind: "ok",
      rows: 25,
      dirs: 0,
      rowsWithoutDir: ids,
      dirsWithoutRow: [],
    });
    for (const id of ids) expect(label).toContain(id);
    expect(label).toContain("row→dir欠 25 [");
  });
});

describe("t261 electionRowMatchesDir — exact-equality predicate", () => {
  const row = {
    electionId: "E-X",
    dirName: "260722-e-x",
    createdAt: "2026-07-22T00:00:00Z",
    status: "draft",
  };

  test("matches on exact dirName equality", () => {
    expect(electionRowMatchesDir(row, "260722-e-x")).toBe(true);
  });

  test("rejects a near-miss (prefix / suffix / case) — no fuzzy match", () => {
    expect(electionRowMatchesDir(row, "260722-e-x-2")).toBe(false);
    expect(electionRowMatchesDir(row, "260722-e-")).toBe(false);
    expect(electionRowMatchesDir(row, "260722-E-X")).toBe(false);
    expect(electionRowMatchesDir(row, "")).toBe(false);
  });

  // ADR-6 parity: the locally-duplicated predicate and scripts' electionDirMatches
  // MUST agree on every sample — same fixture rows applied to both.
  test("parity with scripts' electionDirMatches over a shared fixture set", () => {
    const rows: ElectionRegistryEntry[] = [
      { electionId: "E-A", dirName: "260722-e-a", createdAt: "2026-07-22T00:00:00Z", status: "draft" },
      { electionId: "E-B", dirName: "260722-e-b", createdAt: "2026-07-22T00:00:01Z", status: "open" },
      { electionId: "E-C", dirName: "260722-e-c-2", createdAt: "2026-07-22T00:00:02Z", status: "recorded" },
    ];
    const dirNames = ["260722-e-a", "260722-e-b", "260722-e-c", "260722-e-c-2", "unrelated", ""];
    for (const r of rows) {
      for (const d of dirNames) {
        const local = electionRowMatchesDir(r, d);
        const store = electionDirMatches(r, d);
        expect(local).toBe(store);
      }
    }
  });
});

describe("t261 isElectionsRegistryRow — local 4-field check (ADR-6 duplicate)", () => {
  test("accepts a well-formed row", () => {
    expect(
      isElectionsRegistryRow({
        electionId: "E-A",
        dirName: "260722-e-a",
        createdAt: "2026-07-22T00:00:00Z",
        status: "draft",
      }),
    ).toBe(true);
  });

  test("rejects rows with a missing/empty/mistyped required field", () => {
    const base = {
      electionId: "E-A",
      dirName: "260722-e-a",
      createdAt: "2026-07-22T00:00:00Z",
      status: "draft",
    };
    expect(isElectionsRegistryRow({ ...base, electionId: "" })).toBe(false);
    expect(isElectionsRegistryRow({ ...base, dirName: 5 })).toBe(false);
    expect(isElectionsRegistryRow({ ...base, createdAt: undefined })).toBe(false);
    expect(isElectionsRegistryRow({ ...base, status: "bogus" })).toBe(false);
    expect(isElectionsRegistryRow(null)).toBe(false);
    expect(isElectionsRegistryRow("nope")).toBe(false);
  });
});
