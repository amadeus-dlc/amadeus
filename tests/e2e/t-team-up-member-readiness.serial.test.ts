// size: large
// Issue #1663 full CLI boundary proof. External terminals are deterministic
// fakes; worktree registration, checkout, run records, and readiness evidence
// use the real launcher, real Git, and real filesystem.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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
const TEAM_UP = join(ROOT, "packages/framework/core/tools/team-up.sh");
const BASH = Bun.which("bash") as string;
const GIT = Bun.which("git") as string;
const MV = Bun.which("mv") as string;

type Fixture = {
  root: string;
  repo: string;
  base: string;
  state: string;
  bin: string;
  herdrState: string;
  env: Record<string, string>;
};

let fixture: Fixture;

function executable(path: string, body: string): void {
  writeFileSync(path, `#!${BASH}\nset -eu\n${body}`);
  chmodSync(path, 0o755);
}

function git(args: string[], cwd: string): void {
  const result = Bun.spawnSync([GIT, ...args], { cwd, stderr: "pipe", stdout: "pipe" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
}

function installFakeHerdr(target: Fixture): string {
  const path = join(target.bin, "herdr");
  executable(
    path,
    `
session=
if [ "\${1:-}" = "--session" ]; then session="\${2:-}"; shift 2; fi
case "\${1:-} \${2:-}" in
  "workspace list") test -f "\${FAKE_HERDR_STATE:?}/session" ;;
  "workspace create") printf '{"pane_id":"%%1"}\\n' ;;
  "pane split") printf '{"pane_id":"%%2"}\\n' ;;
  "pane run"|"pane rename"|"agent rename") ;;
  "session delete") rm -f "\${FAKE_HERDR_STATE:?}/session" ;;
  *)
    if [ "\${1:-}" = "server" ]; then
      printf '%s\\n' "$session" >"\${FAKE_HERDR_STATE:?}/session"
    else
      exit 2
    fi
    ;;
esac
`,
  );
  return path;
}

function createFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "team-up-member-readiness-e2e-"));
  const result: Fixture = {
    root,
    repo: join(root, "repo"),
    base: join(root, "worktrees"),
    state: join(root, "state"),
    bin: join(root, "bin"),
    herdrState: join(root, "herdr-state"),
    env: {},
  };
  for (const path of [result.repo, result.base, result.state, result.bin, result.herdrState]) {
    mkdirSync(path, { recursive: true });
  }
  git(["init", "-q", "-b", "main"], result.repo);
  git(["config", "user.email", "issue-1663@example.invalid"], result.repo);
  git(["config", "user.name", "Issue 1663"], result.repo);
  writeFileSync(join(result.repo, "README.md"), "Issue #1663 E2E\n");
  git(["add", "README.md"], result.repo);
  git(["commit", "-qm", "fixture"], result.repo);

  const fakeHerdr = installFakeHerdr(result);
  const fakeAgmsgJoin = join(result.bin, "agmsg-join");
  executable(fakeAgmsgJoin, "exit 0\n");
  executable(join(result.bin, "open"), "exit 0\n");
  result.env = {
    ...Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
    ),
    PATH: `${result.bin}:${process.env.PATH}`,
    TEAM_REPO: result.repo,
    TEAM_BASE: result.base,
    TEAM_STATE_DIR: result.state,
    TEAM_RUN_ID: "run-1663",
    TEAM_SESSION: "amadeus-1663-e2e",
    TEAM_ENGINEERS: "2",
    TEAM_RUNTIME: "claude",
    TEAM_MSG: "herdr",
    HERDR: fakeHerdr,
    AGMSG_JOIN: fakeAgmsgJoin,
    FAKE_HERDR_STATE: result.herdrState,
  };
  return result;
}

function runCli(): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync([BASH, TEAM_UP, "--claude", "-2"], {
    cwd: fixture.repo,
    env: fixture.env,
    stderr: "pipe",
    stdout: "pipe",
  });
  return {
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function evidencePath(member: string, stage: string): string {
  return join(
    fixture.state,
    "runs/run-1663/members",
    member,
    stage,
  );
}

beforeEach(() => {
  fixture = createFixture();
});

afterEach(() => {
  rmSync(fixture.root, { recursive: true, force: true });
});

describe("team-up member readiness CLI journey (Issue #1663)", () => {
  test("publishes exact evidence for every member before the CLI reports success", () => {
    const result = runCli();
    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toContain("session 'amadeus-1663-e2e' launched");

    for (const member of ["leader", "engineer-1", "engineer-2"]) {
      for (const stage of ["registered", "checked-out", "ready"]) {
        expect(JSON.parse(readFileSync(evidencePath(member, stage), "utf8"))).toEqual({
          schemaVersion: 1,
          run: "run-1663",
          member,
          stage,
        });
      }
    }
  });

  test("fails closed when a final marker is tampered before aggregation", () => {
    executable(
      join(fixture.bin, "mv"),
      `
source_path="\${@: -2:1}"
target_path="\${@: -1}"
case "$target_path" in
  */engineer-2/ready)
    printf '%s\\n' '{"schemaVersion":1,"run":"old-run","member":"engineer-2","stage":"ready"}' >"$target_path"
    rm -f -- "$source_path"
    exit 0
    ;;
esac
exec ${MV} "$@"
`,
    );

    const result = runCli();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("engineer-2(record)");
    expect(existsSync(join(fixture.state, "runs/run-1663"))).toBe(false);
    expect(existsSync(join(fixture.base, "runs/run-1663"))).toBe(false);
  });

  test("refuses a crash-stale record without consuming its valid-looking marker", () => {
    const stale = evidencePath("leader", "ready");
    mkdirSync(resolve(stale, ".."), { recursive: true });
    const stalePayload =
      '{"schemaVersion":1,"run":"run-1663","member":"leader","stage":"ready"}\n';
    writeFileSync(stale, stalePayload);

    const result = runCli();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(
      "run metadata already exists; refusing stale member readiness evidence",
    );
    expect(readFileSync(stale, "utf8")).toBe(stalePayload);
  });
});
