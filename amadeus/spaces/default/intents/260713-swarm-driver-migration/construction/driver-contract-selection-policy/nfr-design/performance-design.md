# Driver Contract & Selection Policy Performance Design

## 入力契約と設計境界

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。U-01は同期pure moduleであり、provider probe、filesystem、process、audit、checkpointを実行しない。

wall-clock latencyを最適化対象にせず、I/O call 0、candidate各最大1評価、`O(n log n)`以下、追加memory `O(n)`以下という構造budgetをcomponent designへ割り当てる。

## Processing pipeline

| Component | Algorithm | Time | Additional memory | I/O |
|---|---|---:|---:|---:|
| `SwarmEnvironmentProjection` | known 2 keyのpresence/classificationをfixed lookup | `O(1)` | `O(1)` | 0 |
| `DriverRequestParser` | closed value/legacy/default判別 | `O(1)` | `O(1)` | 0 |
| `TopologyNormalizer` | validate、stable sort、adjacent exact dedupe、classification | `O(n log n)` | `O(n)` | 0 |
| `CandidatePolicy` | fixed harness/topology table lookup | `O(1)` | `O(1)` | 0 |
| `CapabilitySelector` | candidate最大4件を一度ずつ評価 | `O(c)`、`c<=4` | `O(c)` | 0 |
| `LegacyResolver` | fixed harness/value-class table lookup | `O(1)` | `O(1)` | 0 |
| `OutcomeProjector` | allowlist fieldのcanonical projection/sort | output線形 | output線形 | 0 |

`TopologyNormalizer`はraw signalsを1回だけmaterializeし、validation後の同じcollectionをstable sort/dedupe/classifyへ渡す。selectorで再sort・再scanしない。

## Optimization decisions

- immutable driver/harness/reason/candidate tableはmodule constantとして共有するが、per-input resultやprobeをcacheしない。
- topology signalのcross-productを作らず、`unit + fixed kind rank` comparatorでsortし、隣接重複だけを除く。
- capability detailはcandidate keyで一度indexし、同じcandidateを再評価しない。
- outputはdomain valueからallowlist projectionを1件だけ作り、deep cloneやredaction copyを重ねない。
- recursion、async task、worker pool、connection/resource pool、lazy I/Oを使わない。

## Performance verification seams

| Requirement | Design seam | Test |
|---|---|---|
| U01-PERF-01/02 | projection/parserはportを受けずknown key accessorだけ | canary proxy/static dependency |
| U01-PERF-03 | selectorがevaluation traceをtest observerへ返せるpure diagnostic seam | candidate spy count |
| U01-PERF-04/05 | comparator/index operationをtest-only counterで観測 | generated size ladder |
| U01-PERF-06 | canonical projectorのfield manifest | unknown/copy count test |
| U01-PERF-07 | global mutable stateなし | 10,000 fast-check repeat/parallel call |

test observerはproduction outcomeへ含めず、pure helperの返値またはdependency-free counter wrapperとしてtest moduleだけで使う。

## 非適用patternと回帰gate

cache、CDN、database query、connection pool、pagination、queue、async jobは構成要素がないため非適用である。次を回帰として拒否する。

1. filesystem/process/network/clock/random portの追加。
2. topologyのnested pair scanまたはinput全体の複数clone。
3. candidateの二重評価、cross-run memoization、mutable singleton。
4. machine wall-clock benchmarkを必須merge gateにする変更。
