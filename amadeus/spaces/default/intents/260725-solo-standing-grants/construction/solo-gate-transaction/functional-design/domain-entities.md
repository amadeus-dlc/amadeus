# Domain Entities: solo-gate-transaction

## Design Inputs

entityは`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`に基づく。永続entityは追加せず、directive、process result、transaction outcomeをvalueとして表す。

## GrantAuthorizationCarrier

- `standingGrantId`: GrantId
- `standingGrantRouteId`: UUID v4 RouteId
- Invariant: all-or-none
- Owner: run-stage directive

## GateRouteDecision

- Variants:
  - existing directive without carrier
  - grant-backed directive with carrier
  - fatal route error
- Invariant: gate requirement自体を変更しない
- Invariant: carrier variantはprotected receipt append成功を前提とする

## ApprovalCommitOutcome

- `approved`
- `await-approval` with current stage and fixed reason
- fatal error

expected grant invalidityとreceipt mismatchは`await-approval`であり、artifact/state/I/O/wire corruptionだけがfatalである。

## GrantApprovalWireOutcome

- Process boundary専用value
- Success shape: kind `approved`
- Fallback shape: kind `await-approval`、stage、fixed reason
- Invariant: stdout exactly one JSON line、stderr empty、exit 0
- Scope: grant flag pairを持つapproveだけ

## AwaitApprovalDirective

- `kind`: `await-approval`
- `stage`: current stage slug
- `reason`: `standing-grant-no-longer-authorizes`
- Invariant: unknown fieldなし
- Semantics: quality-complete artifactを保持したapproval prompt-only reentry

## ApprovalAuthorization

- Variants: existing human、existing team leader/delegation、verified solo standing grant
- Solo attribute: exact verified Grant Id
- Invariant: solo variantはlock内receipt/grant revalidation成功後だけ生成
- Invariant: team variantのshapeと処理を変更しない
- Invariant: human inputとsolo carrierを同時に認可源として混在させない

## ApprovalTransactionTarget

- Kind: space-wide exact Route Id receipt lookupから解決した所有intent context
- Attributes: intent identity、stage、record path
- Invariant: Route Id一致receiptがexactly oneの場合だけ生成する
- Invariant: route後のactive cursor switchで別intentをtargetへ置換しない
- Invariant: non-target intentのapproval、fallback、audit、state mutationは0

## ApprovalMutationSet

- `GATE_APPROVED` audit row
- `STAGE_COMPLETED` audit row
- state status/current-stage write
- Invariant: full setはauthorization success時だけ適用
- Invariant: fallback時は全要素0件

## QualityExecutionEvidence

- stage body completion
- reviewer completion
- sensor results
- learnings ritual completion
- per-unit coverage
- Invariant: grant carrierがあっても省略しない
- Invariant: fallback prompt reentryでは再生成しない

## Relationships

- GateRouteDecision grant-backed variant 1 → 1 GrantAuthorizationCarrier
- GrantAuthorizationCarrier 1 → 1 U1 AuthorizationSelectionReceipt
- GrantAuthorizationCarrier + current ledger → ApprovalCommitOutcome
- ApprovalTransactionTarget + GrantAuthorizationCarrier → active-intent consistency validation
- ApprovalCommitOutcome approved → ApprovalAuthorization solo
- ApprovalAuthorization + QualityExecutionEvidence → ApprovalMutationSet
- ApprovalCommitOutcome await-approval → AwaitApprovalDirective

## Excluded Entities

GrantGateValue、DelegatedSoloApproval、ConsumedReceipt、FallbackError、SoloLeader、複数認可源を自動合成するentityを作らない。
