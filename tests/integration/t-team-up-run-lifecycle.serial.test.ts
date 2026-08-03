// size: large
import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { main as safetyWaitMain } from "../../packages/framework/core/tools/team-up-codex-safety-wait.ts";

const ROOT = resolve(import.meta.dir, "../..");
const TEAM_UP = join(ROOT, "packages/framework/core/tools/team-up.sh");
const tempDirs: string[] = [];

// These process- and Git-heavy tests share the runner with other files under
// -P N. Keep functional assertions strict without treating CPU contention as a
// product failure.
setDefaultTimeout(15_000);

// Issue #1811: a test that ends without `--kill` leaves its fixture
// safety-wait supervisors orphaned, and their pid files live inside the temp
// trees this hook deletes. Reap them first: SIGTERM, then SIGKILL whatever is
// still alive when the grace window closes.
const SWEEP_TERM_GRACE_MS = 2_000;
const SWEEP_POLL_MS = 25;

function collectSupervisorPids(dir: string): number[] {
  const pids: number[] = [];
  try {
    for (const relative of new Bun.Glob("**/safety-wait.pid").scanSync({ cwd: dir })) {
      const pid = Number(readFileSync(join(dir, relative), "utf8").trim());
      if (Number.isSafeInteger(pid) && pid > 0) pids.push(pid);
    }
  } catch {}
  return pids;
}

function stillAlive(pids: number[]): number[] {
  return pids.filter((pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  });
}

async function reapSupervisors(pids: number[]) {
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
  const deadline = Date.now() + SWEEP_TERM_GRACE_MS;
  while (stillAlive(pids).length > 0 && Date.now() < deadline) await Bun.sleep(SWEEP_POLL_MS);
  for (const pid of stillAlive(pids)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }
}

afterEach(async () => {
  const dirs = tempDirs.splice(0);
  await reapSupervisors(dirs.flatMap(collectSupervisorPids));
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]) {
  const result = Bun.spawnSync({ cmd: ["git", ...args], cwd, stderr: "pipe", stdout: "pipe" });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return result.stdout.toString().trim();
}

