# Unit Test Instructions — integrity-batch

- 実行: `bash tests/run-tests.sh --unit`(または `bun tests/run-tests.ts --unit`)
- 本 intent の追加ユニットテスト:
  - `tests/unit/t203-mint-presence-classify.test.ts`(#708、7ケース): 機械注入スキップ/fail-open 網羅/プライバシー(SENSITIVE マーカー)
  - `tests/unit/t203-codekb-rescan.test.ts`(#707、11ケース): per-intent re-scan パス解決、in-process CLI ハンドラ(coverage 計測用)、spawn 実 CLI
- カバレッジレジストリ整合: `bun tests/gen-coverage-registry.ts --check`(exit 0 必須。none→cli 再分類は gen-coverage-registry.test.ts のラチェットで管理)
