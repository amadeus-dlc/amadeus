# Reliability Requirements — bounded-unit-pool

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Pool Correctness SLO

`requirements.md` NFR-01／02、`business-logic-model.md` のsettle／reconciliation、`business-rules.md` BR-UP-17〜26、`technology-stack.md` のfake executorを適用する。

| ID | Invariant | Target／Failure behavior |
|---|---|---|
| RL-UP-01 | capacity | `active <= cap`違反0件、超過reserveはcommit前拒否 |
| RL-UP-02 | exactly-once release | attemptごとのslot release 1回、duplicate resultの増分0 |
| RL-UP-03 | atomic settle | Unit outcome、release、requeue／cancelを1 event batch、部分状態0 |
| RL-UP-04 | FIFO | 同じevent列でdispatch順100%一致、retryは末尾 |
| RL-UP-05 | bounded attempts | Unit total default 2／hard 3、exhaustion後の新attempt 0 |
| RL-UP-06 | bounded reconciliation | default 2／hard 3、exhaustionでsynthetic terminal＋release |
| RL-UP-07 | late result | authoritative outcome／slot／counter／final resultの変更0 |
| RL-UP-08 | terminal batch | 全Unitがterminalならfinal resultを優先順位で1値に確定 |

## Recovery と Failure Isolation

- no-effect-confirmedは`dispatch-not-started`でsettleし、両budgetが残る場合だけrequeueする。
- effect possible／unknown、worker unresponsiveはsynthetic terminal後にdrainingへ移り、新規dispatchを止める。
- local failure／attempt exhaustedはtransitive dependentを`dependency-unsatisfied`へし、独立UnitをFIFO継続する。
- cancel無応答は`cancel-unconfirmed`でsettle／releaseし、late resultは観測だけを追加する。
- canonical auditを唯一の復旧正本とし、in-memory agent tableやnative worker IDからpoolを再構築しない。

## Verification

- controlled latchでcap=1／2／4、Unit=0／1／4／8を試し、maximum active、FIFO、全terminalを検証する。
- duplicate settle、crash after reserve／claim／confirm／release、reconciliation exhaustion、late resultをfault injectionする。
- DAGのduplicate、missing dependency、self-edge、cycleをenqueue前に拒否する。
- local／systemic／cancelの組合せで`terminated > cancelled > partial-failure > completed`をproperty testする。
