// covers: doc:docs/reference/06-hooks-and-tools.md(hook-scope-count), file:settings.json, file:hooks/amadeus-*.ts
//
// t132 — Doc-count drift guard for the hook-scope sentence in
// docs/reference/06-hooks-and-tools.md. Migrated from
// tests/unit/t132-hooks-doc-count-sync.sh (TAP plan 8).
//
// Mechanism: none. The .sh shelled out to `ls` (disk count), `bun -e` (to
// parse settings.json WITHOUT a jq dependency — the framework ships jq-free),
// and `grep`/`sed` over the doc. None of that is a process-boundary contract:
// every byte the .sh inspected is a static file checked into the repo. The
// twin reads those three files in-process and asserts on their contents — no
// spawn, no LLM, no env seam. (The .sh's `bun -e` was a bash-portability
// workaround for the missing jq, not a tool/CLI under test; in TS we
// JSON.parse settings.json directly.)
//
// Subject (three ground-truth sources cross-checked against the doc prose):
//   A. dist/claude/.claude/hooks/amadeus-*.ts          — the hook scripts on disk
//   B. dist/claude/.claude/settings.json             — the `hooks` block command
//        count + the top-level `statusLine` key (1 when present)
//   C. docs/reference/06-hooks-and-tools.md           — the hook-scope section:
//        the count-FREE prose ("uses the framework hook scripts ... All of them
//        are **project-wide** ... the rest via the `hooks` block") plus the
//        `.claude/hooks/` inventory block that names each script.
//
// This mirrors t28's two-source set-equality discipline: it derives ground truth
// from disk + settings.json independently, then cross-checks the doc in BOTH
// directions. t131 pins the settings.json WIRING; this pins the doc's INVENTORY
// so a reword can't silently drift it away from ground truth.
//
// FR-6 (#1590): the doc went count-free in PR #1578, which left the three
// count-word parse tests (4/6/7) permanently NaN-red. They are replaced by the
// count-free contract itself: test 4 pins that no stale count assertion may
// return, and tests 6/7 cross-check the doc's per-script inventory against disk
// and settings.json — the same forward/reverse discipline, without a number that
// has to be hand-maintained (cid:code-generation:count-comment-sync-on-catalog-change).
//
// Old TAP -> new test parity (1:1, every .sh assertion -> a named test()):
//   .sh test 1  assert_gt DISK_COUNT 0                        -> "ground truth A: hooks/amadeus-*.ts exist on disk"
//   .sh test 2  assert_eq SETTINGS_STATUSLINE_COUNT 1         -> "ground truth B: settings.json registers exactly 1 statusLine hook"
//   .sh test 3  assert_eq SETTINGS_TOTAL DISK_COUNT           -> "ground truth cross-check: settings total == disk files"
//   .sh test 4  doc three count-words parse cleanly           -> (FR-6) "doc: the hook-scope prose asserts no script count"
//   .sh test 5  assert_eq DOC_ALL_PW DOC_TOTAL                -> "doc internal: 'All N project-wide' matches 'uses N hook scripts'"
//   .sh test 6  assert_eq DOC_TOTAL DISK_COUNT                -> (FR-6) "doc forward: the inventory block names every hook on disk"
//   .sh test 7  assert_eq DOC_BLOCK SETTINGS_BLOCK_COUNT      -> (FR-6) "doc reverse: every inventoried hook exists and the statusLine entry matches settings.json"
//   .sh test 8  assert_eq (DOC_BLOCK+1) DOC_TOTAL             -> "doc reverse: hooks-block (N) + statusLine (1) == total (whole split)"

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AMADEUS_SRC, REPO_ROOT } from "../harness/fixtures.ts";

const HOOKS_DIR = join(AMADEUS_SRC, "hooks");
const SETTINGS = join(AMADEUS_SRC, "settings.json.example");
const DOC = join(REPO_ROOT, "docs", "reference", "06-hooks-and-tools.md");

