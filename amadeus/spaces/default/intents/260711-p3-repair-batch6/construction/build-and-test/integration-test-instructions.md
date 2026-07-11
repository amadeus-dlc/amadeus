# Integration Test Instructions — p3-repair-batch6

## 実行

- 単層: `bash tests/run-tests.sh --integration`
- 本 intent の新規: `tests/integration/t211-linter-lint-check.test.ts`(#847 — lint:check 宣言 fixture の FAILED/PASSED/宣言なし3状態。実 linter は spawn しない hermetic 構成)、`tests/integration/t215-*`(#848 — 起票時再現の verbatim 閉包: 拒否→宣言→通過+GUARD_EXEMPTED 記録、env bypass 独立性)

## 注意

- 統合面の registry 追記(EXPECTED_NONE_TO_CLI)は着地済み(t215 は #879 の t214 と番号衝突→リネーム+union 解決済み)。
