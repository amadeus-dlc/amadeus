# NFR Design Questions — reviewer-protocol

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: U08 `reviewer-protocol`。承認済みNFR、正準2 public seam、E-USSU08FD1を既存orchestrator/reviewer/package/test境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-21T01:42:53Z`。

## 質問不要の根拠

- Performance: `reviewerReadScope`のclosed pass-list、spot-check単一file、Review書込直前の単一`date -u`、stage由来validationだけで閉じ、新SLO、cache、queue、retryはない。
- Security: `stage_file`、current Unitの実在`produces`、present consumesだけをauthoritative declared scopeとし、Q&Aは`directive.consumes`明示時だけ含める。4条件ANDを`check-read`でrequest前に評価し、directory/glob/grep/wildcard/browse/search、rejected/outside/2 file目request、bypass、transcript改竄をReview/READY証拠として拒否する。
- Reliability: `runtimeReviewIdentity`は実checker personaと実測UTCからVerdict/Reviewer/Date/Iterationの4-field Reviewを作り、invalid date/persona/field欠落をREADY証拠にしない。
- Scalability: authored正本から6 harnessへ同じcontractをgenerator投影し、self-installは既存4面closed list。review workloadをsibling Unit数へ比例させない。
- Logical components: orchestrator-owned scope builder、reviewer-owned identity builder、内部owner resolver/`check-read`/transcript validator/date runner、既存subagent/Review/audit、package generator、fixturesへ閉じ、新event、read ledger、provenance storeを追加しない。

新public API、read permission、owner discovery、identity fallback、timestamp/failure policy、retention、SLO、service、AWS infrastructureを選ぶ余地はない。成果物化中に新たなpermission、failure classification、component ownership、audit/provenance判断が必要になった場合は確定前に停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-USSU08CGD1 choice1 A=6–0、GoA 6–0により、authoritative scopeは既存wireの`stage_file`、実在`produces`、present consumesから作る§12a declared pass-list、Q&Aは`directive.consumes`明示時だけと確定した。追加requestの唯一受理経路は`check-read`、Review/READY前の正本検証は`complete-review`によるtransient Scope decision transcript全件再計算と最終Reviewへの永続projectionである。bypass、改竄、rejected/outside/2 file目requestを含むresultは不受理とする。承認範囲は正準2 seam `reviewerReadScope` / `runtimeReviewIdentity`、実checker personaと直前UTCによる4-field Review、6 harness generator、4 self-install、既存Bun/TypeScript/test stackへの機械配置に限定する。actual invisible readは非要件で、新public API、read permission、owner discovery、identity fallback、timestamp/failure policy、audit event、read ledger、provenance store、proxy/sandbox、retention、SLO、cache、queue、service、AWS infrastructure、network、databaseは追加しない。
