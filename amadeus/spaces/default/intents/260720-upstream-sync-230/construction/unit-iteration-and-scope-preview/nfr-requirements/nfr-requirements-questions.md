# NFR Requirements Questions — unit-iteration-and-scope-preview

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U05 `unit-iteration-and-scope-preview`。BR-U05-01〜15、FR-2 items 8–9、Requirements NFR-1〜8をNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T23:40:13Z`。

## 質問不要の根拠

- Performance/scalability: `nextConstructionStep`と`previewScopeCost`は既存順序のstate/graph/gridを同期評価するpure decision seamであり、新SLO、parallelism、cache、consumer別countを決める余地はない。
- Security/integrity: 不正iterationはstate、plan、graph、auditの全mutation前に拒否し、previewは同一`CompiledGrid`のeffective in-scope集合だけからstage数・gate数を導出することが既決である。
- Reliability: `unit-major`はUnit外側・既存Unit順・compiled stage順、未指定時は既存stage-majorと生成bytes不変であり、独自sort、tie-break、第二resolverを追加しない。
- Compatibility: scope confirmation、intent birth、scope-change、validate-gridは同じ`ScopeSummary`を投影し、human表示は同値、JSONは既存field/value/順序を変えないadditiveな`summary`に限定される。
- Technology: Bun/TypeScript、既存C2 state/graph/CLI/lock/audit/test stackを維持し、新runtime dependency、service、database、network、UIを追加しない。

新signature、iteration vocabulary、順序、consumer別count、既存bytes変更、ownership、error policyを選ぶ余地はない。成果物化中に新たなtie-break、invalid iteration分類、count semantics、failure/atomicity判断が必要になった場合は確定前に停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T23:40:13Z`）。承認範囲はBR-U05-01〜15、FR-2 items 8–9、Requirements NFR-1〜8、正準2 public seam、opt-in `unit-major`、既定stage-majorの生成bytes不変、`CompiledGrid`由来の`ScopeSummary`共通投影、Bun/TypeScriptと既存C2 stackの機械導出に限定する。新tie-break、invalid iteration分類、count semantics、failure/atomicity、ownership、public API、dependency、service、database、network、UI、保持期間、SLOは追加しない。
