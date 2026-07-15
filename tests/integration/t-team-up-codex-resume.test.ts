import { afterEach, describe, expect, test } from "bun:test";
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

const ROOT = resolve(import.meta.dir, "../..");
const TEAM_UP = join(ROOT, "scripts/team-up.sh");
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function commandFor(member: string, resolverBody: string, env: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-team-up-"));
  tempDirs.push(dir);
  const resolver = join(dir, "role-resume.sh");
  writeFileSync(resolver, `#!/usr/bin/env bash\n${resolverBody}\n`);
  chmodSync(resolver, 0o755);

  return Bun.spawnSync({
    cmd: [
      "bash",
      "-c",
      'script="$1"; member="$2"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; CONTINUE=1; codex_member_cmd "$member"',
      "_",
      TEAM_UP,
      member,
    ],
    env: {
      ...process.env,
      ...env,
      ROLE_RESUME: resolver,
      CODEX_MONITOR: "/usr/bin/true",
      DELIVERY: join(dir, "missing-delivery.sh"),
    },
    stderr: "pipe",
    stdout: "pipe",
  });
}

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
  const tmuxState = join(root, "tmux-state");
  mkdirSync(repo, { recursive: true });
  mkdirSync(bin, { recursive: true });
  mkdirSync(tmuxState, { recursive: true });

  git(repo, "init", "-q", "-b", "main");
  git(repo, "config", "user.email", "team-up@example.com");
  git(repo, "config", "user.name", "Team Up Test");
  writeFileSync(join(repo, "README.md"), "fixture\n");
  git(repo, "add", "README.md");
  git(repo, "commit", "-qm", "fixture");

  const tmux = join(bin, "tmux");
  writeFileSync(
    tmux,
    `#!/usr/bin/env bash
set -eu
state="\${FAKE_TMUX_STATE:?}"
if [ "\${FAKE_TMUX_FAIL_COMMAND:-}" = "\${1:-}" ]; then
  exit 9
fi
case "\${1:-}" in
  has-session) test -f "$state/session" ;;
  new-session) touch "$state/session" ;;
  kill-session) rm -f "$state/session" ;;
  display-message|split-window) printf '%%1\\n' ;;
  select-pane|set-option) ;;
  *) exit 2 ;;
esac
`,
  );
  chmodSync(tmux, 0o755);

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
    TEAM_BASE: base,
    TEAM_STATE_DIR: state,
    TEAM_RUN_ID: "run-001",
    TEAM_SESSION: "amadeus-team-test",
    FAKE_JOIN_LOG: joinLog,
    FAKE_TMUX_STATE: tmuxState,
    AGMSG_JOIN: joinAgent,
    AGMSG_RESET: resetAgent,
    DELIVERY: join(root, "missing-delivery.sh"),
    CODEX_MONITOR: codexMonitor,
    ROLE_RESUME: roleResume,
    PATH: `${bin}:${process.env.PATH}`,
  };

  return { base, env, joinLog, repo, state, tmuxState };
}

