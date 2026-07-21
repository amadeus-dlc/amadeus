# NFR Requirements Questions — reviewer-protocol

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U08 `reviewer-protocol`。Functional Designで承認済みのruntime identity、closed read scope、4条件spot-check、6 harness projection契約をNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T15:24:56Z`。

## 質問不要の根拠

- Performance: service latency SLOではなく、directory/glob/browse/searchや無制限scanを禁止し、current Unitのclosed pass-listと承認済み単一owner pathへreadを有界化する。
- Security/privacy: builderの`memory.md`、`plan.md`、reasoning、sibling Unitを既定scopeから除外し、4条件ANDとread前decisionでleast privilegeを固定する。
- Scalability: sourceから既存6 harnessへ決定的に投影し、spot-checkは当該invocation限定の単一fileだけとする。動的fan-outやself-install面追加はない。
- Reliability/observability: runtime UTC、checker persona、Verdict/Reviewer/Date/Iterationを欠くReviewはREADY不可とし、scope decisionを既存Review/subagent/auditで追跡する。拒否後・decision前・approved path外readはreview全体を無効にする。
- Technology: Bun/TypeScript、既存reviewer/subagent/audit、manifest-driven packaging、既存test stackを維持し、新runtime dependency、network、database、service、UI、audit eventを追加しない。

新しいread permission、保持期間、時間SLO、identity policy、failure classification、public APIを選ぶ余地はない。新たな閾値・scope差・ownership判断が必要になった場合は停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T15:24:56Z`）。承認範囲はBR-U08-01〜17、Requirements NFR-1〜8、technology-stack、E-USSU08FD1の機械導出に限定する。runtime UTC、checker persona、4-field Review、closed scope、4条件ANDのread前decision、単一owner file・invocation限定、directory/glob/grep/browse/search禁止、拒否後・decision前・approved path外readによるreview無効、既存Review/subagent/audit追跡、新eventなし、6 harness決定的projection、Bun/TypeScript/既存stack維持を要求する。新read permission、保持期間、時間SLO、identity/failure policy、public API、runtime dependency、network、database、service、UIは追加しない。新たなpermission/failure分類・監査保持判断が必要なら停止し再付議する。
