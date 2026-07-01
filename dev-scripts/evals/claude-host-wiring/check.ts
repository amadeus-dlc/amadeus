#!/usr/bin/env bun

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const checkCommand = ["bun", "run", join(root, "dev-scripts/check-claude-host-wiring.ts")];

const tmpRoots: string[] = [];
process.on("exit", () => {
  for (const dir of tmpRoots) rmSync(dir, { recursive: true, force: true });
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function run(command: string[], cwd: string): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

function runExpectFailure(command: string[], cwd: string): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode === 0) {
    fail(["command unexpectedly succeeded: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stderr;
}

function makeFixture(): string {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "claude-host-wiring"));
  tmpRoots.push(fixtureRoot);
  mkdirSync(join(fixtureRoot, ".agents/skills/skill-a"), { recursive: true });
  writeFileSync(join(fixtureRoot, ".agents/skills/skill-a/SKILL.md"), "# skill-a\n");
  mkdirSync(join(fixtureRoot, ".agents/skills/skill-b"), { recursive: true });
  writeFileSync(join(fixtureRoot, ".agents/skills/skill-b/SKILL.md"), "# skill-b\n");
  mkdirSync(join(fixtureRoot, ".agents/rules"), { recursive: true });
  writeFileSync(join(fixtureRoot, ".agents/rules/rule-a.md"), "# rule-a\n");
  mkdirSync(join(fixtureRoot, ".claude/skills"), { recursive: true });
  symlinkSync("../../.agents/skills/skill-a", join(fixtureRoot, ".claude/skills/skill-a"));
  symlinkSync("../../.agents/skills/skill-b", join(fixtureRoot, ".claude/skills/skill-b"));
  mkdirSync(join(fixtureRoot, ".claude/rules"), { recursive: true });
  symlinkSync("../../.agents/rules/rule-a.md", join(fixtureRoot, ".claude/rules/rule-a.md"));
  writeFileSync(join(fixtureRoot, ".claude/settings.json"), '{\n  "language": "japanese"\n}\n');
  return fixtureRoot;
}

function expectIssue(stderr: string, needle: string, label: string): void {
  if (stderr.includes(needle)) return;
  fail(`expected ${label} to be reported with ${needle}, got:\n${stderr}`);
}

// 配線がそろった workspace は pass する。
run(checkCommand, makeFixture());

// 昇格済み skill に対応する symlink の欠落を検出する。
const missingSkillLink = makeFixture();
rmSync(join(missingSkillLink, ".claude/skills/skill-b"));
expectIssue(runExpectFailure(checkCommand, missingSkillLink), ".claude/skills/skill-b", "missing skill symlink");

// 参照先が存在しない宙吊り symlink を検出する。
const danglingLink = makeFixture();
symlinkSync("../../.agents/skills/ghost", join(danglingLink, ".claude/skills/ghost"));
expectIssue(runExpectFailure(checkCommand, danglingLink), ".claude/skills/ghost", "dangling symlink");

// symlink が実体ディレクトリへ置き換わった状態を検出する。
const replacedByDir = makeFixture();
rmSync(join(replacedByDir, ".claude/skills/skill-a"));
mkdirSync(join(replacedByDir, ".claude/skills/skill-a"));
expectIssue(runExpectFailure(checkCommand, replacedByDir), ".claude/skills/skill-a", "non-symlink entry");

// 別の昇格先を指す誤参照 symlink を検出する。
const wrongTarget = makeFixture();
rmSync(join(wrongTarget, ".claude/skills/skill-a"));
symlinkSync("../../.agents/skills/skill-b", join(wrongTarget, ".claude/skills/skill-a"));
expectIssue(runExpectFailure(checkCommand, wrongTarget), ".claude/skills/skill-a", "wrong symlink target");

// rules 側の symlink 欠落も検出する。
const missingRuleLink = makeFixture();
rmSync(join(missingRuleLink, ".claude/rules/rule-a.md"));
expectIssue(runExpectFailure(checkCommand, missingRuleLink), ".claude/rules/rule-a.md", "missing rule symlink");

// settings.json の欠落を検出する。
const missingSettings = makeFixture();
rmSync(join(missingSettings, ".claude/settings.json"));
expectIssue(runExpectFailure(checkCommand, missingSettings), ".claude/settings.json", "missing settings");

// settings.json が valid JSON でない状態を検出する。
const brokenSettings = makeFixture();
writeFileSync(join(brokenSettings, ".claude/settings.json"), "{ broken\n");
expectIssue(runExpectFailure(checkCommand, brokenSettings), ".claude/settings.json", "invalid settings");

// 実リポジトリの配線が pass する。
run(checkCommand, root);

console.log("claude host wiring eval: ok");