function createCliFixture() {
  const root = mkdtempSync(join(tmpdir(), "amadeus-team-up-cli-"));
  tempDirs.push(root);
  const repo = join(root, "repo");
  const base = join(root, "worktrees");
  const state = join(root, "state");
  const bin = join(root, "bin");
  const joinLog = join(root, "join.log");
  const herdrState = join(root, "herdr-state");
  const safetyWaitBarrierDir = join(root, "safety-wait-barrier");
  // agmsg readiness stub for the Issue #1384 watcher verification that runs on
  // the claude + agmsg launch path: a self-contained agmsg_ready_path and a run
  // dir the fake herdr `pane run` touches to simulate each watcher arming.
  const agmsgRoot = join(root, "agmsg");
  const readyDir = join(agmsgRoot, "run");
  const actasLib = join(root, "actas-lock.sh");
  mkdirSync(repo, { recursive: true });
  mkdirSync(bin, { recursive: true });
  mkdirSync(herdrState, { recursive: true });
  mkdirSync(safetyWaitBarrierDir, { recursive: true });
  mkdirSync(readyDir, { recursive: true });
  mkdirSync(join(repo, "tools"), { recursive: true });
  // Role-only stub (drops the team key) so a member's sentinel is independent of
  // the instance-derived team name; the fake herdr arms it knowing only the
  // role. Sentinel-name fidelity is covered by t-team-up-watcher-arming.test.ts.
  writeFileSync(
    actasLib,
    `agmsg_ready_path() { printf '%s/run/ready.%s' "\${SKILL_DIR:?}" "$2"; }\n`,
  );

  git(repo, "init", "-q", "-b", "main");
  git(repo, "config", "user.email", "team-up@example.com");
  git(repo, "config", "user.name", "Team Up Test");
  writeFileSync(join(repo, "README.md"), "fixture\n");
  writeFileSync(
    join(repo, "tools", "team-up-codex-safety-wait.ts"),
    `import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
if (args[0] === "production-enabled") process.exit(0);
const roleIndex = args.indexOf("--role");
const role = roleIndex >= 0 ? args[roleIndex + 1] : "";
const runIndex = args.indexOf("--run");
const run = runIndex >= 0 ? args[runIndex + 1] : "";
const recordIndex = args.indexOf("--run-record");
const runRecord = recordIndex >= 0 ? args[recordIndex + 1] : "";
const member = role === "leader" ? "leader" : \`engineer-\${role.slice(1)}\`;
const memberRecord = join(runRecord, "members", member);
const readyPath = join(memberRecord, "safety-wait.ready");
if (args[0] === "role-ready") {
  if (process.env.FAKE_SAFETY_WAIT_CREATE_STALE_ROLE === role) {
    await Bun.write(
      readyPath,
      \`\${JSON.stringify({ schemaVersion: 1, run: "stale-run", role, pid: 42 })}\\n\`,
    );
  }
  process.exit(process.env.FAKE_SAFETY_WAIT_ROLE_READY_FAIL_ROLE === role ? 9 : 0);
}
if (args[0] === "ready-valid") {
  const pidIndex = args.indexOf("--pid");
  const pid = pidIndex >= 0 ? Number(args[pidIndex + 1]) : Number.NaN;
  try {
    const evidence = await Bun.file(readyPath).json();
    process.exit(
      evidence.schemaVersion === 1 &&
        evidence.run === run &&
        evidence.role === role &&
        evidence.pid === pid
        ? 0
        : 3,
    );
  } catch {
    process.exit(3);
  }
}
if (args[0] !== "supervise") process.exit(2);
if (process.env.FAKE_SAFETY_WAIT_FAIL_ROLE === role) {
  const barrier = process.env.FAKE_SAFETY_WAIT_BARRIER_DIR;
  if (!barrier) process.exit(9);
  await Bun.write(join(barrier, \`\${role}.alive\`), "");
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await Bun.file(join(barrier, \`\${role}.release\`)).exists()) process.exit(9);
    await Bun.sleep(25);
  }
  process.exit(9);
}
if (process.env.FAKE_SAFETY_WAIT_NEVER_READY_ROLE === role) {
  process.on("SIGTERM", () => process.exit(0));
  await new Promise(() => {});
}
if (
  process.env.FAKE_SAFETY_WAIT_REQUIRE_STALE_REMOVED_ROLE === role &&
  (await Bun.file(readyPath).exists())
) {
  process.exit(8);
}
const readyTemp = \`\${readyPath}.\${process.pid}.tmp\`;
await Bun.write(
  readyTemp,
  \`\${JSON.stringify({ schemaVersion: 1, run, role, pid: process.pid })}\\n\`,
);
renameSync(readyTemp, readyPath);
process.on("SIGTERM", () => process.exit(0));
// Issue #1811: stay alive only while the run record this supervisor was
// launched for still exists, so an orphan whose launcher and record are both
// gone exits instead of leaking. A supervisor started against a record that
// never existed (the foreign-run ownership fixture) keeps waiting for SIGTERM.
if (existsSync(runRecord)) {
  while (existsSync(runRecord)) await Bun.sleep(100);
  process.exit(0);
}
setInterval(() => {}, 1_000);
`,
  );
  git(repo, "add", "README.md", "tools/team-up-codex-safety-wait.ts");
  git(repo, "commit", "-qm", "fixture");

  // Fake herdr binary. team-up.sh drives herdr through `--session <name>
  // <verb...>` (workspace/pane/agent verbs) plus bare `session <verb>` calls.
  // Session existence is modeled per session name under sessions/<name> so
  // named team-up instances can run in parallel. workspace-create / pane-split
  // print the JSON pane_id contract team-up.sh parses; FAKE_HERDR_FAIL_COMMAND
  // fails a chosen verb (e.g. "pane split") to exercise the layout-failure path.
  const herdr = join(bin, "herdr");
  writeFileSync(
    herdr,
    `#!/usr/bin/env bash
set -eu
state="\${FAKE_HERDR_STATE:?}"
mkdir -p "$state/sessions"
session=""
if [ "\${1:-}" = "--session" ]; then
  session="\${2:-}"
  shift 2
fi
verb="\${1:-} \${2:-}"
target="$session"
case "$verb" in
  "session stop" | "session delete") target="\${3:-$session}" ;;
esac
if [ -n "\${FAKE_HERDR_FAIL_COMMAND:-}" ] && [ "$FAKE_HERDR_FAIL_COMMAND" = "$verb" ]; then
  exit 9
fi
case "$verb" in
  "workspace list") test -n "$session" && test -f "$state/sessions/$session" ;;
  "workspace create") printf '{"pane_id":"%%1"}\\n' ;;
  "pane split") printf '{"pane_id":"%%1"}\\n' ;;
  "pane run")
    # Simulate the launched Claude member's watcher arming by touching its ready
    # sentinel, derived from the member worktree basename in the run command
    # (Issue #1384). Codex launches skip verification, so this is inert there.
    if [ -n "\${FAKE_READY_DIR:-}" ]; then
      _m=$(printf '%s' "\${4:-}" | grep -oE '(leader|engineer-[0-9]+)' | head -1 || true)
      case "$_m" in
        leader) : >"$FAKE_READY_DIR/ready.leader" ;;
        engineer-*) : >"$FAKE_READY_DIR/ready.e\${_m#engineer-}" ;;
      esac
    fi
    ;;
  "pane rename") ;;
  "agent rename") ;;
  "session stop") rm -f "$state/sessions/$target" ;;
  "session delete") rm -f "$state/sessions/$target" ;;
  "session list")
    for f in "$state/sessions"/*; do
      [ -f "$f" ] || continue
      basename "$f"
    done
    ;;
  *)
    case "\${1:-}" in
      server)
        test -n "$session"
        printf '%s\\n' "$session" >"$state/sessions/$session"
        ;;
      *) exit 2 ;;
    esac
    ;;
esac
`,
  );
  chmodSync(herdr, 0o755);

  const ps = join(bin, "ps");
  writeFileSync(
    ps,
    `#!/usr/bin/env bash
set -eu
output=$(/bin/ps "$@")
printf '%s\n' "$output"
role="\${FAKE_SAFETY_WAIT_FAIL_ROLE:-}"
barrier="\${FAKE_SAFETY_WAIT_BARRIER_DIR:-}"
if [ -n "$role" ] && [ -n "$barrier" ] && printf '%s' "$output" | grep -F -- "--role $role" >/dev/null; then
  if [ -e "$barrier/$role.probed" ]; then
    : >"$barrier/$role.release"
  else
    : >"$barrier/$role.probed"
  fi
fi
`,
  );
  chmodSync(ps, 0o755);

  const open = join(bin, "open");
  writeFileSync(open, "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(open, 0o755);

  const codexMonitor = join(bin, "codex-monitor.sh");
  writeFileSync(codexMonitor, "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(codexMonitor, 0o755);

  const roleResume = join(bin, "role-resume.sh");
  writeFileSync(roleResume, '#!/usr/bin/env bash\nprintf "thread-%s" "$3"\n');
  chmodSync(roleResume, 0o755);

  const joinAgent = join(bin, "join.sh");
  writeFileSync(
    joinAgent,
    `#!/usr/bin/env bash
set -eu
if [ "\${FAKE_JOIN_FAIL_ROLE:-}" = "$2" ]; then
  exit 8
fi
printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "\${AGMSG_RESOLVE_PROJECT:-}" >>"\${FAKE_JOIN_LOG:?}"
`,
  );
  chmodSync(joinAgent, 0o755);

  const resetAgent = join(bin, "reset.sh");
  writeFileSync(resetAgent, "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(resetAgent, 0o755);

  const env = {
    ...process.env,
    TEAM_REPO: repo,
    SAFETY_WAIT_HELPER: join(repo, "tools", "team-up-codex-safety-wait.ts"),
    TEAM_BASE: base,
    TEAM_STATE_DIR: state,
    TEAM_RUN_ID: "run-001",
    TEAM_SESSION: "amadeus-team-test",
    TEAM_ENGINEERS: "2",
    FAKE_JOIN_LOG: joinLog,
    FAKE_HERDR_STATE: herdrState,
    FAKE_SAFETY_WAIT_BARRIER_DIR: safetyWaitBarrierDir,
    // Pin the launch backend to the fake herdr by absolute path (variable
    // injection, not PATH order) so the suite never touches a real herdr.
    HERDR: herdr,
    AGMSG_JOIN: joinAgent,
    AGMSG_RESET: resetAgent,
    DELIVERY: join(root, "missing-delivery.sh"),
    CODEX_MONITOR: codexMonitor,
    ROLE_RESUME: roleResume,
    // Issue #1384 watcher verification: derive sentinels from the stub lib +
    // run dir, and keep the per-wait short so a missing sentinel fails fast.
    AGMSG_ROOT: agmsgRoot,
    AGMSG_ACTAS_LOCK_LIB: actasLib,
    FAKE_READY_DIR: readyDir,
    WATCHER_READY_TIMEOUT: "5",
    PATH: `${bin}:${process.env.PATH}`,
  };

  return { base, env, herdrState, joinLog, repo, safetyWaitBarrierDir, state };
}

describe("team-up safety-wait supervisor: CLI contract", () => {
  test("the safety-wait CLI validates commands and supervises only an active exact run", async () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-safety-wait-cli-"));
    tempDirs.push(root);
    const command = join(root, "fake-command");
    const runRecord = join(root, "runs", "run-001");
    mkdirSync(runRecord, { recursive: true });
    writeFileSync(join(runRecord, "session"), "test-session\n");
    writeFileSync(join(runRecord, "runtime"), "codex\n");
    writeFileSync(join(runRecord, "status"), "stopped\n");
    writeFileSync(
      command,
      `#!/bin/sh
if [ "$1" = "--version" ]; then
  printf 'herdr 0.7.1\\n'
  exit 0
fi
printf '{"result":{"agents":[]}}\\n'
`,
    );
    chmodSync(command, 0o755);

    expect(await safetyWaitMain(["production-enabled"])).toBe(0);
    expect(await safetyWaitMain([])).toBe(2);
    expect(
      await safetyWaitMain(["unknown", "--session", "test-session", "--role", "e1"]),
    ).toBe(2);
    expect(
      await safetyWaitMain(["role-ready", "--session", "test-session", "--role", "e0"]),
    ).toBe(2);
    expect(
      await safetyWaitMain([
        "role-ready",
        "--session",
        "test-session",
        "--role",
        "e1",
        "--herdr",
        command,
      ]),
    ).toBe(3);
    expect(
      await safetyWaitMain([
        "role-ready",
        "--session",
        "test-session",
        "--role",
        "e1",
        "--herdr",
        join(root, "missing-command"),
      ]),
    ).toBe(3);
    expect(
      await safetyWaitMain(["supervise", "--session", "test-session", "--role", "e1"]),
    ).toBe(2);
    expect(
      await safetyWaitMain([
        "supervise",
        "--session",
        "test-session",
        "--role",
        "e1",
        "--run",
        "run-001",
        "--run-record",
        runRecord,
        "--herdr",
        command,
        "--codex",
        command,
      ]),
    ).toBe(3);

    writeFileSync(join(runRecord, "status"), "running\n");
    expect(
      await safetyWaitMain([
        "supervise",
        "--session",
        "test-session",
        "--role",
        "e1",
        "--run",
        "run-001",
        "--run-record",
        runRecord,
        "--herdr",
        command,
        "--codex",
        command,
      ]),
    ).toBe(3);
  });
});

describe("team-up run lifecycle: launch", () => {
  test("help explains the fresh and resume lifecycle commands", () => {
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--help"],
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain("-c, --continue");
    expect(result.stdout.toString()).toContain("-2, -4, -6");
    expect(result.stdout.toString()).toContain("-i, --instance NAME");
    expect(result.stdout.toString()).toContain("--list-runs");
    expect(result.stdout.toString()).toContain("--list-instances");
    expect(result.stdout.toString()).toContain("--delete-run ID");
    expect(result.stdout.toString()).toContain("AGENT_IDENTITY");
    expect(result.stdout.toString()).toContain("TEAM_ENGINEERS");
    expect(result.stdout.toString()).toContain("TEAM_INSTANCE");
  });

  test("a fresh launch creates one isolated worktree and branch per role from HEAD", () => {
    const fixture = createCliFixture();
    const baseCommit = git(fixture.repo, "rev-parse", "HEAD");
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-6"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    for (const role of [
      "leader",
      "engineer-1",
      "engineer-2",
      "engineer-3",
      "engineer-4",
      "engineer-5",
      "engineer-6",
    ]) {
      const worktree = join(fixture.base, "runs", "run-001", role);
      expect(git(worktree, "rev-parse", "HEAD")).toBe(baseCommit);
      expect(git(worktree, "branch", "--show-current")).toBe(`team/run-001/${role}`);
    }
    expect(readFileSync(join(fixture.state, "current-run"), "utf8").trim()).toBe("run-001");
  });

  test("-4 creates a five-member run and records the engineer count", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-4"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    for (const role of ["leader", "engineer-1", "engineer-2", "engineer-3", "engineer-4"]) {
      expect(existsSync(join(fixture.base, "runs", "run-001", role))).toBe(true);
    }
    for (const role of ["engineer-5", "engineer-6"]) {
      expect(existsSync(join(fixture.base, "runs", "run-001", role))).toBe(false);
    }
    expect(readFileSync(join(fixture.state, "runs", "run-001", "size"), "utf8").trim()).toBe("4");
  });

  test("-2 creates a three-member run and records the engineer count", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-2"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    for (const role of ["leader", "engineer-1", "engineer-2"]) {
      expect(existsSync(join(fixture.base, "runs", "run-001", role))).toBe(true);
    }
    expect(existsSync(join(fixture.base, "runs", "run-001", "engineer-3"))).toBe(false);
    expect(readFileSync(join(fixture.state, "runs", "run-001", "size"), "utf8").trim()).toBe("2");
  });

  test("the engineer count flags are rejected when resuming a run", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-c", "-4"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("only valid for a fresh run");
  });

  test("a fresh launch rejects an out-of-range engineer count", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: { ...fixture.env, TEAM_ENGINEERS: "5" },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("invalid engineer count");
    expect(existsSync(join(fixture.base, "runs", "run-001"))).toBe(false);
  });

  test("a fresh Codex launch pre-registers every role with agmsg", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--codex"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    const registrations = existsSync(fixture.joinLog)
      ? readFileSync(fixture.joinLog, "utf8").trim().split("\n")
      : [];
    expect(registrations).toEqual(
      ["leader", ...Array.from({ length: 2 }, (_, index) => `e${index + 1}`)].map(
        (role, index) => {
          const member = index === 0 ? "leader" : `engineer-${index}`;
          return `amadeus\t${role}\tcodex\t${join(fixture.base, "runs", "run-001", member)}\t0`;
        },
      ),
    );
  });
});

