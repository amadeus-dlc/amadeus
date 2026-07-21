# Reliability Design — unit-iteration-and-scope-preview

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Iteration correctness

同一WorkflowStateとStageGraphから同じConstructionStepを返す。`unit-major`は明示opt-inの場合だけUnit外側・compiled stage内側で決定し、各組のscope、eligibility、Unit kind、coverageは既存graph判定へ委譲する。iteration未指定時は既存stage-majorのdirective、state、human/JSON bytesを維持する。

不正iterationは既存typed failureで全mutation前に拒否する。decision seam自身はstate/plan/graph/auditを書き換えないため、invalid inputのblast radiusを結果値へ限定する。

## Summary consistency

同一ScopeNameとCompiledGridから同じScopeSummaryを返す。stage countとgate countは同一effective in-scope集合から導出し、4 consumerへ一つのvalueとして配る。human/JSON間やconsumer間でcountを再計算しない。

JSONは既存field/value/orderを保ち、summaryだけをadditiveに投影する。新failure recovery、retry、circuit breaker、health check、RTO/RPO、availability SLOは追加しない。

## Verification matrix

| Scenario | Required behavior |
|---|---|
| iteration未指定 | stage-major baseline bytes不変 |
| valid unit-major | Unit外側・既存順の最初のstep |
| invalid iteration | state/plan/graph/audit bytes不変 |
| 同一scope/grid×4 consumer | stage/gate count一致 |
| JSON preview | 既存field不変、summaryだけadditive |
| human preview | JSONと同じScopeSummary value |

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U05-01〜06を中心に、`performance-requirements.md`のdefault path、`security-requirements.md`のpre-mutation reject、`scalability-requirements.md`のmatrix/grid順、`tech-stack-decisions.md`のgolden/integration test、`business-logic-model.md`のfailure tableへ対応する。
