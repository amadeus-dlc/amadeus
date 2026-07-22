# NFR Requirements Questions — swarm-and-next-stage

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U03 `swarm-and-next-stage`。E-OC1承認、BR-U03-01〜16、FR-1 item 3 / FR-2 item 10をNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T23:36:10Z`。

## 質問不要の根拠

- Performance/scalability: recovered BoltDagとCompiledGridを記録順に同期評価するpure decision seamであり、新service SLOやparallelism policyはない。
- Security/integrity: current runのconverged evidenceだけを完了根拠とし、merge failureや別run claimによるfalse advanceを拒否する。
- Reliability: 最初の未完了batchだけを選び、next stageは実在する最初のin-scope stage、SKIP非出力、終端`null`、gate/engine同一resolverが既決である。
- Compatibility: FR-0 EQUIVALENT面はproduction挙動差分0とし、targeted regression evidenceだけを残す。
- Technology: Bun/TypeScript、既存C2 orchestrator/state/swarm/test stackを維持し、新dependency、service、database、network、UIを追加しない。

新signature、BatchSelection shape、tie-break、failure policy、malformed grid handling、terminal value、ownershipを選ぶ余地はない。新たなno-selection/failure/ordering判断が必要なら停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T23:36:10Z`）。承認範囲はBR-U03-01〜16、FR-1 item 3 / FR-2 item 10、正準2 public seam、BoltDag/currentRun/merge-failure、CompiledGrid/SKIP/terminal null、FR-0 EQUIVALENT、Requirements NFR-1〜8、technology-stackの機械導出に限定する。新no-selection、failure、ordering、malformed-grid、terminal、ownership、signature、dependency、service、database、network、UI、保持期間、SLOは追加しない。
