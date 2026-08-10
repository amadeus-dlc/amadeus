# Scalability Design — stage-stats-attribution-service

## Scope and upstream applicability

present consumeの `business-logic-model.md` を対象とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected-absentで、declared NFR requirement IDはない。`requirements.md:299-305`と`services.md:98-104`をcontext evidenceとしてだけ使う。

## Scaling model

vertical single-process scalingを維持する。current-corpus下限は229 shard・136,011 rowで、同一processがscan、decode、account、compose、render、drainまで完走する。horizontal worker、load balancer、queue、database shard、remote cache、autoscaling ruleは導入しない。

| Growth dimension | Partitioning | Complexity | Guard |
|---|---|---|---|
| audit rows/shards | canonical path orderのstream-like scan、process-local corpus | scan/decode O(n) | scale preconditionをassert |
| candidate groups | intent×stage×family×identity `Map` | O(n log n)上限 | samplingなし |
| windows/candidates | same intent/stage matching | worst O(cw) | correctness優先、実測で再評価 |
| fragments | window/category bucket | O(k log k) | 全corpus単一sort禁止 |
| report rows | window/candidate線形 + fixed 153 reasons | O(n) | outlier sliceは最後 |
| output bytes | complete semantic string | O(bytes) | natural stdout drain |

## Capacity thresholds and growth policy

minimum verification thresholdだけを持ち、runtime拒否thresholdやtime SLOは宣言しない。229/136,011未満のfixtureでscale testを通さず、以上の入力で同じclosed validationとsemantic parityを維持する。memory pressure時にcandidateやreasonを捨てず、failureが実測された場合は意味保存indexまたはstreaming seamを別Intentで設計する。

auto-scaling、horizontal partition、queue decoupling、eventual consistencyは非適用である。並行processへ分割するとcanonical order、global duplicate ID、population-wide invariant、single reportを再結合する新しいcoordination contractが必要になるため、本scopeでは採らない。

## Decision traceability

| Scalability decision | Declared requirement | Context evidence / verification |
|---|---|---|
| single-process vertical model | Missing (`scalability-requirements.md` absent) | `services.md:13-20`; process count 1 |
| 229 shard・136,011 row以上のprecondition | Missing | `requirements.md:299-301`; fixture census assert |
| O(n)/O(n log n)/O(cw)境界 | Missing | `business-logic-model.md` Complexity; operation counters |
| window/category partition | Missing | 同 Interval/Report design; bucket cardinality |
| global candidateをsamplingしない | Missing | `requirements.md:299-305`; exact count parity |
| outlier sliceを統計後に実行 | Missing | Functional outlier contract; N=0/100 parity |
| horizontal/queue/cache/autoscalingなし | Missing | deterministic single semantic model; resource census |
| hard upper threshold/time SLOなし | Missing | Issueが数値を宣言しない; limitを発明しない |

## Scale verification

fixtureまたは実corpusのshard/line countを実行前にassertし、同じinputを1 processで最後まで処理する。0/10/100 outlier limitでaggregate/candidate/category値が不変、input orderを変えてsemantic outputが同一、各formatのoversized pipeが完全にdrainされることを確認する。
