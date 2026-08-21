// covers: file:scripts/core-plugin-import-boundary.ts
// size: medium
//
// t3416 (integration) — the framework→plugins import boundary CLI seam (#3416).
//
// The unit twin drives the pure predicates through an injected reader. This file
// drives the OTHER half: `trackedGitFiles` (a real `git ls-files` spawn) and
// `corePluginImportBoundaryMain` (the exit-code + operator-output surface), over
// SYNTHETIC repositories built in a temp dir. Every arm the CLI can take is
// exercised here — clean, violation, unreadable, empty corpus, and a broken git
// enumeration — so the gate's own failure modes are observed rather than assumed.
//
// Spawns git and touches the filesystem → medium, integration tier (a unit-tier
// home would be a filesystem/process test in the small-only unit scope).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { corePluginImportBoundaryMain, trackedGitFiles } from "../../scripts/core-plugin-import-boundary.ts";

// A synthetic repo: a real git index (so `git ls-files` answers) holding only
// the framework files the case needs.
function makeRepo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t3416-"));
  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf-8" });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  };
  git("init", "--quiet");
  for (const [rel, source] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, source);
  }
  if (Object.keys(files).length > 0) git("add", "--all");
  return root;
}

type Captured = { readonly code: number; readonly out: string; readonly err: string };

// Run the CLI entry in-process, capturing what an operator would read.
function runMain(projectDir: string): Captured {
  const out: string[] = [];
  const err: string[] = [];
  const realLog = console.log;
  const realError = console.error;
  console.log = (...args: unknown[]) => out.push(args.join(" "));
  console.error = (...args: unknown[]) => err.push(args.join(" "));
  try {
    return { code: corePluginImportBoundaryMain(projectDir), out: out.join("\n"), err: err.join("\n") };
  } finally {
    console.log = realLog;
    console.error = realError;
  }
}

function withRepo(files: Record<string, string>, body: (root: string) => void): void {
  const root = makeRepo(files);
  try {
    body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const LEGIT_CORE = [
  'import { join } from "node:path";',
  'import { readState } from "./amadeus-state.ts";',
  'export { HARNESSES } from "../data/harnesses.ts";',
].join("\n");

describe("t3416 trackedGitFiles (the corpus enumeration)", () => {
  test("lists only the tracked framework files", () => {
    withRepo(
      {
        "packages/framework/core/tools/amadeus-lib.ts": LEGIT_CORE,
        "packages/framework/harness/pi/manifest.ts": LEGIT_CORE,
        "scripts/plugin-projection.ts": 'import x from "../plugins/p/tools/a.ts";',
        "README.md": "# synthetic\n",
      },
      (root) => {
        expect([...trackedGitFiles(root)].sort()).toEqual([
          "packages/framework/core/tools/amadeus-lib.ts",
          "packages/framework/harness/pi/manifest.ts",
        ]);
      },
    );
  });

  test("an untracked framework file is not part of the corpus", () => {
    withRepo({ "packages/framework/core/tools/a.ts": LEGIT_CORE }, (root) => {
      writeFileSync(join(root, "packages/framework/core/tools/untracked.ts"), LEGIT_CORE);
      expect(trackedGitFiles(root)).toEqual(["packages/framework/core/tools/a.ts"]);
    });
  });

  test("a failed git enumeration throws instead of returning an empty corpus", () => {
    // A directory that is not a repository at all: the guard must not read the
    // failure as "no framework files".
    const outside = mkdtempSync(join(tmpdir(), "amadeus-t3416-nogit-"));
    try {
      expect(() => trackedGitFiles(outside)).toThrow(/git ls-files failed/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("t3416 corePluginImportBoundaryMain (exit code and operator output)", () => {
  test("a clean corpus exits 0 and reports the scanned count", () => {
    withRepo(
      {
        "packages/framework/core/tools/amadeus-lib.ts": LEGIT_CORE,
        "packages/framework/harness/opencode/manifest.ts":
          'import { emit } from "./emit.ts";\nexport const files = [{ src: "plugins/amadeus-opencode-plugin.ts" }];\n',
        "packages/framework/harness/opencode/plugins/amadeus-opencode-plugin.ts": "export default () => ({});\n",
      },
      (root) => {
        const result = runMain(root);
        expect(result.code).toBe(0);
        expect(result.out).toContain("framework→plugins import boundary: clean (3 core/harness sources scanned");
        expect(result.err).toBe("");
      },
    );
  });

  test("a violating corpus exits 1 and names every offending import", () => {
    withRepo(
      {
        "packages/framework/core/tools/amadeus-lib.ts":
          `${LEGIT_CORE}\nimport { quick } from "../../../../plugins/coverage-patch-quick/tools/cli.ts";\n`,
        "packages/framework/harness/pi/manifest.ts":
          `${LEGIT_CORE}\nconst late = await import(".claude/plugins/formal-model-check/tools/cli.ts");\n`,
      },
      (root) => {
        const result = runMain(root);
        expect(result.code).toBe(1);
        expect(result.err).toContain("framework→plugins import boundary violated — 2 import(s)");
        expect(result.err).toContain("0 unreadable file(s) across 2 scanned source(s)");
        expect(result.err).toContain(
          "packages/framework/core/tools/amadeus-lib.ts:4: imports ../../../../plugins/coverage-patch-quick/tools/cli.ts → plugins/coverage-patch-quick/tools/cli.ts",
        );
        expect(result.err).toContain(
          "packages/framework/harness/pi/manifest.ts:4: imports .claude/plugins/formal-model-check/tools/cli.ts → .claude/plugins/formal-model-check/tools/cli.ts",
        );
      },
    );
  });

  test("a tracked-but-unreadable corpus file fails closed", () => {
    withRepo({ "packages/framework/core/tools/amadeus-lib.ts": LEGIT_CORE }, (root) => {
      // Still in the git index, gone from the worktree: the scan must enumerate
      // it as a failure rather than quietly shrinking to zero files.
      unlinkSync(join(root, "packages/framework/core/tools/amadeus-lib.ts"));
      const result = runMain(root);
      expect(result.code).toBe(1);
      expect(result.err).toContain("0 import(s), 1 unreadable file(s) across 1 scanned source(s)");
      expect(result.err).toContain("UNREADABLE packages/framework/core/tools/amadeus-lib.ts");
    });
  });

  test("an empty corpus is refused as a vacuous pass", () => {
    withRepo({}, (root) => {
      const result = runMain(root);
      expect(result.code).toBe(1);
      expect(result.err).toContain("no tracked source under packages/framework/");
      expect(result.err).toContain("refusing to report a vacuous pass");
      expect(result.out).toBe("");
    });
  });

  test("a broken git enumeration surfaces the error and exits 1", () => {
    const outside = mkdtempSync(join(tmpdir(), "amadeus-t3416-nogit-main-"));
    try {
      const result = runMain(outside);
      expect(result.code).toBe(1);
      expect(result.err).toContain("git ls-files failed");
      expect(result.out).toBe("");
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
