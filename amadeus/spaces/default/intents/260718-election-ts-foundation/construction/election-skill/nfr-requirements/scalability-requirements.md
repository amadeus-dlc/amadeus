# Scalability Requirements — election-skill(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 負荷前提と成長予測

- U6 は文書1点+検査1点+一度きりの実演(business-logic-model.md)で、負荷・成長の概念が適用されない — 容量計画は N/A(反証可能な根拠: requirements.md FR-8 は SKILL の薄さ自体を要求しており、機能追加は FR-0 により TS 側 = U5 へ蓄積される構造)
- SKILL の記述量増加はそれ自体が FR-8a (ii) 違反(転送ループ以外の記述)として検査で検出される — スケールしないことが要件

## 同時実行

- 実行主体を持たないため同時実行の考慮は N/A。禁止語彙検査はテストランナー内の読み取り専用 grep(technology-stack.md 実測の Bun 単一プロセス実行)で共有状態なし
