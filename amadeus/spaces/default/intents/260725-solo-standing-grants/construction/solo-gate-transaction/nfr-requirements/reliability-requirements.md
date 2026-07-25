# Reliability Requirements: solo-gate-transaction

## Inputs and Reliability Model

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を根拠とする。可用性percentageではなく、local directive/process/audit/state transactionの原子性、決定性、回復可能性を対象にする。

## Invariants

| ID | Requirement | Verification |
|---|---|---|
| U2-REL-01 | receipt append成功前にcarrierをemitしない | injected append failure |
| U2-REL-02 | successは検証済みGrant Idで`GATE_APPROVED`→`STAGE_COMPLETED`→state advanceを各1回 | ordered audit/state assertion |
| U2-REL-03 | expected fallbackはexit 0/stderr空のtyped outcomeで、approval/completion/error audit delta 0、state bytes不変 | expiry/revoke/scope/receipt fixtures |
| U2-REL-04 | fallback後はbody/reviewer/sensor/learningsを再実行せず、session予約owner UUIDへtrusted hookがmintしたfresh human approvalだけを受ける | cursor switch→fallback→human continuation E2E |
| U2-REL-05 | protocol error、fatal error、expected fallbackを相互変換しない | exhaustive wire/result matrix |
| U2-REL-06 | active cursor切替時はreceipt ownerだけをtargetにし、非owner delta 0 | two-intent same-stage fixture |
| U2-REL-07 | per-unit final fallbackで全unit成果物とreview evidenceがbyte-identical | artifact hash/count |
| U2-REL-08 | team/human pathのdirective、argv、stdout/stderr、audit/stateがbaseline同一 | golden regression |
| U2-REL-09 | crash時は既存human approvalと同じaudit-first prefixだけを許容し、再実行後に既存recovery semanticsで1回の完了へ収束 | step boundary failure injection + recovery |
| U2-REL-10 | session reservationはatomicなarmed→minted→consumed状態で、machine injection/別sessionでは遷移しない。approval後・consume前crashはowner provenanceから冪等consumeへ収束する | hook/report state-machine + step-boundary fixture |

## Atomicity and Failure Handling

入力行列をlock取得前に分類する。workspace outer lockはfull grant carrier pair branchだけでspace-wide receipt cardinality checkからgrant-backed transaction完了まで保持し、その内側でreceipt owner intent lockを取得する。carrierなしhuman/team pathのlocking behaviorは変えない。targeted human branchは明示owner intentの既存lockだけを取得する。receipt/grant expected invalidityはinner mutation前にtyped fallbackする。audit I/O、state corruption、strict wire違反は既存fatal/protocol errorとし、`await-approval`へ偽装しない。

crashがreceipt append後・commit前に発生してもreceiptはimmutable factとして残る。同じpairの再reportだけが参照でき、後発receiptやgrantへ自動差替えしない。

grant-backed success中のprocess crashについて、本Issueはfilesystem lockだけで複数audit appendとstate writeの全-or-nothingを新たに保証しない。既存human approvalと同じaudit-first prefix（approval eventまで、completion eventまで、state write/advanceまで）を許容し、既存recovery/re-reportで重複completionなしに完了へ収束することをfailure-injection fixtureで比較する。prefixに`GATE_APPROVED`が存在する場合、そのGrant Idはlock内verified IDと一致しなければならない。

## Recovery and Observability

expected fallbackでは新しい`ERROR_LOGGED`や専用error eventを作らない。運用者は既存receipt、grant lifecycle audit、human gate表示から状態を判断できる。新しいhealth service、retry daemon、backup機構は追加しない。

session-local presence reservationはgitignored runtime metadataでありworkflow stateやgrant正本ではない。書込失敗、marker改変、owner registry不一致はhuman approval mutation前にfail-closedにし、`HUMAN_TURN`を別intentから転用しない。reservationは同一sessionの実human promptだけが`minted`にし、成功approvalだけが`consumed`にする。trusted hookはhost envelopeのsession IDでarmed markerを選び、次turnのstateはdirective/reportが明示的に運ぶReservation Idでexact markerを選ぶ。user flag由来session ID、PID、共有current-session marker、active cursorからsession identityを推測しない。

owner approval後・consume前にcrashした場合は、reservationのtarget、stage、Reservation Id、`HUMAN_TURN`座標に相関するowner `GATE_APPROVED`／`STAGE_COMPLETED`／state advanceをexact lookupする。一意なprefixは既存recoveryで完了させてmarkerだけを冪等consumeし、0件・矛盾・複数件ではfail-closedにする。

## Traceability and Ownership

| Target | Upstream | Transaction rules | Blocking suite |
|---|---|---|---|
| U2-REL-01 | FR-08, NFR-01 | TR-04–05 | route audit integration |
| U2-REL-02 | FR-12–14, NFR-01–02 | TR-15, TR-18–19 | approval integration |
| U2-REL-03–05 | FR-15–18, NFR-01, NFR-04 | TR-10–13, TR-16–20 | fallback/wire integration |
| U2-REL-06 | FR-02, FR-12–17, NFR-03 | TR-22–23 | cross-intent integration |
| U2-REL-07 | FR-22–23, NFR-07 | TR-06–07、Quality Ritual Rules | per-unit integration |
| U2-REL-08 | FR-19, NFR-05 | TR-02, TR-14, TR-21 | existing team/human golden |
| U2-REL-09 | NFR-01, NFR-04–05 | TR-15, TR-19 | approval crash/recovery parity integration |
| U2-REL-10 | FR-18, NFR-01, NFR-03–04 | TR-14d–f, TR-25–26 | session reservation/hook integration |
