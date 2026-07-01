# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | README と実在する `amadeus-*` skill の役割を棚卸しする。 | U001 | [design.md](units/U001-readme-skill-role-alignment/design.md) | なし | [B001-readme-role-inventory.md](bolts/B001-readme-role-inventory.md) |
| B002 | `skill-forge` で確認する観点と対象範囲を定義する。 | U002 | [design.md](units/U002-skill-forge-review-contract/design.md) | B001 | [B002-skill-forge-review-scope.md](bolts/B002-skill-forge-review-scope.md) |
| B003 | source skill と昇格先成果物の整合、昇格手段、検証入口を確認する。 | U002 | [design.md](units/U002-skill-forge-review-contract/design.md) | B001, B002 | [B003-source-promoted-alignment.md](bolts/B003-source-promoted-alignment.md) |
| B004 | 互換性判断、README 更新要否、検証条件を確定する。 | U001, U002 | [U001 design](units/U001-readme-skill-role-alignment/design.md), [U002 design](units/U002-skill-forge-review-contract/design.md) | B001, B002, B003 | [B004-compatibility-and-validation-closure.md](bolts/B004-compatibility-and-validation-closure.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | README と skill 一覧の棚卸しが、後続確認の前提であるため。 |
| B002 | B001 | skill-forge の確認範囲は、確認対象の分類を前提にするため。 |
| B003 | B001, B002 | source と昇格先成果物の整合確認は、対象分類と確認観点を前提にするため。 |
| B004 | B001, B002, B003 | 互換性判断と検証条件は、棚卸し、確認範囲、整合確認を前提にするため。 |
