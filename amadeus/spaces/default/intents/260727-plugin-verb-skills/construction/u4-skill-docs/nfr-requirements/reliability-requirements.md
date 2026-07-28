# Reliability Requirements — U4 u4-skill-docs

上流入力(consumes 全数): business-logic-model.md(status first)、business-rules.md(BR-U4-4/BR-U4-6)、requirements.md(FR-3b/FR-5a)、technology-stack.md

## RL-U4-1: 投影 drift の機械固定

7面投影の完全性は dist:check / promote:self:check が固定(business-logic-model.md 投影フロー、requirements.md FR-5a)。手動同期に依存しない(business-rules.md BR-U4-4 の grep 再列挙+technology-stack.md の既存 drift guard 群)。

## RL-U4-2: スキル検査テスト

存在+マーカー不含+7面投影を t258-amadeus-mirror-skill 前例の専用テストでピン(business-rules.md BR-U4-6 — 申告済み予算)。
