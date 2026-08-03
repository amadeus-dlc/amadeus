// size: medium
import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import {
  chmodSync,
  copyFileSync,
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
const CODEX_HOOKS_TOOLS = join(ROOT, "packages/framework/harness/codex/tools");
const CODEX_HOOKS_HELPER_FILES = [
  "amadeus-codex-hooks.ts",
  "amadeus-codex-hooks-contract.ts",
  "amadeus-codex-hooks-migration.ts",
];
const tempDirs: string[] = [];

setDefaultTimeout(15_000);

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Exercise the member-launcher interface without creating a Git worktree or a
// Herdr session. HOME is isolated because Codex launch seeds project and hook
// trust into the selected identity config.
function commandFor(
  member: string,
  resolverBody: string,
  env: Record<string, string> = {},
  homeOverride?: string,
  opts: {
    continueMode?: "0" | "1";
    msgBackend?: "agmsg" | "herdr";
    roleResumeOverride?: string;
  } = {},
) {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-team-up-"));
  tempDirs.push(dir);
  const home = homeOverride ?? mkdtempSync(join(tmpdir(), "amadeus-codex-home-"));
  if (!homeOverride) tempDirs.push(home);
  const identity = env.AGENT_IDENTITY ?? "corporate-1";
  const worktree = join(home, ".team-up-test-worktrees", member);
  mkdirSync(join(worktree, ".codex", "tools"), { recursive: true });
  copyFileSync(
    join(ROOT, ".codex", "hooks.json.example"),
    join(worktree, ".codex", "hooks.json.example"),
  );
  for (const file of CODEX_HOOKS_HELPER_FILES) {
    copyFileSync(join(CODEX_HOOKS_TOOLS, file), join(worktree, ".codex", "tools", file));
  }
  const resolver = join(dir, "role-resume.sh");
  writeFileSync(resolver, `#!/usr/bin/env bash\n${resolverBody}\n`);
  chmodSync(resolver, 0o755);
  const continueMode = opts.continueMode ?? "1";
  const roleResume = opts.roleResumeOverride ?? resolver;

  const result = Bun.spawnSync({
    cmd: [
      "bash",
      "-c",
      `script="$1"; member="$2"; wt="$3"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; CONTINUE=${continueMode}; MSG_BACKEND=${opts.msgBackend ?? "agmsg"}; codex_member_cmd "$member" "$wt"`,
      "_",
      TEAM_UP,
      member,
      worktree,
    ],
    env: {
      ...process.env,
      ...env,
      HOME: home,
      TEAM_REPO: ROOT,
      ROLE_RESUME: roleResume,
      CODEX_MONITOR: "/usr/bin/true",
      DELIVERY: env.DELIVERY ?? join(dir, "missing-delivery.sh"),
    },
    stderr: "pipe",
    stdout: "pipe",
  });
  return { result, home, config: join(home, `.codex-${identity}`, "config.toml") };
}

describe("team-up member launcher", () => {
  test("applies the Codex interaction policy only to engineers", () => {
    for (const msgBackend of ["agmsg", "herdr"] as const) {
      for (const continueMode of ["0", "1"] as const) {
        const engineer = commandFor("engineer-1", 'printf "thread-engineer-1"', {}, undefined, {
          continueMode,
          msgBackend,
        });
        expect(engineer.result.exitCode, engineer.result.stderr.toString()).toBe(0);
        expect(engineer.result.stdout.toString()).toContain(
          "--disable default_mode_request_user_input",
        );
        if (msgBackend === "agmsg" && continueMode === "1") {
          const command = engineer.result.stdout.toString();
          expect(command.indexOf("--disable default_mode_request_user_input")).toBeLessThan(
            command.indexOf("thread-engineer-1"),
          );
        }

        const leader = commandFor("leader", 'printf "thread-leader"', {}, undefined, {
          continueMode,
          msgBackend,
        });
        expect(leader.result.exitCode, leader.result.stderr.toString()).toBe(0);
        expect(leader.result.stdout.toString()).not.toContain(
          "default_mode_request_user_input",
        );
      }
    }
  });

  test("activates Codex hooks before the delivery writer runs", () => {
    const fixture = mkdtempSync(join(tmpdir(), "amadeus-team-up-delivery-"));
    tempDirs.push(fixture);
    const delivery = join(fixture, "delivery.sh");
    const deliveryLog = join(fixture, "delivery.log");
    writeFileSync(
      delivery,
      `#!/usr/bin/env bash
set -eu
wt="$4"
test -f "$wt/.codex/hooks.json" || { echo "active hooks missing before delivery" >&2; exit 43; }
printf "delivery-after-active\\n" >"\${DELIVERY_ORDER_LOG:?}"
`,
    );
    chmodSync(delivery, 0o755);

    const { result } = commandFor(
      "engineer-1",
      "exit 0",
      { DELIVERY: delivery, DELIVERY_ORDER_LOG: deliveryLog },
      undefined,
      { continueMode: "0" },
    );

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(readFileSync(deliveryLog, "utf8")).toBe("delivery-after-active\n");
  });

  test("marks Codex member sessions as team mode", () => {
    const { result, home } = commandFor("engineer-1", "exit 0", {
      AGENT_IDENTITY: "personal",
      CLAUDE_IDENTITY: "ignored-claude",
      CODEX_IDENTITY: "ignored-codex",
    });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain("AMADEUS_OPERATING_MODE=team");
    expect(result.stdout.toString()).toContain("CODEX_IDENTITY=personal");
    expect(result.stdout.toString()).toContain(`CODEX_HOME=${home}/.codex-personal`);
    expect(result.stdout.toString()).not.toContain("ignored-codex");
    expect(result.stdout.toString()).not.toContain("CLAUDE_IDENTITY=");
    expect(result.stdout.toString()).toContain("AGMSG_CODEX_ROLE=e1");
    expect(result.stdout.toString()).toContain("actas\\ e1");
  });

  test("resumes the role's recorded UUID instead of global --last", () => {
    const { result } = commandFor("engineer-1", 'printf "thread-engineer-1"');
    const command = result.stdout.toString();
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(command).toContain(
      "--codex-command resume -- --disable default_mode_request_user_input thread-engineer-1",
    );
    expect(command).not.toContain("--last");
  });

  test("starts fresh when the role has no unique resumable UUID", () => {
    const { result } = commandFor("engineer-2", "exit 0");
    const command = result.stdout.toString();
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(command).toContain("--codex-command codex");
    expect(command).not.toContain("--codex-command resume");
    expect(result.stderr.toString()).toContain("starting fresh");
  });

  test("starts fresh when the role resume resolver fails", () => {
    const { result } = commandFor("engineer-3", "exit 1");
    const command = result.stdout.toString();
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(command).toContain("--codex-command codex");
    expect(command).not.toContain("--codex-command resume");
    expect(result.stderr.toString()).toContain("role resume resolver failed");
  });

  test("launches fresh without a role resume resolver", () => {
    const { result } = commandFor("engineer-1", "exit 0", {}, undefined, {
      continueMode: "0",
      roleResumeOverride: join(tmpdir(), "amadeus-no-such-role-resume.sh"),
    });
    const command = result.stdout.toString();
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(command).toContain("--codex-command codex");
    expect(command).not.toContain("--codex-command resume");
    expect(result.stderr.toString()).not.toContain("missing role resume resolver");
  });

  test("refuses resume without a role resume resolver", () => {
    const missing = join(tmpdir(), "amadeus-no-such-role-resume.sh");
    const { result } = commandFor("engineer-1", "exit 0", {}, undefined, {
      continueMode: "1",
      roleResumeOverride: missing,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain(`missing role resume resolver: ${missing}`);
  });

  test("seeds project and hook trust into the identity config", () => {
    const { result, config } = commandFor("engineer-1", "exit 0", {
      AGENT_IDENTITY: "seedy",
    });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(existsSync(config)).toBe(true);

    const toml = readFileSync(config, "utf8");
    expect(toml).toMatch(/\[projects\."[^"]*engineer-1"\]/);
    expect(toml).toContain('trust_level = "trusted"');
    expect(toml).toContain("[hooks.state.");
    expect(toml).toContain("engineer-1/.codex/hooks.json:session_start:0:0");
    expect(toml).toContain("trusted_hash = ");
  });

  test("seeds trust idempotently", () => {
    const home = mkdtempSync(join(tmpdir(), "amadeus-codex-home-"));
    tempDirs.push(home);

    const first = commandFor("engineer-1", "exit 0", { AGENT_IDENTITY: "seedy" }, home);
    expect(first.result.exitCode, first.result.stderr.toString()).toBe(0);
    const afterFirst = readFileSync(first.config, "utf8");

    const second = commandFor("engineer-1", "exit 0", { AGENT_IDENTITY: "seedy" }, home);
    expect(second.result.exitCode, second.result.stderr.toString()).toBe(0);
    const afterSecond = readFileSync(second.config, "utf8");

    expect(afterSecond).toBe(afterFirst);
    expect((afterSecond.match(/\[projects\./g) ?? []).length).toBe(1);
    expect((afterSecond.match(/\[hooks\.state\."[^"]*session_start:0:0"\]/g) ?? []).length).toBe(1);
  });

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

  test("lists the leader plus the requested engineer count", () => {
    const result = Bun.spawnSync({
      cmd: [
        "bash",
        "-c",
        'script="$1"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; members_for 4',
        "_",
        TEAM_UP,
      ],
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe(
      "leader engineer-1 engineer-2 engineer-3 engineer-4",
    );
  });
});
