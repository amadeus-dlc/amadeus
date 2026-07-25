// size: large
// Regression for Issue #1449: team-up.sh blocked the user's attach for the whole
// watcher poll budget (measured 200.85s, rc=1) because verify_watchers_armed
// polls a ready sentinel that only an *actas* watcher writes (agmsg
// watch.sh:307, guarded at :300 by `if [ -n "$ACTIVE_NAME" ]`). A monitor-mode
// watcher is launched by delivery.sh:301 with three positionals — ACTIVE_NAME is
// empty, so the sentinel is never written and the wait can never succeed.
//
// Issue #1476 migrated the bootstrap prompt to the actas form, so the shipped
// default now *does* apply; the guard's inapplicable branches (herdr backend,
// codex runtime) are still pinned here, as is the announce-once advisory.
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

// Members the prompt derivation is exercised over, with the role member_role
// maps each to. Covers both arms of member_role's case (leader / engineer-*).
const MEMBERS: Array<[string, string]> = [
  ["leader", "leader"],
  ["engineer-1", "e1"],
  ["engineer-6", "e6"],
];

describe("team-up watcher verification applicability (Issue #1449/#1476)", () => {
  // FR-1: the shipped default is now the actas bootstrap prompt, whose watcher
  // does write the readiness sentinel — so the verification applies. Read off
  // the shipped derivation, not pinned by the test: this is the surface the
  // guard inspects.
  test("the shipped bootstrap prompt is the actas form (FR-1)", () => {
    for (const [member, role] of MEMBERS) {
      const result = runLib(`member_bootstrap_prompt ${member}`);
      expect(result.exitCode, result.stderr.toString()).toBe(0);
      expect(result.stdout.toString(), member).toBe(`/agmsg actas ${role}`);
    }
  });

  // BR-5 / ADR-2 invariant: watcher_verification_applies derives the prompt for a
  // single representative role, which is only sound because the presence of
  // " actas " does not vary by role. Pinning it here keeps a future per-role
  // prompt shape from silently breaking the guard.
  test("the ' actas ' marker is present for every role (BR-5, ADR-2 invariant)", () => {
    for (const [member] of MEMBERS) {
      const result = runLib(
        `case "$(member_bootstrap_prompt ${member})" in *" actas "*) echo yes ;; *) echo no ;; esac`,
      );
      expect(result.stdout.toString().trim(), member).toBe("yes");
    }
  });

  // FR-1: with the shipped prompt on the claude + agmsg pair, the verification
  // applies. Pre-#1476 the monitor-mode prompt made this "no".
  test("the shipped default applies on claude + agmsg (FR-1)", () => {
    const result = runLib(APPLIES);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe("yes");
  });

  // FR-1: under the herdr backend there is no watcher to arm, so the derivation
  // yields an empty prompt regardless of role.
  test("the herdr backend derives an empty bootstrap prompt (FR-1)", () => {
    for (const [member] of MEMBERS) {
      // declare -F first: without it an absent function would also print "[]".
      const result = runLib(
        `declare -F member_bootstrap_prompt >/dev/null || exit 1; ` +
          `MSG_BACKEND=herdr; printf '[%s]' "$(member_bootstrap_prompt ${member})"`,
      );
      expect(result.exitCode, result.stderr.toString()).toBe(0);
      expect(result.stdout.toString(), member).toBe("[]");
    }
  });

  // FR-1 non-regression: the runtime/backend conditions still gate — codex, or
  // the herdr backend, stays inapplicable.
  test("codex runtime and herdr backend stay inapplicable (FR-1)", () => {
    for (const [runtime, backend] of [
      ["codex", "agmsg"],
      ["claude", "herdr"],
      ["codex", "herdr"],
    ] as const) {
      const result = runLib(`RUNTIME=${runtime}; MSG_BACKEND=${backend}; ${APPLIES}`);
      expect(result.stdout.toString().trim(), `${runtime}/${backend}`).toBe("no");
    }
  });

  // FR-2: skipping is announced, not silent — one stderr line naming the issues.
  // FR-2 also pins the channel: stdout carries only the snippet's own output.
  // The shipped configuration no longer reaches this branch (the prompt is always
  // the actas form), so the derivation is overridden to a non-arming prompt — the
  // latch is retained for exactly that class of future prompt change.
  const NON_ARMING = `member_bootstrap_prompt() { printf '/agmsg mode monitor'; }`;
  test("the skip is announced exactly once on stderr, never on stdout (FR-2)", () => {
    const result = runLib(
      `${NON_ARMING}; watcher_verification_applies || true; watcher_verification_applies || true`,
    );
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    const err = result.stderr.toString();
    expect(err).toContain("#1449");
    expect(err).toContain("#1476");
    expect(err).toContain("skipping arming verification");
    // Announced once per run even though the launch path asks twice.
    expect(err.split("skipping arming verification").length - 1).toBe(1);
    expect(result.stdout.toString()).toBe("");
  });

  // FR-2 non-regression: the applicable (shipped actas) path emits no advisory.
  test("no advisory is emitted when the verification applies (FR-2)", () => {
    const result = runLib(`watcher_verification_applies`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stderr.toString()).not.toContain("skipping arming verification");
  });

  // FR-5: the verification machinery and its budget constants stay in place; the
  // per-wait timeout is the #1476 value grounded on the measured 32.2s arming.
  test("verification functions and budget constants are retained (FR-5)", () => {
    const result = runLib(
      `for fn in verify_watchers_armed ready_sentinel_path resend_monitor_prompt clear_stale_watcher_sentinels member_bootstrap_prompt; do ` +
        `declare -F "$fn" >/dev/null || { echo "missing:$fn"; exit 1; }; done; ` +
        `printf '%s %s' "$WATCHER_READY_TIMEOUT" "$WATCHER_RESEND_MAX"`,
    );
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe("60 1");
  });

  // BR-17: the retired constant leaves no alias or fallback behind.
  test("CLAUDE_MONITOR_PROMPT is fully retired (BR-17)", () => {
    const result = runLib('printf "[%s]" "${CLAUDE_MONITOR_PROMPT:-}"');
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toBe("[]");
  });
});
