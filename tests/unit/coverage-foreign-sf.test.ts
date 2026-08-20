// covers: harness-instrument:coverage-foreign-sf
//
// coverage-foreign-sf.test.ts — pins the #2315 fix: after LCOV normalize, SF
// records that sit outside the repo root AND are not a known mapping must be
// excluded from project totals, with a loud warning that names every dropped
// path. In-repo sources and known mappings (amadeus-pkg-*, dist/<harness>
// prefixes) must keep their LF/LH contribution.
//
// Mechanism: none (pure in-process). The merge helper lives in
// coverage-source-path.ts so tests can drive it without importing
// run-tests.ts (which runs main() on load). Technique: known-answer synthetic
// LCOV (pollution injection vs clean corpus).

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  type CoverageSourcePathContext,
  excludeForeignLcovRecords,
  formatForeignCoverageExclusionWarning,
  isCoverageSourceInsideRepo,
  normalizeCoverageSourcePath,
} from "../lib/coverage-source-path.ts";

const CONTEXT: CoverageSourcePathContext = {
  repoRoot: "/repo",
  tempRoots: ["/tmp", "/var/folders"],
};

const IN_REPO = "packages/framework/core/tools/amadeus-lib.ts";
const FOREIGN = "/var/folders/zz/T/host-copy/tools/amadeus-lib.ts";

function record(source: string, lines: number, hits: number): string {
  return ["TN:", `SF:${source}`, `DA:1,${hits}`, `LF:${lines}`, `LH:${hits}`, "end_of_record"].join(
    "\n",
  );
}

function sumTag(lcov: string, tag: "LF" | "LH"): number {
  const re = new RegExp(`^${tag}:(\\d+)`, "gm");
  let sum = 0;
  for (const match of lcov.matchAll(re)) sum += Number(match[1]);
  return sum;
}

describe("isCoverageSourceInsideRepo", () => {
  test("accepts a repo-relative source and an absolute path under the repo root", () => {
    expect(isCoverageSourceInsideRepo(IN_REPO, CONTEXT)).toBe(true);
    expect(isCoverageSourceInsideRepo(`/repo/${IN_REPO}`, CONTEXT)).toBe(true);
  });

  test("rejects an absolute path outside the repo root", () => {
    expect(isCoverageSourceInsideRepo(FOREIGN, CONTEXT)).toBe(false);
  });

  test("rejects a path that only looks in-repo before dot-segment collapse", () => {
    expect(isCoverageSourceInsideRepo("/repo/../tmp/composed-host/a.ts", CONTEXT)).toBe(false);
  });

  test("folds a relative climb-out path into the known amadeus-candidate mapping", () => {
    const relativeClimb =
      "../../../../private/var/folders/zz/T/amadeus-candidate-codex-AbC123/.codex/tools/amadeus-lib.ts";
    const context: CoverageSourcePathContext = {
      repoRoot: "/repo/nested/work",
      tempRoots: ["/private/var/folders/zz/T"],
    };
    expect(normalizeCoverageSourcePath(relativeClimb, context)).toBe(IN_REPO);
    expect(
      isCoverageSourceInsideRepo(normalizeCoverageSourcePath(relativeClimb, context), context),
    ).toBe(true);
  });
});

