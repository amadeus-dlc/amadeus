// size: large
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

function git(cwd: string, ...args: string[]) {
  const result = Bun.spawnSync({ cmd: ["git", ...args], cwd, stderr: "pipe", stdout: "pipe" });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return result.stdout.toString().trim();
}

// Source team-up.sh in library mode and echo the MSG_BACKEND resolved by
// resolve_msg_backend for the given flag/env inputs. Mirrors the seam the CLI
// uses (flag wins over env, default agmsg).
function resolveBackend(opts: { flag?: string; env?: string }) {
  const setFlag = opts.flag !== undefined ? `MSG_FLAG_EXPLICIT=1; MSG_FLAG=${JSON.stringify(opts.flag)};` : "";
  return Bun.spawnSync({
    cmd: [
      "bash",
      "-c",
      `script="$1"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; ${setFlag} resolve_msg_backend; printf '%s' "$MSG_BACKEND"`,
      "_",
      TEAM_UP,
    ],
    env: opts.env !== undefined ? { ...process.env, TEAM_MSG: opts.env } : { ...process.env },
    stderr: "pipe",
    stdout: "pipe",
  });
}

// A CLI fixture with a fake herdr multiplexer and fake agmsg join/reset scripts.
// `deliveryLog`, when read, records every delivery.sh invocation so a test can
// assert the agmsg monitor arming ran (agmsg) or was skipped (herdr).
function createCliFixture() {
  const root = mkdtempSync(join(tmpdir(), "amadeus-team-msg-be-"));
  tempDirs.push(root);
  const repo = join(root, "repo");
  const base = join(root, "worktrees");
  const state = join(root, "state");
  const bin = join(root, "bin");
  const joinLog = join(root, "join.log");
  const deliveryLog = join(root, "delivery.log");
  const herdrState = join(root, "herdr-state");
  mkdirSync(repo, { recursive: true });
  mkdirSync(bin, { recursive: true });
  mkdirSync(herdrState, { recursive: true });

  git(repo, "init", "-q", "-b", "main");
  git(repo, "config", "user.email", "team-up@example.com");
  git(repo, "config", "user.name", "Team Up Test");
  writeFileSync(join(repo, "README.md"), "fixture\n");
  git(repo, "add", "README.md");
  git(repo, "commit", "-qm", "fixture");

  const herdr = join(bin, "herdr");
  writeFileSync(
    herdr,
    `#!/usr/bin/env bash
set -eu
state="\${FAKE_HERDR_STATE:?}"
session=""
if [ "\${1:-}" = "--session" ]; then
  session="\${2:-}"
  shift 2
fi
verb="\${1:-} \${2:-}"
case "$verb" in
  "workspace list") test -f "$state/session" ;;
  "workspace create") printf '{"pane_id":"%%1"}\\n' ;;
  "pane split") printf '{"pane_id":"%%1"}\\n' ;;
  "pane run") ;;
  "pane rename") ;;
  "agent rename") ;;
  "session stop") rm -f "$state/session" ;;
  "session delete") rm -f "$state/session" ;;
  "session list") [ -f "$state/session" ] && cat "$state/session" || true ;;
  *)
    case "\${1:-}" in
      server) printf '%s\\n' "$session" >"$state/session" ;;
      *) exit 2 ;;
    esac
    ;;
esac
`,
  );
  chmodSync(herdr, 0o755);

  const open = join(bin, "open");
  writeFileSync(open, "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(open, 0o755);

  // delivery.sh records each invocation so a test can prove the agmsg monitor
  // arming is skipped under the herdr backend.
  const delivery = join(bin, "delivery.sh");
  writeFileSync(delivery, `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >>"\${FAKE_DELIVERY_LOG:?}"\nexit 0\n`);
  chmodSync(delivery, 0o755);

  const joinAgent = join(bin, "join.sh");
  writeFileSync(
    joinAgent,
    `#!/usr/bin/env bash
set -eu
printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" >>"\${FAKE_JOIN_LOG:?}"
`,
  );
  chmodSync(joinAgent, 0o755);

  const resetAgent = join(bin, "reset.sh");
  writeFileSync(resetAgent, "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(resetAgent, 0o755);

  const env: Record<string, string> = {
    ...process.env,
    TEAM_REPO: repo,
    TEAM_BASE: base,
    TEAM_STATE_DIR: state,
    TEAM_RUN_ID: "run-001",
    TEAM_SESSION: "amadeus-team-msg-test",
    TEAM_ENGINEERS: "2",
    FAKE_JOIN_LOG: joinLog,
    FAKE_DELIVERY_LOG: deliveryLog,
    FAKE_HERDR_STATE: herdrState,
    HERDR: herdr,
    AGMSG_JOIN: joinAgent,
    AGMSG_RESET: resetAgent,
    DELIVERY: delivery,
    PATH: `${bin}:${process.env.PATH}`,
  };

  return { base, env, deliveryLog, joinLog, repo, state };
}

describe("team-up resolve_msg_backend", () => {
  test("defaults to agmsg with no flag or env", () => {
    const result = resolveBackend({});
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toBe("agmsg");
  });

  test("the TEAM_MSG env selects the backend", () => {
    const result = resolveBackend({ env: "herdr" });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toBe("herdr");
  });

  test("the --msg flag wins over the TEAM_MSG env", () => {
    const result = resolveBackend({ flag: "herdr", env: "agmsg" });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toBe("herdr");
  });

  test("an unknown backend is rejected fail-closed", () => {
    const result = resolveBackend({ flag: "bogus" });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("unknown msg backend: bogus (agmsg|herdr)");
  });

  test("an unknown TEAM_MSG env is rejected fail-closed", () => {
    const result = resolveBackend({ env: "bogus" });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("unknown msg backend: bogus (agmsg|herdr)");
  });
});

describe("team-up messaging backend launch", () => {
  test("the default fresh run records agmsg and registers every role", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(readFileSync(join(fixture.state, "runs", "run-001", "msg"), "utf8").trim()).toBe("agmsg");
    // agmsg backend registers leader + 2 engineers and arms the monitor.
    expect(readFileSync(fixture.joinLog, "utf8").trim().split("\n")).toHaveLength(3);
    expect(existsSync(fixture.deliveryLog)).toBe(true);
  });

  test("a --msg herdr fresh run records herdr, skips agmsg registration and monitor arming", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--msg", "herdr"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(readFileSync(join(fixture.state, "runs", "run-001", "msg"), "utf8").trim()).toBe("herdr");
    // No agmsg join registrations and no monitor arming under herdr.
    expect(existsSync(fixture.joinLog)).toBe(false);
    expect(existsSync(fixture.deliveryLog)).toBe(false);
    // The run still launches: current/active-run pointers are written.
    expect(readFileSync(join(fixture.state, "current-run"), "utf8").trim()).toBe("run-001");
  });

  test("a herdr fresh run launches even when the agmsg join script is absent", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--msg", "herdr"],
      // Point AGMSG_ROOT and the join script at a non-existent tree: herdr mode
      // must never require an agmsg installation.
      env: {
        ...fixture.env,
        AGMSG_ROOT: join(fixture.base, "no-such-agmsg"),
        AGMSG_JOIN: join(fixture.base, "no-such-agmsg", "join.sh"),
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(readFileSync(join(fixture.state, "runs", "run-001", "msg"), "utf8").trim()).toBe("herdr");
  });

  test("a resumed run inherits the saved herdr backend and never re-registers", () => {
    const fixture = createCliFixture();
    const started = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--msg", "herdr"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(started.exitCode, started.stderr.toString()).toBe(0);
    Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });

    const resumed = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-c"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(resumed.exitCode, resumed.stderr.toString()).toBe(0);
    // The saved backend is still herdr, so no agmsg registration ever happens.
    expect(readFileSync(join(fixture.state, "runs", "run-001", "msg"), "utf8").trim()).toBe("herdr");
    expect(existsSync(fixture.joinLog)).toBe(false);
  });

  test("--msg is rejected on resume (a resumed run keeps its backend)", () => {
    const fixture = createCliFixture();
    const started = Bun.spawnSync({ cmd: ["bash", TEAM_UP], env: fixture.env });
    expect(started.exitCode).toBe(0);
    Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });

    const resumed = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-c", "--msg", "herdr"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(resumed.exitCode).toBe(1);
    expect(resumed.stderr.toString()).toContain("--msg is only valid for a fresh run");
  });

  test("rollback_registered_members is a safe no-op with no registrations (herdr)", () => {
    // Under herdr the registration list stays empty; the rollback helper must
    // iterate nothing and return success even when AGMSG_RESET is absent.
    const result = Bun.spawnSync({
      cmd: [
        "bash",
        "-c",
        'script="$1"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; REGISTERED_MEMBERS=""; AGMSG_RESET="/no/such/reset.sh"; rollback_registered_members; echo "ok:$?"',
        "_",
        TEAM_UP,
      ],
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe("ok:0");
  });
});

