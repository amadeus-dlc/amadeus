# Reliability Design — plugin-composition

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Atomic compose・drop

compose/dropはtemp hostで検証を完了してから、workspace lock下の一つの三面transactionとしてcommitする。WALはtransaction id、phase、host/record/auditの全write-set/preimageを保持し、最初のcanonical mutation前にPREPAREDとなる。三面すべて完了した場合だけCOMMITTEDとなり、record/auditはonceである。

handled commit failureはreturn前に全preimageへ即時・冪等復元する。dropはrecord-owned new pathとshared contributionだけを対象にし、全current一致後に対象寄与を除いた残存寄与からshared fileを決定的再構築する。record外pathとuser editは削除しない。

## Crash recovery phase semantics

未完了PREPARED中のcrashは次のworkspace lock取得直後に検出し、新規compose/dropより先にpre-stateへ冪等回復する。回復完了まで新規操作を禁止し、二重record/auditを発生させない。

durable COMMITTED後のcrashは成立済みtransactionであるため、post-state、composition record、audit onceを維持し、pre-state recoveryを行わない。journal/preimage driftまたはcorruption時は状態を推測せず、追加mutation 0でloud停止する。

## Failure matrix

| Scenario | Required behavior |
|---|---|
| inspect error | rejected+全error、三面write 0 |
| temp verify failure | canonical三面不変 |
| handled commit failure | return前にpre-state復元 |
| 未完了PREPARED crash | 次操作前pre-state回復、新規操作禁止 |
| durable COMMITTED crash | post-state/record/audit once維持 |
| recovery drift/corruption | 追加mutation 0、loud stop |
| valid drop | 対象寄与だけ除去、三面once |

PREPARED直後、host各write後、record write後、audit write前後、COMMITTED直前を未完了fixtureとして回復検証する。COMMITTED直後は独立fixtureとしてpost-state維持を検証する。新retry、backoff、circuit breaker、RTO/RPO、availability SLOは追加しない。

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U10-01〜09を中心に、`performance-requirements.md`のtemp verification、`security-requirements.md`の三面integrity、`scalability-requirements.md`のcrash capacity、`tech-stack-decisions.md`のfailure injection、`business-logic-model.md`のFailure tableへ対応する。
