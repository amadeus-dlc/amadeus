# Domain Entities: grant-authorization-domain

## Design Inputs

entity定義は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`に基づく。すべてin-memory valueまたはaudit projectionであり、新しい永続modelではない。

## OperatingMode

- Kind: value object
- Values: `solo | team`
- Source: canonical resolver
- Invariant: unknown raw valueから生成できない

## GrantId

- Kind: value object
- Shape: 8 lowercase hexadecimal characters
- Role: issue/revoke/receipt/approval auditを相関するopaque identity
- Invariant: identity以外の意味をencodingしない

## StandingGrantIssue

- Kind: audit-derived immutable fact
- Attributes:
  - `grantId`
  - `intentId`
  - `issuer`
  - `issuedAt`
  - `expiresAt`
  - `scope`
  - `includesPhaseBoundary`
- Invariants:
  - issue入力のTTLはNumber変換後finiteかつ`> 0`
  - `expiresAt`は既存Number加算結果を保持し、IEEE-754丸めで`expiresAt === issuedAt`になり得る
  - valid human provenanceを持つ
  - scopeは現行`stage-gates`

## StandingGrantRevocation

- Kind: audit-derived immutable fact
- Attributes: `grantId`, `revokedAt`, `revoker`
- Relationship: zero or more revocations may reference one GrantId
- Invariant: referenced issueの存在を要求しない

## ActiveSoloGrant

- Kind: derived value
- Derived from: one valid StandingGrantIssue and the absence of applicable revocation
- Attributes: issue attributes plus eligibility context
- Lifecycle: query時点だけ存在し、保存しない
- Invariant: active intent binding、`expiresAt > now`、valid provenance、同Grant Idのvalid issue eventがexactly one

## GateContext

- Kind: value object
- Attributes:
  - `stage`
  - `phase`
  - `gateRequired`
  - `isPhaseBoundary`
  - `isFirstConstructionGate`
  - `isPerUnitFinalGate`
  - `scope`
  - `walkingSkeletonStance`
- Invariant: gate policy classifierの出力を表し、grantが値を書き換えない

## AuthorizationSelectionReceipt

- Kind: protected audit-derived immutable fact
- Attributes:
  - `routeId` UUID v4
  - `stage`
  - `grantId`
  - audit timestamp/provenance
- Cardinality rule: commit carrierのRoute Idあたりexactly one
- Invariant: later routeでsupersede/consumeしない

## SoloGrantCarrier

- Kind: directive value object
- Attributes: `standingGrantId`, `standingGrantRouteId`
- Invariant: pairはall-or-none
- Relationship: one carrier must match exactly one AuthorizationSelectionReceipt

## RevalidationOutcome

- Kind: discriminated result
- Variants:
  - `authorized` with verified GrantId
  - `no-longer-authorizes`
  - fatal protocol/corruption error
- Invariant: expected expiry/revoke/out-of-scope、issue cardinality不一致、receipt欠落/重複/field不一致はfatal variantにせずhuman fallbackへ送る
- Invariant: audit I/O failure、state corruption、wire parse failureだけをfatalとする

## Relationships

- StandingGrantIssue 1 → 0..N StandingGrantRevocation
- StandingGrantIssue 1 → 0..N AuthorizationSelectionReceipt
- AuthorizationSelectionReceipt 1 → 1 SoloGrantCarrier at a commit attempt
- GateContext + ActiveSoloGrant → eligibility decision
- SoloGrantCarrier + AuthorizationSelectionReceipt + current ledger → RevalidationOutcome

## Excluded Entities

StandingGrantConfig、GrantDatabaseRecord、ConsumedReceipt、SoloLeader、Delegationは作らない。team leader/delegationは既存別domainのままとする。
