// covers: file:docs/harness-engineering/06-sensors.md
// covers: file:docs/harness-engineering/06-sensors.ja.md
// covers: file:docs/reference/07-sensor-system.md
// covers: file:docs/reference/07-sensor-system.ja.md
// size: medium
//
// t3028 (integration: real-filesystem corpus walk) — the sensor tables in docs/harness-engineering/06-sensors(.ja).md and
// docs/reference/07-sensor-system(.ja).md stay in sync with the real sensor
// corpus. #3028 measured the hand-maintained 06 table drifting from 10 rows to a
// 14-manifest reality across two intents; #3097 measured the 07 `matches` table
// drifting the same way (4 missing manifests) *and* carrying two stale glob
// values that a name-only contract cannot see. A count-free set contract keeps
// the docs honest as sensors come and go.
//
// The derived expectation is deliberately NOT a pinned number: it is the union
// of the core sensors dir and every plugin.json `sensors` declaration, so
// adding or removing a sensor moves the expectation with the corpus and this
// test only reddens when the docs table disagrees with reality.
//
// Two corpora, one derivation. 06 documents every manifest; 07's `matches`
// table documents only the manifests that declare a `matches` glob (a manifest
// without one never fires), so 07's expectation is that same corpus filtered to
// the matches-declaring subset — not a second hand-listed set.
//
// Scope of the value contract. 07's table has a glob column, so its rows are
// checked as name→glob pairs against the manifest text. 06's table has no glob
// column (its second cell is prose), so its globs live in the surrounding prose
// where no sensor→glob pairing is machine-derivable; those are checked by
// containment — every glob 06 quotes must be a glob some manifest declares.
// Containment is deliberate rather than a weaker fallback for 07: parsing which
// sensor a prose sentence is talking about would carry prose interpretation into
// a machine gate. The same containment is not applied to 07's prose, which
// quotes an illustrative authoring glob (`**/*.ts`) that no manifest declares.
//
// Reading discipline. A manifest's `matches` is read from its YAML frontmatter
// only — a `matches:` line in the body is prose, and honouring it would let an
// authoring example stand in for a declaration the frontmatter no longer makes.
// A docs table that repeats a manifest row is rejected rather than deduped: a
// stale row sitting beside the corrected one is exactly the drift this gate
// exists to catch, and last-write-wins would publish it green.

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");

/** Heading anchor for the `matches` table section — shared by both 07 translations. */
const MATCHES_HEADING = /^## `matches`/u;
/** A manifest row in a docs table, whatever its second cell holds. */
const MANIFEST_ROW = /^\| `(amadeus-[a-z0-9-]+\.md)` \|/u;
/** The same row shape, for whole-document scans (kept separate: a global regex is stateful under `.test`). */
const MANIFEST_ROW_GLOBAL = /^\| `(amadeus-[a-z0-9-]+\.md)` \|/gmu;
/** A manifest row whose second cell is a backticked glob. */
const MANIFEST_GLOB_ROW = /^\| `(amadeus-[a-z0-9-]+\.md)` \| `(.+)` \|$/u;
/** A backticked glob literal anywhere in prose. */
const PROSE_GLOB = /`(\*\*\/[^`]*)`/gu;

function coreManifests(): Array<[string, string]> {
  const dir = join(REPO_ROOT, "packages", "framework", "core", "sensors");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => [f, join(dir, f)]);
}

function pluginDeclaredManifests(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const plugin of readdirSync(join(REPO_ROOT, "plugins"))) {
    let manifest: { sensors?: unknown };
    try {
      manifest = JSON.parse(readFileSync(join(REPO_ROOT, "plugins", plugin, "plugin.json"), "utf8"));
    } catch {
      continue;
    }
    const raw = manifest.sensors;
    if (!Array.isArray(raw)) continue;
    for (const entry of raw) {
      if (typeof entry === "string") {
        out.push([entry.split("/").pop() ?? entry, join(REPO_ROOT, "plugins", plugin, entry)]);
      }
    }
  }
  return out;
}

/** Every shipped manifest, name → on-disk path, first declaration winning. */
function derivedManifests(): Map<string, string> {
  const out = new Map<string, string>();
  for (const [name, path] of [...coreManifests(), ...pluginDeclaredManifests()]) {
    if (!out.has(name)) out.set(name, path);
  }
  return out;
}

function derivedCorpus(): string[] {
  return [...derivedManifests().keys()].sort();
}

/**
 * A manifest's YAML frontmatter — the only region where `matches:` is a
 * declaration rather than prose. A manifest that opens without frontmatter, or
 * never closes it, is malformed and fails closed.
 */
function manifestFrontmatter(path: string): string {
  const lines = readFileSync(path, "utf8").split("\n");
  if (lines[0] !== "---") throw new Error(`${path}: manifest does not open with YAML frontmatter`);
  const end = lines.indexOf("---", 1);
  if (end === -1) throw new Error(`${path}: manifest has unterminated YAML frontmatter`);
  return lines.slice(1, end).join("\n");
}

/**
 * The `matches` glob each manifest declares. Absence is an opt-out (a manifest
 * with no `matches` never fires, so 07 does not list it); an unparseable
 * declaration is a defect and fails closed rather than silently opting out.
 */
function declaredMatches(): Map<string, string> {
  const out = new Map<string, string>();
  for (const [name, path] of [...derivedManifests()].sort()) {
    const line = manifestFrontmatter(path).match(/^matches:.*$/mu)?.[0];
    if (line === undefined) continue;
    const value = line.match(/^matches:\s*"(.+)"\s*$/u)?.[1];
    if (value === undefined) throw new Error(`${path}: unparseable matches declaration: ${line}`);
    out.set(name, value);
  }
  return out;
}

/**
 * The name→glob pairs the 07 `matches` table publishes. Anchored on the section
 * heading so the unrelated manifest table earlier in the doc cannot leak in, and
 * fails closed when a manifest row in that section has no backticked glob cell
 * or when one manifest holds more than one row — a repeated name would otherwise
 * let a stale glob survive beside the corrected one.
 */
function matchesTableRows(doc: string): Map<string, string> {
  const lines = readFileSync(join(REPO_ROOT, "docs", "reference", doc), "utf8").split("\n");
  const headings = lines.flatMap((line, i) => (MATCHES_HEADING.test(line) ? [i] : []));
  if (headings.length !== 1) {
    throw new Error(`${doc}: expected exactly one "## \`matches\`" section, found ${headings.length}`);
  }
  const out = new Map<string, string>();
  const repeated: string[] = [];
  for (let i = (headings[0] ?? 0) + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("## ")) break;
    if (!MANIFEST_ROW.test(line)) continue;
    const row = line.match(MANIFEST_GLOB_ROW);
    if (!row) throw new Error(`${doc}:${i + 1}: manifest row without a backticked glob cell: ${line}`);
    const name = row[1] ?? "";
    if (out.has(name)) repeated.push(name);
    out.set(name, row[2] ?? "");
  }
  if (repeated.length > 0) {
    throw new Error(`${doc}: manifest listed more than once in the \`matches\` table: ${[...new Set(repeated)].sort().join(", ")}`);
  }
  return out;
}

