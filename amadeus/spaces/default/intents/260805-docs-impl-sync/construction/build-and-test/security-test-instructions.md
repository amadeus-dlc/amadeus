# Security Test Instructions — docs-impl-sync

上流入力(consumes 全数): code-generation-plan.md(変更面の確認)、code-summary.md(認証情報・攻撃面への非接触の確認)

## 判定: N/A(比例選定 — 専用検査は実施しない)

本 intent の変更は docs/ + README*.md の記述のみで、認証・認可・入力検証・依存関係・シークレットのいずれにも触れない(全 Bolt の `git status` 実測)。承認済み NFR にセキュリティ要件は存在しない。`cid:build-and-test:c3`(攻撃面・依存・承認 NFR を実測明記した場合のみ検査を比例選定)に基づき、専用のセキュリティ検査は生成しない。

## 付随的な担保 (1) docs へ書かれた値はすべて実装実測からの転記であり、実在しない手順・コマンドの案内(読者を危険操作へ誤誘導するクラス)を FR-2 で全件除去した(D-1 の Kimi 0.28.1 誤案内是正を含む) (2) builder は成果物へ credential を書き込む作業を持たず、audit の Purpose 欄は credential スクラブ済み機構を通る。既存の必須スキャン・依存監査の省略根拠には使わない。