describe("team-up safety-wait supervisor: ownership and readiness", () => {
  test("Codex fresh, resume, and kill own one safety-wait supervisor per role", () => {
    const fixture = createCliFixture();
    const members = [
      "leader",
      "engineer-1",
      "engineer-2",
    ];
    const runRecord = join(fixture.state, "runs", "run-001");
    const readPids = () =>
      members.map((member) =>
        Number(readFileSync(join(runRecord, "members", member, "safety-wait.pid"), "utf8")),
      );

    try {
      const fresh = Bun.spawnSync({
        cmd: ["bash", TEAM_UP, "--codex"],
        env: fixture.env,
        stderr: "pipe",
        stdout: "pipe",
      });
      expect(fresh.exitCode, fresh.stderr.toString()).toBe(0);
      const freshPids = readPids();
      expect(new Set(freshPids).size).toBe(3);
      for (const pid of freshPids) expect(() => process.kill(pid, 0)).not.toThrow();
      for (const [index, member] of members.entries()) {
        const role = index === 0 ? "leader" : `e${index}`;
        expect(
          JSON.parse(
            readFileSync(
              join(runRecord, "members", member, "safety-wait.ready"),
              "utf8",
            ),
          ),
        ).toEqual({
          schemaVersion: 1,
          run: "run-001",
          role,
          pid: freshPids[index],
        });
      }

      const resumed = Bun.spawnSync({
        cmd: ["bash", TEAM_UP, "-c"],
        env: fixture.env,
        stderr: "pipe",
        stdout: "pipe",
      });
      expect(resumed.exitCode, resumed.stderr.toString()).toBe(0);
      expect(readPids()).toEqual(freshPids);

      const killed = Bun.spawnSync({
        cmd: ["bash", TEAM_UP, "--kill"],
        env: fixture.env,
        stderr: "pipe",
        stdout: "pipe",
      });
      expect(killed.exitCode, killed.stderr.toString()).toBe(0);
      for (const pid of freshPids) expect(() => process.kill(pid, 0)).toThrow();
      for (const member of members) {
        const memberRecord = join(runRecord, "members", member);
        expect(existsSync(join(memberRecord, "safety-wait.pid"))).toBe(false);
        expect(existsSync(join(memberRecord, "safety-wait.ready"))).toBe(false);
        expect(existsSync(join(memberRecord, "safety-wait.lock"))).toBe(false);
      }
    } finally {
      Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });
    }
  });

  test("a stale safety-wait ready marker is removed before supervisor startup", () => {
    const fixture = createCliFixture();
    const runRecord = join(fixture.state, "runs", "run-001");
    const memberRecord = join(runRecord, "members", "engineer-2");

    try {
      const result = Bun.spawnSync({
        cmd: ["bash", TEAM_UP, "--codex"],
        env: {
          ...fixture.env,
          FAKE_SAFETY_WAIT_CREATE_STALE_ROLE: "e2",
          FAKE_SAFETY_WAIT_REQUIRE_STALE_REMOVED_ROLE: "e2",
        },
        stderr: "pipe",
        stdout: "pipe",
      });
      expect(result.exitCode, result.stderr.toString()).toBe(0);
      const pid = Number(readFileSync(join(memberRecord, "safety-wait.pid"), "utf8"));
      expect(
        JSON.parse(readFileSync(join(memberRecord, "safety-wait.ready"), "utf8")),
      ).toEqual({
        schemaVersion: 1,
        run: "run-001",
        role: "e2",
        pid,
      });
    } finally {
      Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });
    }
  });

  test("kill does not signal a safety-wait process owned by another run", async () => {
    const fixture = createCliFixture();
    const runRecord = join(fixture.state, "runs", "run-001");
    const memberRecord = join(runRecord, "members", "leader");
    const fresh = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--codex"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(fresh.exitCode, fresh.stderr.toString()).toBe(0);
    const ownedPid = Number(readFileSync(join(memberRecord, "safety-wait.pid"), "utf8"));
    const foreign = Bun.spawn({
      cmd: [
        "bun",
        join(fixture.repo, "tools", "team-up-codex-safety-wait.ts"),
        "supervise",
        "--session",
        "foreign-session",
        "--run",
        "foreign-run",
        "--role",
        "leader",
        "--run-record",
        join(fixture.state, "runs", "foreign-run"),
      ],
      env: fixture.env,
      stderr: "ignore",
      stdout: "ignore",
    });
    await Bun.sleep(50);
    writeFileSync(join(memberRecord, "safety-wait.pid"), `${foreign.pid}\n`);

    try {
      const killed = Bun.spawnSync({
        cmd: ["bash", TEAM_UP, "--kill"],
        env: fixture.env,
        stderr: "pipe",
        stdout: "pipe",
      });
      expect(killed.exitCode, killed.stderr.toString()).toBe(0);
      const foreignStillRunning = await Promise.race([
        foreign.exited.then(() => false),
        Bun.sleep(100).then(() => true),
      ]);
      expect(foreignStillRunning).toBe(true);
      expect(() => process.kill(ownedPid, 0)).toThrow();
    } finally {
      for (const pid of [ownedPid, foreign.pid]) {
        try {
          process.kill(pid, "SIGTERM");
        } catch {}
      }
      await foreign.exited;
    }
  });

  test("resume refuses mismatched pid and owner metadata without replacing either process", async () => {
    const fixture = createCliFixture();
    const runRecord = join(fixture.state, "runs", "run-001");
    const memberRecord = join(runRecord, "members", "leader");
    const fresh = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--codex"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(fresh.exitCode, fresh.stderr.toString()).toBe(0);
    const ownedPid = Number(readFileSync(join(memberRecord, "safety-wait.pid"), "utf8"));
    const foreign = Bun.spawn({
      cmd: ["bun", "-e", "setInterval(() => {}, 1_000)"],
      env: fixture.env,
      stderr: "ignore",
      stdout: "ignore",
    });
    await Bun.sleep(50);
    writeFileSync(join(memberRecord, "safety-wait.pid"), `${foreign.pid}\n`);

    try {
      const resumed = Bun.spawnSync({
        cmd: ["bash", TEAM_UP, "-c"],
        env: fixture.env,
        stderr: "pipe",
        stdout: "pipe",
      });
      expect(resumed.exitCode).not.toBe(0);
      expect(resumed.stderr.toString()).toContain("ambiguous");
      expect(() => process.kill(ownedPid, 0)).not.toThrow();
      expect(() => process.kill(foreign.pid, 0)).not.toThrow();
      expect(Number(readFileSync(join(memberRecord, "safety-wait.pid"), "utf8"))).toBe(
        foreign.pid,
      );
      expect(
        Number(readFileSync(join(memberRecord, "safety-wait.lock", "owner"), "utf8")),
      ).toBe(ownedPid);
    } finally {
      for (const pid of [ownedPid, foreign.pid]) {
        try {
          process.kill(pid, "SIGTERM");
        } catch {}
      }
      await foreign.exited;
      Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });
    }
  });

  test("a dead owner is not reacquired when the role pane cannot be revalidated", async () => {
    const fixture = createCliFixture();
    const memberRecord = join(
      fixture.state,
      "runs",
      "run-001",
      "members",
      "leader",
    );
    const fresh = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--codex"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(fresh.exitCode, fresh.stderr.toString()).toBe(0);
    const deadPid = Number(readFileSync(join(memberRecord, "safety-wait.pid"), "utf8"));
    process.kill(deadPid, "SIGTERM");
    await Bun.sleep(100);

    try {
      const resumed = Bun.spawnSync({
        cmd: ["bash", TEAM_UP, "-c"],
        env: { ...fixture.env, FAKE_SAFETY_WAIT_ROLE_READY_FAIL_ROLE: "leader" },
        stderr: "pipe",
        stdout: "pipe",
      });
      expect(resumed.exitCode).not.toBe(0);
      expect(resumed.stderr.toString()).toContain("role pane is not ready");
      expect(Number(readFileSync(join(memberRecord, "safety-wait.pid"), "utf8"))).toBe(
        deadPid,
      );
      expect(
        Number(readFileSync(join(memberRecord, "safety-wait.lock", "owner"), "utf8")),
      ).toBe(deadPid);
    } finally {
      Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });
    }
  });

  test("a safety-wait exit after the liveness probe fails launch and cleans every started supervisor", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--codex"],
      env: { ...fixture.env, FAKE_SAFETY_WAIT_FAIL_ROLE: "e2" },
      stderr: "pipe",
      stdout: "pipe",
    });

    try {
      expect(existsSync(join(fixture.safetyWaitBarrierDir, "e2.probed"))).toBe(true);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("early-exit");
      expect(result.stderr.toString()).toContain("waiting for ready");
      const runRecord = join(fixture.state, "runs", "run-001");
      for (const member of [
        "leader",
        "engineer-1",
        "engineer-2",
      ]) {
        const memberRecord = join(runRecord, "members", member);
        expect(existsSync(join(memberRecord, "safety-wait.pid"))).toBe(false);
        expect(existsSync(join(memberRecord, "safety-wait.lock"))).toBe(false);
        expect(existsSync(join(memberRecord, "safety-wait.ready"))).toBe(false);
      }
    } finally {
      Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });
    }
  });

  test("a safety-wait readiness timeout identifies the role and cleans every startup asset", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--codex"],
      env: {
        ...fixture.env,
        FAKE_SAFETY_WAIT_NEVER_READY_ROLE: "e2",
        SAFETY_WAIT_READY_TIMEOUT_SECONDS: "1",
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    try {
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("timeout");
      expect(result.stderr.toString()).toContain("waiting for ready for e2");
      const runRecord = join(fixture.state, "runs", "run-001");
      for (const member of [
        "leader",
        "engineer-1",
        "engineer-2",
      ]) {
        const memberRecord = join(runRecord, "members", member);
        expect(existsSync(join(memberRecord, "safety-wait.pid"))).toBe(false);
        expect(existsSync(join(memberRecord, "safety-wait.lock"))).toBe(false);
        expect(existsSync(join(memberRecord, "safety-wait.ready"))).toBe(false);
      }
    } finally {
      Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });
    }
  });

});

