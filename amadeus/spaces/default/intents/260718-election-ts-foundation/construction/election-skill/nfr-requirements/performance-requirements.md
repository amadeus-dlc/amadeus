# Performance Requirements — election-skill(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 性能特性と目標

U6 は SKILL.md(薄ラップ文書)+禁止語彙 grep 検査+ノルム無参照 subagent 実演(business-logic-model.md — ADR-6 実演層)。実行コードを持たない文書+検査ユニットで、性能 SLO は N/A(反証可能な根拠: requirements.md FR-8a — SKILL は「ツールの指令ループに従う」記述のみで処理を実装しない)。

- 禁止語彙 grep 検査は SKILL.md 1ファイルへの単一走査(business-rules.md の検査ルール)— 実行時間の考慮対象にならない
- 数値目標は置かない(未実測の数値を SLO 化しない)

## 測定と検証

- 検査はテストランナー内の決定的 grep(requirements.md FR-8a 受け入れ (i))で、既存タイムアウトが停止ガード。ベンチマーク・専用計測は追加しない(規模正当化)
- 実演層(subagent 完走)は一度きりの受け入れ証跡で CI 非常設(ADR-6 (ii))— 性能要求の対象外。既存スタック(technology-stack.md の Bun/TS 実測)の範囲で足りる
