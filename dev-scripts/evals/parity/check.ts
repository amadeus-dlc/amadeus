#!/usr/bin/env bun

// パリティ機械化（generate-parity-baseline.ts + parity-check.ts）のコードレベル検証。
// 上流の実 clone には依存せず、合成した最小 clone / workspace fixture で確認する。

import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const generator = join(root, "dev-scripts/generate-parity-baseline.ts");
const checker = join(root, "dev-scripts/parity-check.ts");

const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function run(command: string[], cwd = root): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

function runExpectFailure(command: string[], expected: string, cwd = root): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode === 0) {
    fail(["command unexpectedly succeeded: " + command.join(" "), "expected:", expected, "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  if (!stdout.includes(expected) && !stderr.includes(expected)) {
    fail(["command failed without expected evidence: " + expected, "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout + stderr;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function tmpDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cleanups.push(dir);
  return dir;
}

// ---- generate-parity-baseline.ts ----

const engineFixtureFiles: Record<string, string> = {
  "tools/foo.ts": "console.log('foo');\n",
  "aidlc-common/bar.md": "# bar\n",
  "sensors/s.md": "# sensor\n",
  "hooks/h.md": "# hook\n",
  "scopes/sc.md": "# scope\n",
  "agents/a.md": "# agent\n",
  "knowledge/k.md": "# knowledge\n",
};

function buildUpstreamFixture(): string {
  const upstream = tmpDir("parity-upstream");
  const claudeRoot = join(upstream, "dist/claude/.claude");
  mkdirSync(join(claudeRoot, "skills/aidlc"), { recursive: true });
  writeFileSync(join(claudeRoot, "skills/aidlc/SKILL.md"), "# aidlc\n");
  mkdirSync(join(claudeRoot, "skills/aidlc-x"), { recursive: true });
  writeFileSync(join(claudeRoot, "skills/aidlc-x/SKILL.md"), "# aidlc-x\n");
  for (const [relativePath, content] of Object.entries(engineFixtureFiles)) {
    const filePath = join(claudeRoot, relativePath);
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, content);
  }
  mkdirSync(join(claudeRoot, "rules"), { recursive: true });
  writeFileSync(join(claudeRoot, "rules/aidlc.md"), "# rules\n");

  run(["git", "init", "-q"], upstream);
  run(["git", "-c", "user.email=test@example.com", "-c", "user.name=test", "add", "-f", "-A"], upstream);
  run(["git", "-c", "user.email=test@example.com", "-c", "user.name=test", "commit", "-q", "-m", "fixture"], upstream);
  return upstream;
}

const upstreamFixture = buildUpstreamFixture();
const upstreamCommit = run(["git", "rev-parse", "HEAD"], upstreamFixture).trim();
const baselineOutPath = join(tmpDir("parity-baseline-out"), "parity-baseline.json");

// (B1) 上流 clone から skills 一覧・engine ファイル・rules/aidlc.md の sha256・基準 commit を抽出する。
run(["bun", "run", generator, upstreamFixture, "--out", baselineOutPath]);
const baseline = JSON.parse(readFileSync(baselineOutPath, "utf8"));

if (baseline.baselineCommit !== upstreamCommit) {
  fail(`baselineCommit が一致しない: 期待 ${upstreamCommit}、実際 ${baseline.baselineCommit}`);
}
if (JSON.stringify(baseline.skills) !== JSON.stringify(["aidlc", "aidlc-x"])) {
  fail(`skills 一覧が一致しない: ${JSON.stringify(baseline.skills)}`);
}
if (baseline.engineFiles.length !== Object.keys(engineFixtureFiles).length) {
  fail(`engineFiles 件数が一致しない: ${baseline.engineFiles.length}`);
}
for (const [relativePath, content] of Object.entries(engineFixtureFiles)) {
  const entry = baseline.engineFiles.find((item: { path: string }) => item.path === relativePath);
  if (!entry) fail(`engineFiles に ${relativePath} がない`);
  if (entry.sha256 !== sha256(content)) fail(`${relativePath} の sha256 が一致しない`);
}
if (baseline.rulesAidlcMd.sha256 !== sha256("# rules\n")) {
  fail("rulesAidlcMd の sha256 が一致しない");
}
console.log("generate-parity-baseline: ok");

// ---- parity-check.ts ----

// baseline のうち parity-check テストで使う最小 skills（"aidlc", "aidlc-x"）に絞った軽量 baseline。
function writeParityMap(workspace: string, overrides: Partial<{ missingSkillExceptions: string[]; engineFileExceptions: string[] }> = {}): void {
  mkdirSync(join(workspace, "dev-scripts/data"), { recursive: true });
  const map = {
    baselineCommit: upstreamCommit,
    skillNameMapping: { prefix: "aidlc", replacement: "amadeus", rule: "aidlc-<x> -> amadeus-<x>; aidlc -> amadeus" },
    relocations: [
      {
        upstreamPath: "rules/aidlc.md",
        localPath: ".agents/rules/aidlc.md",
        reason: "symlink 化。.claude/rules/aidlc.md は .agents/rules/aidlc.md への symlink であり、実体を直接照合する。",
      },
    ],
    missingSkillExceptions: overrides.missingSkillExceptions ?? [],
    engineFileExceptions: overrides.engineFileExceptions ?? [],
    exceptions: [{ target: "テスト用 fixture", reason: "parity eval のテスト用ダミー除外一覧。" }],
  };
  writeFileSync(join(workspace, "dev-scripts/data/parity-map.json"), `${JSON.stringify(map, null, 2)}\n`);
}

function writeBaselineInto(workspace: string): void {
  mkdirSync(join(workspace, "dev-scripts/data"), { recursive: true });
  writeFileSync(join(workspace, "dev-scripts/data/parity-baseline.json"), `${JSON.stringify(baseline, null, 2)}\n`);
}

function writeMatchingLocalWorkspace(): string {
  const workspace = tmpDir("parity-local");
  writeBaselineInto(workspace);
  writeParityMap(workspace);

  for (const name of ["amadeus", "amadeus-x"]) {
    mkdirSync(join(workspace, "skills", name), { recursive: true });
    writeFileSync(join(workspace, "skills", name, "SKILL.md"), `# ${name}\n`);
    mkdirSync(join(workspace, ".agents/skills", name), { recursive: true });
    writeFileSync(join(workspace, ".agents/skills", name, "SKILL.md"), `# ${name}\n`);
  }

  for (const [relativePath, content] of Object.entries(engineFixtureFiles)) {
    const filePath = join(workspace, ".claude", relativePath);
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, content);
  }

  mkdirSync(join(workspace, ".agents/rules"), { recursive: true });
  writeFileSync(join(workspace, ".agents/rules/aidlc.md"), "# rules\n");

  return workspace;
}

// (C1) 名前写像・engine ファイル・rules/aidlc.md（配置差込み）がすべて揃っていれば pass する。
const happyWorkspace = writeMatchingLocalWorkspace();
run(["bun", "run", checker, happyWorkspace]);
console.log("parity-check happy path: ok");

// (C2) 写像先 skill ディレクトリが skills/ に欠けていると fail する。
const missingSkillWorkspace = writeMatchingLocalWorkspace();
rmSync(join(missingSkillWorkspace, "skills/amadeus-x"), { recursive: true, force: true });
runExpectFailure(["bun", "run", checker, missingSkillWorkspace], "amadeus-x");

// (C3) engine ファイルの内容が変わっていると fail する（hash 不一致）。
const changedEngineWorkspace = writeMatchingLocalWorkspace();
writeFileSync(join(changedEngineWorkspace, ".claude/tools/foo.ts"), "console.log('changed');\n");
runExpectFailure(["bun", "run", checker, changedEngineWorkspace], "tools/foo.ts");

// (C4) engine ファイルが欠けていると fail する。
const missingEngineWorkspace = writeMatchingLocalWorkspace();
rmSync(join(missingEngineWorkspace, ".claude/hooks/h.md"));
runExpectFailure(["bun", "run", checker, missingEngineWorkspace], "hooks/h.md");

// (C5) rules/aidlc.md（.agents/rules/aidlc.md へ配置差）の内容が変わっていると fail する。
const changedRulesWorkspace = writeMatchingLocalWorkspace();
writeFileSync(join(changedRulesWorkspace, ".agents/rules/aidlc.md"), "# changed rules\n");
runExpectFailure(["bun", "run", checker, changedRulesWorkspace], "rules/aidlc.md");

// (C6) parity-map.json の missingSkillExceptions に宣言された欠落は pass する。
const declaredMissingSkillWorkspace = writeMatchingLocalWorkspace();
rmSync(join(declaredMissingSkillWorkspace, "skills/amadeus-x"), { recursive: true, force: true });
rmSync(join(declaredMissingSkillWorkspace, ".agents/skills/amadeus-x"), { recursive: true, force: true });
writeParityMap(declaredMissingSkillWorkspace, { missingSkillExceptions: ["amadeus-x"] });
run(["bun", "run", checker, declaredMissingSkillWorkspace]);
console.log("parity-check declared skill exception: ok");

// (C7) parity-map.json の engineFileExceptions に宣言された不一致は pass する。
const declaredEngineExceptionWorkspace = writeMatchingLocalWorkspace();
writeFileSync(join(declaredEngineExceptionWorkspace, ".claude/tools/foo.ts"), "console.log('changed');\n");
writeParityMap(declaredEngineExceptionWorkspace, { engineFileExceptions: ["tools/foo.ts"] });
run(["bun", "run", checker, declaredEngineExceptionWorkspace]);
console.log("parity-check declared engine file exception: ok");

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("parity eval: ok");
