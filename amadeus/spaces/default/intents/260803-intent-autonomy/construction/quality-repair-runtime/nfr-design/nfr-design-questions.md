# NFR Design 質問 — quality-repair-runtime

## 裁定結果

追加のユーザー裁定は不要である。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はself-featureスコープ上のexpected absenceであり、`functional-design/business-logic-model.md`に確定した#2096のbounded convergence、evidence provenance、atomic resumeをNFRオラクルとする。

## 矛盾・抜け漏れ確認

Issue外の数値SLO、総修復回数上限、新stage、常駐supervisor、PR運用は追加しない。strict progressがある間は修復を続け、T回の連続non-progressを初回replan・次回repair-stalledへ閉じる既存契約を維持する。
