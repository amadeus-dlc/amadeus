# Reliability Design — interaction-budgets

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Delivery State Machine

`InteractionTransitionCoordinator`が唯一のorchestration ownerとして、C2のclosed commandとC7 side effectを次の順で実行する。C2 lock中にC7を呼ばない。

| Durable state／event | Lock内preconditionとcommit | Lock外action | Resume判定 |
|---|---|---|---|
| `reserved` | instance、counter、deliveryKeyを1 audit transactionでcommit | なし | 同じreceiptを返す |
| `claimed-question` | `reserved`のみclaim可 | C7 rendererへ同じdeliveryKeyで表示 | evidenceなしなら再表示。重複は同じID、counter不変 |
| `delivered` | renderer success evidenceをcommit | 回答待ち | answer未記録なら待機を再開 |
| `answered` | canonical HMACを最初のfingerprintとしてcommit | なし | 同tagは既存receipt、異tagはconflict |
| `claimed-review` | `reserved`のみclaim可 | C7 reviewerへ同じdeliveryKeyでdispatch | effect query可能なら照会し、idempotent backendだけ再送。両方不能なら`unavailable` |
| `dispatched` | dispatch/effect evidenceをcommit | result収集 | result照会だけ再開し、再dispatchしない |
| `resolved` | answer／review resultをcommit | なし | terminal receiptを返す |
| `failed`／`unavailable`／`exhausted` | reasonとsummary payloadを同じtransactionでcommit | 既存approval boundaryへ投影 | 同じsummaryIdを再投影 |

各commandは`expectedState`、`interactionId`、`deliveryKey`、`idempotencyKey`を必須とし、state不一致はmutation 0件で既存receiptまたはtyped conflictを返す。questionの表示後・`delivered` commit前crashは同じIDの再表示を許容する。回答受信後・fingerprint commit前crashは再送回答から同じHMACを計算してcommitする。review claim後crashはC7 capability factに基づき、effect unknownを成功扱いせず再dispatchもしない。

## Exhaustion Handoff

terminal audit eventは`summaryId = hash(interactionId, terminalRevision)`とsummary payloadを同じlock transactionで保持する。これによりterminalと「summaryちょうど1件」を原子的にする。`InteractionSummaryProjector`はoutbox cursorを使い、BLOCKER、budget、last progress、next action、artifact setを既存approvalへ少なくとも1回投影する。投影先はsummaryIdでdedupeし、投影commit失敗時は次processが同じoutbox itemを再実行する。

FOLLOW-UP／NITだけでは新reviewを開始しない。HMAC key unavailableはsummary付きunavailableにする。fault-injectionはclaimed直後、question表示直後、回答受信直後、review native effect直後、terminal audit append直後、summary投影直後の各crash pointで、counter不変・question同一ID・review at-most-once／unknown unavailable・summaryId一意を検証する。
