上流入力(consumes 全数): code-generation-plan, code-summary

# セキュリティテスト手順

## 選定判断

**追加スキャンなし**。build-and-test:c3 規範(攻撃面・依存・承認 NFR の実測明記がある場合のみ比例選定)に従う。本 intent は依存追加ゼロ・ネットワーク境界なし・入力は CLI 引数のみ。セキュリティ関連の実質的検証は t256 の fail-closed 系(不在 intent/space での loud exit 1、無言フォールバック禁止 — code-summary の fail-closed 節)が担い、パストラバーサル面は既存の `activeIntent`/`readStateFile` の解決機構(fork/merge と同一経路)を流用することで新規面を作っていない。

## 既存必須ゲート

既存 CI の必須ゲート(lint/type-check/drift)は省略せず全実行する(本書は省略根拠にしない)。
