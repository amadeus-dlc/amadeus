#!/usr/bin/env bun

// migrate-workspace-to-aidlc の検証。
// 旧 `.amadeus/` 構造の fixture workspace を合成し、一括移行の結果が
// 新契約（aidlc/spaces/default/、aidlc-state.md、intents.json、R005 改名）を満たし、
// 移行後の workspace と Intent が validator で pass することを確認する。

import { mkdirSync, mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const script = "dev-scripts/migrate-workspace-to-aidlc.ts";
const validator = ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts";

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

function write(base: string, relPath: string, content: string): void {
  const path = join(base, relPath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

function check(name: string, condition: boolean, evidence: string): void {
  if (!condition) fail(`fail: ${name} — ${evidence}`);
  console.log(`ok: ${name}`);
}

// ---- 旧構造 fixture ----

const oldIntentId = "20260703-aidlc-v2-full-compliance";
const newDirName = "260703-aidlc-v2-full-compliance";

function buildFixture(): string {
  const workspace = mkdtempSync(join(tmpdir(), "migrate-workspace"));
  cleanups.push(workspace);
  const a = join(workspace, ".amadeus");

  write(a, "README.md", "# Amadeus workspace\n");
  write(a, "steering.md", "# Steering\n\n## 役割\n\n- 共有前提を扱う。\n");
  write(a, "steering/objective.md", "# システムの目的\n\n## 一覧\n\n| 識別子 | 目的 | 期待価値 | 成功指標 | 状態 |\n|---|---|---|---|---|\n| OBJ001 | v2 準拠 | 互換性 | validator pass | 確認済み |\n");
  write(a, "steering/product.md", "# プロダクト概要\n\n## コア能力\n\n- ライフサイクル運用\n\n## 主要ユースケース\n\n- Intent 駆動開発\n\n## 価値仮説\n\n- 契約の一貫性\n");
  write(a, "steering/tech.md", "# 技術スタック\n\n## アーキテクチャ\n\n- skill 群\n\n## 主要技術\n\n| 領域 | 技術 | 根拠 | 状態 |\n|---|---|---|---|\n| 実行 | Bun | 高速 | 確認済み |\n\n## 開発標準\n\n- TDD\n\n## 開発環境\n\n- bun\n\n## 主要技術判断\n\n- 外部依存を増やさない\n");
  write(a, "steering/structure.md", "# プロジェクト構造\n\n## 編成方針\n\n- skill 単位\n\n## ディレクトリパターン\n\n| パターン | 場所 | 役割 | 例 | 状態 |\n|---|---|---|---|---|\n| skills | skills/ | 入口 | skills/amadeus | 確認済み |\n\n## 命名規約\n\n| 対象 | 規約 | 例 | 状態 |\n|---|---|---|---|\n| skill | kebab-case | amadeus-grilling | 確認済み |\n\n## 依存関係の整理\n\n- 一方向\n\n## コード構成原則\n\n- 小さく保つ\n");
  write(a, "steering/actors.md", "# アクター\n\n## 一覧\n\n| 識別子 | 名前 | 役割 | 関心 | 状態 |\n|---|---|---|---|---|\n| ACT001 | 開発者 | 利用者 | 生産性 | 確認済み |\n");
  write(a, "steering/external-systems.md", "# 外部システム\n\n## 一覧\n\n| 識別子 | 名前 | 役割 | 接点 | 状態 |\n|---|---|---|---|---|\n");
  write(a, "steering/knowledge.md", "# ナレッジ\n\n## 背景\n\n- v2 準拠の背景\n\n## 前提\n\n- Bun 前提\n\n## 未確認事項\n\n- なし\n");
  write(a, "steering/knowledge/README.md", "# ナレッジ詳細\n\n## 役割\n\n- 詳細記録\n\n## 記録方針\n\n- 共有知識だけ\n");
  write(a, "steering/knowledge/history.md", "# 履歴\n\n過去の経緯を記録する。\n");
  write(a, "steering/policies.md", "# ポリシー\n\n## 方針\n\n- main を基準にする\n\n## 禁止事項\n\n- 直接 push しない\n\n## 判断基準\n\n- 検証 green\n");
  write(a, "steering/policies/README.md", "# ポリシー詳細\n\n## 役割\n\n- 詳細方針\n\n## 記録方針\n\n- 複数 Intent に効くものだけ\n");
  write(a, "steering/policies/git-branching.md", "# Git Branching Policy\n\nmain から branch を切る。\n");
  write(a, "glossary.md", "# 用語集\n\n## 用語\n\n| 用語 | 説明 | 状態 |\n|---|---|---|\n| Intent | 作業単位 | 確定 |\n\n## 避ける語\n\n| 避ける語 | 代わりに使う語 | 理由 |\n|---|---|---|\n\n現時点ではなし。\n\n## 禁止ワード\n\n| 禁止ワード | 理由 |\n|---|---|\n\n現時点ではなし。\n");
  write(a, "domain-map.md", "# Domain Map\n\n## Subdomains\n\n| 識別子 | 名前 | 種別 | 役割 | 状態 | 根拠 |\n|---|---|---|---|---|---|\n\n採用済みまたは廃止済みの Subdomain は未登録である。\n\n## Bounded Contexts\n\n| 識別子 | 名前 | サブドメイン | 役割 | 状態 | 根拠 |\n|---|---|---|---|---|---|\n\n採用済みまたは廃止済みの Bounded Context は未登録である。\n");
  write(a, "context-map.md", "# Context Map\n\n## Dependencies\n\n| Downstream | Upstream | 依存内容 | 組織パターン | 統合パターン | 状態 | 根拠 |\n|---|---|---|---|---|---|---|\n\n採用済みまたは廃止済みのコンテキスト間依存は未登録である。\n");
  write(a, "knowledge/codebase/amadeus/architecture.md", "# アーキテクチャ：amadeus\n\nskill 群と validator で構成する。\n");
  write(a, "knowledge/codebase/amadeus/timestamp.md", "# 解析記録\n\n- 解析時刻: 2026-07-03T04:00:00Z\n");
  write(a, "active-intent", `${oldIntentId}\n`);

  const moduleFile = [
    "# インテント：v2 完全準拠",
    "",
    "## 概要",
    "",
    "Amadeus DLC を AI-DLC v2 に完全準拠させる。",
    "",
    "## 依存",
    "",
    "| 依存 | 理由 |",
    "|---|---|",
    "| なし | 単独で完了判断できるため。 |",
    "",
    "## 目標プロファイル",
    "",
    "| フィールド | 値 | 説明 |",
    "|---|---|---|",
    "| goalType | technical | 構造の準拠変更である。 |",
    "| scope | refactor | 振る舞いを保存する構造変更である。 |",
    "| labels | aidlc-v2 | 準拠作業。 |",
    "",
    "## 目的",
    "",
    "v2 との構造互換を実現する。",
    "",
    "## 成功条件",
    "",
    "- validator が pass する。",
    "",
  ].join("\n");
  write(a, `intents/${oldIntentId}.md`, moduleFile);

  const state = {
    schemaVersion: 2,
    intentId: oldIntentId,
    scope: "refactor",
    depth: "Standard",
    status: "in_progress",
    phase: "construction",
    currentStage: "code-generation",
    stages: {
      "reverse-engineering": { state: "completed", approval: { approvedAt: "2026-07-03T13:36:52+09:00", via: "conversation" } },
      "requirements-analysis": { state: "completed", approval: { approvedAt: "2026-07-03T13:44:23+09:00", via: "conversation" } },
      "functional-design": { units: { implicit: { state: "completed", approval: { approvedAt: "2026-07-03T13:58:40+09:00", via: "conversation" } } } },
      "code-generation": { units: { implicit: { state: "active" } } },
      "build-and-test": { state: "pending" },
    },
    phaseGates: {
      ideation: { skipped: true },
      inception: { approvedAt: "2026-07-03T13:48:04+09:00", via: "pr", reference: "https://example.test/pull/388" },
    },
    bolts: { implicit: { state: "active", units: ["implicit"] } },
  };
  write(a, `intents/${oldIntentId}/state.json`, JSON.stringify(state, null, 2) + "\n");
  write(a, `intents/${oldIntentId}/inception/requirements-analysis/requirements.md`, "# 要求\n\n| ID | 要求 |\n|---|---|\n| R001 | v2 構造 |\n");
  write(a, `intents/${oldIntentId}/inception/requirements-analysis/questions.md`, "# 質問記録\n\n- Q1: 境界の確認。\n");
  write(a, `intents/${oldIntentId}/construction/implicit/functional-design/business-logic-model.md`, "# Business Logic Model\n\n中核ロジック。\n");
  write(a, `intents/${oldIntentId}/construction/implicit/code-generation/plan.md`, "# Plan\n\n実装計画。\n");

  // intents.md は旧 IndexGenerate の出力相当（移行で作り直すため最小限でよい）
  write(a, "intents.md", "# インテント\n\n## 一覧\n\n（旧索引）\n");

  return workspace;
}

// ---- RED/GREEN: 移行スクリプトの実行 ----

const workspace = buildFixture();
run(["bun", "run", script, workspace, "--repo", "amadeus", "--delete-old"]);

const space = join(workspace, "aidlc/spaces/default");

// R001: Space 構造
check("memory/org.md が存在する", existsSync(join(space, "memory/org.md")), "なし");
check("memory/team.md に旧 policies の内容が移っている", readFileSync(join(space, "memory/team.md"), "utf8").includes("main を基準にする"), "内容なし");
check("memory/team.md に policies 詳細が連結されている", readFileSync(join(space, "memory/team.md"), "utf8").includes("Git Branching Policy"), "内容なし");
check("memory/project.md に技術と構造が移っている", (() => { const t = readFileSync(join(space, "memory/project.md"), "utf8"); return t.includes("## 主要技術") && t.includes("## 編成方針") && t.includes("## 目的"); })(), "見出し不足");
check("knowledge/glossary.md が存在する", existsSync(join(space, "knowledge/glossary.md")), "なし");
check("knowledge/domain-map.md が存在する", existsSync(join(space, "knowledge/domain-map.md")), "なし");
check("knowledge/background.md に旧 knowledge.md が移っている", readFileSync(join(space, "knowledge/background.md"), "utf8").includes("v2 準拠の背景"), "内容なし");
check("knowledge/ に詳細ファイルが移っている", existsSync(join(space, "knowledge/history.md")), "なし");
check("codekb/amadeus/architecture.md が存在する", existsSync(join(space, "codekb/amadeus/architecture.md")), "なし");
check("旧 .amadeus/ が削除されている", !existsSync(join(workspace, ".amadeus")), "残存");

// R004: record の改名と registry
const recordDir = join(space, "intents", newDirName);
check("record が YYMMDD 形式へ改名されている", existsSync(recordDir), "なし");
check("モジュールファイルが移っている", existsSync(join(space, "intents", `${newDirName}.md`)), "なし");
const moduleText = readFileSync(join(space, "intents", `${newDirName}.md`), "utf8");
check("モジュールファイルが索引と依存とプロファイルだけを持つ", !moduleText.includes("## 成功条件"), "旧セクションが残存");
const registry = JSON.parse(readFileSync(join(space, "intents/intents.json"), "utf8"));
check("registry に record の行がある", Array.isArray(registry) && registry.length === 1 && registry[0].dirName === newDirName, JSON.stringify(registry));
check("registry の uuid が UUIDv7 である", /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(registry[0].uuid), String(registry[0].uuid));
check("active-intent が新 dirName を指す", readFileSync(join(space, "intents/active-intent"), "utf8").trim() === newDirName, "不一致");

// R003: aidlc-state.md
const stateText = readFileSync(join(recordDir, "aidlc-state.md"), "utf8");
check("aidlc-state.md に v2 セクションがある", stateText.includes("## Stage Progress") && stateText.includes("## Phase Progress"), "セクション不足");
check("scope が refactor である", stateText.includes("- **Scope**: refactor"), "Scope 行不一致");
{
  const line = stateText.split("\n").find((entry) => entry.startsWith("- **Stages to Execute**: ")) ?? "";
  const numbers = line.replace("- **Stages to Execute**: ", "").split(", ").filter(Boolean);
  check("Stages to Execute に重複がない", numbers.length === new Set(numbers).size && numbers.length > 0, line);
}
check("完了ステージが [x] である", stateText.includes("- [x] requirements-analysis"), "requirements-analysis の checkbox 不一致");
check("進行中ステージが [-] である", stateText.includes("- [-] code-generation"), "code-generation の checkbox 不一致");
check("scope 外ステージが [S] である", stateText.includes("- [S] intent-capture — SKIP:"), "intent-capture の checkbox 不一致");
check("record 直下に state.json が残っていない", !existsSync(join(recordDir, "state.json")), "残存");

// audit の遡及記録
const auditText = readFileSync(join(recordDir, "audit/audit.md"), "utf8");
check("audit に WORKFLOW_STARTED がある", auditText.includes("**Event**: WORKFLOW_STARTED"), "なし");
check("audit に PHASE_VERIFIED（inception）がある", auditText.includes("**Event**: PHASE_VERIFIED") && auditText.includes("https://example.test/pull/388"), "なし");
check("audit に BOLT_STARTED がある", auditText.includes("**Event**: BOLT_STARTED"), "なし");

// R005: 改名の適用
check("plan.md が code-generation-plan.md へ改名されている", existsSync(join(recordDir, "construction/implicit/code-generation/code-generation-plan.md")) && !existsSync(join(recordDir, "construction/implicit/code-generation/plan.md")), "改名されていない");
check("questions.md が requirements-analysis-questions.md へ改名されている", existsSync(join(recordDir, "inception/requirements-analysis/requirements-analysis-questions.md")), "改名されていない");

// 総合: validator で pass する
const workspaceReport = run(["bun", "run", validator, workspace]);
check("移行後 workspace が validator で pass する", /^pass$/m.test(workspaceReport), workspaceReport.split("\n").slice(-10).join("\n"));
const intentReport = run(["bun", "run", validator, workspace, newDirName]);
check("移行後 Intent が validator で pass する", /^pass$/m.test(intentReport), intentReport.split("\n").slice(-10).join("\n"));

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("migrate workspace eval: ok");
