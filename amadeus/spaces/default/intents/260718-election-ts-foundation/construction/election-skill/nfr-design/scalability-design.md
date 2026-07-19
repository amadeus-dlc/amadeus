# Scalability Design — election-skill(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md

## 非スケール設計

- U6 は文書1点+検査1点+実演1回(business-logic-model.md)で、スケール機構を持たない(scalability-requirements.md N/A の設計反映)。SKILL の肥大抑止はアーキテクチャ由来(FR-0 — 手順知識は TS 側 = U5 へ蓄積)であり、検査(business-rules.md BR-K1/K3)は特定語彙・構造逸脱の検出に限る(nfr-requirements 段の是正済み表現を維持)
- 語彙集合の増補は canonical 定数への追加1箇所で閉じる(tech-stack-decisions.md — security-requirements.md の語彙境界・performance-requirements.md の単一走査を変えない)

## 同時実行

- 実行主体なし(scalability-requirements.md N/A)。検査は読み取り専用 grep で共有状態なし(reliability-requirements.md の fixture 基盤と共通)
