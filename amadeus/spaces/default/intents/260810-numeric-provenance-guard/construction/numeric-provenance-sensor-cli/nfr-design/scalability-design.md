# Scalability Design — numeric-provenance-sensor-cli

唯一のpresent consume `business-logic-model.md` は1成果物を評価する同期短命CLI (`business-logic-model.md:101-111`) とevaluation-local state (`business-logic-model.md:113-120`) を定義する。NFR Requirements成果物はabsent-and-expectedであり、cloud scale IDは新設しない。

## Scale unit

scale unitは1成果物に対する1 CLI invocationである。1 invocationは次を共有しない。

- mutable global state。
- cross-process cache。
- queue、database、network connection。
- previous artifactのclaim/provenance index。

既存dispatcherがstage outputごとのinvocation数と順序を所有する。新規toolは複数成果物batch、worker pool、load balancerを所有しない。

## Per-artifact scaling

1成果物内では入力byte数に対してO(n)のregion/claim/provenance indexを構築する。claimごとの全文rescanを禁止し、evaluation-local memoryだけを使う。入力sizeによるhard skipを設けないため、大きなfileでも意味論は同じである。

100KBは性能受け入れ点であり最大file sizeではない。100KB超の容量limitや別modeが必要になった場合は新しいrequirementで定義する。

## Multi-artifact concurrency

invocationがstatelessなため、dispatcherまたはtest runnerが複数processを並行実行しても意味上の共有競合はない。ただし本Unitは並列度を決定せず、同一output fileへのwriterも持たない。

Generated Mappingはmodule-level readonly constantであり、各processが同じrevisionを読む。runtime更新、watch、hot reloadは行わない。

## Capacity behavior

| Pressure | Behavior |
| --- | --- |
| artifact数増加 | invocation数へ線形分解、共有stateなし |
| 1 artifactのline増加 | single-pass O(n) |
| claim密度増加 | region-local index参照、全文再scanなし |
| relative link重複 | invocation-local memoでprobe重複排除 |
| concurrent invocations | independent process、audit集約は既存dispatcher所有 |

## Non-applicable infrastructure

autoscaling group、Kubernetes、Lambda concurrency、load balancer、shard、partition、CDN、distributed cacheは非該当である。AWS support perspectiveからも、新規resourceを追加するworkloadではない。

## Verification

- 異なる2成果物を別processで評価し、結果が実行順に依存しない。
- 同一成果物のrepeat evaluationがbyte-equivalentなverdict dataを返す。
- 50KB→100KBでmedian比が既存予算内に収まる。
- cache/historyをclearするpublic APIが存在しないことをmodule surfaceで確認する。
