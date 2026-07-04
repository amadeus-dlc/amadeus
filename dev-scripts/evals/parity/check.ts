#!/usr/bin/env bun

// パリティ機械化（generate-parity-baseline.ts + parity-check.ts）のコードレベル検証。
// 上流の実 clone には依存せず、合成した最小 clone / workspace fixture で確認する。
//
// nameMappings（engine-namespace 改名、Issue #445）関連の fixture は、
// 対応表 kind（engine-dir / tool / hook / common-dir / shared-dir / rules-file / sub-agent）ごとに
// 1 件ずつの mapping と、境界安全性（bare token・拡張子違い・部分文字列）を壊す変異を both 用意する。

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
  "tools/aidlc-widget.ts": "export const widget = 1;\n// see aidlc-state.md and .agents/aidlc/tools for context\n",
  // aidlc-common/bar.md は scope-file / sensor-file の命名規則プレースホルダ（`aidlc-<name>.md`、
  // `aidlc-<id>.md`）が engine ファイル内に埋め込まれるケースを模す（stage-definition.md、
  // stage-protocol.md での実際の参照パターン。review 指摘で追加、code-generation 決定記録あり）。
  "aidlc-common/bar.md":
    "# bar\nxaidlc-commonx must stay literal\nSee .claude/scopes/aidlc-<name>.md and .claude/sensors/aidlc-<id>.md for reference.\n",
  "sensors/s.md": "# sensor\n",
  "sensors/aidlc-linter.md": "# linter sensor\n",
  "hooks/h.md": "# hook\n",
  // ESM の兄弟ファイル import は .js 拡張子で書かれる（ソースは .ts）。tool/hook kind は
  // .ts と .js のどちらでも一致し、置換後も元の拡張子を保持する必要がある（実装確認済みの実際のバグ）。
  "hooks/aidlc-hook-x.ts": "import { widget } from '../tools/aidlc-widget.js';\n",
  "scopes/sc.md": "# scope\n",
  "scopes/aidlc-bugfix.md": "# bugfix scope\n",
  "agents/aidlc-fixture-agent.md": "---\nname: aidlc-fixture-agent\n---\n# Agent\n",
  "knowledge/aidlc-fixture-agent/guide.md": "# Guide\nUse aidlc-fixture-agent.\n",
  "knowledge/aidlc-shared/k.md": "# shared\nxaidlc-sharedx must stay literal\n",
};

const rulesAidlcContent = "# rules\nSee rules/aidlc.md for details.\n";

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
  writeFileSync(join(claudeRoot, "rules/aidlc.md"), rulesAidlcContent);

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
if (baseline.rulesAidlcMd.sha256 !== sha256(rulesAidlcContent)) {
  fail("rulesAidlcMd の sha256 が一致しない");
}
console.log("generate-parity-baseline: ok");

// ---- parity-check.ts ----

// 改名対応表（engine-namespace、Issue #445）を模した nameMappings。
// kind ごとの disambiguation 規則（business-logic-model.md）を fixture レベルで再現する。
const nameMappings = [
  { kind: "engine-dir", prefix: ".agents/aidlc/", replacement: ".agents/amadeus/" },
  { kind: "common-dir", prefix: "aidlc-common", replacement: "amadeus-common" },
  { kind: "shared-dir", prefix: "aidlc-shared", replacement: "amadeus-shared" },
  { kind: "rules-file", prefix: "rules/aidlc.md", replacement: "rules/amadeus.md" },
  { kind: "tool", prefix: "aidlc-widget.ts", replacement: "amadeus-widget.ts" },
  { kind: "hook", prefix: "aidlc-hook-x.ts", replacement: "amadeus-hook-x.ts" },
  { kind: "scope-file", prefix: "aidlc-bugfix.md", replacement: "amadeus-bugfix.md" },
  { kind: "scope-file", prefix: "aidlc-<name>.md", replacement: "amadeus-<name>.md" },
  { kind: "sensor-file", prefix: "aidlc-linter.md", replacement: "amadeus-linter.md" },
  { kind: "sensor-file", prefix: "aidlc-<id>.md", replacement: "amadeus-<id>.md" },
  { kind: "sub-agent", prefix: "aidlc", replacement: "amadeus" },
];

