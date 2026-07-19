# Scalability Requirements — election-skill(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 負荷前提と成長予測

- U6 は文書1点+検査1点+一度きりの実演(business-logic-model.md)で、負荷・成長の概念が適用されない — 容量計画は N/A(反証可能な根拠: requirements.md FR-8 は SKILL の薄さ自体を要求しており、機能追加は FR-0 により TS 側 = U5 へ蓄積される構造)
- SKILL の肥大への構造的抑止は FR-0/FR-8 のアーキテクチャに由来する(手順知識の正本は TS 側 = U5 へ蓄積され、SKILL は転送ループのみ)。実装済み検査が検出するのは**特定の禁止語彙の混入(BR-K1)と4節構造の逸脱(BR-K3)に限る** — 一般的な記述量増加そのものを検出する機構は設計に存在しない(reviewer Major 是正 — 未実装の検出力を根拠にしない)

## 同時実行

- 実行主体を持たないため同時実行の考慮は N/A。禁止語彙検査はテストランナー内の読み取り専用 grep(technology-stack.md 実測の Bun 単一プロセス実行)で共有状態なし