describe("team-up run lifecycle: resume and preparation", () => {
  test("a fresh Claude launch pre-registers every role with agmsg", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--claude"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    const registrations = existsSync(fixture.joinLog)
      ? readFileSync(fixture.joinLog, "utf8").trim().split("\n")
      : [];
    expect(registrations.map((line) => line.split("\t").slice(0, 3).join("\t"))).toEqual([
      "amadeus\tleader\tclaude-code",
      "amadeus\te1\tclaude-code",
      "amadeus\te2\tclaude-code",
    ]);
  });

  test("an agmsg registration failure prevents pane launch", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--codex"],
      env: { ...fixture.env, FAKE_JOIN_FAIL_ROLE: "e2" },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("agmsg registration failed");
    expect(existsSync(join(fixture.herdrState, "sessions", "amadeus-team-test"))).toBe(false);
    expect(existsSync(join(fixture.base, "runs", "run-001"))).toBe(false);
  });

  test("continue reuses the current run worktrees and restores its runtime", () => {
    const fixture = createCliFixture();
    const started = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--codex"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(started.exitCode, started.stderr.toString()).toBe(0);
    const before = git(fixture.repo, "worktree", "list", "--porcelain");

    const killed = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--kill"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(killed.exitCode, killed.stderr.toString()).toBe(0);

    const resumed = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-c"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(resumed.exitCode, resumed.stderr.toString()).toBe(0);
    expect(resumed.stdout.toString()).toContain("runtime=codex");
    expect(git(fixture.repo, "worktree", "list", "--porcelain")).toBe(before);
    expect(readFileSync(fixture.joinLog, "utf8").trim().split("\n")).toHaveLength(6);
  });

  test("the first legacy resume requires a runtime and adopts fixed worktrees in place", () => {
    const fixture = createCliFixture();
    for (const role of [
      "leader",
      "engineer-1",
      "engineer-2",
      "engineer-3",
      "engineer-4",
      "engineer-5",
      "engineer-6",
    ]) {
      git(
        fixture.repo,
        "worktree",
        "add",
        "-q",
        "-b",
        `legacy/${role}`,
        join(fixture.base, role),
        "HEAD",
      );
    }

    const ambiguous = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-c"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(ambiguous.exitCode).toBe(1);
    expect(ambiguous.stderr.toString()).toContain("--claude or --codex");

    const adopted = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-c", "--codex"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(adopted.exitCode, adopted.stderr.toString()).toBe(0);
    expect(readFileSync(join(fixture.state, "current-run"), "utf8").trim()).toBe("legacy");
    expect(
      readFileSync(join(fixture.state, "runs", "legacy", "members", "leader", "path"), "utf8").trim(),
    ).toBe(join(fixture.base, "leader"));
  });

  test("continue can select an older run without creating more worktrees", () => {
    const fixture = createCliFixture();
    const first = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(first.exitCode, first.stderr.toString()).toBe(0);
    Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });

    const secondEnv = { ...fixture.env, TEAM_RUN_ID: "run-002" };
    const second = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: secondEnv,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(second.exitCode, second.stderr.toString()).toBe(0);
    Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: secondEnv });
    const before = git(fixture.repo, "worktree", "list", "--porcelain");

    const resumed = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-c", "--run", "run-001"],
      env: secondEnv,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(resumed.exitCode, resumed.stderr.toString()).toBe(0);
    expect(readFileSync(join(fixture.state, "current-run"), "utf8").trim()).toBe("run-001");
    expect(git(fixture.repo, "worktree", "list", "--porcelain")).toBe(before);
  });

  test("continue refuses to attach when a different run is active", () => {
    const fixture = createCliFixture();
    const first = Bun.spawnSync({ cmd: ["bash", TEAM_UP], env: fixture.env });
    expect(first.exitCode).toBe(0);
    Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });
    const secondEnv = { ...fixture.env, TEAM_RUN_ID: "run-002" };
    const second = Bun.spawnSync({ cmd: ["bash", TEAM_UP], env: secondEnv });
    expect(second.exitCode).toBe(0);

    const resumed = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-c", "--run", "run-001"],
      env: secondEnv,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(resumed.exitCode).toBe(1);
    expect(resumed.stderr.toString()).toContain("run run-002 is active");
  });

  test("a worktree preparation failure rolls back only resources created for the run", () => {
    const fixture = createCliFixture();
    git(fixture.repo, "branch", "team/run-001/engineer-2", "HEAD");

    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).not.toBe(0);
    expect(git(fixture.repo, "branch", "--list", "team/run-001/*")).toBe(
      "team/run-001/engineer-2",
    );
    expect(git(fixture.repo, "worktree", "list", "--porcelain")).not.toContain(
      join(fixture.base, "runs", "run-001"),
    );
  });

});

