# Integration Test Instructions — 260814-t99-copytree-race

上流入力: `code-generation-plan.md` / `code-summary.md`。

## 対象

- 患部の直接検証: `bun test tests/integration/t-fixtures-copy-tree-retry.integration.test.ts` → 12/12(dest>src 収束・診断差分・truncation・(none)・ENOTDIR catch を含む)
- 発現面の回帰: `bun test tests/integration/t99-learnings-gate-flow.test.ts` → 17/17

## フルスイート

- `bash tests/run-tests.sh --ci`(テストヘルパ変更のため絞り込みで完了としない)→ RESULT: PASS 実測済み(単独所有実行)
