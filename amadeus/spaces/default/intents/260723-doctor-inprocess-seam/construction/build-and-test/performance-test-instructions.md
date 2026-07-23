# Performance Test Instructions — Doctor in-process seam

## 上流成果物

- `construction/doctor-inprocess-seam/code-generation/code-generation-plan.md`
- `construction/doctor-inprocess-seam/code-generation/code-summary.md`

## 適用判定

`requirements.md` と Code Generation 成果物に latency、throughput、concurrency、
resource 使用量の定量 NFR はない。常駐 service や production-like load target も
存在しないため、load/stress/soak test は N/A とする。

## 実行内容

性能 gate は新設しない。通常の test runner が報告する wall time は flakiness と
hang の診断情報としてのみ記録し、SLO や性能達成値へ昇格させない。

## 将来の再評価条件

- doctor の最大実行時間または workspace 規模別 target が要件化された場合
- graph/catalog 規模に対する定量 throughput が定義された場合
- current suite に10%超の継続的な実行時間退行が観測された場合

いずれかが成立した時点で、固定 fixture と複数回測定による benchmark を設計する。
