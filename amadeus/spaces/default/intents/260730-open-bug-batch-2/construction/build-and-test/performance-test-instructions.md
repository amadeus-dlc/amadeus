# Performance Test Instructions — 260730-open-bug-batch-2

上流入力(consumes 全数): 6 unit の code-generation-plan.md・code-summary.md(fix-1769-degrade-multiunit / fix-1749-phase-check-name / fix-1734-scopegrid-order / fix-1735-autosolo-protocol / fix-1742-sensor-scope / fix-1750-intent-initialized)— 検証対象・手順・実測証拠は各 unit の plan/summary から導出。

## 判定: N/A(反証可能根拠付き)

requirements に性能 NFR は無い。変更面は directive 発行時の readdirSync+集合演算・promote:self のソート・protocol 散文で、trace 可能な負荷検査対象が無いため比例選定により生成しない。CI の Intent Mirror benchmark(3レプリカ+分散ゲート)と Tests の wall-clock drift 検査が横断監視する(#1791 で digestMatrix 分散フレークを実測・再実行で green 収束)。

## 再判定条件

directive 発行経路へ閾値付き性能 NFR が導入された場合は失効し、タイミングシームの決定的検証で再選定する。
