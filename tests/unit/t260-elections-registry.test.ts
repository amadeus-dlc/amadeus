// t260 — U1 elections-registry pure-function tests (Bolt B1 space-record-catalog).
// Layer: unit (no fs, no clock — fs-tests-integration-first). Covers the pure
// registry surface: mintElectionDirName, uuidv7ToUtcIso, electionDirMatches, and
// the row 4-field check (isElectionRegistryEntry).
import { describe, expect, test } from "bun:test";
import {
  type ElectionRegistryEntry,
  electionDirMatches,
  isElectionRegistryEntry,
  mintElectionDirName,
  uuidv7ToUtcIso,
} from "../../scripts/amadeus-election-store";

describe("mintElectionDirName", () => {
  test("base form is <YYMMDD>-<kebab slug> (UTC date, lowercase, 24-cap slug)", () => {
    const name = mintElectionDirName("E-SRCB1CG", "2026-07-22T13:45:07Z", new Set());
    expect(name).toBe("260722-e-srcb1cg");
  });

  test("date stamp is UTC — a late-UTC instant keeps the UTC calendar day", () => {
    // 23:59:59Z on the 22nd stays 260722 (no local-time drift to the 23rd).
    expect(mintElectionDirName("E-X", "2026-07-22T23:59:59Z", new Set())).toBe("260722-e-x");
  });

  test("slug caps the label at 24 chars", () => {
    const long = "E-THIS-IS-A-VERY-LONG-ELECTION-CODE-INDEED";
    const name = mintElectionDirName(long, "2026-01-02T00:00:00Z", new Set());
    const slug = name.slice("260102-".length);
    expect(slug.length).toBeLessThanOrEqual(24);
    expect(slug).toBe("e-this-is-a-very-long-el");
  });

  test("collision counter appends -2, -3, … over existing names", () => {
    const base = "260722-e-srcb1cg";
    expect(mintElectionDirName("E-SRCB1CG", "2026-07-22T13:45:07Z", new Set([base]))).toBe(
      `${base}-2`,
    );
    expect(
      mintElectionDirName("E-SRCB1CG", "2026-07-22T13:45:07Z", new Set([base, `${base}-2`])),
    ).toBe(`${base}-3`);
  });

  test("LOUD throw after 1000 exhausted names", () => {
    const base = "260722-e-srcb1cg";
    const taken = new Set<string>([base]);
    for (let n = 2; n <= 1000; n++) taken.add(`${base}-${n}`);
    // base + base-2..base-1000 = 1000 names taken -> no free candidate -> throw.
    expect(() => mintElectionDirName("E-SRCB1CG", "2026-07-22T13:45:07Z", taken)).toThrow(
      /after 1000 attempts/,
    );
  });

  test("1000th name is still minted (boundary just below the cap)", () => {
    const base = "260722-e-srcb1cg";
    const taken = new Set<string>([base]);
    for (let n = 2; n <= 999; n++) taken.add(`${base}-${n}`);
    expect(mintElectionDirName("E-SRCB1CG", "2026-07-22T13:45:07Z", taken)).toBe(`${base}-1000`);
  });
});

describe("uuidv7ToUtcIso", () => {
  test("decodes a version-7 UUID's 48-bit ms timestamp to seconds-precision UTC ISO", () => {
    // ms = 0x0190f4d3b2c0 -> a real instant; assert the round-trip is stable.
    const ms = 0x0190f4d3b2c0;
    const hex = ms.toString(16).padStart(12, "0"); // 12 leading hex digits
    const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7abc-8def-0123456789ab`;
    const iso = uuidv7ToUtcIso(uuid);
    expect(iso).toBe(new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z"));
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  test("epoch boundary: all-zero timestamp -> 1970-01-01T00:00:00Z", () => {
    expect(uuidv7ToUtcIso("00000000-0000-7000-8000-000000000000")).toBe("1970-01-01T00:00:00Z");
  });

  test("a version-4 UUID is not v7 -> null", () => {
    expect(uuidv7ToUtcIso("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  test("wrong variant nibble (not 8/9/a/b) -> null", () => {
    expect(uuidv7ToUtcIso("00000000-0000-7000-c000-000000000000")).toBeNull();
  });

  test("malformed / non-UUID strings -> null", () => {
    expect(uuidv7ToUtcIso("not-a-uuid")).toBeNull();
    expect(uuidv7ToUtcIso("")).toBeNull();
    expect(uuidv7ToUtcIso("00000000-0000-7000-8000-00000000000")).toBeNull(); // 11 tail hex
  });
});

describe("electionDirMatches", () => {
  const entry: ElectionRegistryEntry = {
    electionId: "E-SRCB1CG",
    dirName: "260722-e-srcb1cg",
    createdAt: "2026-07-22T13:45:07Z",
    status: "open",
  };

  test("exact equality only", () => {
    expect(electionDirMatches(entry, "260722-e-srcb1cg")).toBe(true);
    expect(electionDirMatches(entry, "E-SRCB1CG")).toBe(false); // electionId != dirName
    expect(electionDirMatches(entry, "260722-e-srcb1cg-2")).toBe(false);
    expect(electionDirMatches(entry, "260722-E-SRCB1CG")).toBe(false); // case-sensitive
  });
});

describe("isElectionRegistryEntry (row 4-field check)", () => {
  const good: ElectionRegistryEntry = {
    electionId: "E-A",
    dirName: "E-A",
    createdAt: "2026-07-22T00:00:00Z",
    status: "draft",
  };

  test("accepts a well-formed row", () => {
    expect(isElectionRegistryEntry(good)).toBe(true);
  });

  test("accepts every known ElectionState in status", () => {
    for (const status of [
      "draft",
      "open",
      "collecting",
      "tallied",
      "rendered",
      "recorded",
      "hold",
    ] as const) {
      expect(isElectionRegistryEntry({ ...good, status })).toBe(true);
    }
  });

  test("ignores unknown EXTRA fields (forward-compat)", () => {
    expect(isElectionRegistryEntry({ ...good, note: "future", weight: 3 })).toBe(true);
  });

  test("rejects a missing or mistyped required field", () => {
    const { electionId, ...noId } = good;
    expect(isElectionRegistryEntry(noId)).toBe(false);
    expect(isElectionRegistryEntry({ ...good, electionId: "" })).toBe(false);
    expect(isElectionRegistryEntry({ ...good, dirName: 42 })).toBe(false);
    expect(isElectionRegistryEntry({ ...good, createdAt: null })).toBe(false);
  });

  test("rejects an unknown status value", () => {
    expect(isElectionRegistryEntry({ ...good, status: "archived" })).toBe(false);
    expect(isElectionRegistryEntry({ ...good, status: 1 })).toBe(false);
  });

  test("rejects non-object inputs", () => {
    expect(isElectionRegistryEntry(null)).toBe(false);
    expect(isElectionRegistryEntry("row")).toBe(false);
    expect(isElectionRegistryEntry([good])).toBe(false); // an array is not a row
  });
});
