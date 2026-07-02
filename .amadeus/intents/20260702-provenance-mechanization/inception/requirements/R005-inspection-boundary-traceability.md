# R005 検査責務境界の追跡可能性

## 要求

validator、provenance:check、evaluator の検査責務の境界が decisions から追跡でき、親 Issue #315 の受け入れ条件「境界がいずれかの子 Issue に記録されている」を満たす。

## 背景

親 Issue #315 は、証拠記録と評価に関わる複数の子 Issue（#296、#297、#240 など）に検査責務が分散することを想定しており、境界がどこかの子 Issue で記録されることを受け入れ条件にしている。この Intent（#296）は、grilling session（2026-07-02）で、validator = 成果物構造の検証、provenance:check = 実測値の照合、evaluator = 意味と接続性の評価という境界を確定した（GD003）。

## 受け入れ条件

- validator（成果物構造の検証）、provenance:check（実測値の照合）、evaluator（意味と接続性の評価、#240 の対象）の検査責務の境界が decisions に記録されている。
- 親 Issue #315 の受け入れ条件を、この Intent の decisions への記録で満たせる。

## 依存

なし。

## 対応する対象境界

- SC-IN-001

## 未確認事項

- なし。
