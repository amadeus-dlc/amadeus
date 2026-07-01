# B003: source promoted alignment

## 概要

source skill と昇格先成果物の整合、昇格手段、検証入口を確認する。

## 対象ユニット

- U002

## 設計

- [design.md](../units/U002-skill-forge-review-contract/design.md)

## 完了条件

- `skills/amadeus-*` と `.agents/skills/amadeus-*` の対応を確認している。
- source skill と昇格先成果物の差分確認方法を決めている。
- 昇格が必要な場合は `dev-scripts/promote-skill.ts` を使う方針と矛盾しない。
- `test:it:promote-skill`、`contracts:check`、`validate:workspace` などの検証入口を確認している。

## 依存

- B001
- B002

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-*` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.agents/skills/amadeus-*` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `dev-scripts/promote-skill.ts` | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `package.json` | 未確認 | なし | 未確認 |

## 未確認事項

- 実際に昇格処理が必要かは Construction で確定する。
