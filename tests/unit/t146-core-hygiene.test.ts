// t146-core-hygiene: core/ prose carries the {{HARNESS_DIR}} token, never a raw
// harness-dir path literal — except a small, named carve-out set.
//
// covers: file:core/amadeus-common/protocols/stage-protocol.md
//
// WHAT. The dist-unified keystone (MR-1) made core/ harness-neutral: every
// path that names the harness directory in .md prose is written
// `{{HARNESS_DIR}}/…` and the packager substitutes `.claude` / `.kiro` /
// `.codex` per tree. A raw `.claude/<subdir>` (or `.kiro/` / `.codex/`) path
// literal that slips into a core .md would ship verbatim into EVERY harness's
// dist — a Claude path leaking into the Kiro and Codex trees. The dist-level
// byte-parity gate (t145) catches a literal that the anchored migration WOULD
// have tokenized; this test guards the other direction — a NEW core edit that
// hardcodes a harness path instead of using the token.
//
// THE CARVE-OUTS (truthful, harness-specific prose that MUST stay literal):
//   - workspace-detection.md enumerates all three harness dirs by name when it
//     tells the scanner which dirs to exclude — `.claude/`, `.kiro/`, `.codex/`
//     are the literal directory names, not a tokenizable path.
//   - stage-protocol.md's CWD-drift note says "on Claude Code,
//     $CLAUDE_PROJECT_DIR/.claude/tools/" — a Claude-Code-specific example, true
//     only for that harness.
// Both are exactly what survives the proven anchored migration by NON-MATCH
// (the anchors only rewrite `.claude/<subdir>` path forms), so this carve-out
// list is the same set the packager and the kiro/codex dist trees already prove.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { allHarnessDirs } from "../helpers/harness-dir-fixture.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = join(REPO_ROOT, "packages", "framework", "core");
// Plugin prose is projected into EVERY harness tree by the same two delivery
// paths core prose is (the build-time packager and the runtime seeding copy), so
// a raw harness-dir literal there leaks exactly as it would from core (#2790).
// The authoring `plugins/` tree is therefore part of THIS test's corpus. The
// token-floor test below keeps its own, core-only scope: plugins/ carries a
// single token today and would sink any floor derived from core's 60 files.
const PLUGINS = join(REPO_ROOT, "plugins");
const STRAY_ROOTS: readonly string[] = [CORE, PLUGINS];

// A hit is carved out iff its (relPath, lineText) is a known truthful literal.
function isCarvedOut(relPath: string, line: string): boolean {
  // workspace-detection's three-dir enumeration: the line names .kiro/ and
  // .codex/ alongside .claude/, so it is harness-enumerating, not a path.
  if (
    relPath === "amadeus-common/stages/initialization/workspace-detection.md" &&
    line.includes(".kiro/") &&
    line.includes(".codex/")
  ) {
    return true;
  }
  // stage-protocol's Claude-Code-specific CWD-drift example.
  if (
    relPath === "amadeus-common/protocols/stage-protocol.md" &&
    line.includes("$CLAUDE_PROJECT_DIR/.claude/tools/")
  ) {
    return true;
  }
  return false;
}

function* walkMd(dir: string): Generator<string> {
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walkMd(full);
    else if (full.endsWith(".md")) yield full;
  }
}

// Raw harness-dir path literals — EVERY packaged harness's dir, read from the
// authored manifests rather than listed here, so a new harness row cannot
// silently fall outside the guard (#2790: `.opencode/`, `.cursor/`,
// `.kimi-code/` and `.pi/` used to sail straight through a three-harness
// pattern). Bare `.claude/` (e.g. inside a `(.claude/, .kiro/, .codex/)`
// enumeration) is matched too, then filtered by the carve-out predicate.
const HARNESS_PATH_RE = new RegExp(
  `(?:${allHarnessDirs().map((dir) => dir.replace(/[.]/g, "\\.")).join("|")})/`,
);

// The scan itself, over an arbitrary root list — reused by the positive-control
// test below so the guard is exercised through the SAME code path a real stray
// literal would take, not through a hand-rolled regex probe.
function strayLiterals(roots: readonly string[]): string[] {
  const stray: string[] = [];
  for (const root of roots) {
    for (const file of walkMd(root)) {
      const rel = relative(root, file);
      const lines = readFileSync(file, "utf-8").split("\n");
      lines.forEach((line, i) => {
        if (!HARNESS_PATH_RE.test(line)) return;
        if (isCarvedOut(rel, line)) return;
        stray.push(`${relative(REPO_ROOT, file)}:${i + 1}: ${line.trim()}`);
      });
    }
  }
  return stray;
}

describe("t146 core hygiene — no stray harness-dir path literals in core/ prose", () => {
  test("every harness-dir path literal in core/*.md is the {{HARNESS_DIR}} token or a named carve-out", () => {
    const stray = strayLiterals(STRAY_ROOTS);
    if (stray.length > 0) {
      console.error(
        "stray harness-dir path literals in core/ or plugins/ (use {{HARNESS_DIR}} or add a carve-out):\n" +
          stray.join("\n"),
      );
    }
    expect(stray).toEqual([]);
  });

  // POSITIVE CONTROL. A non-regression pass proves nothing about a regex that was
  // mis-written: the three-harness pattern this test used to carry was green on
  // the whole corpus while `.opencode/`, `.cursor/`, `.kimi-code/` and `.pi/`
  // walked past it. Inject one literal per packaged harness dir and require the
  // scan to catch each — the guard must be red for EVERY dir it claims to cover.
  test("the guard catches an injected literal for every packaged harness dir", () => {
    const injected = mkdtempSync(join(tmpdir(), "amadeus-t146-injected-"));
    try {
      for (const dir of allHarnessDirs()) {
        const file = join(injected, "stray.md");
        writeFileSync(file, `Run \`bun ${dir}/tools/amadeus-sensor.ts fire x\` by hand.\n`);
        expect(strayLiterals([injected]), dir).toHaveLength(1);
      }
      writeFileSync(join(injected, "stray.md"), "Run `bun {{HARNESS_DIR}}/tools/amadeus-sensor.ts fire x`.\n");
      expect(strayLiterals([injected])).toEqual([]);
    } finally {
      rmSync(injected, { recursive: true, force: true });
    }
  });

  // The carve-outs are load-bearing prose, not incidental: assert they are still
  // matched by the (now wider) pattern AND still excused, so a widened regex
  // cannot quietly turn into a wider carve-out.
  test("both named carve-outs still match the pattern and are still excused", () => {
    const carved: Array<[string, string]> = [
      [
        "amadeus-common/stages/initialization/workspace-detection.md",
        "exclude `.claude/`, `.kiro/`, `.codex/` from the scan",
      ],
      [
        "amadeus-common/protocols/stage-protocol.md",
        "on Claude Code, $CLAUDE_PROJECT_DIR/.claude/tools/ is the anchor",
      ],
    ];
    for (const [rel, line] of carved) {
      expect(HARNESS_PATH_RE.test(line), rel).toBe(true);
      expect(isCarvedOut(rel, line), rel).toBe(true);
    }
    expect(carved).toHaveLength(2);
  });

  test("the {{HARNESS_DIR}} token is actually present in core/ (migration ran)", () => {
    let tokenFiles = 0;
    for (const file of walkMd(CORE)) {
      if (readFileSync(file, "utf-8").includes("{{HARNESS_DIR}}")) tokenFiles++;
    }
    // 60 core .md files carried a tokenizable path at migration time; assert a
    // healthy floor so a botched migration (token stripped) fails loudly.
    expect(tokenFiles).toBeGreaterThan(50);
  });
});
