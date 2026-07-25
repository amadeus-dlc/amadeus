# Reliability Requirements: harness-contract-and-regression

## Inputs and Reliability Model

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を根拠とする。全harnessで同じdirective/state/audit/presence semanticsへ収束し、generated driftや一部harnessの回帰をwarning扱いしない。

## Invariants

| ID | Requirement | Verification |
|---|---|---|
| U3-REL-01 | 全manifest harnessがGrant Id/Route Id pairをverbatim report | adapter golden |
| U3-REL-02 | strict `approved`/`await-approval`/protocol/fatal分類が全harness同一 | wire matrix |
| U3-REL-03 | fallback時3 audit delta 0、state bytes不変、quality再実行0 | per-harness E2E |
| U3-REL-04 | same-session real promptだけがReservation Id当たりowner `HUMAN_TURN` exactly 1をmintし、明示Reservation Id reportがreservationをexactly 1回consume | session→reservation→mint→approve E2E |
| U3-REL-05 | targeted human continuationでowner approval/completion/state advance各1、非owner/別target delta 0、replay delta 0 | cursor switch E2E |
| U3-REL-06 | team/human directive、argv、locking、stdout/stderr、audit/stateがbaseline同一 | existing golden |
| U3-REL-07 | phase-boundary、walking-skeleton、per-unit policyが全harness同一 | policy matrix |
| U3-REL-08 | generated artifacts drift 0、focused/type/full suites exit 0 | final pipeline |
| U3-REL-09 | reservation none→armed→minted→consumedがatomic、crash後もaudit correlationからexactly-onceへ回復 | state transition + failure injection |

## Failure and Recovery

generator途中失敗ではgenerated setを完了扱いせず、再生成後にdrift checkを再実行する。session reservation write/mint/consume失敗はtargeted approvalをfail-closedにし、別intentのturnを転用しない。expected grant invalidityはどのharnessでも`ERROR_LOGGED`を増やさずhuman gateを提示する。

process crash recoveryはcanonical state coreの既存audit-first prefix semanticsに従い、harness adapterが独自retryやstderr classifierを追加しない。再実行後のevent/state結果はhuman approval baselineと同じ収束条件を満たす。

reservation必須fieldはversion、random UUID Reservation Id、normalized session digest、space、target intent UUID、stage、Route Id、created timestamp、stateである。`minted`はowner audit shard/timestampを追加する。2件目arm、duplicate hook、concurrent prompt、crash/restart、marker tamper、target completionをtable-drivenに検証する。append後crashはPresence Reservation Id付き`HUMAN_TURN`をauditからexact lookupして回復し、0件ならappend、1件なら再利用、2件以上ならfail-closedにする。

## Verification Pipeline

canonical generation後の同一working treeで、focused domain/directive/state/orchestrator/hook tests、team/human regression、全6 harness integration、typecheck、full test、`dist:check`、`promote:self:check`、`git diff --check`を順に実行する。command、exit code、対象suite、tree fingerprintを記録し、1件でも失敗すれば完了しない。

## Traceability and Ownership

| Target | Upstream | Harness rules | Blocking suite |
|---|---|---|---|
| U3-REL-01–02 | FR-08, FR-10, FR-15, FR-24–25 | HR-02–04b | adapter/wire matrix |
| U3-REL-03–05 | FR-15–18, FR-23, NFR-01–04 | HR-08, HR-16–17, HR-21 | cross-harness fallback/hook E2E |
| U3-REL-06 | FR-19, NFR-05 | HR-05–09 | team/human golden |
| U3-REL-07 | FR-20–23, NFR-07 | HR-10–14, HR-20–21 | policy matrix |
| U3-REL-08 | NFR-07–08 | HR-15, HR-18–22 | final verification pipeline |
| U3-REL-09 | FR-18, NFR-01–04 | HR-04c–e, HR-08a, HR-24 | reservation recovery integration |
