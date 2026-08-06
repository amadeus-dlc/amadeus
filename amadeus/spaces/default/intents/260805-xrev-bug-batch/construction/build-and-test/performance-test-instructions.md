# Performance Test Instructions — 260805-xrev-bug-batch

## 適用判断

本 intent に**性能 NFR は存在しない**（requirements.md に性能要件の記載なし）。したがって専用の負荷試験・
ベンチマークは作らない。ただし患部の一つが**監査シャード全体の走査**（`readAllAuditShards` → 世代フィルタ）で
あるため、退行を検出する既存面のみ記録する。

## 既存の性能面（本 intent が新設しないもの）

```bash
bun tests/run-tests.ts --perf        # perf tier（既存）
```

- `tests/perf/t-pi-adapter-overhead.test.ts` 等が既存の overhead 予算を固定している
- 本 intent の変更は監査行ごとに文字列フィールドを1つ読む増分（`Plan generation`）であり、
  走査回数を増やさない（既存ループ内での判定追加）

## 測定しなかったこと（申し送り）

- 世代フィルタ追加後の `collectSwarmEvidence` の実測時間は測っていない。監査シャードが極端に大きい
  intent（数千行規模）での挙動は未確認であり、必要になった時点で perf tier に追加する
