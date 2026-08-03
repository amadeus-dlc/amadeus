# Performance Test手順

## 上流成果物と適用判断

`code-generation-plan.md`と`code-summary.md`、Requirements NFR-1〜NFR-6にはlatency、throughput、resource、wall-clockの定量性能目標がない。新しいservice、looping workload、network、databaseも追加しないため、専用performance testは非適用とする。

## 代替検証

- pure extractor／comparatorは小さなsource textを決定的に処理し、unit testからin-process実行する。
- live integrationは既存test runnerの通常timeout内で完了することを確認する。
- repository `tests/perf/`へ根拠のないwall-clock testを追加せず、既存daily performance tierを変更しない。

## 合格基準

performanceをPASSと表現せずN/Aとする。将来、registry数またはsource sizeに定量上限が承認された場合にのみ、同一runner・warm-up・反復数を固定したbenchmarkを追加する。
