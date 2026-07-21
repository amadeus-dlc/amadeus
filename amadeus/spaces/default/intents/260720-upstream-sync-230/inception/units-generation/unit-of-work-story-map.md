# Unit of Work Story Map — upstream-sync-230

> 上流入力(consumes 全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。`stories.md` は本 scope で SKIP 済み。

本scopeではUser Stories stageがSKIPされたため、story数は0であり「story implementation order」はN/A。代わりに承認済みFR itemをUnitへ全数写像し、未割当・重複ownerを検査する。これは実装順やBolt優先を意味しない。

## Requirement-to-Unit map

| Requirement / item | Primary Unit | Supporting/verification |
|---|---|---|
| FR-0 verification-first 4項目 | U03/U04/U07（該当機能owner） | U12集約 |
| FR-1 item 1 bolt-dag-selfheal | U02 runtime-recovery | U10 composition consumer、U12 |
| FR-1 item 2 gate-revision-backstop | U02 runtime-recovery | U12 |
| FR-1 item 3 swarm-batch-advance | U03 swarm-and-next-stage | U12 |
| FR-1 item 4 help-routing | U04 routing-and-autonomy-guards | U12 |
| FR-1 item 5 compose-pending-freshness | U04 routing-and-autonomy-guards | U12 |
| FR-1 item 6 recompose-autonomy-guard | U04 routing-and-autonomy-guards | U12 |
| FR-2 item 7 unit-kind-pruning | U01 stage-contract | U05、U12 |
| FR-2 item 8 unit-major-iteration | U05 unit-iteration-and-scope-preview | U12 |
| FR-2 item 9 scope-cost-preview | U05 unit-iteration-and-scope-preview | U12 |
| FR-2 item 10 gate-next-stage-naming | U03 swarm-and-next-stage | U12 |
| FR-3 item 11 nested-root-detection | U06 workspace-inspection | U12 |
| FR-3 item 12 submodule-detection | U06 workspace-inspection | U12 |
| FR-4 item 13 execpath-spawn | U07 harness-hook-correctness | U12 |
| FR-4 item 14 kiro-ide-hook-context | U07 harness-hook-correctness | U12 |
| FR-4 item 15 project-dir-quoting | U07 harness-hook-correctness | U12 |
| FR-5 item 16 reviewer-date-persona | U08 reviewer-protocol | U12 |
| FR-5 item 17 reviewer-read-scope | U08 reviewer-protocol | U12 |
| FR-6 item 18 stage-schema-extensions | U01 stage-contract | U09/U10、U12 |
| FR-6 item 19 packager-plugin-projection | U09 plugin-projection | U11、U12 |
| FR-6 item 20 plugin-compose-hook | U10 plugin-composition | U11、U12 |
| FR-6 item 21 test-pro-reference-plugin | U11 reference-plugin-and-guides | U09/U10、U12 |
| FR-6 item 22 plugin-docs | U11 reference-plugin-and-guides | U12 |
| FR-7 item 23 ported-tests | 各U01–U11へ該当testを同乗 | U12全数trace |
| FR-7 item 24 docs-updates | 各U01–U11へ該当docsを同乗 | U12pair/legacy検査 |
| FR-8 ledger completion | U12 verification-and-ledger-closure | 全U01–U11 evidence |

## Cross-cutting coverage

- NFR-1決定性: U01/U03/U05/U09/U10、U12。
- NFR-2 fail-closed/atomicity: U01/U02/U04/U06/U10、U12。
- NFR-3互換性: 各機能ownerのdefault fixture、U12。
- NFR-4配布整合: U07/U08/U09/U11、U12。
- NFR-5/NFR-6検証・coverage: 各Unit targeted test、U12 full gate。
- NFR-7保守性: 全Unitの既存choke point/reuse inventory。
- NFR-8供給網: U09/U10/U11、U12 dependency/network検査。

## Coverage verification

- User stories: 0（stage SKIP、未割当0）。
- ADOPT/ADAPT items: 24/24にprimary Unitあり。
- Units: 12/12に最低1つのFR/NFR/closure責務あり。
- SKIP 6項目: primary Unit 0。plugin deferred面: primary Unit 0。
- plugin 4分割: U01 contract / U09 projection / U10 composition / U11 referenceを独立ownerとして保持し、Delivery Planningへ独立検証可能Bolt条件を渡す。
