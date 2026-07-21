# Scalability Design — routing-and-autonomy-guards

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。runtime trafficではなく、単一marker、共有decision table、projectionのclosed setを決定的に処理する。

## Closed capacity matrix

| Axis | Closed set | Design |
|---|---|---|
| help parser surfaces | engine、terminal、direct utilityの3入口 | 同じ`classifyHelpIntent` tableを再利用 |
| marker ownership | workspace-level単一path + 単一24h TTL | Stop hookとdoctorが同じ`inspectComposeMarker`を再利用 |
| marker side effects | non-autonomous stale時の単一unlink | background sweepやrecord fan-outなし |
| package projection | 現行6 harness | authored sourceから既存generatorで全数導出 |
| self-install | 現行4面 | closed listを既存promote/checkで維持 |

単一、3入口、6 harness、4 self-installは既決inventoryであり予測値ではない。新grammar、harness、install面は正本更新と再承認なしに増やさない。

## Deterministic expansion

help分類はtoken数に対する有界走査、marker分類は単一stat、stale cleanupは単一unlinkで完結する。workspace数、intent数、record数へfan-outせず、filesystem watcher、workspace sweeper、daemon、parallel workerを追加しない。

同一source/manifestから同一6面bytesを生成し、missing、duplicate、order drift、orphan projectionを非0にする。self-installはpackage 6面と混同せず既存4面だけを検査する。

## Capacity fixture

table-driven fixtureでhelp 3入口、marker absent/fresh/stale/unreadable/autonomous、doctor read-only、recompose before/after bytes、6/4 projection matrixを全数検査する。代表sampleだけのgreenやrecursive workspace sweepを認めない。

## トレーサビリティ

本設計は`scalability-requirements.md`のSCALE-U04-01〜04、`performance-requirements.md`の有界処理、`security-requirements.md`のscope固定、`reliability-requirements.md`のdeterminism、`tech-stack-decisions.md`のpackage/self-install境界、`business-logic-model.md`の責務境界とProjectionを実装へ渡す。
