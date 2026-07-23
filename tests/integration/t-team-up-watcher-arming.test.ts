// size: large
// Regression for Issue #1384: scripts/team-up.sh fresh Claude members race the
// Claude Code TUI cold-start and drop the initial `/agmsg mode monitor` prompt,
// leaving the agmsg watcher unarmed with no check or retry. These tests drive
// the bash verification seam directly (sourced in TEAM_UP_LIB_ONLY mode) against
// a self-contained fake agmsg readiness lib + fake herdr, so no real agmsg /
// herdr install is required. Real FS is used for the sentinels, so this lives in
// the integration layer (cid:fs-tests-integration-first).
import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const TEAM_UP = join(ROOT, "scripts/team-up.sh");
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// A fixture with a self-contained agmsg readiness lib and a fake herdr. The fake
// `agent list` maps each member name to a pane id equal to its role, so the
// resolver → send-text handler can touch the matching sentinel when
// FAKE_RESEND_ARMS=1 (simulating a watcher that arms only after the re-send).
function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "amadeus-watcher-arming-"));
  tempDirs.push(root);
  const agmsgRoot = join(root, "agmsg");
  const readyDir = join(agmsgRoot, "run");
  const bin = join(root, "bin");
  const sendLog = join(root, "send.log");
  mkdirSync(readyDir, { recursive: true });
  mkdirSync(bin, { recursive: true });

  // Self-contained stub of agmsg's agmsg_ready_path — same contract team-up.sh
  // consumes (path under $SKILL_DIR/run keyed by team + role), without pulling
  // the real actas-lock.sh dependency chain.
  const lib = join(root, "actas-lock.sh");
  writeFileSync(
    lib,
    `agmsg_ready_path() { printf '%s/run/ready.%s__%s' "\${SKILL_DIR:?}" "$1" "$2"; }\n`,
  );

  // Fake herdr: `agent list` returns name→pane_id(=role); send-text logs and,
  // when FAKE_RESEND_ARMS=1, touches the sentinel for that role; send-keys logs.
  const herdr = join(bin, "herdr");
  writeFileSync(
    herdr,
    `#!/usr/bin/env bash
set -eu
shift 2 || true   # drop the leading --session <name>
verb="\${1:-} \${2:-}"
case "$verb" in
  "agent list")
    printf '{"result":{"agents":[{"agent":"claude","name":"leader","pane_id":"leader"},{"agent":"claude","name":"engineer-1","pane_id":"e1"},{"agent":"claude","name":"engineer-2","pane_id":"e2"}]}}\\n'
    ;;
  "pane send-text")
    printf 'send-text %s\\n' "\${3:-}" >>"\${FAKE_SEND_LOG:?}"
    if [ "\${FAKE_RESEND_ARMS:-0}" = "1" ]; then : >"\${FAKE_READY_DIR:?}/ready.amadeus__\${3:-}"; fi
    ;;
  "pane send-keys")
    printf 'send-keys %s %s\\n' "\${3:-}" "\${4:-}" >>"\${FAKE_SEND_LOG:?}"
    ;;
esac
`,
  );
  chmodSync(herdr, 0o755);

  const env: Record<string, string> = {
    ...process.env,
    HERDR: herdr,
    AGMSG_ROOT: agmsgRoot,
    AGMSG_ACTAS_LOCK_LIB: lib,
    FAKE_SEND_LOG: sendLog,
    FAKE_READY_DIR: readyDir,
    // Zero per-wait so the poll rounds do not sleep; the sentinels either exist
    // now or are created synchronously by the fake send-text handler.
    WATCHER_READY_TIMEOUT: "0",
    WATCHER_RESEND_MAX: "2",
  };

  return { root, agmsgRoot, readyDir, sendLog, env };
}

const ROLES = ["leader", "e1", "e2"] as const;
function sentinel(readyDir: string, role: string) {
  return join(readyDir, `ready.amadeus__${role}`);
}
function armAll(readyDir: string) {
  for (const role of ROLES) writeFileSync(sentinel(readyDir, role), "");
}

