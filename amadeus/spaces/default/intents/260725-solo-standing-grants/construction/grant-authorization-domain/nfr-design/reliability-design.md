# Reliability Design: grant-authorization-domain

## Inputs and Failure Domains

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を入力とする。failure domainはworkspace registry/audit、owner intent audit/state、process crashである。

## Transaction Patterns

### Route

workspace outer lock内でRoute Idのspace-wide未使用を検証し、workspace → route owner intentの順でinner lockを取得してreceiptをraw appendする。両lockはappend receipt検証まで保持し、receiptを受け取る前にcarrierを返さない。append failure/collisionはcarrier 0でfatalとする。

### Commit

workspace outer lockを取得し、space-wide receipt lookup passのexactly-oneからownerをpinする。workspace → owner intentの順でinner lockを取得した後、owner audit shardをrevalidation passとして必ず再読する。receipt fieldとexact grantをこのfresh owner snapshotおよび現在clockで再検証し、space lookup時のgrant projectionは使用しない。invalidなら両lock内でmutationなしのtyped fallbackを返す。validなら同じinner lockを保持して既存approval transactionへverified Grant Idを渡す。

### Revoke Race

revokeもowner intent lockを使う。revoke先行ならcommitはfallback、commit先行ならapproval完了後にrevoke appendとなり、検証後への割込みを許さない。barrier hookで2順序を再現しsleepを使わない。

receipt lookup完了後・owner lock取得前にrevokeをbarrier注入するfixtureでは、owner revalidation passがrevokeを観測してfallbackしなければならない。

## Failure Classification

| Condition | Outcome | Audit/state |
|---|---|---|
| expired/revoked/out-of-scope/provenance/cardinality mismatch | typed no-longer-authorizes | approval/completion/error delta 0、state bytes不変 |
| audit/registry I/O、lock exhaustion、state corruption | existing fatal | mutation前停止 |
| receipt append後crash | immutable receipt remains | same pairだけretry可能 |
| active cursor switch | owner intentだけtarget | non-owner delta 0 |

## Recovery

projectionはauditから再構築し、新しいcheckpoint/databaseを持たない。approval成功中のcrashは既存human approvalと同じaudit-first prefix/recovery semanticsを使用し、本Issue固有のrollbackを追加しない。team lifecycle goldenでlock/audit behaviorの非回帰を確認する。

## Verification

U1-REL-01–09をappend failure、cardinality、clock/revoke、audit delta、permutation、team golden、cursor switch、2種contention fixtureへ対応付ける。

route append contention fixtureは同ownerへの通常audit writerとbarrierで競合させ、両event exactly once、破損block 0、carrierはreceipt成功後だけをassertする。
