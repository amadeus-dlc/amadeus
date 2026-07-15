import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const TEAM_UP = join(ROOT, "scripts/team-up.sh");
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function commandFor(member: string, resolverBody: string) {
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
      ROLE_RESUME: resolver,
      CODEX_MONITOR: "/usr/bin/true",
      DELIVERY: join(dir, "missing-delivery.sh"),
    },
    stderr: "pipe",
    stdout: "pipe",
  });
}

function freshMemberCommand(runtime: "claude" | "codex", member: string, continueMode: boolean) {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-team-up-mailbox-"));
  tempDirs.push(dir);
  const inbox = join(dir, "inbox.sh");
  writeFileSync(inbox, "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(inbox, 0o755);

  return Bun.spawnSync({
    cmd: [
      "bash",
      "-c",
      'script="$1"; runtime="$2"; member="$3"; continued="$4"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; RUNTIME="$runtime"; CONTINUE="$continued"; member_cmd "$member"',
      "_",
      TEAM_UP,
      runtime,
      member,
      continueMode ? "1" : "0",
    ],
    env: {
      ...process.env,
      INBOX: inbox,
      ROLE_RESUME: "/usr/bin/true",
      CODEX_MONITOR: "/usr/bin/true",
      DELIVERY: join(dir, "missing-delivery.sh"),
    },
    stderr: "pipe",
    stdout: "pipe",
  });
}

describe("team-up Codex resume", () => {
  test("marks Codex member sessions as team mode", () => {
    const result = commandFor("engineer-1", "exit 0");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("AMADEUS_OPERATING_MODE=team");
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
        DELIVERY: "/path/that/does/not/exist",
      },
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("AMADEUS_OPERATING_MODE=team");
  });
});

describe("team-up fresh mailbox", () => {
  test.each([
    ["claude", "engineer-1", "e1"],
    ["codex", "engineer-1", "codex-engineer-1"],
  ] as const)("clears unread %s messages before a fresh launch", (runtime, member, role) => {
    const result = freshMemberCommand(runtime, member, false);
    const command = result.stdout.toString();

    expect(result.exitCode).toBe(0);
    expect(command).toContain(`amadeus ${role} --quiet`);
  });

  test.each([
    ["claude", "engineer-1"],
    ["codex", "engineer-1"],
  ] as const)("preserves unread %s messages when continuing", (runtime, member) => {
    const result = freshMemberCommand(runtime, member, true);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).not.toContain("--quiet");
  });
});