describe("team-up member command backend wiring", () => {
  function claudeCmd(msgBackend: string) {
    return Bun.spawnSync({
      cmd: [
        "bash",
        "-c",
        `script="$1"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; CONTINUE=0; MSG_BACKEND=${msgBackend}; claude_member_cmd engineer-1 /tmp/wt`,
        "_",
        TEAM_UP,
      ],
      env: { ...process.env, DELIVERY: "/path/that/does/not/exist" },
      stderr: "pipe",
      stdout: "pipe",
    });
  }

  test("the agmsg claude command keeps the monitor bootstrap prompt", () => {
    const result = claudeCmd("agmsg");
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    const cmd = result.stdout.toString();
    expect(cmd).toContain("TEAM_MSG=agmsg");
    // The prompt is %q-quoted, so spaces appear escaped (/agmsg\ mode\ monitor).
    expect(cmd).toContain("/agmsg");
  });

  test("the herdr claude command drops the monitor bootstrap prompt", () => {
    const result = claudeCmd("herdr");
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    const cmd = result.stdout.toString();
    expect(cmd).toContain("TEAM_MSG=herdr");
    expect(cmd).not.toContain("/agmsg");
  });

  function claudeCmdWithRunRecord(msgBackend: string) {
    return Bun.spawnSync({
      cmd: [
        "bash",
        "-c",
        `script="$1"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; CONTINUE=0; MSG_BACKEND=${msgBackend}; RUN_RECORD=/tmp/run-record; claude_member_cmd engineer-1 /tmp/wt`,
        "_",
        TEAM_UP,
      ],
      env: { ...process.env, DELIVERY: "/path/that/does/not/exist" },
      stderr: "pipe",
      stdout: "pipe",
    });
  }

  // The elected send audit log needs an activator: the herdr launch command
  // must carry TEAM_MSG_LOG_DIR or every real-run send silently skips logging.
  test("the herdr claude command arms TEAM_MSG_LOG_DIR from the run record", () => {
    const result = claudeCmdWithRunRecord("herdr");
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain("TEAM_MSG_LOG_DIR=/tmp/run-record");
  });

  test("the agmsg claude command does not set TEAM_MSG_LOG_DIR", () => {
    const result = claudeCmdWithRunRecord("agmsg");
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).not.toContain("TEAM_MSG_LOG_DIR");
  });
});
