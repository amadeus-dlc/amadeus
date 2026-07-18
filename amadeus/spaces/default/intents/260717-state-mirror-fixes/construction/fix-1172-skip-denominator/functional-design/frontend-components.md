# Frontend Components — fix-1172-skip-denominator(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## N/A 宣言(反証可能根拠付き)

本 unit は repo ローカル CLI(scripts/amadeus-mirror.ts)の純関数修正のみで UI を持たない(ui-less-mockups-as-output-contract 準拠、rough/refined-mockups は scope SKIP)。

## 出力契約モック

| 経路 | 出力(状態行の該当部) |
|---|---|
| 修正後・mirror-issue-tool 相当 state(C4 修復後) | `approved 18/18` |
| 修正後・本 intent state(in-scope 18、進行中) | `approved N/18`(N = 現 [x] 数 — 分母が 32 でないことが検証点) |

既存 render 様式(amadeus-mirror.ts の状態行テンプレート)は不変 — 変わるのは countStageProgress の返す分母のみ。
