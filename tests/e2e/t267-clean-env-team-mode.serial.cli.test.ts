// t267 — FR-6 clean-environment journey through the generated Claude
// distribution. The test never executes the canonical package sources.
// size: large
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const DISTRIBUTION = join(ROOT, "dist/claude/.claude");

function requiredCommand(name: string): string {
  const path = Bun.which(name);
  if (path === null) throw new Error(`required test command not found: ${name}`);
  return path;
}

const SYSTEM_BASH = requiredCommand("bash");
const SYSTEM_GIT = requiredCommand("git");
const SYSTEM_BUN = process.execPath;

type CommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

type CleanEnv = {
  root: string;
  home: string;
  bin: string;
  workspace: string;
  repo: string;
  harness: string;
  tools: string;
  agmsgRoot: string;
  logs: string;
  state: string;
  base: string;
  env: Record<string, string>;
};

let clean: CleanEnv;

function executable(path: string, body: string): string {
  writeFileSync(path, `#!${SYSTEM_BASH}\nset -eu\n${body}`);
  chmodSync(path, 0o755);
  return path;
}

function linkCommand(bin: string, name: string, target?: string): void {
  const resolved = target ?? Bun.which(name);
  if (resolved === null) throw new Error(`required test command not found: ${name}`);
  symlinkSync(resolved, join(bin, name));
}

function initializeRepo(repo: string): void {
  mkdirSync(repo, { recursive: true });
  for (const args of [
    ["init", "-q", "-b", "main"],
    ["config", "user.email", "clean-env@example.com"],
    ["config", "user.name", "Clean Env Test"],
  ]) {
    const result = Bun.spawnSync([SYSTEM_GIT, ...args], { cwd: repo });
    if (result.exitCode !== 0) throw new Error(`git ${args[0]} failed`);
  }
  writeFileSync(join(repo, "README.md"), "clean environment fixture\n");
  for (const args of [
    ["add", "README.md"],
    ["commit", "-qm", "fixture"],
  ]) {
    const result = Bun.spawnSync([SYSTEM_GIT, ...args], { cwd: repo });
    if (result.exitCode !== 0) throw new Error(`git ${args[0]} failed`);
  }
}

function installIsolatedCommands(env: CleanEnv): void {
  const commands = [
    "awk",
    "basename",
    "cat",
    "cut",
    "date",
    "dirname",
    "env",
    "find",
    "grep",
    "head",
    "mkdir",
    "mktemp",
    "nohup",
    "pwd",
    "readlink",
    "rm",
    "sed",
    "seq",
    "sleep",
    "sort",
    "tail",
    "tr",
    "wc",
  ];
  for (const command of commands) linkCommand(env.bin, command);
  linkCommand(env.bin, "bash", SYSTEM_BASH);
  linkCommand(env.bin, "git", SYSTEM_GIT);
  executable(join(env.bin, "mise"), "exit 0\n");
  executable(join(env.bin, "open"), "exit 0\n");
}

function installFakeUname(env: CleanEnv, osName = "Darwin"): void {
  executable(join(env.bin, "uname"), `printf '%s\\n' '${osName}'\n`);
}

function installFakeHerdr(env: CleanEnv): void {
  executable(
    join(env.bin, "herdr"),
    `
printf '%s\n' "$*" >>"\${FAKE_HERDR_LOG:?}"
session=
if [ "\${1:-}" = "--session" ]; then session="\${2:-}"; shift 2; fi
verb="\${1:-} \${2:-}"
case "$verb" in
  "workspace list") test -f "\${FAKE_HERDR_STATE:?}/session" ;;
  "workspace create") printf '{"pane_id":"%%1"}\n' ;;
  "pane split") printf '{"pane_id":"%%2"}\n' ;;
  "pane run")
    member=$(printf '%s' "\${4:-}" | grep -oE '(leader|engineer-[0-9]+)' | head -1 || true)
    case "$member" in
      leader) : >"\${FAKE_READY_DIR:?}/ready.leader" ;;
      engineer-*) : >"\${FAKE_READY_DIR:?}/ready.e\${member#engineer-}" ;;
    esac
    ;;
  "pane rename"|"agent rename") ;;
  "session stop") rm -f "\${FAKE_HERDR_STATE:?}/session" ;;
  "session delete") : >"\${FAKE_HERDR_STATE:?}/session" ;;
  "session list") test ! -f "\${FAKE_HERDR_STATE:?}/session" || cat "\${FAKE_HERDR_STATE:?}/session" ;;
  *)
    case "\${1:-}" in
      server) printf '%s\n' "$session" >"\${FAKE_HERDR_STATE:?}/session" ;;
      *) exit 2 ;;
    esac
    ;;
esac
`,
  );
}