// 改名後のローカル配置。手書きで境界安全性（xaidlc-commonx 等のデコイが変化しないこと）を担保する。
const expectedLocalFiles: Record<string, { path: string; content: string }> = {
  "tools/foo.ts": { path: ".agents/amadeus/tools/foo.ts", content: "console.log('foo');\n" },
  "tools/aidlc-widget.ts": {
    path: ".agents/amadeus/tools/amadeus-widget.ts",
    content: "export const widget = 1;\n// see aidlc-state.md and .agents/amadeus/tools for context\n",
  },
  "aidlc-common/bar.md": {
    path: ".agents/amadeus/amadeus-common/bar.md",
    content:
      "# bar\nxaidlc-commonx must stay literal\nSee .claude/scopes/amadeus-<name>.md and .claude/sensors/amadeus-<id>.md for reference.\n",
  },
  "sensors/s.md": { path: ".agents/amadeus/sensors/s.md", content: "# sensor\n" },
  "sensors/aidlc-linter.md": { path: ".agents/amadeus/sensors/amadeus-linter.md", content: "# linter sensor\n" },
  "hooks/h.md": { path: ".agents/amadeus/hooks/h.md", content: "# hook\n" },
  "hooks/aidlc-hook-x.ts": {
    path: ".agents/amadeus/hooks/amadeus-hook-x.ts",
    content: "import { widget } from '../tools/amadeus-widget.js';\n",
  },
  "scopes/sc.md": { path: ".agents/amadeus/scopes/sc.md", content: "# scope\n" },
  "scopes/aidlc-bugfix.md": { path: ".agents/amadeus/scopes/amadeus-bugfix.md", content: "# bugfix scope\n" },
  "agents/aidlc-fixture-agent.md": {
    path: ".agents/amadeus/agents/amadeus-fixture-agent.md",
    content: "---\nname: amadeus-fixture-agent\n---\n# Agent\n",
  },
  "knowledge/aidlc-fixture-agent/guide.md": {
    path: ".agents/amadeus/knowledge/amadeus-fixture-agent/guide.md",
    content: "# Guide\nUse amadeus-fixture-agent.\n",
  },
  "knowledge/aidlc-shared/k.md": {
    path: ".agents/amadeus/knowledge/amadeus-shared/k.md",
    content: "# shared\nxaidlc-sharedx must stay literal\n",
  },
};

const rulesAmadeusContent = "# rules\nSee rules/amadeus.md for details.\n";

