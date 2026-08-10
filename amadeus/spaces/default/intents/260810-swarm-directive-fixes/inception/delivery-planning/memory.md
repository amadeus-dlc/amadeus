# Delivery Planning Memory

## Interpretations

- 2026-08-10T14:24:00Z — 1 Issue=1 Unit=1 Bolt=1 PRを満たすため、pure moduleとorchestrator配線をIssue別vertical Unitへ統合した。
- 2026-08-10T14:24:00Z — 横断acceptanceはUnit/PRでなく既存Build and Test工程の責務とした。

## Deviations

- 2026-08-10T14:24:00Z — self-featureのBolt 1単独実行規範に対し、今回intentだけBolt 2の並行実装を許す。ユーザー最終裁定「並行実装＋#2833先行ゲート」に基づき、walking-skeletonの先行gate自体は維持する。

## Tradeoffs

- 2026-08-10T14:24:00Z — shared-file conflictをDAG edgeで全直列化せずsemantic region ownershipとPR収束順序で制御した。これによりConstruction swarm並行化とIssue別PRを両立するが、same-hunk検出時はfail-closedで裁定へ戻る。

## Open questions

- なし。

