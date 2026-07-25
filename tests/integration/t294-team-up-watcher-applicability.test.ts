// size: large
// Regression for Issue #1449: team-up.sh blocked the user's attach for the whole
// watcher poll budget (measured 200.85s, rc=1) because verify_watchers_armed
// polls a ready sentinel that only an *actas* watcher writes (agmsg
// watch.sh:307, guarded at :300 by `if [ -n "$ACTIVE_NAME" ]`). The shipped
// bootstrap prompt starts a monitor-mode watcher (team-up.sh:104), which
// delivery.sh:301 launches with three positionals — ACTIVE_NAME is empty, so the
// sentinel is never written and the wait can never succeed.
//
// These tests drive watcher_verification_applies through the bash library seam
// (TEAM_UP_LIB_ONLY=1 source). Real FS is touched by the sourced script, so this
// lives in the integration layer (cid:code-generation:fs-tests-integration-first).
import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const TEAM_UP = join(ROOT, "packages/framework/core/tools/team-up.sh");

// Source team-up.sh in library mode and evaluate a snippet. `set --` clears the
// args so team-up.sh does not parse the bash -c positionals as its own flags.
// RUNTIME/MSG_BACKEND default to the claude + agmsg pair the guard gates on;
// the snippet may override them.
function runLib(snippet: string) {
  return Bun.spawnSync({
    cmd: [
      "bash",
      "-c",
      `script="$1"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; TEAM_SIZE=2; TEAM_NAME=amadeus; S=sess; RUNTIME=claude; MSG_BACKEND=agmsg; ${snippet}`,
      "_",
      TEAM_UP,
    ],
    env: process.env,
    stderr: "pipe",
    stdout: "pipe",
  });
}

const APPLIES = `if watcher_verification_applies; then echo yes; else echo no; fi`;

describe("team-up watcher verification applicability (Issue #1449)", () => {
  // FR-1: the shipped default is a monitor-mode bootstrap prompt, whose watcher
  // writes no readiness sentinel — the verification must not apply. Pre-fix the
  // guard returned true here and the launch burned the whole poll budget.
  test("default monitor-mode bootstrap prompt does not apply (FR-1)", () => {
    const result = runLib(APPLIES);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe("no");
  });

  // The default is read off the shipped constant, not pinned by the test — this
  // is the surface the guard inspects.
  test("the shipped bootstrap prompt is the monitor form", () => {
    const result = runLib(`printf '%s' "$CLAUDE_MONITOR_PROMPT"`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe("/agmsg mode monitor");
  });

  // FR-1: an actas bootstrap prompt does arm a sentinel-writing watcher, so the
  // verification re-enables itself once #1476 migrates the prompt.
  test("an actas bootstrap prompt applies (FR-1, #1476 forward path)", () => {
    const result = runLib(`CLAUDE_MONITOR_PROMPT='/agmsg actas leader'; ${APPLIES}`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe("yes");
  });

  // FR-1 non-regression: the runtime/backend conditions still gate first — an
  // actas prompt on codex or the herdr backend stays inapplicable.
  test("codex runtime and herdr backend stay inapplicable even with an actas prompt (FR-1)", () => {
    for (const [runtime, backend] of [
      ["codex", "agmsg"],
      ["claude", "herdr"],
      ["codex", "herdr"],
    ] as const) {
      const result = runLib(
        `CLAUDE_MONITOR_PROMPT='/agmsg actas leader'; RUNTIME=${runtime}; MSG_BACKEND=${backend}; ${APPLIES}`,
      );
      expect(result.stdout.toString().trim(), `${runtime}/${backend}`).toBe("no");
    }
  });

  // FR-2: skipping is announced, not silent — one stderr line naming the issues.
  // FR-2 also pins the channel: stdout carries only the snippet's own output.
  test("the skip is announced exactly once on stderr, never on stdout (FR-2)", () => {
    const result = runLib(`watcher_verification_applies || true; watcher_verification_applies || true`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    const err = result.stderr.toString();
    expect(err).toContain("#1449");
    expect(err).toContain("#1476");
    expect(err).toContain("skipping arming verification");
    // Announced once per run even though the launch path asks twice.
    expect(err.split("skipping arming verification").length - 1).toBe(1);
    expect(result.stdout.toString()).toBe("");
  });

  // FR-2 non-regression: the applicable (actas) path emits no advisory at all.
  test("no advisory is emitted when the verification applies (FR-2)", () => {
    const result = runLib(`CLAUDE_MONITOR_PROMPT='/agmsg actas leader'; watcher_verification_applies`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stderr.toString()).not.toContain("skipping arming verification");
  });

  // FR-5: the verification machinery stays in place so #1476 can re-enable it by
  // changing the bootstrap prompt alone.
  test("verification functions and budget constants are retained (FR-5)", () => {
    const result = runLib(
      `for fn in verify_watchers_armed ready_sentinel_path resend_monitor_prompt clear_stale_watcher_sentinels; do ` +
        `declare -F "$fn" >/dev/null || { echo "missing:$fn"; exit 1; }; done; ` +
        `printf '%s %s' "$WATCHER_READY_TIMEOUT" "$WATCHER_RESEND_MAX"`,
    );
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe("90 1");
  });
});
