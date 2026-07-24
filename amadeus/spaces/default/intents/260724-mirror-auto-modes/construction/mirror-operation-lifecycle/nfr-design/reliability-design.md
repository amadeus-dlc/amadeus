# Reliability Design — mirror-operation-lifecycle

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Orchestration State Machine

config→state→policy→prompt/executeの順で評価する。executeはprepare→readiness→attempted→remote→completeを固定し、outbox未drainならremoteを開始しない。

prompt承認は`approve-prompt-and-prepare`でbinding consume＋approval-bearing prepared receiptを同時commitする。C6がreadiness後に同approvalを含む`mark-attempted` CASを成功させた場合だけpermitを発行するため、consume後／attempted前crashでも承認を失わずremoteを先行させない。

## Recovery

not-startedはprepared、no-effect-confirmedは専用retry後、outcome-unknownはcreate candidate／sync body／close stateのremote evidenceでのみ収束する。CAS loserは最新stateで1回だけ再評価する。

| Effect／failure | Persisted result | Exclusive next action |
|---|---|---|
| readiness／spawn `not-started` | prepared＋warning | 次eligible boundaryでreadiness |
| `no-effect-confirmed` | pending＋effect | `retry-after-no-effect` CAS winnerだけ同ID retry |
| create `outcome-unknown` | attempted／pending | candidate 1件adopt、0／複数block |
| sync `outcome-unknown` | attempted／pending | body同一complete、差異時`claim-observed-retry` winnerだけPATCH |
| close `outcome-unknown` | attempted／pending | closed complete、open時全guard＋claim winnerだけPATCH |
| pre-remote local | warning、remote 0 | filesystem修復後再評価 |
| post-remote local | attempted＋safety-blocked | remote evidence reconciliation |
| outbox drain | committed＋audit pending | 任意operation先頭でdrain、remote 0 |

外部failureはGateway deadline内、local state／CAS／outboxは5秒以内に検出する。directory fsync済みwarning／receiptはRPO 0。CAS再評価は1回だけでspinしない。

## Continuity

全outcomeは`workflowMayAdvance=true`で、engine本体のstage／phaseは常に継続可能である。「停止」は同じMirror completion chainの後続create／sync／closeを呼ばない意味だけである。completionはsuccess時だけ次へ進み、failure／skip／blocked／abandonedでMirror chainを停止する。warning clearは同operation success／human repairだけである。

## Verification

REL-OL-01〜06とfailure matrix全行、pre／remote／post failure、same-event audit重複0を検証する。
