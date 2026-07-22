# NFR Requirements Questions — reviewer-protocol

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U08 `reviewer-protocol`。Functional Designで承認済みのruntime identity、closed read scope、4条件spot-check、6 harness projection契約をNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T15:24:56Z`。

## 質問不要の根拠

- Performance: service latency SLOではなく、directory/glob/browse/searchや無制限scanを禁止し、current Unitのauthoritative declared pass-listと承認済み単一owner pathへrequestを有界化する。
- Security/privacy: builderの`memory.md`、`plan.md`、reasoning、sibling Unitを既定scopeから除外し、4条件ANDと`check-read`のrequest前decisionでleast privilegeを固定する。
- Scalability: sourceから既存6 harnessへ決定的に投影し、spot-checkは当該invocation限定の単一fileだけとする。動的fan-outやself-install面追加はない。
- Reliability/observability: runtime UTC、checker persona、Verdict/Reviewer/Date/Iterationを欠くReviewはREADY不可とする。scope decision transcriptはprompt/result間のtransient carrierとし、`complete-review`が全entryを再検証したprojectionを最終Reviewへ永続記録する。bypass・改竄・rejected/outside/2 file目requestを含むresultはReview/READY不受理とする。
- Technology: Bun/TypeScript、既存reviewer/subagent/audit、manifest-driven packaging、既存test stackを維持し、新runtime dependency、network、database、service、UI、audit eventを追加しない。

新しいread permission、保持期間、時間SLO、identity policy、failure classification、public APIを選ぶ余地はない。新たな閾値・scope差・ownership判断が必要になった場合は停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T15:24:56Z`）。E-USSU08CGD1はchoice1 Aを6–0、GoA 6–0でrecordedし、authoritative scopeを既存wireの`stage_file`、実在`produces`、present consumesへ整合した。Q&Aは`directive.consumes`明示時だけ含める。runtime UTC、checker persona、4-field Review、4条件ANDの`check-read`、単一owner file・invocation限定、directory/glob/grep/browse/search request禁止、prompt/result間のtransient Scope decision transcript、`complete-review`によるdirective/artifacts/consumesからの全件再検証と最終Reviewへの永続projectionを要求する。bypass、改竄、rejected/outside/2 file目requestを含むresultはReview/READY不受理とする。actual invisible readは非要件で、新read permission、audit event、read ledger、store、proxy/sandbox、保持期間、時間SLO、identity/failure policy、public API、runtime dependency、network、database、service、UIは追加しない。