describe("team-up Herdr adapter", () => {
  test("a layout failure after agent launch preserves the failed run", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: { ...fixture.env, FAKE_HERDR_FAIL_COMMAND: "pane split" },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).not.toBe(0);
    expect(readFileSync(join(fixture.state, "runs", "run-001", "status"), "utf8").trim()).toBe(
      "failed",
    );
    expect(git(join(fixture.base, "runs", "run-001", "leader"), "branch", "--show-current")).toBe(
      "team/run-001/leader",
    );
    expect(existsSync(join(fixture.state, "current-run"))).toBe(false);
  });

});

describe("team-up run lifecycle: retained runs", () => {
  test("a fresh launch refuses a dirty base repository", () => {
    const fixture = createCliFixture();
    writeFileSync(join(fixture.repo, "uncommitted.txt"), "not in HEAD\n");

    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("repository is dirty");
    expect(existsSync(join(fixture.base, "runs", "run-001"))).toBe(false);
  });

  test("a fresh launch refuses to replace a running team", () => {
    const fixture = createCliFixture();
    const first = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(first.exitCode, first.stderr.toString()).toBe(0);

    const second = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: { ...fixture.env, TEAM_RUN_ID: "run-002" },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(second.exitCode).toBe(1);
    expect(second.stderr.toString()).toContain("already exists");
    expect(existsSync(join(fixture.base, "runs", "run-002"))).toBe(false);
  });

  test("kill stops the active run without removing its worktrees", () => {
    const fixture = createCliFixture();
    const started = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(started.exitCode, started.stderr.toString()).toBe(0);

    const killed = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--kill"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(killed.exitCode, killed.stderr.toString()).toBe(0);
    expect(existsSync(join(fixture.state, "active-run"))).toBe(false);
    expect(readFileSync(join(fixture.state, "runs", "run-001", "status"), "utf8").trim()).toBe(
      "stopped",
    );
    expect(git(join(fixture.base, "runs", "run-001", "leader"), "branch", "--show-current")).toBe(
      "team/run-001/leader",
    );
  });

  test("list-runs reports retained runs and their lifecycle state", () => {
    const fixture = createCliFixture();
    const started = Bun.spawnSync({ cmd: ["bash", TEAM_UP], env: fixture.env });
    expect(started.exitCode).toBe(0);
    Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });

    const listed = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--list-runs"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(listed.exitCode, listed.stderr.toString()).toBe(0);
    expect(listed.stdout.toString()).toContain("ID\tRUNTIME\tSTATUS\tNAME");
    expect(listed.stdout.toString()).toContain("run-001\tclaude\tstopped\t");
  });

  test("delete-run removes a stopped clean run with no unmerged work", () => {
    const fixture = createCliFixture();
    const started = Bun.spawnSync({ cmd: ["bash", TEAM_UP], env: fixture.env });
    expect(started.exitCode).toBe(0);
    Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });

    const deleted = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--delete-run", "run-001"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(deleted.exitCode, deleted.stderr.toString()).toBe(0);
    expect(existsSync(join(fixture.base, "runs", "run-001"))).toBe(false);
    expect(existsSync(join(fixture.state, "runs", "run-001"))).toBe(false);
    expect(existsSync(join(fixture.state, "current-run"))).toBe(false);
    expect(git(fixture.repo, "branch", "--list", "team/run-001/*")).toBe("");
  });

  test("delete-run refuses a run containing a dirty worktree", () => {
    const fixture = createCliFixture();
    const started = Bun.spawnSync({ cmd: ["bash", TEAM_UP], env: fixture.env });
    expect(started.exitCode).toBe(0);
    Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });
    writeFileSync(join(fixture.base, "runs", "run-001", "engineer-2", "dirty.txt"), "keep\n");

    const deleted = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--delete-run", "run-001"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(deleted.exitCode).toBe(1);
    expect(deleted.stderr.toString()).toContain("worktree is dirty");
    expect(git(join(fixture.base, "runs", "run-001", "leader"), "branch", "--show-current")).toBe(
      "team/run-001/leader",
    );
  });

  test("delete-run refuses clean work that is not reachable from another branch", () => {
    const fixture = createCliFixture();
    const started = Bun.spawnSync({ cmd: ["bash", TEAM_UP], env: fixture.env });
    expect(started.exitCode).toBe(0);
    Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });
    const engineer = join(fixture.base, "runs", "run-001", "engineer-2");
    writeFileSync(join(engineer, "result.txt"), "valuable\n");
    git(engineer, "add", "result.txt");
    git(engineer, "commit", "-qm", "valuable result");

    const deleted = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--delete-run", "run-001"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(deleted.exitCode).toBe(1);
    expect(deleted.stderr.toString()).toContain("unmerged work");
    expect(git(engineer, "log", "-1", "--format=%s")).toBe("valuable result");
  });

  test("delete-run does not treat another branch in the same run as a merged destination", () => {
    const fixture = createCliFixture();
    const started = Bun.spawnSync({ cmd: ["bash", TEAM_UP], env: fixture.env });
    expect(started.exitCode).toBe(0);
    Bun.spawnSync({ cmd: ["bash", TEAM_UP, "--kill"], env: fixture.env });
    const engineer1 = join(fixture.base, "runs", "run-001", "engineer-1");
    const engineer2 = join(fixture.base, "runs", "run-001", "engineer-2");
    writeFileSync(join(engineer1, "shared-result.txt"), "valuable\n");
    git(engineer1, "add", "shared-result.txt");
    git(engineer1, "commit", "-qm", "shared valuable result");
    git(engineer2, "merge", "-q", "--ff-only", "team/run-001/engineer-1");

    const deleted = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--delete-run", "run-001"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(deleted.exitCode).toBe(1);
    expect(deleted.stderr.toString()).toContain("unmerged work");
    expect(git(engineer1, "log", "-1", "--format=%s")).toBe("shared valuable result");
  });

  test("delete-run refuses the active run", () => {
    const fixture = createCliFixture();
    const started = Bun.spawnSync({ cmd: ["bash", TEAM_UP], env: fixture.env });
    expect(started.exitCode).toBe(0);

    const deleted = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--delete-run", "run-001"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(deleted.exitCode).toBe(1);
    expect(deleted.stderr.toString()).toContain("run is active");
    expect(git(join(fixture.base, "runs", "run-001", "leader"), "branch", "--show-current")).toBe(
      "team/run-001/leader",
    );
  });

  test("a named run can use an explicit base ref without including dirty caller changes", () => {
    const fixture = createCliFixture();
    const mainCommit = git(fixture.repo, "rev-parse", "main");
    git(fixture.repo, "switch", "-q", "-c", "feature");
    writeFileSync(join(fixture.repo, "feature.txt"), "committed feature\n");
    git(fixture.repo, "add", "feature.txt");
    git(fixture.repo, "commit", "-qm", "feature");
    writeFileSync(join(fixture.repo, "dirty.txt"), "caller-only\n");

    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--base", "main", "--name", "issue-123"],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(git(join(fixture.base, "runs", "run-001", "leader"), "rev-parse", "HEAD")).toBe(
      mainCommit,
    );
    expect(readFileSync(join(fixture.state, "runs", "run-001", "name"), "utf8").trim()).toBe(
      "issue-123",
    );
    expect(readFileSync(join(fixture.state, "runs", "run-001", "base-ref"), "utf8").trim()).toBe(
      "main",
    );
  });

  test("a configured run ID is validated before any path is created", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: { ...fixture.env, TEAM_RUN_ID: "../escape" },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("invalid run ID");
    expect(existsSync(join(fixture.base, "escape"))).toBe(false);
  });
});

