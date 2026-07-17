# Rollback Runbook — eoc1-gate-check

## 上流入力(consumes 全数)

`../../construction/eoc1-gate-guard/infrastructure-design/deployment-architecture.md`(配布=npm/タグ、デプロイ基盤なし)、`../../construction/ci-pipeline/ci-config.md`、`../../construction/build-and-test/build-and-test-summary.md`、deployment-strategy.md、`../../construction/ci-pipeline/quality-gates.md`。

## 手順(deployment-pipeline:c3 準拠)

1. 偽陽性ブロック等の重大不具合時: 通常 PR で該当コミットを `git revert`(履歴 rewrite・force push 禁止)→ 2名レビュー → auto/承認マージ
2. 検査は state 非破壊(fail 時も record 無変更)のため revert に随伴データ修復なし
3. 緊急回避(revert 着地までの暫定): 対象 intent の questions へ正当な証跡行を記載すれば通過する(ガードの是正手順そのもの — 運用停止なし)
