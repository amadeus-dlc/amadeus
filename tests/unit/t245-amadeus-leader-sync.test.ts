// covers: harness-instrument:amadeus-leader-sync
//
// t245 — pure-domain coverage for the leader-owned record sync tool. Filesystem
// and process boundaries are intentionally kept in the integration companion.

import { describe, expect, test } from "bun:test";
import {
  analyzeOwnedContents,
  checkExclusions,
  deriveSyncStatus,
  parseArgs,
  parseNameStatus,
  renderPrBody,
  renderSyncError,
  reportPassed,
  resolveOwnedCandidates,
  shardBasename,
  syncErrorExitCode,
  SYNC_ELECTION_THRESHOLD,
} from "../../scripts/amadeus-leader-sync";

const SHARD = "builder-abc123.md";
const ELECTION_JSON = "amadeus/spaces/default/elections/E-ONE/definition.json";
const SHARD_PATH = `amadeus/spaces/default/intents/260720-one/audit/${SHARD}`;

function owned() {
  return resolveOwnedCandidates([
    SHARD_PATH,
    ELECTION_JSON,
    "amadeus/spaces/default/intents/260720-two/audit/other-def456.md",
    "docs/README.md",
  ], SHARD);
}

describe("t245 M8 argument parsing", () => {
  test("accepts exactly status, plan, and create", () => {
    expect(parseArgs(["status"])).toEqual({ kind: "status" });
    expect(parseArgs(["plan"])).toEqual({ kind: "plan" });
    expect(parseArgs(["create"])).toEqual({ kind: "create" });
  });

  test("rejects missing, unknown, and surplus arguments as usage", () => {
    expect(parseArgs([]).kind).toBe("usage");
    expect(parseArgs(["merge"]).kind).toBe("usage");
    expect(parseArgs(["status", "--json"]).kind).toBe("usage");
  });

  test("maps every SyncError discriminator to its loud rendering and exit code", () => {
    const cases = [
      [{ kind: "clone-id-missing", detail: "clone" } as const, 1],
      [{ kind: "git-failed", detail: "git" } as const, 1],
      [{ kind: "gh-failed", detail: "gh" } as const, 1],
      [{ kind: "usage", detail: "usage" } as const, 2],
    ] as const;
    for (const [error, exitCode] of cases) {
      expect(syncErrorExitCode(error)).toBe(exitCode);
      expect(renderSyncError(error)).toContain(`${error.kind}: ${error.detail}`);
    }
  });
});

describe("t245 M1/M2 owned-set resolution", () => {
  test("keeps every election file and only the matching clone audit shard", () => {
    expect(owned()).toEqual({
      electionPaths: [ELECTION_JSON],
      shardPaths: [SHARD_PATH],
    });
  });

  test("normalizes symbolic and long hosts and accepts clone ids of length 1..32", () => {
    expect(shardBasename("J5IK2O.Mac Studio!", "a")).toBe("j5ik2o-mac-studio-a.md");
    const longHost = `Host.${"x".repeat(80)}`;
    expect(shardBasename(longHost, "z".repeat(32))).toBe(
      `${`host-${"x".repeat(43)}`}-${"z".repeat(32)}.md`,
    );
    expect(() => shardBasename("host", "")).toThrow();
    expect(() => shardBasename("host", "A".repeat(12))).toThrow();
    expect(() => shardBasename("host", "a".repeat(33))).toThrow();
  });
});

describe("t245 M3 E-PM10A exclusion predicate", () => {
  test("allows only elections and the own shard", () => {
    expect(checkExclusions([
      { status: "A", path: ELECTION_JSON },
      { status: "M", path: SHARD_PATH },
    ], owned())).toEqual([]);
  });

  test("classifies memory, member snapshot, and generic foreign changes", () => {
    expect(checkExclusions([
      { status: "M", path: "amadeus/spaces/default/memory/team.md" },
      { status: "A", path: "amadeus/spaces/default/intents/member/amadeus-state.md" },
      { status: "M", path: "scripts/unrelated.ts" },
    ], owned())).toEqual([
      { kind: "memory-touch", path: "amadeus/spaces/default/memory/team.md" },
      { kind: "snapshot-carry", path: "amadeus/spaces/default/intents/member/amadeus-state.md" },
      { kind: "foreign-modify", path: "scripts/unrelated.ts" },
    ]);
  });

  test("parses rename rows using their destination path", () => {
    expect(parseNameStatus(`A\t${ELECTION_JSON}\nR100\told.md\tnew.md\n`)).toEqual([
      { status: "A", path: ELECTION_JSON },
      { status: "R", path: "new.md" },
    ]);
    expect(() => parseNameStatus("broken-row\n")).toThrow();
    expect(() => parseNameStatus("R100\told.md\t\n")).toThrow();
  });
});

describe("t245 M5 self-check", () => {
  test("passes additions plus an append-only shard modification", () => {
    const report = analyzeOwnedContents([
      { status: "A", path: ELECTION_JSON },
      { status: "M", path: SHARD_PATH },
    ], owned(), new Map([
      [ELECTION_JSON, '{"electionId":"E-ONE"}\n'],
      [SHARD_PATH, "## Audit\nnew entry\n"],
    ]), new Map([[SHARD_PATH, "## Audit\n"]]));
    expect(reportPassed(report)).toBe(true);
    expect(renderPrBody(report, 2)).toContain("pureAddition: true");
  });

  test("fails invalid JSON, canonical conflict markers, and election modification", () => {
    const report = analyzeOwnedContents([
      { status: "M", path: ELECTION_JSON },
    ], owned(), new Map([
      [ELECTION_JSON, "{bad json\n<<<<<<< ours\n======= intentionally excluded\n>>>>>>> theirs\n"],
      [SHARD_PATH, "||||||| base\n"],
    ]));
    expect(report.pureAddition).toBe(false);
    expect(report.parseFailures).toEqual([ELECTION_JSON]);
    expect(report.markerHits).toEqual([
      { path: ELECTION_JSON, count: 2 },
      { path: SHARD_PATH, count: 1 },
    ]);
    expect(reportPassed(report)).toBe(false);
  });

  test("rejects a modified shard that is not an append-only prefix extension", () => {
    const report = analyzeOwnedContents([
      { status: "M", path: SHARD_PATH },
    ], owned(), new Map([[SHARD_PATH, "rewritten\n"]]), new Map([[SHARD_PATH, "original\n"]]));
    expect(report.pureAddition).toBe(false);
  });
});

describe("t245 M7 threshold status", () => {
  test("derives counts and uses strict greater-than against the named constant", () => {
    const base = ["E-BASE"];
    const atThreshold = Array.from({ length: SYNC_ELECTION_THRESHOLD }, (_, i) => `E-${i}`);
    expect(deriveSyncStatus(atThreshold, base, 4, 6)).toEqual({
      unsyncedElections: SYNC_ELECTION_THRESHOLD,
      shardDeltaLines: 4,
      normDeltaLines: 6,
      thresholdExceeded: false,
    });
    expect(deriveSyncStatus([...atThreshold, "E-EXTRA"], base, 0, 0).thresholdExceeded).toBe(true);
  });
});
