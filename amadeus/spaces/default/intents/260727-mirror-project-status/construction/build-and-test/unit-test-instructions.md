# Unit Test Instructions — 260727-mirror-project-status

上流入力(consumes 全数): code-generation-plan, code-summary(u1-project-sync-skeleton / u2-state-reconcile-hardening / u3-lifecycle-integration / u4-config-overrides-and-diagnostics / u5-docs-and-distribution の全5ユニット)

## フレームワークと実行方法

- bun test(自作ランナー tests/run-tests.sh が smoke/unit/integration/e2e の4層を統括)
- 個別実行: `bun test tests/unit/<file>` / 層一括: `bash tests/run-tests.sh --ci`
- unit 層は純関数直叩きのみ(実 FS・process を使う検証は integration 層 — fs-tests-integration-first)

## テストインベントリ(Comprehensive 戦略 — 変更コンポーネント全数をカバー)

| ファイル | 対象コンポーネント | 主要ケース |
|---|---|---|
| tests/unit/t343-amadeus-mirror-project-config.test.ts | C1 config parse | mirror-projects 要素 parse・closed schema 拒否・N 要素一般化(u4 更新) |
| tests/unit/t344-amadeus-mirror-project-reconcile.test.ts | C2 reducer | 9セル遷移(synced/pending/safety-blocked × 3分類)の全数対照 |
| tests/unit/t347-amadeus-mirror-completion-gate.test.ts | completionProjectGate | ready/blocking 全分岐・rename された done 名で判定/既定名では通らない対照ペア |
| tests/unit/t348-amadeus-mirror-project-config-overrides.test.ts | C1 層解決 | 層全置換(マージなし)・auto-mirror 独立・status-names 既定表フォールバック |
| tests/unit/t285-mirror-projection-registry.test.ts | 配布台帳 | MIRROR_TOOL_FILES/PROJECTIONS 件数不変 |

## カバレッジ目標

- 変更行の patch カバレッジ未カバー 0(coverage-patch-gate / local-lcov-pre-push)
- reducer・gate 純関数は分岐全数(9セル・4値)を明示ケースで固定

## テストデータ

fixture は各テストファイル内で構築(外部 fixture ディレクトリ不使用)。手動セットアップ不要。

## 実測(測定 ref = 45a09c9a0、conductor 再実行 2026-07-28)

unit+integration mirror 面 10ファイル合算 168 pass / 0 fail / 409 expect() calls
