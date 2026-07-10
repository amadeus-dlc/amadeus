# Unit Test Instructions — pbt-small-band

- 通常実行: `bash tests/run-tests.sh --unit`(PBT は固定 seed 6187376 / numRuns 100)
- 本 intent の新規テスト: setup-semver.pbt / setup-manifest.pbt / setup-plan-decisions / t204-audit-escape.pbt(いずれも in-process Small)+ t205-audit-escape-seams(medium、実経路シーム)
- **PBT 深掘り**: `AMADEUS_PBT_DEEP=1 bun test <pbt files>`(numRuns 50,000)— リリース前の高予算実行。失敗時は seed/counterexample が出力され、shrink 済み反例は example-based としてピン留めコミットする(規約は setup-semver.pbt.test.ts 冒頭が canonical)
- カバレッジ整合: `bun tests/gen-coverage-registry.ts --check`
