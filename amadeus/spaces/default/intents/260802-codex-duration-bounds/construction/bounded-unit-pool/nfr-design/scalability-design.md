# Scalability Design — bounded-unit-pool

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Queue Model

`PoolProjection`はordered queue、active Map、terminal Map、next sequenceを保持する。全Unit submit後もspawnはslot取得時だけで、retry entryは新sequenceで末尾へ置く。

## Configuration

`max-parallel-units`をglobal→space→intentで解決し、1〜4だけを許可する。batch sizeより小さい値をeffective capとし、driver別pool、priority、dynamic autoscaleを持たない。
