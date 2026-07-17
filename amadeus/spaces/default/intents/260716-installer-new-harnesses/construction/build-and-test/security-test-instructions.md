# Security Test Instructions — Issue #1048

上流入力(consumes 全数): `../installer-enum-extension/code-generation/code-generation-plan.md`(変更目録)、`../installer-enum-extension/code-generation/code-summary.md`(検証実測)。

## 選定(build-and-test:c3 — 比例選定)

追加セキュリティ検査は選定しない — SR-2/SR-4(新規攻撃面・新規依存・承認済みセキュリティ NFR いずれも不存在、実測根拠付き)。既存必須検査の省略根拠にはしない(lint/typecheck/テストは全て実行済み)。

## 保存検証(実施済み)

- 入力拒否(SR-1): `--harness foo` → exit 2+6値列挙を integration テストで実測
- 依存不変: bun.lock 差分なし(diff stat 27ファイルに lockfile 不含)
- シークレット: 変更面に該当なし(SR-3)
