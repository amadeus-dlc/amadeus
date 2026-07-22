# Security Design — swarm-and-next-stage

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Evidence integrity

BoltDag、RunEvidence、CompiledGridはC1/C2の既存validation境界を通過したruntime inputとして扱う。`selectNextSwarmBatch`が完了根拠に使用できるのはcurrentRunのconverged evidenceだけである。別runのclaim、check成功だけのclaim、merge failureを持つunitはconverged集合へ入れず、false advanceを防ぐ。

`resolveNextInScopeStage`はCompiledGridのeffective scopeを唯一のstage sourceとし、SKIP stage、未知slug、placeholderを結果として返さない。未知stageやmalformed gridの新failure policyは本Unitで作らず、既存validation境界へ留保する。

## Mutation・projection control

2 seamは入力から結果を返すだけで、lock取得、state write、audit emit、workspace read/writeを所有しない。gateの`next_stage`表示とengine `next` directiveは同じresolver resultを投影し、表示だけを別のstageへ向ける経路を作らない。

worker dispatch、verification、merge、state mutationは既存ownerと既存transaction境界に残す。新credential、network、database、service、UI、audit event、retention、permission modelを追加しない。

## Integrity fixtures

| Threat | Expected control |
|---|---|
| 別runのconverged claim | 未完了扱い、batch advance 0 |
| check成功後のmerge failure | 非converged、同batch残留 |
| scope上SKIP | resultから除外 |
| terminal | `null`、架空slug 0 |
| projector divergence | gate表示とengine directive差分0 |

## トレーサビリティ

本設計は`security-requirements.md`のSEC-U03-01〜04を中心に、`performance-requirements.md`のpure execution、`scalability-requirements.md`の順序正本、`reliability-requirements.md`のmerge failure/terminal、`tech-stack-decisions.md`の既存C2 choke point、`business-logic-model.md`のIntegration boundariesへ対応する。
