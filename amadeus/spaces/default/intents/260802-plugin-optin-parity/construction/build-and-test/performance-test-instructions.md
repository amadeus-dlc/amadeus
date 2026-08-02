# Performance Test Instructions — plugin-optin-parity

`code-generation-plan.md` Step 9と `code-summary.md` のNFR-4測定を再現し、起動時reconciliationの退行を判定する。

## 実行方法

```bash
bun test --timeout 120000 tests/perf/t413-plugin-optin-startup-performance.test.ts
```

同一runner上でbaselineと変更後を交互測定する。未選択とcurrentは各100回、初回導入は明示install+compose baselineと自動導入を各30回測定し、p95を比較する。

## 合格基準

- 未選択・currentのp95増加が `max(20%, 25ms)` 以下。
- 初回導入のp95増加が `max(20%, 50ms)` 以下。
- 平均値ではなくp95で判定し、各sample countと実測値を `build-test-results.md` に記録する。
- これは短命CLIのfile境界性能検証であり、常駐service向け負荷・soak・auto-scaling試験は非適用とする。