function installFakeAgmsg(env: CleanEnv): void {
  const scripts = join(env.agmsgRoot, "scripts");
  const driver = join(scripts, "drivers/types/codex");
  const lib = join(scripts, "lib");
  mkdirSync(driver, { recursive: true });
  mkdirSync(lib, { recursive: true });
  executable(
    join(scripts, "join.sh"),
    `printf 'join\\t%s\\t%s\\t%s\\t%s\\n' "$1" "$2" "$3" "$4" >>"\${FAKE_AGMSG_LOG:?}"\n`,
  );
  executable(join(scripts, "reset.sh"), "exit 0\n");
  executable(
    join(scripts, "delivery.sh"),
    `printf 'delivery\\t%s\\n' "$*" >>"\${FAKE_AGMSG_LOG:?}"\n`,
  );
  executable(
    join(scripts, "send.sh"),
    `printf 'send\\t%s\\t%s\\t%s\\t%s\\n' "$1" "$2" "$3" "$4" >>"\${FAKE_AGMSG_LOG:?}"\n`,
  );
  executable(
    join(scripts, "history.sh"),
    `printf 'history\\t%s\\t%s\\n' "$1" "$2" >>"\${FAKE_AGMSG_LOG:?}"\n`,
  );
  executable(join(scripts, "role-resume.sh"), "exit 0\n");
  executable(join(driver, "codex-monitor.sh"), "exit 0\n");
  writeFileSync(
    join(lib, "actas-lock.sh"),
    `agmsg_ready_path() { printf '%s/ready.%s' "\${FAKE_READY_DIR:?}" "$2"; }\n`,
  );
}

function createCleanEnv(): CleanEnv {
  const root = mkdtempSync(join(tmpdir(), "amadeus-clean-env-"));
  const env: CleanEnv = {
    root,
    home: join(root, "home"),
    bin: join(root, "bin"),
    workspace: join(root, "workspace"),
    repo: join(root, "repo"),
    harness: join(root, "workspace/.claude"),
    tools: join(root, "workspace/.claude/tools"),
    agmsgRoot: join(root, "agmsg"),
    logs: join(root, "logs"),
    state: join(root, "state"),
    base: join(root, "worktrees"),
    env: {},
  };
  for (const dir of [
    env.home,
    env.bin,
    env.workspace,
    env.logs,
    env.state,
    env.base,
    join(env.logs, "herdr-state"),
    join(env.logs, "ready"),
  ]) {
    mkdirSync(dir, { recursive: true });
  }
  cpSync(DISTRIBUTION, env.harness, { recursive: true });
  initializeRepo(env.repo);
  installIsolatedCommands(env);
  installFakeUname(env);
  installFakeHerdr(env);
  installFakeAgmsg(env);
  env.env = {
    HOME: env.home,
    PATH: env.bin,
    SHELL: SYSTEM_BASH,
    HERDR: join(env.bin, "herdr"),
    AGMSG_ROOT: env.agmsgRoot,
    AGMSG_JOIN: join(env.agmsgRoot, "scripts/join.sh"),
    AGMSG_RESET: join(env.agmsgRoot, "scripts/reset.sh"),
    AGMSG_SEND: join(env.agmsgRoot, "scripts/send.sh"),
    DELIVERY: join(env.agmsgRoot, "scripts/delivery.sh"),
    ROLE_RESUME: join(env.agmsgRoot, "scripts/role-resume.sh"),
    CODEX_MONITOR: join(env.agmsgRoot, "scripts/drivers/types/codex/codex-monitor.sh"),
    AGMSG_ACTAS_LOCK_LIB: join(env.agmsgRoot, "scripts/lib/actas-lock.sh"),
    TEAM_REPO: env.repo,
    TEAM_BASE: env.base,
    TEAM_STATE_DIR: env.state,
    TEAM_RUN_ID: "run-clean",
    TEAM_SESSION: "amadeus-clean",
    TEAM_ENGINEERS: "2",
    TEAM_RUNTIME: "claude",
    TEAM_MSG: "agmsg",
    WATCHER_READY_TIMEOUT: "1",
    FAKE_HERDR_LOG: join(env.logs, "herdr.log"),
    FAKE_HERDR_STATE: join(env.logs, "herdr-state"),
    FAKE_AGMSG_LOG: join(env.logs, "agmsg.log"),
    FAKE_READY_DIR: join(env.logs, "ready"),
  };
  return env;
}

