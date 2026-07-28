# Scalability Design — U4 u4-skill-docs

上流入力(consumes 全数): scalability-requirements.md、performance-requirements.md、security-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

SC-U4-1(scalability-requirements.md — N/A)に従いスケール機構なし。ハーネス列挙の count-free 導出形(business-logic-model.md — 「tools/amadeus-plugin.ts を含むインストール済みハーネスディレクトリ」)が唯一の規模対応設計。

## 境界確認

- 投影 entry の追加(tech-stack-decisions.md TS-U4-2)はハーネス増に対し線形の機械作業で、reliability-requirements.md RL-U4-1 の drift guard が完全性を固定。performance-requirements.md / security-requirements.md への影響なし
