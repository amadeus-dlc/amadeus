# B001: reporting contract definition

## 概要

- skill 実行時問題報告の共通契約を source skill に定義する。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design](../units/U001-reporting-contract/design.md)

## 完了条件

- source skill から、現在の Intent 対象、後続 Issue 候補、報告不要の分類基準を読める。
- source skill から、最低報告項目を読める。
- source skill から、GitHub Issue 作成が人間承認付きであることを読める。
- source skill から、validator の `pass` を内容承認として扱わないことを読める。
- 現在の Intent と無関係な改善を成果物へ混ぜない方針を読める。

## 依存

- なし

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-ideation/SKILL.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-inception/SKILL.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-construction/SKILL.md` | 未確認 | なし | 未確認 |

## 未確認事項

- `amadeus-discovery` と `amadeus-validator` を同時に対象へ含めるかは、Construction で差分規模を見て確定する。
