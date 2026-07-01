# B001: stage 方針記録

## 概要

- stage0、stage1、stage2 の意味と、stage2 を次回 stage0 として採用する条件を記録する。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design](../units/U001-stage-adoption/design.md)

## 完了条件

- stage0、stage1、stage2 の意味が追跡できる。
- stage2 を次回 stage0 として採用する条件が追跡できる。
- Maintainer の採用判断を記録できる。
- `CONTEXT.md` への stage 語彙追加は対象外として残る。

## 依存

- なし

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/glossary.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.amadeus/steering/policies.md` | 未確認 | なし | 未確認 |

## 未確認事項

- 採用判断の主記録先をどの成果物にするかは Construction で確定する。
