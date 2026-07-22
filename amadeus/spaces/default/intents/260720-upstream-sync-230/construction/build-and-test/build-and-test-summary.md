# Build and Test Summary — upstream-sync-230

> 上流入力(consumes 全数): 全12ユニットの `code-generation-plan.md`、`code-summary.md`

## 対象と戦略

- 12ユニット(U01-U12)の code-generation 完了成果を、単一のビルド+テスト工程で統合検証する。Test Strategy: Comprehensive(state 宣言)。
- 検査体系: build 同期4ゲート(typecheck/lint/dist:check/promote:self:check)+ 品質2ゲート(complexity/coverage-registry)+ 全層テスト(`bash tests/run-tests.sh --ci` = smoke/unit/integration/e2e)。
- 性能・セキュリティは承認済み NFR へ trace できる検査のみ選定(performance-test-instructions.md / security-test-instructions.md — build-and-test:c1/c3 準拠)。

## 統合結果の要旨

- 全ゲート green(実測値は build-test-results.md)。full CI は 415 テストファイル・失敗0。
- FR-8 ledger: 現況 `INTENT_IN_PROGRESS`。`APPLIED` への遷移は「24項目 disposition+必須 gate 全 green+最終 SHA」の三条件ゲート(U12 `planLedgerTransition`)を通し、**main への着地(PR マージ)後**に最終 Amadeus 比較 SHA を確定してから行う — 未着地 SHA での先取り記録はしない(close-after-landing)。
- 既知の advisory: wall-clock drift 2件(本 intent 非改変ファイル、負荷起因)。
