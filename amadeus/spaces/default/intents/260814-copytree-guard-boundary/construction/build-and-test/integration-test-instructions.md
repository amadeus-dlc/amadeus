# Integration Test Instructions — 260814-copytree-guard-boundary

上流入力: `code-generation-plan.md` / `code-summary.md`。

## 対象

- 経路検証: `bun test tests/integration/t-tui-fixtures-copy-guard.integration.test.ts` → 4/4(5 面の guard 経由 + エラーパス伝播)
- 患部直接: `bun test tests/integration/t-fixtures-copy-tree-retry.integration.test.ts` → 12/12(exists スタブ削除後も assert 変更 0)
- 消費回帰: `bun test tests/integration/t-kiro-tui-live-gate.integration.test.ts` → 12/12

## フルスイート

- `bash tests/run-tests.sh --ci` → RESULT: PASS 実測済み(13,412 assertions / 0 fail、単独所有実行)
