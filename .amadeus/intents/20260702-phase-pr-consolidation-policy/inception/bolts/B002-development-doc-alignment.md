# B002 development.md の整合補正

## 概要

development.md の PR 準備条件が統合 PR と矛盾なく読めるかを確認し、必要な補正を行う Bolt である。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design Brief](../units/U001-pr-consolidation-contract/design.md)

## 完了条件

- development.md の PR 準備条件が、統合 PR では含まれる各 phase の成果物に適用されることが読める。
- Git Branching Policy への参照が必要な場合は追加されている。
- 補正が不要と判断した場合は、その根拠が notes に記録されている。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/development.md` | 未確認 | なし | 未確認 |

## 未確認事項

- 補正の要否（読み替えで足りるか、明記が必要か）は Task Generation と実装で確定する。
