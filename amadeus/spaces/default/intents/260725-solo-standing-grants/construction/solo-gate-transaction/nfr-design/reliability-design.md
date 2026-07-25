# Reliability Design: solo-gate-transaction

## Inputs and Outcome Model

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`に基づく。成功、expected fallback、protocol error、fatal errorを相互変換しない。

## Grant-backed Transaction

receipt owner pin後、owner lock内fresh auditでexact grantを再検証する。validならverified Grant Idで既存approvalを続行する。invalidならexit 0/stderr空のtyped `await-approval`を返し、`GATE_APPROVED`、`STAGE_COMPLETED`、`ERROR_LOGGED`増分0、state bytes不変とする。

reportはawait outcomeからtarget intent UUIDを含むhuman gate directiveを作り、host session reservationをarmedにする。stage quality成果は保持する。

## Reservation Recovery

| State | Event | Result |
|---|---|---|
| none | expected fallback | atomic armed |
| armed | same-session real prompt | owner HUMAN_TURN append + minted |
| armed | machine/other session | no change |
| minted | replay hook | audit delta 0 |
| minted | valid human approval | owner completion then consume |
| minted | approval prefixあり・consume前crash | owner provenanceをexact recovery後、冪等consume |
| minted | validation failure | mutation 0、fail-closed |

append後marker update前crashはPresence Reservation Idをowner auditから再構築する。0/1/複数cardinalityをappend/reuse/fail-closedへ対応させる。target invalidationはmarkerを隔離しmutationしない。

owner approval後・consume前crashでは、markerのtarget、stage、Reservation Id、`HUMAN_TURN`座標に相関する`GATE_APPROVED`、`STAGE_COMPLETED`、state revisionをowner内でexact lookupする。一意な既存prefixは再appendせず既存recoveryで完了させ、markerだけを`consumed`へ収束させる。相関0件、矛盾、複数件では新reservationをarmせずfail-closedにする。approval append後、completion append後、state advance後、consume直前の各failure boundaryをfixture化する。

## Approval Crash Parity

grant-backed successのcrashは既存human approvalと同じaudit-first prefixだけを許容し、既存recovery/re-reportで重複completionなしに収束する。新rollback journalを追加しない。GATE_APPROVEDが存在する場合のGrant Idはverified IDに一致する。

## End-to-end Assertions

cursor switch→fallback→same-session prompt→targeted reportでowner HUMAN_TURN/approval/completion/state advance各1、reservation consume 1、non-owner/別target/replay delta 0をblockingにする。space receipt scanとowner lock取得のbarrierでrevokeをappendし、owner fresh readが必ずtyped fallbackすることをblockingにする。各approval/consume failure boundaryからのretryでも最終countが各1になることを確認し、team/human goldenで既存pathを比較する。