// Source team-up.sh in library mode (TEAM_UP_LIB_ONLY=1) and run a snippet with
// the verification globals pinned to the fixture. `set --` clears the args so
// team-up.sh does not parse the bash -c positionals as its own flags.
function runLib(env: Record<string, string>, snippet: string) {
  return Bun.spawnSync({
    cmd: [
      "bash",
      "-c",
      `script="$1"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; TEAM_SIZE=2; TEAM_NAME=amadeus; S=sess; RUNTIME=claude; MSG_BACKEND=agmsg; ${snippet}`,
      "_",
      TEAM_UP,
    ],
    env,
    stderr: "pipe",
    stdout: "pipe",
  });
}

describe("team-up watcher arming — seams", () => {
  test("ready_sentinel_path derives from the agmsg lib (no duplicated path string)", () => {
    const fx = createFixture();
    const result = runLib(fx.env, `ready_sentinel_path amadeus e1`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe(sentinel(fx.readyDir, "e1"));
  });

  test("resolve_member_pane extracts the pane id by member name, order-independent", () => {
    const fx = createFixture();
    const leader = runLib(fx.env, `resolve_member_pane sess leader`);
    expect(leader.stdout.toString().trim()).toBe("leader");
    const eng = runLib(fx.env, `resolve_member_pane sess engineer-1`);
    expect(eng.stdout.toString().trim()).toBe("e1");
    const absent = runLib(fx.env, `resolve_member_pane sess engineer-9`);
    expect(absent.stdout.toString().trim()).toBe("");
  });

  test("clear_stale_watcher_sentinels removes existing sentinels before launch", () => {
    const fx = createFixture();
    armAll(fx.readyDir);
    const result = runLib(fx.env, `clear_stale_watcher_sentinels`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    for (const role of ROLES) expect(existsSync(sentinel(fx.readyDir, role))).toBe(false);
  });
});

describe("team-up watcher arming — verify_watchers_armed", () => {
  test("all members already armed passes with no re-send (idempotent, FR-7)", () => {
    const fx = createFixture();
    armAll(fx.readyDir);
    const result = runLib(fx.env, `verify_watchers_armed`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    // No pane was re-sent to: the send log is never written.
    expect(existsSync(fx.sendLog)).toBe(false);
  });

  test("unarmed members that never arm exit non-zero and are named (falling proof, FR-5)", () => {
    const fx = createFixture();
    // No sentinels, and the fake herdr does not arm on re-send.
    const result = runLib({ ...fx.env, FAKE_RESEND_ARMS: "0", WATCHER_RESEND_MAX: "1" }, `verify_watchers_armed`);
    expect(result.exitCode).not.toBe(0);
    const err = result.stderr.toString();
    expect(err).toContain("agmsg watcher never armed for:");
    expect(err).toContain("leader");
    expect(err).toContain("engineer-1");
    expect(err).toContain("engineer-2");
    // Recovery guidance is emitted (no silent failure).
    expect(err).toContain("/agmsg mode monitor");
  });

  test("a member armed only after the re-send passes via the two-step send/submit", () => {
    const fx = createFixture();
    // Sentinels absent initially; the fake send-text handler creates them, so
    // the second poll round observes every watcher armed.
    const result = runLib({ ...fx.env, FAKE_RESEND_ARMS: "1" }, `verify_watchers_armed`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    const log = readFileSync(fx.sendLog, "utf8");
    // Each member gets the send-text then the send-keys <pane> enter pair.
    for (const role of ROLES) {
      expect(log).toContain(`send-text ${role}`);
      expect(log).toContain(`send-keys ${role} enter`);
    }
    // send-text must precede its send-keys for every pane (submit after place).
    for (const role of ROLES) {
      expect(log.indexOf(`send-text ${role}`)).toBeLessThan(log.indexOf(`send-keys ${role} enter`));
    }
  });

  test("watcher_verification_applies only for the claude + agmsg combination", () => {
    const fx = createFixture();
    const combos: Array<[string, string, boolean]> = [
      ["claude", "agmsg", true],
      ["claude", "herdr", false],
      ["codex", "agmsg", false],
      ["codex", "herdr", false],
    ];
    for (const [runtime, backend, expected] of combos) {
      const result = runLib(
        fx.env,
        `RUNTIME=${runtime}; MSG_BACKEND=${backend}; if watcher_verification_applies; then echo yes; else echo no; fi`,
      );
      expect(result.stdout.toString().trim(), `${runtime}/${backend}`).toBe(expected ? "yes" : "no");
    }
  });
});
