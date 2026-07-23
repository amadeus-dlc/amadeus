# Scalability Requirements — status-registry

`business-logic-model`、`business-rules`、`requirements`、`technology-stack`が示す単一workspace・単一JSON registryを対象とする。

## Capacity envelope

- 保証dataset: 0〜10,000 entries。
- 時間計算量: read、validate、migration、verificationはいずれもO(n)。
- 空間計算量: O(n)、独立child processで測るpeak incremental RSS p95 ≤ 64MiB。
- target件数0、1、重複、およびtargetが先頭・中央・末尾のfixtureで同じ複雑度を維持する。

## Growth behaviour

10,000 entriesを超える場合も恣意的に拒否するhard capは導入しないが、保証範囲外としてbenchmark warningを記録する。O(n²) regressionはdataset 1k/2k/5k/10kの傾きから検出し、10倍入力で処理時間が25倍を超えればfailとする。

## Non-applicable scaling modes

horizontal scaling、replica、sharding、autoscaling、multi-region、distributed cacheはN/A。理由はlocal CLIがworkspace lock下で一つのregistry fileを扱い、network requestや同時writer fleetが存在しないためである。これらを導入しないことは既存architectureの単純性を保つ。
