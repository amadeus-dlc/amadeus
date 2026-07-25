# Security Requirements — mirror-operation-lifecycle

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Trust and Authorization Boundary

modeはstanding consent、prompt回答／manual CLIはone-operation consent、repair challengeはone-time elevated consentとして分離する。いずれもprovenance、repository、landing、final-sync guardを迂回するauthorityを持たない。

## STRIDE Controls

| Threat | Control | Verification |
|---|---|---|
| Spoofing | engine-owned Intent UUID／boundary instance、canonical repository、expected promptを完全一致 | cross-Intent／boundary tests |
| Tampering | prompt answerをevent／operationへbindし、state再読込後にconsume | stale／replay tests |
| Repudiation | trigger event、operation event／ID、classification、reconciliationをaudit outboxへ投影 | audit fixtures |
| Information disclosure | prompt／status／warningはfixed fieldsだけでraw diagnostics／credentialを含めない | secret sentinel tests |
| Denial of service | completion最大3、CAS再評価1、background retry 0 | call-count tests |
| Elevation of privilege | operation-specific permit、safe close guards、repair exact phrase＋10分TTL | forged／expired challenge tests |

## Safe Mutation Requirements

- 全`gh`外部commandは`shell:false`でargument arrayとして起動し、repository API path、title、body、labelを別argument境界に保持する。shell command文字列、`eval`、command substitutionを使用しない。
- remote mutation前にattempted receiptのdurable commitとaudit outbox drainを完了する。
- createはcontext一致＋candidate分類＋CAS claim winnerだけがpermitを得る。
- sync／closeはprovenance、marker、repository、Issue numberを全一致させる。
- final sync／closeはregistry complete、state Completedを要求し、closeは同completionのfinal sync successも要求する。
- manual closeもguardを緩和しない。
- marker欠落Issueを自動relinkしない。
- `auto`をPR、merge、release、publish、deploy、repairへ拡張しない。

## Data and Compliance

status／Issue bodyにcredential、token、raw stderr、header、URL query、absolute secret pathを含めない。本Unitは新しいPII／PHI／cardholder dataを処理せず、規制適合を主張しない。

## Acceptance

1. provenance／repository／landing／final-sync各guard失敗でremote mutation 0件。
2. stale prompt、別operation回答、challenge replayでstate／remote mutation 0件。
3. secret sentinelがstate、audit、prompt、status、Issue bodyへ現れない。
4. `;`、`$()`、backtick、newline、leading dashを含むtitle／bodyでもargv element数／順序とexplicit repository pathがgoldenに一致し、追加process／別repository mutationが0件となる。
