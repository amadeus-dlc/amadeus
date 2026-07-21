# NFR Design Questions — reviewer-protocol

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: U08 `reviewer-protocol`。承認済みNFR、正準2 public seam、E-USSU08FD1を既存orchestrator/reviewer/package/test境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-21T01:42:53Z`。

## 質問不要の根拠

- Performance: `reviewerReadScope`のclosed pass-list、spot-check単一file、Review書込直前の単一`date -u`、stage由来validationだけで閉じ、新SLO、cache、queue、retryはない。
- Security: current Unit/stage/Q&A/passed consumesだけを既定scopeとし、4条件ANDをread前に評価する。directory/glob/grep/wildcard/browse/search、decision前/拒否後/approved path外/2 file目readは禁止・review無効が既決である。
- Reliability: `runtimeReviewIdentity`は実checker personaと実測UTCからVerdict/Reviewer/Date/Iterationの4-field Reviewを作り、invalid date/persona/field欠落をREADY証拠にしない。
- Scalability: authored正本から6 harnessへ同じcontractをgenerator投影し、self-installは既存4面closed list。review workloadをsibling Unit数へ比例させない。
- Logical components: orchestrator-owned scope builder、reviewer-owned identity builder、内部owner resolver/decision recorder/date runner、既存subagent/Review/audit、package generator、fixturesへ閉じ、新eventやprovenance storeを追加しない。

新public API、read permission、owner discovery、identity fallback、timestamp/failure policy、retention、SLO、service、AWS infrastructureを選ぶ余地はない。成果物化中に新たなpermission、failure classification、component ownership、audit/provenance判断が必要になった場合は確定前に停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。leaderの仕掛かり完了指示により、既承認scope内での成果物・sensor・独立review・§13の完了を承認済み（`2026-07-21T01:42:53Z`）。承認範囲は正準2 seam `reviewerReadScope` / `runtimeReviewIdentity`、current Unit・stage・Q&A・passed consumesのclosed scope、E-USSU08FD1の4条件ANDとread前decision、単一owner pathのinvocation限定追加、禁止されたdirectory/glob/grep/wildcard/browse/search、実checker personaと直前UTCによる4-field Review、既存Review/subagent/audit、6 harness generator、4 self-install、既存Bun/TypeScript/test stackへの機械配置に限定する。新public API、read permission、owner discovery、identity fallback、timestamp/failure policy、retention、SLO、cache、queue、service、AWS infrastructure、network、database、provenance storeは追加しない。