function writeParityMap(workspace: string, overrides: Partial<{ missingSkillExceptions: string[]; engineFileExceptions: string[] }> = {}): void {
  mkdirSync(join(workspace, "dev-scripts/data"), { recursive: true });
  const map = {
    baselineCommit: upstreamCommit,
    skillNameMapping: { prefix: "aidlc", replacement: "amadeus", rule: "aidlc-<x> -> amadeus-<x>; aidlc -> amadeus" },
    nameMappings,
    relocations: [
      {
        upstreamPath: "rules/amadeus.md",
        localPath: ".agents/rules/amadeus.md",
        reason: "symlink 化 + rules-file 改名。.claude/rules/amadeus.md は .agents/rules/amadeus.md への symlink であり、実体を直接照合する。",
      },
      { upstreamPath: "tools", localPath: ".agents/amadeus/tools", reason: "host 中立化 + engine-dir 改名。" },
      { upstreamPath: "amadeus-common", localPath: ".agents/amadeus/amadeus-common", reason: "host 中立化 + common-dir 改名。" },
      { upstreamPath: "sensors", localPath: ".agents/amadeus/sensors", reason: "host 中立化 + engine-dir 改名。" },
      { upstreamPath: "hooks", localPath: ".agents/amadeus/hooks", reason: "host 中立化 + engine-dir 改名。" },
      { upstreamPath: "scopes", localPath: ".agents/amadeus/scopes", reason: "host 中立化 + engine-dir 改名。" },
      { upstreamPath: "agents", localPath: ".agents/amadeus/agents", reason: "host 中立化 + engine-dir 改名。sub-agent 名は aidlc-* から amadeus-* へ写像する。" },
      { upstreamPath: "knowledge", localPath: ".agents/amadeus/knowledge", reason: "host 中立化 + engine-dir 改名。per-agent knowledge と aidlc-shared は amadeus-* へ写像する。" },
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

  for (const local of Object.values(expectedLocalFiles)) {
    const filePath = join(workspace, local.path);
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, local.content);
  }

  mkdirSync(join(workspace, ".agents/rules"), { recursive: true });
  writeFileSync(join(workspace, ".agents/rules/amadeus.md"), rulesAmadeusContent);

  return workspace;
}

// (C1) 名前写像・engine ファイル・rules/amadeus.md（配置差込み）がすべて揃っていれば pass する。
const happyWorkspace = writeMatchingLocalWorkspace();
run(["bun", "run", checker, happyWorkspace]);
console.log("parity-check happy path (nameMappings): ok");

// (C2) 写像先 skill ディレクトリが skills/ に欠けていると fail する。
const missingSkillWorkspace = writeMatchingLocalWorkspace();
rmSync(join(missingSkillWorkspace, "skills/amadeus-x"), { recursive: true, force: true });
runExpectFailure(["bun", "run", checker, missingSkillWorkspace], "amadeus-x");

// (C3) engine ファイルの内容が変わっていると fail する（hash 不一致）。
const changedEngineWorkspace = writeMatchingLocalWorkspace();
writeFileSync(join(changedEngineWorkspace, ".agents/amadeus/tools/foo.ts"), "console.log('changed');\n");
runExpectFailure(["bun", "run", checker, changedEngineWorkspace], "tools/foo.ts");

// (C4) engine ファイルが欠けていると fail する。
const missingEngineWorkspace = writeMatchingLocalWorkspace();
rmSync(join(missingEngineWorkspace, ".agents/amadeus/hooks/h.md"));
runExpectFailure(["bun", "run", checker, missingEngineWorkspace], "hooks/h.md");

// (C5) rules/aidlc.md（.agents/rules/amadeus.md へ配置差 + rules-file 改名）の内容が変わっていると fail する。
const changedRulesWorkspace = writeMatchingLocalWorkspace();
writeFileSync(join(changedRulesWorkspace, ".agents/rules/amadeus.md"), "# changed rules\n");
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
writeFileSync(join(declaredEngineExceptionWorkspace, ".agents/amadeus/tools/foo.ts"), "console.log('changed');\n");
writeParityMap(declaredEngineExceptionWorkspace, { engineFileExceptions: ["tools/foo.ts"] });
run(["bun", "run", checker, declaredEngineExceptionWorkspace]);
console.log("parity-check declared engine file exception: ok");

// (C8) disambiguation 境界: tool kind は拡張子込み完全一致に限る。
// aidlc-state.md（v2 成果物、改名禁止）を誤って amadeus-state.md へ書き換えるバグを混入させると、
// 逆方向正規化（拡張子 .ts 限定）はこれを aidlc-state.md へ戻さないため hash 不一致で fail する。
const bareTokenBugWorkspace = writeMatchingLocalWorkspace();
writeFileSync(
  join(bareTokenBugWorkspace, ".agents/amadeus/tools/amadeus-widget.ts"),
  "export const widget = 1;\n// see amadeus-state.md and .agents/amadeus/tools for context\n",
);
runExpectFailure(["bun", "run", checker, bareTokenBugWorkspace], "tools/aidlc-widget.ts");
console.log("parity-check bare-token disambiguation guard: ok");

// (C9) disambiguation 境界: common-dir / shared-dir kind はセグメント境界一致に限る。
// xaidlc-commonx のような部分文字列を誤って書き換えるバグを混入させると、
// 逆方向正規化（境界一致限定）はこれを戻さないため hash 不一致で fail する。
const boundaryBugWorkspace = writeMatchingLocalWorkspace();
writeFileSync(
  join(boundaryBugWorkspace, ".agents/amadeus/amadeus-common/bar.md"),
  "# bar\nxamadeus-commonx must stay literal\n",
);
runExpectFailure(["bun", "run", checker, boundaryBugWorkspace], "aidlc-common/bar.md");
console.log("parity-check segment-boundary disambiguation guard: ok");

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("parity eval: ok");
