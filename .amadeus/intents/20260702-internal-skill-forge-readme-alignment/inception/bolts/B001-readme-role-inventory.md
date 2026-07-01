# B001: README role inventory

## 概要

README と README.ja の skill 分類を、実在する `skills/amadeus-*` と `.agents/skills/amadeus-*` の一覧と照合する。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-readme-skill-role-alignment/design.md)

## 完了条件

- README の Phase Skills、Cross-Cutting Support Skills、Internal Skills の分類を確認している。
- `skills/amadeus-*` と `.agents/skills/amadeus-*` の一覧を確認している。
- README に内部 skill を全列挙するか、公開入口中心の説明に留めるかを判断できる。
- 互換性維持対象の有無を確認している。

## 依存

- なし

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `README.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `README.ja.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-*` | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `.agents/skills/amadeus-*` | 未確認 | なし | 未確認 |

## 未確認事項

- README 文面を更新するかは Construction で確定する。
