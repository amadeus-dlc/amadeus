# Scalability Design — status-registry

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`が定める単一workspace registryを対象にする。

## Capacity architecture

- 0〜10,000 entriesを保証範囲とし、decode、strict validation、target scan、candidate verificationをO(n)時間・O(n)memoryに保つ。
- target indexを先頭・中央・末尾に置くfixtureで全scanを確認し、nested full scanやentryごとのreparseを禁止する。
- 10,000 entries超を恣意的に拒否せず、保証範囲外warningをbenchmark outputへ記録する。

## Scale validation

- 1k/2k/5k/10k fixtureは同じentry shapeとbyte densityで生成し、各点を独立processで測定する。
- 1kから10kへの10倍増加でmedian時間が25倍を超えた場合、complexity gateを失敗させる。
- peak incremental RSSは10k fixtureで64 MiB以下とし、noop baselineとの差分で測る。

## Non-applicable infrastructure

- horizontal replica、shard、load balancer、distributed cache、autoscaling、multi-regionは導入しない。
- local JSON、workspace lock、短命Bun processがfailure/capacity boundaryであり、AWS resourceやnetwork serviceは存在しない。
