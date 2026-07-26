# Security Test Instructions — metrics 可視化

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

両 unit の code-generation-plan.md(実施計画・検証手順)と code-summary.md(変更ファイル・検証結果)を検証対象の定義として消費する。

## 方針(承認済み NFR へ trace する範囲のみ)

- U1-SEC-01(self-contained): unit テストの http/https 非出現 grep assert(実装済み)
- U1-SEC-02(全数エスケープ): escapeHtml unit テスト+reviewer のコード全数検分(未エスケープ埋め込み0箇所を実測)
- U2-SEC-02(CI 権限不変): ci.yml diff レビューで permissions 変更なしを確認(実施済み)
- DAST・依存監査の新設: N/A(依存追加ゼロ・ネットワーク I/O ゼロ — services.md 境界。既存必須スキャンの省略根拠にはしない)

## 実測記録

- self-contained grep・エスケープ全数検分・CI permissions 不変 — いずれも build-and-test-summary.md の実測サマリへ集約済み
