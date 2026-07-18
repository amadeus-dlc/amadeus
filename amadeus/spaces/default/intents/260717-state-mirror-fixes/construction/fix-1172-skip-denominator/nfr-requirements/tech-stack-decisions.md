# Tech Stack Decisions — fix-1172-skip-denominator(nfr-requirements)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 決定

| # | 決定 | 根拠 |
|---|---|---|
| T-1 | 新規 runtime dependency ゼロ・新規 import ゼロ(正規表現リテラル1本の追加のみ) | requirements NFR-3、business-logic-model |
| T-2 | scripts/ 既存配線(biome.json:41 / tsconfig.json:19)にそのまま収容 — 配線変更なし | evidence(practices-discovery)実測 |

## 現行スタックとの整合(technology-stack 由来)

technology-stack.md(Bun/TypeScript/ESM、Biome、tsc --noEmit)と整合 — スタック変更ゼロ。
