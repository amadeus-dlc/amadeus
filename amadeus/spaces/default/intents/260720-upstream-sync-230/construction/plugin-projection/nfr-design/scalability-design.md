# Scalability Design — plugin-projection

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Closed capacity model

本Unitのscalabilityはservice auto-scalingではなく、plugin/artifact数に対する決定的batchと既決配布matrixである。packageは6 harness、self-installはclosed 4 harnessとし、新harnessやpromotion対象を動的に追加しない。plugin 0件、1件、複数件を同じpipelineで処理し、1件以上の場合だけplugin-owned pathを期待集合へ加える。

pluginとartifactをcanonical sortして一度validateし、同一normalized snapshotを6つの既存`HarnessManifest`へ投影する。harness固有path、token、rules rename、frontmatter変換は既存manifest-driven変換へ委譲し、plugin側へharness別copy logicを持たせない。

## Load distributionとpartitioning

分散worker、queue、database partition、network registryは設けない。論理的partition keyはharness、plugin identity、artifact relative pathであり、各partitionの期待pathをtemp root上へ構成した後、全体のcollisionとread-setを検査する。commit単位は6面全体で、harnessごとの成功を独立commitへ分割しない。

driftは期待path集合、committed path集合、discovered source集合、read-setの比較から全件導出し、harness、kind、path順へ固定する。先頭failureで残余driftを隠さず、`MISSING`、`DIFFERS`、`ORPHAN`、`UNREFERENCED`以外の新分類を増やさない。

## Capacity verification

- plugin 0/1/multipleのfixtureで、追加pathがplugin ownershipへ限定される。
- 6 package面と4 self-install面を別matrixとして全数検証し、一方の成功を他方へ流用しない。
- discovery、plugin、artifact順を反転してもprojection bytesとdrift全件順が一致する。
- 新しいcapacity threshold、auto-scaling rule、cache tier、parallelism policyを導入しない。

## トレーサビリティ

本設計は`scalability-requirements.md`のSCALE-U09-01〜04を中心に、`performance-requirements.md`のcanonical batch、`security-requirements.md`のownership collision、`reliability-requirements.md`の全件drift、`tech-stack-decisions.md`のHarnessManifest再利用、`business-logic-model.md`のDeterministic orderingへ対応する。
