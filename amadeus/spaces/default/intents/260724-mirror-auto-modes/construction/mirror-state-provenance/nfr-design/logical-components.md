# Logical Components — mirror-state-provenance

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Inventory

| ID | Component | Responsibility |
|---|---|---|
| S0（C0） | State Types | snapshot、receipt、warning、challenge、outbox unions |
| S1（C3 internal） | Document Codec | sentinel、duplicate-aware tokenizer、byte preservation |
| S2（C3 internal） | Pure Reducer | transition closure、invariants、no-op |
| S3（C3 internal） | Atomic File Store | lock、CAS、temp、fsync、rename |
| S4（C3 internal） | Audit Outbox Module | transaction ID、idempotent append result |
| S5（C4 internal） | Marker Codec | canonical marker render／parse |
| S6（C4 internal） | Provenance Verifier | repository／identity／Issue match |
| S7（C3 internal） | Repair Challenge | plan codec、TTL、consume／prune |

## Dependencies

S0は上流C0の一部でleaf。S1〜S4／S7は上流C3 State Storeのprivate module、S5〜S6は上流C4 Provenanceのprivate moduleであり、独立deployable componentではない。公開APIはC3のparse／mutate／repair challengeとC4のmarker／verifyだけである。C3 coordinatorがS3 state lockを所有しS4 audit portを呼び、C6は公開C3／C4 APIだけをorchestrateする。本UnitはGatewayやlifecycleをimportしない。

## Failure Domains

- codec／reducer invalidはwrite前に閉じる。
- file failureはstate commit certaintyをtyped outcomeへ分離する。
- audit failureはcommitted business stateをrollbackせずoutboxで回復する。
- marker／repair mismatchはremote call 0件。
- capacity failureはpartial stateやfallback provenanceを作らない。

## Verification Boundaries

pure componentはgolden／property／transition matrix、S3／S4はtemporary filesystemとfailure injection、S7はfake clock、C6 handoffはintegration testで検証する。
