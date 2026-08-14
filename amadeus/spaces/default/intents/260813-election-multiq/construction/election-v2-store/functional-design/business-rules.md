# Business Rules — election-v2-store

## Sources

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) からU3 persistence ruleを抽出する。

## Read rules

- BR-R1: 全JSON readはU1 decoderを通す。
- BR-R2: missing/corrupt/unsupported versionを区別する。
- BR-R3: malformedをempty/null/defaultへsilent変換しない。
- BR-R4: legacy readはmemory canonicalizationだけでdiskを書き換えない。
- BR-R5: registry/election state矛盾はfail-closed。

## Blind and append rules

- BR-B1: collecting中のballot本文はvoter固有pending fileだけに書く。
- BR-B2: pending fileはordered ballot eventsを保持し、amend historyを上書きしない。
- BR-B3: shared ledgerへの統合はtally boundaryで一括実行する。
- BR-B4: ledger/materialized durable確認前にpendingを消費しない。
- BR-B5: formal ledger/historyはappend-only。staging cleanupを履歴削除に使わない。
- BR-B6: same ballot identity/same bytesはidempotent、different bytesはconflict。

## Tally commit rules

| Rule | Contract |
|---|---|
| BR-T1 | history fileはcreate-only |
| BR-T2 | history既存時はcanonical bytes一致だけrepair続行可 |
| BR-T3 | current snapshotはcomplete v2 tallyをatomic replace |
| BR-T4 | history → current → state/registry → timelineの順 |
| BR-T5 | expected state mismatchでtransition拒否 |
| BR-T6 | timeline eventはrunIdで重複防止 |
| BR-T7 | failure時にhistory/currentを削除rollbackしない |
| BR-T8 | same run retryは不足stepだけ前進回復 |

## Snapshot/history rules

- BR-H1: 各runはfull question results、target IDs、preserved digestを持つ。
- BR-H2: current tallyはlatest valid history runと一致する。
- BR-H3: history foldは各runのestablished preservationを検証する。
- BR-H4: read-only status/verifyはrepair writeをしない。
- BR-H5: runId、question IDs、digestをtimelineへ保持する。

## State rules

- BR-S1: holdが残るcanonical stateはpartial。
- BR-S2: all establishedだけがtallied以降へ進める。
- BR-S3: legacy holdはread時partialへ正規化し、new writeでholdを出さない。
- BR-S4: registry/election stateはcompare-before-writeで収束させる。

## Traceability

FR-BAL-5、FR-RER-2/3、FR-COMP-1〜4、FR-TAL-6、NFR-3/4を本rule群で被覆する。single writer前提を維持し、並行writer/DB transactionはscope外。
