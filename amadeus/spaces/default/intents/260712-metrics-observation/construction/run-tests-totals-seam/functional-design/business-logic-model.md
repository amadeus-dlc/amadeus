# Business Logic Model — U1: run-tests-totals-seam

- 責務: run-tests.ts の集計カウンタ(totalFiles/failedFiles/totalTests/totalFailed、:398-401)を `tests-totals.json` として書き出す(coverage-totals.json :610 と同型・同タイミング)。
- 書き出し位置: **`combineCoverageReports()` とは別の、`args.coverage` に依存しない新規呼び出し箇所**(printSummary() 呼び出し直前)に置く — writeCoverageTotalsJson は combineCoverageReports 内(:637)にあり `if (!args.coverage) return;`(:619)で早期リターンするため「同タイミング」は不成立(reviewer F3 実測)。値源は SUMMARY と同一カウンタ(表示と機械出力の乖離を構造的に防ぐ)。
- 失敗時: 書き出し失敗は runner の exit code に影響させない(coverage-totals と同じ best-effort。snapshot 側は不在を fault として loud fail する分界 — FR-4 は消費側の契約)。