function tableRows(doc: string): string[] {
  const text = readFileSync(join(REPO_ROOT, "docs", "harness-engineering", doc), "utf8");
  const rows = [...text.matchAll(MANIFEST_ROW_GLOBAL)].map((m) => m[1] ?? "");
  return [...new Set(rows)].sort();
}

function proseGlobs(doc: string): string[] {
  const text = readFileSync(join(REPO_ROOT, "docs", "harness-engineering", doc), "utf8");
  return [...new Set([...text.matchAll(PROSE_GLOB)].map((m) => m[1] ?? ""))].sort();
}

describe("06-sensors docs tables match the sensor corpus (#3028)", () => {
  test("the derived corpus is non-empty (vacuity guard)", () => {
    expect(derivedCorpus().length).toBeGreaterThan(0);
  });

  test("the English table lists exactly the derived corpus", () => {
    expect(tableRows("06-sensors.md")).toEqual(derivedCorpus());
  });

  test("the Japanese table lists exactly the derived corpus", () => {
    expect(tableRows("06-sensors.ja.md")).toEqual(derivedCorpus());
  });
});

describe("07-sensor-system `matches` tables match the sensor corpus (#3097)", () => {
  test("the matches-declaring corpus is a non-empty subset of the corpus (vacuity guard)", () => {
    const declared = [...declaredMatches().keys()].sort();
    expect(declared.length).toBeGreaterThan(0);
    expect(derivedCorpus()).toEqual(expect.arrayContaining(declared));
  });

  test("the English table lists exactly the matches-declaring corpus", () => {
    expect([...matchesTableRows("07-sensor-system.md").keys()].sort()).toEqual(
      [...declaredMatches().keys()].sort(),
    );
  });

  test("the Japanese table lists exactly the matches-declaring corpus", () => {
    expect([...matchesTableRows("07-sensor-system.ja.md").keys()].sort()).toEqual(
      [...declaredMatches().keys()].sort(),
    );
  });

  test("the English table publishes each manifest's real glob", () => {
    expect([...matchesTableRows("07-sensor-system.md")].sort()).toEqual([...declaredMatches()].sort());
  });

  test("the Japanese table publishes each manifest's real glob", () => {
    expect([...matchesTableRows("07-sensor-system.ja.md")].sort()).toEqual([...declaredMatches()].sort());
  });
});

describe("06-sensors prose quotes only real manifest globs (#3097)", () => {
  test("the English prose quotes at least one glob (vacuity guard)", () => {
    expect(proseGlobs("06-sensors.md").length).toBeGreaterThan(0);
  });

  test("the Japanese prose quotes at least one glob (vacuity guard)", () => {
    expect(proseGlobs("06-sensors.ja.md").length).toBeGreaterThan(0);
  });

  test("every glob the English prose quotes is a declared matches value", () => {
    const declared = new Set(declaredMatches().values());
    expect(proseGlobs("06-sensors.md").filter((g) => !declared.has(g))).toEqual([]);
  });

  test("every glob the Japanese prose quotes is a declared matches value", () => {
    const declared = new Set(declaredMatches().values());
    expect(proseGlobs("06-sensors.ja.md").filter((g) => !declared.has(g))).toEqual([]);
  });
});
