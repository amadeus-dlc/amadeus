# Code Generation Plan — diagnostic-logs

上流入力（consumes 全数）: functional-design（business-logic-model.md、business-rules.md、domain-entities.md）、nfr-requirements、nfr-design、unit-of-work.md、requirements.md（すべて参照済み）

## 対象要件

FR-MLM-2, FR-EXP-4（unit-of-work.md U10）

## 実施方針

- fail-open diagnostic Log 経路: U1/U4 既設の主経路（Context 相関・LocalLogExporter 同期 append・export 境界 redaction・canonical 非 dispatch）に対する実装デルタ2点 — (1) drop note の warn port（BR-2/BR-10、credential scrub 済み最小情報のみ） (2) canonical 名借用の静的 guard（BR-6、registry table から語彙導出。diagnostic 経路は fail-open 契約のため runtime throw にしない）
- 残る BR は既存実装への characterization テストとして固定（TDD slice と区別して申告）
- TDD（Red 実測 → 最小実装 → Green）。成果は PR #1731

## 検証計画

- t368（integration + unit）+ 影響 otel スイート
- typecheck・lint・dist:check・promote:self:check・coverage registry --check・落ちる実証（corpus 注入 → 赤 → revert 不可分1セット）
