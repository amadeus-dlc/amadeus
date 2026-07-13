# Driver Contract & Selection Policy Reliability Design

## 入力契約とreliability boundary

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。U-01は永続state/remote dependencyを持たないため、availability SLA、replication、backup、failover、health endpointは非適用である。

信頼性はpure recomputation、closed state、fail-fast typed error、canonical output、explicit failureのside effect 0で実現する。

## Resilience patterns

| Pattern | Component | Configuration/behavior | Reason |
|---|---|---|---|
| fail-fast validation | projection/parser/normalizer |最初のinvalid boundaryでtyped error、partial plan 0 | tainted stateをselectorへ渡さない |
| closed-state modeling | smart constructors/discriminated unions | invalid source/request/legacy combinationを構築不能 | runtime分岐漏れ防止 |
| pure recomputation | orchestrated pure pipeline | retry stateなし、修正済みinputを新callで再評価 | stale cache/state排除 |
| deterministic ordering | normalizer/projector | fixed comparator/reason/field order | repeat digest 100% |
| fault isolation | call-local immutable values | global mutable state/lock/cache 0 | call間blast radius 0 |
| exhaustive failure mapping | selector/schema | unknown branch/codeはparse error、successへ推測0 | false success防止 |

circuit breaker、backoff retry、bulkhead process、replicationはremote/shared resourceがないため導入しない。これらを追加するとU-01のpure boundaryを破る。

## Failure and fallback design

| Condition | Owner component | Result | Retry/fallback |
|---|---|---|---|
| new/legacy env conflict | `DriverRequestParser` | `CONFLICTING_ENV` | input修正後だけ再評価 |
| invalid driver value | `DriverRequestParser` | `INVALID_DRIVER` | input修正後だけ再評価 |
| harness mismatch | `NativeDriverValue`/support policy | `HARNESS_DRIVER_MISMATCH` | fallbackなし |
| explicit unavailable | `CapabilitySelector` | `EXPLICIT_DRIVER_UNAVAILABLE` | fallbackなし |
| invalid topology/capability | normalizer/validator | contract error | producer修正後だけ |
| registration mismatch | registration validator | composition/build error | mapping修正後だけ |
| unknown output field | schema guard | output rejection | implementation修正後 |
| `auto` unavailable candidate | selector | next fixed candidate + loud reason | dispatch前・同call内だけ |

errorはcode、field path、accepted IDなどclosed diagnosticだけを持ち、raw input/stack/valueを保持しない。

## Determinism and durability

永続dataがないためRPOは0/N/A、recoveryはinputからの再計算である。次の不変条件を保つ。

- input valueをmutationせず、domain/outputをfreezeする。
- clock/random/locale/object insertion orderに依存しない。
- candidate/reason/schema orderをversioned constantへ固定する。
- canonical JSON projectorはsame domain valueからsame bytes/digestを生成する。
- begin/attempt/lease/checkpointなどU-02のrecovery stateをU-01へ持ち込まない。

## Observability handoff

U-01内ではlog、metric、trace、auditを発行しない。`SelectionOutcomeProjection`がschema version、source、requested、selected/mode、harness、topology/reason、fallback diagnostics、legacy warning codeとcanonical digestをU-02へ渡す。

これにより同一decisionを相関できる一方、provider credential、prompt、raw responseを観測surfaceへ入れない。health check/alertはlocal pure componentに非適用である。

## Reliability verification

- closed decision tableと全state edgeをexhaustive table/compile fixtureで100%検証する。
- 10,000 generated caseでsame input repeat、order/duplicate metamorphic digestを検証する。
- invalid/conflict/explicit failureでside effect spy call exactly 0を確認する。
- unknown reason/state/field、secret canary、registration placeholderのsuccess化を0件にする。
- test skip、typecheck/lint/complexity/coverage ratchet悪化をmerge blockerにする。
