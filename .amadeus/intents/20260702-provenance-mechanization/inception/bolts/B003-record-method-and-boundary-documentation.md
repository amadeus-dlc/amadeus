# B003 記録方法と検査責務境界の文書整合

## 概要

`.amadeus/steering/policies.md` の provenance 記録方法を生成スクリプト前提の記述へ更新し、`.amadeus/development.md` の stage と workspace 対応記録の表を新しい記録先と矛盾しないよう整合させ、検査責務境界（validator、provenance:check、evaluator）を decisions に記録する Bolt である。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design Brief](../units/U001-provenance-record-contract/design.md)

## 完了条件

- policies.md の provenance 記録方法の記述が、`provenance:generate` による生成を前提にした記述へ更新される。
- development.md の「stage と workspace 対応記録」の表が、`provenance/` を記録先として矛盾なく含む。
- 検査責務境界（validator = 成果物構造の検証、provenance:check = 実測値の照合、evaluator = 意味と接続性の評価）が decisions に記録され、親 Issue #315 の受け入れ条件を満たす。

## 依存

- B001
- B002

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/steering/policies.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.amadeus/development.md` | 未確認 | なし | 未確認 |

## 未確認事項

- なし。
