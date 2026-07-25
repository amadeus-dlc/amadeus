# Reliability Requirements: grant-authorization-domain

## Inputs and Reliability Model

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を根拠とする。remote SLAではなく、local audit/stateの整合性と決定的recoveryを対象にする。

## Invariants

| ID | Requirement | Verification |
|---|---|---|
| U1-REL-01 | route receipt append成功前にcarrierを返さない | injected append failure |
| U1-REL-02 | exact lookupが0/複数ならtargetを選ばない | cardinality fixtures |
| U1-REL-03 | expiry/revoke/intent/scope/provenanceをcommit clockで再評価 | deterministic clock/audit fixtures |
| U1-REL-04 | expected invalidityでapproval/completion/error audit delta 0 | before/after event counts |
| U1-REL-05 | shard iteration orderで結果が変わらない | permutation/property test |
| U1-REL-06 | teamの発行・取消CLI output、default TTL、audit field/count、finder、leader/delegation approval結果が変わらない | change前golden + existing team integration suite |
| U1-REL-07 | receipt所有intent以外はactive cursor切替時もapproval/fallback/audit/state mutationが0 | two-intent same-stage fixture |
| U1-REL-08 | revokeとapprovalが同じreceipt owner intent lockで直列化される | barrier付きlock-contention integration fixture |
| U1-REL-09 | route receipt appendとcommitがworkspace outer lockを共有し、space-wide exactly-one判定後にcross-intent duplicateを追加できない | two-intent duplicate Route Id contention fixture |

## Failure Handling

- malformed authorization evidenceはfail-closedにする。
- audit I/O failureは既存fatal errorとしてmutation前に停止する。
- expected grant invalidityはtyped fallbackとし、error recoveryを要求しない。
- receiptはimmutableであり、crash後も対応Route Idを持つreportだけが参照する。

## Concurrency Serialization Contract

`revoke-standing-delegation`の`GRANT_REVOKED` appendとgrant-backed approvalは、receipt所有intentをkeyとする既存audit/state lockを共有する。approvalはlock取得後にauditを再読し、exact grant検証から`GATE_APPROVED`、`STAGE_COMPLETED`、state writeまでlockを保持する。検証後へrevokeを割り込ませない。

barrier付きfixtureで同時実行を開始し、sleepやstderr文字列を使わず次の2結果だけを許容する。

1. revokeが先にlockを取得: approvalはrevokeを観測してtyped fallbackし、approval/completion/error audit delta 0。
2. approvalが先にlockを取得: verified Grant Idでapproval/completionをcommitした後、revokeがappendされる。

部分的な3番目の結果、別Grant Idへの差替え、非owner intentへのmutationは許容しない。

space-wide receipt cardinalityは既存workspace-level intent registry lockで直列化する。routeはworkspace lock内でRoute Idの未使用を確認してreceiptをappendし、commitは同じworkspace lock内でexactly-oneを確認してtransaction完了まで保持する。owner intent lockを併用するときの取得順は必ずworkspace → owner intentとする。duplicate Route Idを生成したrouteはreceipt/carrierを作らずfatalにし、commit fixtureに事前存在するduplicateはtyped fallbackにする。

## Recovery Targets

process再実行で追加stateなしにauditから同じ結果を再構築できる。backup/DRの新要件はなく、既存Git管理とappend-only auditのrecovery特性を維持する。

## Traceability and Verification Ownership

| Target | Upstream | Business rules | Fixture / blocking suite owner |
|---|---|---|---|
| U1-REL-01 | FR-08, NFR-01 | BR-22 | route audit integration suite |
| U1-REL-02 | FR-12, FR-15–17, NFR-03–04 | BR-23–24 | receipt cardinality integration suite |
| U1-REL-03 | FR-12–15, NFR-02 | BR-25–29 | commit race integration suite |
| U1-REL-04 | FR-15–17, NFR-01, NFR-04 | BR-24, BR-26, BR-28 | fallback audit/state integration suite |
| U1-REL-05 | NFR-02, NFR-07 | BR-13–14a, Audit Invariants | property suite |
| U1-REL-06 | FR-19, NFR-05 | BR-02, BR-14 | existing team golden/integration suite |
| U1-REL-07 | FR-02, FR-12–17, NFR-03 | BR-09, BR-23–28 | cross-intent transaction integration suite |
| U1-REL-08 | FR-12–17, NFR-01–02 | BR-25–29 | lock-contention integration suite |
| U1-REL-09 | FR-08, FR-12–17, NFR-01–03 | BR-22–24 | cross-intent receipt contention integration suite |
