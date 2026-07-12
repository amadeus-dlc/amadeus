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

describe("team-up Codex resume", () => {
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
});
