# Scalability Design — runtime-recovery

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。service scalingではなく、Unit DAG、audit shard、projectionのclosed setを決定的に処理する。

## Closed capacity matrix

| Axis | Closed set | Design |
|---|---|---|
| DAG consumers | per-unit loop、coverage guard、swarmの3 consumer | 単一resolved batchesを共有 |
| chronology | 全shardの関連6 event | Timestamp + buffer positionで一意順序化 |
| approve batch | Recovered 3 + normal 2の5 blocks | memory生成/検証後に単一atomic commit |
| package projection | 現行6 harness | authored sourceからgenerator導出 |
| self-install | 現行4面 | closed listをpromote/check |

3/5/6/4は既決contractであり、将来予測値ではない。新consumer、event、layout、harnessを正本承認なしに追加しない。

## Deterministic expansion

canonical DAGを一度resolveし、全consumerへ同じimmutable resultを渡す。audit evidenceは一回filter/sortし、shard filenameやfilesystem discovery orderへ依存しない。read-side recoveryはwrite amplificationを起こさず、persistent healを既存runtime compileへ集約する。

5 block commitはblock数分の逐次disk appendを行わない。large/multi-shard fixtureでもsecond run no-opと同一Unit集合を保証し、worker pool、database、queue、autoscaling、別indexを追加しない。

## Capacity fixture

cache mismatch、cycle、unknown edge、timestamp tie、filename逆転、各commit failure、state-write recovery、6/4 projection matrixをtable-drivenで全数検査する。代表sampleだけのgreenを認めない。

## トレーサビリティ

本設計は`scalability-requirements.md`のSCALE-U02-01〜04、`performance-requirements.md`の有界処理、`security-requirements.md`のscope固定、`reliability-requirements.md`のidempotency、`tech-stack-decisions.md`のpackage/test境界、`business-logic-model.md`のConsumer/Evidence flowへ対応する。
