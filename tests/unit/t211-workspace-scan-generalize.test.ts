// covers: subcommand:amadeus-utility:init
//
// t211-workspace-scan-generalize.test.ts — in-process seam test for Issue #840.
//
// detectWorkspace() backs the `amadeus-utility init` / `intent-birth` scan. Its
// language walk used to recurse ONLY into SCAN_SOURCE_DIRS (src/app/lib/pages/
// components/tests), so a repo whose sources live under packages/ (or scripts/)
// counted zero files -> langCounts empty -> hasSourceFiles=false. When no other
// brownfield signal is present (no framework config, no manifest, no non-dev
// deps, no SCAN_SOURCE_DIRS dir) the repo is misclassified Greenfield and the
// bugfix-scope reverse-engineering stage is downgraded to SKIP.
//
// The #459 fix (765fe4f20) generalized the walk to every non-excluded, non-dot
// top-level directory; it was lost in the 2026-07-06 restart rebaseline and is
// re-applied here. This test drives detectWorkspace() IN-PROCESS (it is an
// exported pure function over a directory) against fresh temp fixtures — no
// spawn, no LLM. STRONGER than the CLI-boundary t20 twin for the specific #840
// contract: it pins the classification of a packages/-only layout directly.
//
// Cases:
//   1 (#840 closure): sources ONLY under packages/, no manifest / framework /
//     non-dev-deps signal -> Brownfield + languages detected (RED before fix:
//     would be Greenfield / Unknown).
//   2 (perf guard): SCAN_EXCLUDE dirs (node_modules) and dot-dirs (.hidden) are
//     NOT walked — code placed only there stays uncounted (Greenfield/Unknown).
//   3 (regression): the classic src/App.tsx layout still classifies Brownfield
//     with TypeScript (the old SCAN_SOURCE_DIRS path still works).

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  countLangsInTopDirs,
  detectWorkspace,
} from "../../dist/claude/.claude/tools/amadeus-utility.ts";

const tempDirs: string[] = [];

afterAll(() => {
  for (const d of tempDirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

/** Fresh empty temp dir. */
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "t211-ws-"));
  tempDirs.push(d);
  return d;
}

/** Write a file, creating parent dirs. */
function write(root: string, rel: string, body: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, body, "utf-8");
}

describe("t211 detectWorkspace — non-standard source layout (#840)", () => {
  // Case 1 — #840 closure. Sources live ONLY under packages/ and there is NO
  // other brownfield signal (no package.json, no framework config, no manifest).
  // Before the fix the SCAN_SOURCE_DIRS-only walk left langCounts empty and the
  // OR-chain fell through to Greenfield. After the fix packages/ is walked, so
  // hasSourceFiles=true -> Brownfield and languages resolve to TypeScript.
  test("1: packages/-only sources -> Brownfield + TypeScript (was Greenfield/Unknown)", () => {
    const p = tmp();
    write(p, "packages/core/src/index.ts", "export const x = 1;\n");
    write(p, "packages/core/src/util.ts", "export const y = 2;\n");
    write(p, "README.md", "# repo\n");

    const r = detectWorkspace(p);
    expect(r.projectType).toBe("Brownfield");
    expect(r.languages).toContain("TypeScript");
  });

  // Case 2 — performance/scope guard. Code placed ONLY under an excluded dir
  // (node_modules) or a dot-dir (.hidden) must NOT be counted. With no other
  // signal the workspace stays Greenfield/Unknown — proving the walk still skips
  // SCAN_EXCLUDE entries and dot-directories.
  test("2: node_modules/ and dot-dirs are not walked (perf guard preserved)", () => {
    const p = tmp();
    write(p, "node_modules/pkg/index.ts", "export const dep = 1;\n");
    write(p, ".hidden/secret.ts", "export const s = 1;\n");
    write(p, "README.md", "# repo\n");

    const r = detectWorkspace(p);
    expect(r.projectType).toBe("Greenfield");
    expect(r.languages).toBe("Unknown");
  });

  // Case 3 — regression. The classic src/ layout (a member of SCAN_SOURCE_DIRS)
  // must keep classifying Brownfield with TypeScript — the generalized walk is a
  // superset of the old one.
  test("3: classic src/App.tsx layout still Brownfield + TypeScript", () => {
    const p = tmp();
    write(p, "src/App.tsx", "export const App = () => null;\n");

    const r = detectWorkspace(p);
    expect(r.projectType).toBe("Brownfield");
    expect(r.languages).toContain("TypeScript");
  });

  // Case 4 — lstat-race guard (seam). An entry present in topSet but absent on
  // disk (the readdir/lstat TOCTOU window) makes lstatSync throw; the walk must
  // swallow it and continue, leaving counts untouched. Driven through the
  // exported seam because the race is not reproducible via detectWorkspace.
  test("4: a topSet entry missing on disk is skipped (lstat-race guard)", () => {
    const p = tmp();
    write(p, "packages/core/src/index.ts", "export const x = 1;\n");
    const counts: Record<string, number> = {};
    // "ghost" is not on disk -> lstatSync throws -> caught -> continue.
    countLangsInTopDirs(p, new Set(["ghost", "packages"]), counts);
    expect(counts.TypeScript).toBe(1);
  });
});