describe("team-up run lifecycle", () => {
  test("help explains the fresh and resume lifecycle commands", () => {
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--help"],
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain("-c, --continue");
    expect(result.stdout.toString()).toContain("--list-runs");
    expect(result.stdout.toString()).toContain("--delete-run ID");
    expect(result.stdout.toString()).toContain("AGENT_IDENTITY");
  });

  test("a fresh launch creates one isolated worktree and branch per role from HEAD", () => {
    const fixture = createCliFixture();
    const baseCommit = git(fixture.repo, "rev-parse", "HEAD");
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
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
      ["leader", ...Array.from({ length: 6 }, (_, index) => `e${index + 1}`)].map(
        (role, index) => {
          const member = index === 0 ? "leader" : `engineer-${index}`;
          return `amadeus\t${role}\tcodex\t${join(fixture.base, "runs", "run-001", member)}\t0`;
        },
      ),
    );
  });

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
      "amadeus\te3\tclaude-code",
      "amadeus\te4\tclaude-code",
      "amadeus\te5\tclaude-code",
      "amadeus\te6\tclaude-code",
    ]);
  });

  test("an agmsg registration failure prevents pane launch", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP, "--codex"],
      env: { ...fixture.env, FAKE_JOIN_FAIL_ROLE: "e3" },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("agmsg registration failed");
    expect(existsSync(join(fixture.tmuxState, "session"))).toBe(false);
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
    expect(readFileSync(fixture.joinLog, "utf8").trim().split("\n")).toHaveLength(14);
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
    git(fixture.repo, "branch", "team/run-001/engineer-3", "HEAD");

    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: fixture.env,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).not.toBe(0);
    expect(git(fixture.repo, "branch", "--list", "team/run-001/*")).toBe(
      "team/run-001/engineer-3",
    );
    expect(git(fixture.repo, "worktree", "list", "--porcelain")).not.toContain(
      join(fixture.base, "runs", "run-001"),
    );
  });

  test("a layout failure after agent launch preserves the failed run", () => {
    const fixture = createCliFixture();
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_UP],
      env: { ...fixture.env, FAKE_TMUX_FAIL_COMMAND: "split-window" },
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
    writeFileSync(join(fixture.base, "runs", "run-001", "engineer-4", "dirty.txt"), "keep\n");

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

describe("team-up Codex resume", () => {
  test("marks Codex member sessions as team mode", () => {
    const result = commandFor("engineer-1", "exit 0", {
      AGENT_IDENTITY: "personal",
      CLAUDE_IDENTITY: "ignored-claude",
      CODEX_IDENTITY: "ignored-codex",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("AMADEUS_OPERATING_MODE=team");
    expect(result.stdout.toString()).toContain("CODEX_IDENTITY=personal");
    expect(result.stdout.toString()).toContain(`CODEX_HOME=${process.env.HOME}/.codex-personal`);
    expect(result.stdout.toString()).not.toContain("ignored-codex");
    expect(result.stdout.toString()).not.toContain("CLAUDE_IDENTITY=");
    expect(result.stdout.toString()).toContain("AGMSG_CODEX_ROLE=e1");
    expect(result.stdout.toString()).toContain("actas\\ e1");
  });

  test("resumes the role's recorded UUID instead of global --last", () => {
    const result = commandFor("engineer-1", 'printf "thread-engineer-1"');
    const command = result.stdout.toString();
    expect(result.exitCode).toBe(0);
    expect(command).toContain("--codex-command resume -- thread-engineer-1");
    expect(command).not.toContain("--last");
  });

  test("starts fresh when the role has no unique resumable UUID", () => {
    const result = commandFor("engineer-2", "exit 0");
    const command = result.stdout.toString();
    expect(result.exitCode).toBe(0);
    expect(command).toContain("--codex-command codex");
    expect(command).not.toContain("--codex-command resume");
    expect(result.stderr.toString()).toContain("starting fresh");
  });

  test("starts fresh when the role resume resolver fails", () => {
    const result = commandFor("engineer-3", "exit 1");
    const command = result.stdout.toString();
    expect(result.exitCode).toBe(0);
    expect(command).toContain("--codex-command codex");
    expect(command).not.toContain("--codex-command resume");
    expect(result.stderr.toString()).toContain("role resume resolver failed");
  });
});

describe("team-up shared operating mode", () => {
  test("marks Claude member sessions as team mode", () => {
    const result = Bun.spawnSync({
      cmd: [
        "bash",
        "-c",
        'script="$1"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; CONTINUE=0; claude_member_cmd engineer-1',
        "_",
        TEAM_UP,
      ],
      env: {
        ...process.env,
        AGENT_IDENTITY: "personal",
        CLAUDE_IDENTITY: "ignored-claude",
        CODEX_IDENTITY: "ignored-codex",
        DELIVERY: "/path/that/does/not/exist",
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("AMADEUS_OPERATING_MODE=team");
    expect(result.stdout.toString()).toContain("CLAUDE_IDENTITY=personal");
    expect(result.stdout.toString()).not.toContain("ignored-claude");
    expect(result.stdout.toString()).not.toContain("CODEX_IDENTITY=");
  });
});
