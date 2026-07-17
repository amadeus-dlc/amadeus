# Deployment Strategy — eoc1-gate-check

## 上流入力(consumes 全数)

`../../construction/eoc1-gate-guard/infrastructure-design/deployment-architecture.md`(配布=npm/タグ、デプロイ基盤なし)、`../../construction/ci-pipeline/ci-config.md`、`../../construction/build-and-test/build-and-test-summary.md`、cd-config.md、`../../construction/ci-pipeline/quality-gates.md`。

## 戦略(既定合流)

main マージ = 即時有効(セルフホスト運用 — 各 worktree は fetch/merge で新ガードを取得。私の conductor ツリーはミラーで先行適用済み = dogfooding 3回)。トラフィック切替・カナリアは N/A(根拠: ランタイムサービス不在 — CLI ツール)。
