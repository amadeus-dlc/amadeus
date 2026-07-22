# Performance Test 手順 — leader-sync-tool(U1)

上流入力: `code-generation-plan.md`、`code-summary.md`

## 適用範囲

- 承認済み performance NFR は専用 SLO を持たない。単発の repo-local CLI であり、専用 load/stress/soak test は非適用。
- `SYNC_SPLIT_FILE_LIMIT=300` が単一 create の上限 guard、現行 elections 全量 corpus sweep が O(n) 走査の実行実証となる。

## 観測方法

- focused suite と全 CI の wall-clock を観測値として記録するが、未承認の閾値へ昇格させない。
- corpus sweep の完走、分割上限超過の loud refusal、走査結果の決定性を合格条件とする。

## 判定

- 実行時間は回帰診断情報であり service SLO ではない。timeout が出た場合は対象単独再実行と ambient 負荷を分離する。
