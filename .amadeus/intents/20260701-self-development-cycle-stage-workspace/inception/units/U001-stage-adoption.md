# U001: stage 採用判断

## ユニット

- stage0、stage1、stage2 の意味と、stage2 を次回 stage0 として採用する判断を扱う。

## 対象要求

- R001
- R002

## 価値境界

- Maintainer が、stage2 を次回 stage0 として採用できるか判断するための語彙と条件を扱う。
- build workspace と target workspace の詳細な対応記録は U002 に渡す。

## 検証観点

- stage0、stage1、stage2 の意味が追跡できる。
- stage2 が自動昇格しないことが追跡できる。
- Maintainer の採用判断を記録できる。

## 未確認事項

- 採用判断の主記録先は Construction で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/glossary.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.amadeus/steering/policies.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-stage-adoption/design.md)
