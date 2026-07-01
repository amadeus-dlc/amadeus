# B004: compatibility and validation closure

## 概要

互換性判断、README 更新要否、検証条件を確定する。

## 対象ユニット

- U001
- U002

## 設計

- [U001 design](../units/U001-readme-skill-role-alignment/design.md)
- [U002 design](../units/U002-skill-forge-review-contract/design.md)

## 複数 Unit を扱う理由

互換性判断と検証条件は、README 分類と skill-forge 確認契約の両方にまたがる。

README だけを更新して skill 契約や昇格先成果物とのずれを残さないため、U001 と U002 の両方を対象にする。

## 完了条件

- 互換性維持対象の有無を確認している。
- 互換性維持対象を追加する必要がある場合は、実装前に記録する方針を確認している。
- README 更新要否と更新範囲を確定している。
- skill 契約、validator、example、検証入口とのずれを残さない確認条件を記録している。

## 依存

- B001
- B002
- B003

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `README.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `README.ja.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `docs/backward-compatibility.md` | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `package.json` | 未確認 | なし | 未確認 |

## 未確認事項

- `docs/backward-compatibility.md` を作成する必要があるかは Construction で確定する。
- example snapshot の更新が必要かは Construction で確定する。