// --- Ground truth A: hook scripts on disk (hooks/amadeus-*.ts) -----------------
// The .sh did `ls -1 "$HOOKS_DIR"/amadeus-*.ts | wc -l`.
function diskHooks(): Set<string> {
  return new Set(
    readdirSync(HOOKS_DIR).filter((f) => f.startsWith("amadeus-") && f.endsWith(".ts")),
  );
}
function diskHookCount(): number {
  return diskHooks().size;
}

// --- Ground truth B: settings.json registrations ----------------------------
// The .sh's `bun -e` parse counted every command in the `hooks` block, which
// was 1:1 with scripts while each script had exactly one registration. The
// mint-presence hook is now wired at TWO events (UserPromptSubmit + PostToolUse
// AskUserQuestion), so count UNIQUE commands instead: the guard's subject is
// "scripts wired vs scripts on disk", and a wired-but-missing script still
// changes the unique count. statusLine stays +1 (its own top-level key).
interface SettingsCounts {
  block: number;
  statusline: number;
  total: number;
}
function settingsCounts(): SettingsCounts {
  const s = JSON.parse(readFileSync(SETTINGS, "utf-8")) as {
    hooks?: Record<string, Array<{ hooks?: Array<{ command?: string }> }>>;
    statusLine?: { command?: string };
  };
  const commands = new Set<string>();
  for (const ev of Object.keys(s.hooks ?? {})) {
    for (const g of s.hooks![ev]) {
      for (const h of g.hooks ?? []) {
        if (h.command) commands.add(h.command);
      }
    }
  }
  const statusline = s.statusLine?.command ? 1 : 0;
  return { block: commands.size, statusline, total: commands.size + statusline };
}

// --- Doc count-words (number-word -> int) ------------------------------------
// The .sh's word2int case statement. "MISS" (here: NaN) if not a known word.
const WORD2INT: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
function word2int(word: string | undefined): number {
  if (word === undefined || !(word in WORD2INT)) return Number.NaN;
  return WORD2INT[word];
}

/** First capture-group match of `re` against the doc, or undefined. */
function docWord(re: RegExp): string | undefined {
  const m = readFileSync(DOC, "utf-8").match(re);
  return m ? m[1] : undefined;
}

// The three pinned count-words. Same patterns the .sh grepped (the subject noun
// "This implementation" / "AI-DLC" is deliberately NOT pinned — only the count).
//   "uses <word> hook scripts"            -> total
//   "All <word> are **project-wide**"     -> total restatement
//   "the other <word> via the `hooks` block" -> hooks-block subcount
const DOC_TOTAL_WORD = docWord(/uses ([a-z]+) hook scripts/);
const DOC_ALL_PW_WORD = docWord(/All ([a-z]+) are \*\*project-wide\*\*/);
const DOC_BLOCK_WORD = docWord(/the other ([a-z]+) via the `hooks` block/);

// --- FR-6: the count-free contract ------------------------------------------
// A count assertion is a count-WORD or a digit run in one of the three legacy
// hook-scope slots. Built from WORD2INT so the two stay in lockstep. "All of
// them are **project-wide**" (the current count-free wording) is not a match:
// "of" is not a count token.
const COUNT_TOKEN = `(?:${Object.keys(WORD2INT).join("|")}|\\d+)`;
const STALE_COUNT_PATTERNS: readonly RegExp[] = [
  new RegExp(`uses ${COUNT_TOKEN} hook scripts`),
  new RegExp(`All ${COUNT_TOKEN} are \\*\\*project-wide\\*\\*`),
  new RegExp(`the other ${COUNT_TOKEN} via the \`hooks\` block`),
];

/** The script names in the doc's `.claude/hooks/` inventory block, each with the
 *  registration annotation in its trailing comment. */
