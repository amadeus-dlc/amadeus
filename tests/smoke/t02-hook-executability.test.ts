// covers:
//
// t02 — hook presence. Migrated from tests/smoke/t02-hook-executability.sh
// (TAP plan 10, 10 assert_file_exists rows). The .sh had no `# covers:` header
// (it is a structural presence guard over the shipped dist tree, not a unit
// contract), so this twin's covers id list is empty too — matching the smoke
// guard house style in tests/smoke/t-scope-mapping-guard.test.ts.
//
// Mechanism: none. Subject is the shipped hooks directory on disk
// (dist/claude/.claude/hooks/). The .sh asserted each of the 10 framework hooks
// is present as a regular file — a pure structural check with zero LLM, zero
// tokens, zero process boundary. We assert it in-process with statSync().isFile()
// against the same dist tree the .sh resolved (AMADEUS_SRC from the fixtures
// harness == <REPO_ROOT>/dist/claude/.claude, the .sh's
// "$SCRIPT_DIR/../../dist/claude/.claude").
//
// Why .isFile() and not bare existsSync(): the .sh's assert_file_exists uses
// `[ -f "$path" ]` (tests/lib/tap.sh:32), a REGULAR-FILE test that a directory
// of the same name would fail. existsSync alone would pass on a dir, so this
// twin is equal-or-stronger by pinning .isFile().
//
// Source under test: the 10 framework hooks shipped under
// dist/claude/.claude/hooks/ (all .ts, run via bun — no executable bit needed,
// per the .sh's own subject line). The expected set matches the hooks the
// project CLAUDE.md and t01-file-structure.sh:20-29 enumerate.
//
// Old TAP -> new test parity (1:1, one test() per .sh assert_file_exists row):
//   .sh:11 amadeus-audit-logger.ts present    -> "hook present: amadeus-audit-logger.ts"
//   .sh:12 amadeus-sensor-fire.ts present     -> "hook present: amadeus-sensor-fire.ts"
//   .sh:13 amadeus-sync-statusline.ts present -> "hook present: amadeus-sync-statusline.ts"
//   .sh:14 amadeus-runtime-compile.ts present -> "hook present: amadeus-runtime-compile.ts"
//   .sh:15 amadeus-validate-state.ts present  -> "hook present: amadeus-validate-state.ts"
//   .sh:16 amadeus-log-subagent.ts present    -> "hook present: amadeus-log-subagent.ts"
//   .sh:17 amadeus-session-start.ts present   -> "hook present: amadeus-session-start.ts"
//   .sh:18 amadeus-session-end.ts present     -> "hook present: amadeus-session-end.ts"
//   .sh:19 amadeus-statusline.ts present      -> "hook present: amadeus-statusline.ts"
//   .sh:20 amadeus-stop.ts present (Stop hook)-> "hook present: amadeus-stop.ts"

import { describe, expect, test } from "bun:test";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { AMADEUS_SRC } from "../harness/fixtures.ts";

const HOOKS_DIR = join(AMADEUS_SRC, "hooks");

// The framework hooks, in the .sh's row order (t02:11-20) plus the
// mint-presence hook added after the migration. All .ts, run via bun — the .sh
// title notes no executable bit is needed.
const HOOKS = [
  "amadeus-audit-logger.ts",
  "amadeus-sensor-fire.ts",
  "amadeus-sync-statusline.ts",
  "amadeus-runtime-compile.ts",
  "amadeus-validate-state.ts",
  "amadeus-log-subagent.ts",
  "amadeus-session-start.ts",
  "amadeus-session-end.ts",
  "amadeus-statusline.ts",
  "amadeus-stop.ts",
  // Records a HUMAN_TURN on UserPromptSubmit.
  "amadeus-mint-presence.ts",
] as const;

describe("t02 hook presence — shipped dist/claude/.claude/hooks (migrated from t02-hook-executability.sh, plan 10)", () => {
  for (const hook of HOOKS) {
    test(`hook present: ${hook}`, () => {
      const p = join(HOOKS_DIR, hook);
      // Stronger than the .sh's existence intent: assert it is a REGULAR FILE,
      // mirroring `[ -f "$path" ]` (tap.sh:32) — a dir of the same name fails.
      expect(existsSync(p)).toBe(true);
      expect(statSync(p).isFile()).toBe(true);
    });
  }
});
