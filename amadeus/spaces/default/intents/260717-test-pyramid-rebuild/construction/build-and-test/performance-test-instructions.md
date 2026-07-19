上流入力(consumes 全数): U1-size-ledger/code-generation/code-generation-plan.md, U1-size-ledger/code-generation/code-summary.md, U2-layer-spec-gate/code-generation/code-generation-plan.md, U2-layer-spec-gate/code-generation/code-summary.md, U3-migration-coverage/code-generation/code-generation-plan.md, U3-migration-coverage/code-generation/code-summary.md

# Performance Test 手順

## 適用判定

- U1〜U3はrecord materializationだけで、runtime service、処理アルゴリズム、dependency、runnerのdeltaがない。load/stress/soak testと新規benchmarkはN/A。
- U1はO(N)分類スイープの特性だけを持ち、独立した秒数SLOは存在しない。
- U2のsmoke 21秒、unit 128秒はref `244a196795f8b23192ed54dc1221b75d0c8e8f44`で承認されたguidelineであり、CI verdictや本runの強制gateではない。integration/e2e budgetはPENDING。
- U3 replay validatorは完全性・決定性の検査であり、performance PASSの代用品にしない。

## フレームワーク・データ・環境

- 専用performance framework、load generator、service fixture、性能用test dataはN/Aであり、追加しない。
- 副次観測にはBun 1.3.13の既存serial runnerだけを使う。host、ref、tier、失敗・skip状態を伴わないwall timeは比較値にしない。
- coverage targetは性能試験の代替ではない。combined coverageは回帰証拠として別に記録する。

## 実行と観測

専用performance commandは存在しない。通常のB&Tで次のserial runのwall timeを副次観測として記録する。

```bash
bun tests/run-tests.ts --smoke
bun tests/run-tests.ts --unit
bun tests/run-tests.ts --integration
bun tests/run-tests.ts --e2e
```

## 判定方法

- 秒数はcurrent worktreeの観測として記録し、U2 baselineやbudgetを暗黙更新しない。
- failed/skipを含むrunから数値budgetを導出しない。
- host、Bun、ref、serial条件が異なる値を同じ母集団として集約しない。
- service SLO、latency percentile、throughput、availabilityは実在service/SLIがないためN/Aであり、単発run成功をservice SLO達成へ昇格させない。

## 将来の再測定条件

実装・runner・母集団・host条件が変わりbudget再策定が必要になった場合だけ、U2で承認済みのtrial数、順序、fail-closed式、別の人間承認を用いる。
