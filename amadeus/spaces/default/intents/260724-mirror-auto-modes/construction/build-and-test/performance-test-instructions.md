# Performance Test Instructions — mirror-auto-modes

## NFRと測定境界

各Unitの`nfr-requirements/performance-requirements.md`と`code-generation-plan.md`／`code-summary.md`を上流とする。常駐service SLOは存在しないため、CLI／local filesystem／build-time workloadのabsolute budgetとcall countを検証する。

- Contract/Policy: pure policy p95、selector read回数、background workload 0
- Gateway: 10／30／60秒deadline、1 mutation、process残存0
- State: no-op write 0、atomic transition、capacity上限
- Lifecycle: completion最大3 operation、CAS再評価最大1
- Distribution: package／check／promote／docs／digestの5 workload

## ローカル実行

1. `bun test tests/integration/t269-amadeus-mirror-contract-policy-performance.integration.test.ts tests/integration/t292-mirror-distribution-performance.integration.test.ts`
2. `bun run distribution:benchmark`
3. benchmark JSONを`bun run distribution:benchmark:aggregate -- <replica-json...>`へ渡す場合は、同一imageの3 replicaだけを使用する。

## 判定

ローカル測定はprotocolと明白な回帰の確認に限定する。PERF-DD-01〜05の正式判定は`.github/workflows/ci.yml`の`ubuntu-24.04`／Bun 1.3.13、3 replica、各3 warm-up＋20 runのaggregateを権威とする。欠損、image不一致、非数値、max/min比2.0超はpassへ丸めない。