function docHookInventory(): { script: string; annotation: string }[] {
  const block = readFileSync(DOC, "utf-8").match(/\n\.claude\/hooks\/\n([\s\S]*?)\n```/);
  if (block === null) return [];
  const entries: { script: string; annotation: string }[] = [];
  for (const line of block[1].split("\n")) {
    const m = line.match(/^\+--\s+(amadeus-[\w-]+\.ts)\s+#\s*(.*)$/);
    if (m) entries.push({ script: m[1], annotation: m[2] });
  }
  return entries;
}

/** The script basename settings.json wires as the statusLine command. */
function settingsStatusLineScript(): string | undefined {
  const s = JSON.parse(readFileSync(SETTINGS, "utf-8")) as { statusLine?: { command?: string } };
  return s.statusLine?.command?.match(/(amadeus-[\w-]+\.ts)/)?.[1];
}

const DOC_TOTAL = word2int(DOC_TOTAL_WORD);
const DOC_ALL_PW = word2int(DOC_ALL_PW_WORD);
const DOC_BLOCK = word2int(DOC_BLOCK_WORD);

describe("t132 hook-scope doc-count drift guard (migrated from t132-hooks-doc-count-sync.sh, plan 8)", () => {
  // --- Ground truth A ---
  test("1: ground truth A — hooks/amadeus-*.ts exist on disk [.sh test 1]", () => {
    expect(diskHookCount()).toBeGreaterThan(0);
  });

  // --- Ground truth B ---
  test("2: ground truth B — settings.json registers exactly 1 statusLine hook [.sh test 2]", () => {
    expect(settingsCounts().statusline).toBe(1);
  });

  // --- Ground truth cross-check: disk == settings total ---
  test("3: ground truth cross-check — settings total registrations == hook files on disk [.sh test 3]", () => {
    const { total } = settingsCounts();
    expect(total).toBe(diskHookCount());
  });

  // --- Doc count-free contract (FR-6) ---
  test("4: doc — the hook-scope prose asserts no script count (count-free contract) [FR-6, was .sh test 4]", () => {
    // A hand-maintained count in prose is drift waiting to happen: PR #1578
    // reworded it away precisely because it had gone stale. Pin the absence, so
    // reintroducing "uses twelve hook scripts" (or a digit) fails here.
    const doc = readFileSync(DOC, "utf-8");
    for (const pattern of STALE_COUNT_PATTERNS) {
      expect(doc.match(pattern)).toBeNull();
    }
  });

  // --- Doc internal consistency ---
  test("5: doc internal — 'All N project-wide' matches 'uses N hook scripts' [.sh test 5]", () => {
    expect(DOC_ALL_PW).toBe(DOC_TOTAL);
  });

  // --- Doc forward: the inventory names every hook on disk (no omission) ---
  test("6: doc forward — the `.claude/hooks/` inventory names every hook on disk [FR-6, was .sh test 6]", () => {
    // Replaces the count with the set it was standing in for: a new hook script
    // that never reaches the doc fails here, exactly as an unbumped count did.
    const inventoried = new Set(docHookInventory().map((e) => e.script));
    expect(inventoried.size).toBeGreaterThan(0);
    expect([...diskHooks()].filter((f) => !inventoried.has(f))).toEqual([]);
  });

  // --- Doc reverse: nothing inventoried is fictional, and the split is real ---
  test("7: doc reverse — every inventoried hook exists and the statusLine entry matches settings.json [FR-6, was .sh test 7]", () => {
    const inventory = docHookInventory();
    const disk = diskHooks();
    expect(inventory.map((e) => e.script).filter((s) => !disk.has(s))).toEqual([]);
    // The block/statusLine split the old subcount encoded, asserted per script:
    // exactly one entry is annotated statusLine, and it is the one settings.json
    // wires there.
    const statusLineEntries = inventory.filter((e) => e.annotation.includes("statusLine"));
    expect(statusLineEntries.map((e) => e.script)).toEqual([settingsStatusLineScript() ?? "<unwired>"]);
    expect(inventory.length - statusLineEntries.length).toBe(settingsCounts().block);
  });

  // --- Doc reverse: the doc's own split is arithmetically whole ---
  test("8: doc reverse — hooks-block (N) + statusLine (1) == total (whole split) [.sh test 8]", () => {
    // Catches a half-correction that fixes one count-word but not the other.
    expect(DOC_BLOCK + 1).toBe(DOC_TOTAL);
  });
});
