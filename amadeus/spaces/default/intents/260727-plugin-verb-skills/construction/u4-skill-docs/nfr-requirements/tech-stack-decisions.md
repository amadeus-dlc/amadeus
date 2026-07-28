# Tech Stack Decisions — U4 u4-skill-docs

上流入力(consumes 全数): technology-stack.md(現行スタック)、business-logic-model.md(投影3系統)、business-rules.md(BR-U4-4)、requirements.md(FR-3a/3b)

## TS-U4-1: 追加依存なし

SKILL.md は markdown、投影は既存 manifest/emit 機構の entry 追加のみ(business-logic-model.md の3系統 — literal/helper registry/emit.ts 配列)。新規ツール・依存なし(technology-stack.md 現行のまま)。

## TS-U4-2: 配線の実装位置

mirror の実配線(business-rules.md BR-U4-4 の grep 再列挙)と同一系統に追随し、requirements.md FR-3a の正本(packages/framework/core/skills/amadeus-plugin/)から生成する。dist/self-install の手編集なし。
