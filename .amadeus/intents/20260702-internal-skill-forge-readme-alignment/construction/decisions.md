# Construction 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Functional Design は README と skill 確認契約に限定する。 | accepted | なし | [D001-functional-design-scope.md](decisions/D001-functional-design-scope.md) |
| D002 | README の内部 skill は workflow family で整理する。 | accepted | D001 | [D002-readme-internal-skill-families.md](decisions/D002-readme-internal-skill-families.md) |
| D003 | Amadeus skill 確認時の入口として skill-forge の確認観点を示す。 | accepted | D001, D002 | [D003-skill-forge-review-boundary.md](decisions/D003-skill-forge-review-boundary.md) |
| D004 | 互換性を保つため skill 本文と昇格先成果物は変更しない。 | accepted | D001, D002, D003 | [D004-compatibility-and-validation-closure.md](decisions/D004-compatibility-and-validation-closure.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Construction の対象を固定する判断であり、他の Construction 判断に依存しないため。 |
| D002 | D001 | README の整理範囲は Functional Design の範囲判断を前提にするため。 |
| D003 | D001, D002 | skill-forge の確認境界は README の整理範囲と内部 skill family の整理を前提にするため。 |
| D004 | D001, D002, D003 | 互換性と検証の閉じ方は、対象範囲、README分類、skill-forge 確認境界を前提にするため。 |