function run(command: string[], cwd = clean.workspace, env = clean.env): CommandResult {
  const result = Bun.spawnSync(command, {
    cwd,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    code: result.exitCode ?? 1,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function tool(name: string): string {
  const path = join(clean.tools, name);
  expect(relative(clean.harness, path).startsWith("..")).toBe(false);
  expect(path.startsWith(join(ROOT, "packages/framework"))).toBe(false);
  return path;
}

function expectNoLaunchSideEffects(): void {
  expect(existsSync(join(clean.state, "runs/run-clean"))).toBe(false);
  expect(existsSync(join(clean.state, "current-run"))).toBe(false);
  expect(readdirSync(clean.base)).toHaveLength(0);
}

function electionCli(args: string[]): CommandResult {
  return run([SYSTEM_BUN, tool("amadeus-election.ts"), ...args, "--project", clean.workspace]);
}

beforeEach(() => {
  clean = createCleanEnv();
  expect(clean.home).not.toBe(homedir());
  expect(relative(clean.root, clean.home).startsWith("..")).toBe(false);
  expect(relative(clean.root, clean.workspace).startsWith("..")).toBe(false);
  expect(relative(ROOT, clean.workspace).startsWith("..")).toBe(true);
});

afterEach(() => {
  rmSync(clean.root, { recursive: true, force: true });
});

describe("t267 clean-environment distributed Team Mode journey", () => {
  test("launches, messages, and completes open-vote-tally from the distribution", () => {
    const launched = run([SYSTEM_BASH, tool("team-up.sh")]);
    const launchTrace = existsSync(clean.env.FAKE_HERDR_LOG)
      ? readFileSync(clean.env.FAKE_HERDR_LOG, "utf8")
      : "<no herdr log>";
    expect(launched.code, `${launched.stderr}\n${launchTrace}`).toBe(0);
    const herdrLog = readFileSync(clean.env.FAKE_HERDR_LOG, "utf8");
    expect(herdrLog).toContain("workspace create");
    expect(herdrLog).toContain("pane run");
    expect(herdrLog).toContain("agent rename");

    const messaged = run([
      SYSTEM_BASH,
      tool("team-msg.sh"),
      "send",
      "e1",
      "clean environment hello",
    ], clean.workspace, { ...clean.env, TEAM_MSG_FROM: "leader" });
    expect(messaged.code, messaged.stderr).toBe(0);
    expect(readFileSync(clean.env.FAKE_AGMSG_LOG, "utf8")).toContain(
      "send\tamadeus\tleader\te1\tclean environment hello",
    );

    const definition = join(clean.root, "definition.json");
    const ballot = join(clean.root, "ballot.json");
    writeFileSync(
      definition,
      JSON.stringify({
        electionId: "E-CLEAN-1",
        kind: "zero-confirm",
        question: "Ship the distributed journey?",
        choices: [{ internalNo: 1, label: "ship" }],
        voters: ["e1"],
      }),
    );
    writeFileSync(
      ballot,
      JSON.stringify({
        electionId: "E-CLEAN-1",
        voter: "e1",
        voterKind: "member",
        choiceInternalNo: 1,
        goa: 1,
        submittedAt: "2026-07-23T00:00:00Z",
      }),
    );
    expect(electionCli(["open", "--file", definition]).code).toBe(0);
    expect(electionCli(["vote", "--election", "E-CLEAN-1", "--file", ballot]).code).toBe(0);
    const tallied = electionCli(["tally", "--election", "E-CLEAN-1"]);
    expect(tallied.code, tallied.stderr).toBe(0);
    expect(tallied.stdout).toContain('"kind":"established"');

    const registry = JSON.parse(
      readFileSync(
        join(clean.workspace, "amadeus/spaces/default/elections/elections.json"),
        "utf8",
      ),
    ) as Array<{ electionId: string; dirName: string }>;
    const row = registry.find(({ electionId }) => electionId === "E-CLEAN-1");
    expect(row).toBeDefined();
    const electionDir = join(
      clean.workspace,
      "amadeus/spaces/default/elections",
      row!.dirName,
    );
    expect(existsSync(join(electionDir, "tally.json"))).toBe(true);
    expect(readFileSync(join(electionDir, "timeline.json"), "utf8")).toContain("tallied");
  });

  test("fails loudly before side effects when herdr is absent", () => {
    rmSync(join(clean.bin, "herdr"));
    const result = run([SYSTEM_BASH, tool("team-up.sh")], clean.workspace, {
      ...clean.env,
      HERDR: "herdr",
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("herdr is required");
    expect(result.stderr).toContain("https://herdr.dev");
    expect(result.stderr).toContain("docs/guide/20-team-mode.md");
    expect(existsSync(clean.env.FAKE_HERDR_LOG)).toBe(false);
    expect(existsSync(clean.env.FAKE_AGMSG_LOG)).toBe(false);
    expectNoLaunchSideEffects();
  });

  test("fails loudly before side effects when agmsg is absent", () => {
    const missing = join(clean.root, "missing-agmsg");
    const result = run([SYSTEM_BASH, tool("team-up.sh")], clean.workspace, {
      ...clean.env,
      AGMSG_ROOT: missing,
      AGMSG_JOIN: join(missing, "scripts/join.sh"),
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("agmsg is required");
    expect(result.stderr).toContain("https://github.com/j5ik2o/agmsg");
    expect(result.stderr).toContain("docs/guide/20-team-mode.md");
    expect(existsSync(clean.env.FAKE_HERDR_LOG)).toBe(false);
    expect(existsSync(clean.env.FAKE_AGMSG_LOG)).toBe(false);
    expectNoLaunchSideEffects();
  });

  test("rejects an unsupported OS before probing either prerequisite", () => {
    installFakeUname(clean, "Plan9");
    const result = run([SYSTEM_BASH, tool("team-up.sh")]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("unsupported on Plan9");
    expect(result.stderr).toContain("docs/guide/20-team-mode.md");
    expect(result.stderr).not.toContain("herdr is required");
    expect(result.stderr).not.toContain("agmsg is required");
    expect(existsSync(clean.env.FAKE_HERDR_LOG)).toBe(false);
    expect(existsSync(clean.env.FAKE_AGMSG_LOG)).toBe(false);
    expectNoLaunchSideEffects();
  });

  test("renders doctor prerequisite found and missing states as advisory", async () => {
    const utilityPath = tool("amadeus-utility.ts");
    const utility = await import(`${utilityPath}?clean-env=${Date.now()}`);
    const context = utility.resolveDoctorContext(clean.workspace);
    const baseline = utility.handleDoctor(context);
    const found = utility.handleDoctor({
      ...context,
      teamPrerequisites: [
        { tool: "herdr", found: true, path: clean.env.HERDR },
        { tool: "agmsg", found: true, path: clean.env.AGMSG_SEND },
      ],
    });
    const missing = utility.handleDoctor({
      ...context,
      teamPrerequisites: utility.detectTeamPrerequisites(
        { HOME: clean.home, PATH: clean.bin },
        () => null,
      ),
    });
    const summary = baseline.output.match(/\d+ passed, \d+ failed/)?.[0];
    expect(found.exitCode).toBe(baseline.exitCode);
    expect(missing.exitCode).toBe(baseline.exitCode);
    expect(found.output).toContain(`herdr: ${clean.env.HERDR}`);
    expect(found.output).toContain(`agmsg: ${clean.env.AGMSG_SEND}`);
    expect(missing.output).toContain("herdr: not found");
    expect(missing.output).toContain("agmsg: not found");
    expect(missing.output).toContain("https://herdr.dev");
    expect(missing.output).toContain("https://github.com/j5ik2o/agmsg");
    expect(found.output.match(/\d+ passed, \d+ failed/)?.[0]).toBe(summary);
    expect(missing.output.match(/\d+ passed, \d+ failed/)?.[0]).toBe(summary);
  });
});
