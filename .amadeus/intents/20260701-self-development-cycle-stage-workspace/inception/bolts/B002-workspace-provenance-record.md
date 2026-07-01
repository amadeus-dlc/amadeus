# B002: workspace provenance 記録

## 概要

- build workspace、host environment、target workspace、target artifacts の対応記録と検証証拠を記録する。

## 対象ユニット

- U002

## 設計

- [U002 Unit Design](../units/U002-workspace-provenance/design.md)

## 完了条件

- build workspace と target workspace の path と commit を記録できる。
- 利用した skill、validator、開発用スクリプトを記録できる。
- validator と標準検証結果を stage 判定の証拠候補として追跡できる。
- stage 判定と workspace 対応記録が PR 準備条件から読める。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/development.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.amadeus/steering/policies.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `.amadeus/intents/*/inception/traceability.md` | 未確認 | なし | 未確認 |

## 未確認事項

- machine-readable evidence 形式の導入要否は Construction で判断する。
