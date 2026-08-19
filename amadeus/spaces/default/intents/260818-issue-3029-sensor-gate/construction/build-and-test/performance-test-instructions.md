# Performance Test Instructions

## 適用判定

Requirements の NFR に latency、throughput、capacity、SLA の目標値はなく、本 Issue は同期的な audit predicate の意味修正である。そのため新規 load/performance test は **N/A** とする。

## 代替確認

対象 unit evaluator は決定的な in-memory audit 判定であり、既存 t511 の実行時間を回帰観測として記録する。新しい性能目標を発明しない。
