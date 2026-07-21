# Reliability Design — swarm-and-next-stage

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Selection correctness

同一BoltDagとcurrentRunから常に同じBatchSelectionを返す。各batchの完了はcurrentRunで全unitがconvergedした場合だけ成立し、merge failureを持つunitはcheck成功済みでも未完了として残す。最初の未完了batchに到達した後は後続batchを評価対象へ採用せず、cross-batch advanceを防ぐ。

同一CompiledGridとcurrentから常に同じStageSlugまたは`null`を返す。current後方のeffective SKIPを除外し、最初の実在in-scope stageを返す。候補がなければterminal `null`を返し、SKIP名やplaceholderを成功値にしない。

## Consistencyとfailure containment

gate projectorとengine nextはresolver resultを共有し、表示と実directiveを一致させる。decision seamはpureであるため、invalidまたは未完了の入力評価からstate/audit/workspace mutationを発生させない。malformed inputの意味を本Unitで推測せず、既存C1/C2 validationに従う。

新retry、backoff、circuit breaker、health check、failover、replication、RTO/RPO、availability SLOは追加しない。誤advanceを自動補正する第二resolverも作らない。

## Verification matrix

| Scenario | Required result |
|---|---|
| 先頭batch全converged | 次の未完了batch |
| 先頭batchに未完了あり | 同batchの未完了unitだけ |
| check成功・merge failure | 非convergedとして同batch |
| current直後がSKIP | 後方の最初のin-scope stage |
| 最終in-scope stage | `null` |
| FR-0 EQUIVALENT | production observable差分0 |

targeted fixturesとfull verificationを同一最終SHAで通し、未実施またはstale evidenceをgreenへ読み替えない。

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U03-01〜06を中心に、`performance-requirements.md`の最初の候補停止、`security-requirements.md`のevidence integrity、`scalability-requirements.md`の順序保存、`tech-stack-decisions.md`のcharacterization、`business-logic-model.md`のVerification scenariosへ対応する。
