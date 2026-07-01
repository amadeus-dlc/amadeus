# U002: workspace provenance 記録

## ユニット

- build workspace、host environment、target workspace、target artifacts の対応記録と検証証拠を扱う。

## 対象要求

- R003
- R004

## 価値境界

- Agent と Reviewer が、後続 Intent の provenance と検証結果を混同せずに追跡できる範囲を扱う。
- stage 判定語彙と採用条件は U001 に依存する。

## 検証観点

- build workspace と target workspace の path と commit を記録できる。
- 利用した skill、validator、開発用スクリプトを記録できる。
- validator と標準検証結果を stage 判定の証拠候補として追跡できる。

## 未確認事項

- machine-readable evidence 形式を導入するかは Construction で判断する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/development.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.amadeus/steering/policies.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `.amadeus/intents/*/inception/traceability.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U002-workspace-provenance/design.md)