describe("excludeForeignLcovRecords — #2315 out-of-repo SF exclusion", () => {
  test("drops a foreign SF record from totals and names it in the loud warning", () => {
    const mixed = [record(IN_REPO, 10, 8), record(FOREIGN, 1000, 50)].join("\n");
    const { lcov, excluded } = excludeForeignLcovRecords(mixed, CONTEXT);

    expect(excluded).toEqual([FOREIGN]);
    expect(sumTag(lcov, "LF")).toBe(10);
    expect(sumTag(lcov, "LH")).toBe(8);
    expect(lcov).toContain(`SF:${IN_REPO}`);
    expect(lcov).not.toContain(FOREIGN);

    const warning = formatForeignCoverageExclusionWarning(excluded);
    expect(warning).not.toBeNull();
    expect(warning).toContain("WARNING: excluded 1 out-of-repo coverage source");
    expect(warning).toContain(FOREIGN);
  });

  test("leaves a clean in-repo input's totals unchanged and emits no warning", () => {
    const clean = [record(IN_REPO, 10, 8), record("tests/lib/coverage-source-path.ts", 4, 4)].join(
      "\n",
    );
    const { lcov, excluded } = excludeForeignLcovRecords(clean, CONTEXT);

    expect(excluded).toEqual([]);
    expect(sumTag(lcov, "LF")).toBe(14);
    expect(sumTag(lcov, "LH")).toBe(12);
    expect(formatForeignCoverageExclusionWarning(excluded)).toBeNull();
  });

  test("keeps a known amadeus-pkg mapping after normalize, and still drops a non-mapped temp host copy", () => {
    const mappedTemp = join(
      "/tmp",
      "amadeus-pkg-codex-AbC123",
      ".codex",
      "tools",
      "amadeus-lib.ts",
    );
    const canonical = normalizeCoverageSourcePath(mappedTemp, CONTEXT);
    expect(canonical).toBe(IN_REPO);

    const mixed = [record(canonical, 10, 8), record(FOREIGN, 1000, 50)].join("\n");
    const { lcov, excluded } = excludeForeignLcovRecords(mixed, CONTEXT);

    expect(excluded).toEqual([FOREIGN]);
    expect(sumTag(lcov, "LF")).toBe(10);
    expect(sumTag(lcov, "LH")).toBe(8);
    expect(lcov).toContain(`SF:${IN_REPO}`);
  });

  test("keeps dist and harness-prefix mappings after normalize", () => {
    const dist = normalizeCoverageSourcePath("dist/codex/.codex/tools/amadeus-lib.ts", CONTEXT);
    const harness = normalizeCoverageSourcePath(".claude/tools/amadeus-lib.ts", CONTEXT);
    expect(dist).toBe(IN_REPO);
    expect(harness).toBe(IN_REPO);

    const clean = [record(dist, 6, 3), record(harness, 6, 3)].join("\n");
    const { lcov, excluded } = excludeForeignLcovRecords(clean, CONTEXT);

    expect(excluded).toEqual([]);
    expect(sumTag(lcov, "LF")).toBe(12);
    expect(sumTag(lcov, "LH")).toBe(6);
  });

  test("names every excluded path when several foreign records arrive together", () => {
    const other = "/tmp/composed-host/packages/framework/core/tools/amadeus-lib.ts";
    const mixed = [record(IN_REPO, 2, 2), record(FOREIGN, 100, 1), record(other, 200, 2)].join("\n");
    const { excluded } = excludeForeignLcovRecords(mixed, CONTEXT);
    const warning = formatForeignCoverageExclusionWarning(excluded);

    expect(excluded).toEqual([FOREIGN, other]);
    expect(warning).toContain("WARNING: excluded 2 out-of-repo coverage source");
    expect(warning).toContain(FOREIGN);
    expect(warning).toContain(other);
  });

  test("keeps a record that has no SF line instead of dropping it silently", () => {
    const noSource = ["TN:", "DA:1,1", "end_of_record"].join("\n");
    const mixed = [noSource, record(IN_REPO, 10, 8), record(FOREIGN, 1000, 50)].join("\n");
    const { lcov, excluded } = excludeForeignLcovRecords(mixed, CONTEXT);

    expect(excluded).toEqual([FOREIGN]);
    expect(lcov).toContain("TN:");
    expect(lcov).toContain("DA:1,1");
    expect(lcov).toContain(`SF:${IN_REPO}`);
    expect(lcov).not.toContain(FOREIGN);
  });

  test("an all-foreign corpus yields empty lcov and names every path", () => {
    const other = "/tmp/composed-host/tools/amadeus-lib.ts";
    const only = [record(FOREIGN, 1000, 50), record(other, 2, 1)].join("\n");
    const { lcov, excluded } = excludeForeignLcovRecords(only, CONTEXT);

    expect(lcov).toBe("");
    expect(excluded).toEqual([FOREIGN, other]);
    expect(formatForeignCoverageExclusionWarning(excluded)).toContain(
      "WARNING: excluded 2 out-of-repo coverage source",
    );
  });

  test("empty input yields empty lcov and no warning", () => {
    const { lcov, excluded } = excludeForeignLcovRecords("", CONTEXT);
    expect(lcov).toBe("");
    expect(excluded).toEqual([]);
    expect(formatForeignCoverageExclusionWarning(excluded)).toBeNull();
  });

  test("collapses .. so a repo-prefixed escape path is excluded from totals", () => {
    const escaped = "/repo/../tmp/composed-host/a.ts";
    const mixed = [record(IN_REPO, 10, 8), record(escaped, 1000, 50)].join("\n");
    const { lcov, excluded } = excludeForeignLcovRecords(mixed, CONTEXT);

    expect(excluded).toEqual([escaped]);
    expect(sumTag(lcov, "LF")).toBe(10);
    expect(lcov).not.toContain(escaped);
  });

  test("warning text does not pass through raw control characters from SF paths", () => {
    const nasty = "/tmp/host/\u001b[31mred.ts";
    const { excluded } = excludeForeignLcovRecords(record(nasty, 1, 0), CONTEXT);
    const warning = formatForeignCoverageExclusionWarning(excluded);
    expect(warning).not.toBeNull();
    expect(warning).not.toContain("\u001b");
    expect(warning).toContain("red.ts");
  });
});
