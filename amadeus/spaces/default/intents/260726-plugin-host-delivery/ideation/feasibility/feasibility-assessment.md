# Feasibility Assessment — plugin-host-delivery

> 上流入力(consumes 全数): intent-statement
> 測定 ref: 本 worktree HEAD(752d8ed53 = origin/main 5cb1a28fe 取込後)。上流参照は awslabs/aidlc-workflows commit `29a31f78` 固定

## 評価サマリ(verdict)

**Conditional GO** — 中核経路(中立正本 → ハーネス別投影 → フック起動 compose → 再コンパイル → 通常 scope 実行)は、既存資産の実測により技術的に成立する。条件は2点: (1) ハーネスごとのネイティブ導入機構は未実測の外部 seam であり、能力マトリクス(本 intent の第一成果物)の実測で degrade 契約を確定してから実装確約する (2) intent-statement の成功指標 8(activation policy)は TLC 実行コストの制約下で application-design の ADR ゲート裁定を要する。

## 実測に基づく現状(intent-statement の問題認識の裏取り)

intent-statement が挙げた欠落 5 点をリポジトリ実測で確認した。

1. **neutral-only packaging**: `scripts/package.ts:307-309` に「Plugins ship ONLY as the harness-neutral bundle (dist/plugins/<name>/)」と明記。`dist/plugins/formal-model-check/` 実在、ハーネス別投影は不在
2. **compose engine はテストからのみ到達可能**: `applyPluginPlan` / `planPluginComposition`(`scripts/plugin-composition.ts:920,:497`)の呼び出し元は tests(t252/t253/t254/t-formal-verif-plugin-lifecycle)のみ。CLI verb・フック配線は 0 hit。一方エンジン側は composition record(`.amadeus-plugin-composition.json`)を読む配線が既にある(`amadeus-graph.ts:1897`、`amadeus-orchestrate.ts:901`)
3. **formal-model-check は `scopes: []` + `--single` 専用**: `plugins/formal-model-check/stages/formal-model-check.md` frontmatter(`scopes: []`、condition に「never auto-selected by a stock scope」)
4. **docs 不一致**: `docs/guide/19-plugins.ja.md:7`「パッケージャが全ハーネスへ投影し」 vs 上記 neutral-only 実装
5. **適合テスト不在**: 上流 t188 相当(32 ケース、下記)に対応する Amadeus 側追跡表・テストは存在しない(既存 t252-254 は compose engine 単体の検証であり、host 投影・フック起動・E2E は未カバー)

## 技術的実現可能性(強み)

- **compose engine は完成度が高い**: 発見/検証(`discoverPlugins:241`、`inspectPlugin:364`)、seam の set-union 合成(`mergeSeamEntries:431`、SEAM_NAMES = produces/consumes/sensors/required_sections `:48`)、アトミック適用+ジャーナル復旧(`applyPluginPlan:920`、`runRecovery:799`)、drop(`planPluginDrop:650`)、診断(`diagnosePlugins:1011`)が実装・テスト済み。上流の「弱い合成の重複実装禁止」方針はこのエンジンを呼ぶだけで満たせる
- **全 7 ハーネスにフック面が既在**: claude = `settings.json.example` の SessionStart/UserPromptSubmit、codex/cursor/kimi/kiro/kiro-ide = `packages/framework/harness/<name>/hooks/` のアダプタ、opencode = `plugin/amadeus-opencode-plugin.ts`。SessionStart 相当から compose を呼ぶ配線は全ハーネスで追加実装のみで足りる見込み(各ハーネスのイベント語彙・実行保証は能力マトリクスで実測確定 — 外部 seam 語彙の未実測確約はしない)
- **上流の参照実装が具体的**: Plugin Mechanism doc(配布 = Claude marketplace / Codex git tag+hash pin / Kiro folder-drop、トリガー = SessionStart(Claude eager / Codex lazy)、全トリガーが同一 compose を呼ぶ)、test-pro リファレンス(新規2ステージ+既存4ステージ拡張+2センサー)、t188 適合テスト 32 ケースの列挙を一次資料直読で取得済み

## ギャップ(上流とAmadeusの差分)

- 上流の host 投影は **4 ハーネス**(claude/codex/kiro/kiro-ide)。Amadeus は **7 ハーネス**(feasibility-questions Q1 裁定: Kimi 含む)— cursor/opencode/kimi の 3 面は上流に前例がなく、Amadeus 独自の方式決定(folder-drop+フック compose、または明示 degrade)が必要
- 上流は Kiro を「信頼ゲートなし folder-drop」とする。Amadeus は独自の trust grant 機構を既に持つため、上流より強い trust 契約を維持したまま folder-drop を受ける設計余地がある(安全契約維持は intent-statement 成功指標 5)
- 上流自身の未実装(when: 評価、adds.scopes、plugin scope、agents/memory/knowledge 投影、lockfile)は非目標として除外済み — 追従不要

## リスク分析(要点 — 詳細は raid-log)

最大リスクは「各ハーネスのネイティブ導入機構」という外部 seam の未実測(存在実測と語彙実測の区別 — 確約は能力マトリクス実測後)。次点は SessionStart 自動 compose のセッション起動コストと、32 ケース × 7 ハーネスの適合テスト規模。いずれも設計で吸収可能で、hard blocker は特定されていない。手動 fallback(folder-drop + 明示 compose コマンド)は全ハーネスで成立するため、最悪でも「自動 trigger なし・文書化された手動経路」の degrade 契約で着地できる。

## 推奨着手順(delivery への示唆)

1. 能力マトリクス(7 ハーネス実測)— 最大不確実性を最初に潰す
2. compose CLI 入口 + ハーネス投影 packaging(walking skeleton: 1 ハーネスで install→compose→通常 scope 実行の E2E)
3. 残ハーネスへの展開 + 適合テスト(上流 32 ケース追跡表)
4. activation policy ADR(application-design ゲート)+ docs 同期
