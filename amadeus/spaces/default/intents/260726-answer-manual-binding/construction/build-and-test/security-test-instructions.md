# Security Test Instructions — 260726-answer-manual-binding

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-answer-manual-binding/code-generation/ — 検証対象・実測 exit code・逸脱裁定の導出元)。

## 対象変更のセキュリティ回帰(target-scoped)

- guard(manual 引数検証)・executionAuthorization・requireAuthorization の不変量は無変更(reviewer が diff 実測で確認 — code-generation-plan.md Review 節)。補填値は永続 provenance(expected)由来で外部入力の昇格なし
- consume は bindingId+answerId 一致時のみ(reducer 既存検査)— 認可バイパスの追加なし

## リポジトリ全体の依存 audit

別判定。依存追加ゼロ。既存 advisory 棚卸しはスコープ外。