describe("team-up run lifecycle: named instances", () => {
  function derivedEnv(fixture: ReturnType<typeof createCliFixture>) {
    // Drop TEAM_SESSION so --instance can derive amadeus-team-<name>.
    // AGMSG_TEAM is not set on the fixture env, so omission alone is enough.
    const { TEAM_SESSION: _ignored, ...env } = fixture.env;
    return env;
  }

  test("two named instances launch in parallel with isolated session and agmsg team", () => {
    const fixture = createCliFixture();
    const env = derivedEnv(fixture);

    const alpha = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--instance", "alpha", "-2"],
      env: { ...env, TEAM_RUN_ID: "run-alpha" },
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(alpha.exitCode, alpha.stderr.toString()).toBe(0);
    expect(alpha.stdout.toString()).toContain("instance=alpha");
    expect(alpha.stdout.toString()).toContain("agmsg=amadeus-alpha");
    expect(existsSync(join(fixture.herdrState, "sessions", "amadeus-team-alpha"))).toBe(true);
    expect(readFileSync(join(fixture.state, "instances", "alpha", "active-run"), "utf8").trim()).toBe(
      "run-alpha",
    );
    expect(existsSync(join(fixture.state, "active-run"))).toBe(false);

    const beta = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-i", "beta", "-2"],
      env: { ...env, TEAM_RUN_ID: "run-beta" },
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(beta.exitCode, beta.stderr.toString()).toBe(0);
    expect(existsSync(join(fixture.herdrState, "sessions", "amadeus-team-beta"))).toBe(true);
    expect(readFileSync(join(fixture.state, "instances", "beta", "active-run"), "utf8").trim()).toBe(
      "run-beta",
    );

    const joinLog = readFileSync(fixture.joinLog, "utf8");
    expect(joinLog).toContain("amadeus-alpha\tleader\t");
    expect(joinLog).toContain("amadeus-beta\tleader\t");

    const listed = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--list-instances"],
      env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(listed.exitCode, listed.stderr.toString()).toBe(0);
    expect(listed.stdout.toString()).toContain("alpha\tamadeus-team-alpha\trun-alpha\tup");
    expect(listed.stdout.toString()).toContain("beta\tamadeus-team-beta\trun-beta\tup");
  });

  test("killing one instance leaves the other running", () => {
    const fixture = createCliFixture();
    const env = derivedEnv(fixture);

    expect(
      Bun.spawnSync({
        cmd: ["bash", TEAM_UP, "--instance", "alpha", "-2"],
        env: { ...env, TEAM_RUN_ID: "run-alpha" },
        stderr: "pipe",
        stdout: "pipe",
      }).exitCode,
    ).toBe(0);
    expect(
      Bun.spawnSync({
        cmd: ["bash", TEAM_UP, "--instance", "beta", "-2"],
        env: { ...env, TEAM_RUN_ID: "run-beta" },
        stderr: "pipe",
        stdout: "pipe",
      }).exitCode,
    ).toBe(0);

    const killed = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--kill", "--instance", "alpha"],
      env,
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(killed.exitCode, killed.stderr.toString()).toBe(0);
    expect(existsSync(join(fixture.herdrState, "sessions", "amadeus-team-alpha"))).toBe(false);
    expect(existsSync(join(fixture.herdrState, "sessions", "amadeus-team-beta"))).toBe(true);
    expect(existsSync(join(fixture.state, "instances", "alpha", "active-run"))).toBe(false);
    expect(readFileSync(join(fixture.state, "instances", "beta", "active-run"), "utf8").trim()).toBe(
      "run-beta",
    );
  });

  test("default instance keeps legacy state layout at the state root", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "-2"],
      env: { ...fixture.env, TEAM_RUN_ID: "run-default" },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(readFileSync(join(fixture.state, "active-run"), "utf8").trim()).toBe("run-default");
    expect(existsSync(join(fixture.state, "runs", "run-default"))).toBe(true);
    expect(existsSync(join(fixture.state, "instances"))).toBe(false);
  });

  test("same named instance refuses a second fresh launch while session is up", () => {
    const fixture = createCliFixture();
    const env = derivedEnv(fixture);
    expect(
      Bun.spawnSync({
        cmd: ["bash", TEAM_UP, "--instance", "alpha", "-2"],
        env: { ...env, TEAM_RUN_ID: "run-alpha-1" },
        stderr: "pipe",
        stdout: "pipe",
      }).exitCode,
    ).toBe(0);

    const second = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--instance", "alpha", "-2"],
      env: { ...env, TEAM_RUN_ID: "run-alpha-2" },
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(second.exitCode).toBe(1);
    expect(second.stderr.toString()).toContain("already exists");
    expect(second.stderr.toString()).toContain("--instance alpha --kill");
    expect(existsSync(join(fixture.base, "runs", "run-alpha-2"))).toBe(false);
  });
});
