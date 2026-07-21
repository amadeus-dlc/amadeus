# NFR Requirements Questions — runtime-recovery

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U02 `runtime-recovery`。E-USSU02FD1=Aを含むBolt DAG recoveryとgate revision backstopをNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T15:33:08Z`。

## 質問不要の根拠

- Performance/scalability: dependency正本とruntime cacheのpure resolution、timestamp+buffer positionの有界audit evidence normalizationであり、新service SLOはない。
- Security: malformed sourceをzero-unitへ降格せず、autonomous/off-switchではrevision backstopを実行しない。
- Reliability: read-side mutation 0、5 block事前生成/全数検証/単一atomic audit commit、state 1回write、state failure後のidempotent convergenceが裁定済みである。
- Observability: healed diagnosticとRecovered provenanceを既存stderr/auditへ投影し、新eventや保持期間を追加しない。
- Technology: Bun/TypeScript、既存audit lock/filesystem/parser/test stackを維持し、新dependency/network/database/queue/UIを追加しない。

新しいatomicity、evidence predicate、chronology、degrade policy、public APIを選ぶ余地はない。新たなfailure boundaryやrecovery policyが必要なら停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T15:33:08Z`）。承認範囲はE-USSU02FD1=A、BR-U02-01〜24、Requirements NFR-1〜8、technology-stackの機械導出に限定する。dependency正本優先DAG recovery、none/ok/malformed、read-side mutation 0、全consumer同一Unit集合、Timestamp+buffer position chronology、revision evidence closed predicate、autonomous/off-switch skip、5 block事前生成/全数検証/単一atomic audit commit、最終state 1回write、state failure後のaudit重複0・収束、既存Bun/TypeScript/audit lock stackを維持する。新atomicity/evidence/degrade/failure policy、public API、dependency、network、database、queue、UI、保持期間、SLOは追加しない。
