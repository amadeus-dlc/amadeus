# B001: Skill Contract catalog model

## 概要

- Skill Contract 型、catalog、代表 skill 契約を追加する。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design](../units/U001-skill-contract-catalog-model/design.md)

## 完了条件

- Skill Contract 型が追加されている。
- 代表 skill 5件の契約が catalog に定義されている。
- catalog の公開口が更新されている。
- `npm run typecheck` が通る。

## 依存

- なし

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `amadeus-contracts/catalog/skill-contract.ts`, `amadeus-contracts/catalog/skills.ts`, `amadeus-contracts/catalog/index.ts`, `amadeus-contracts/catalog/types.ts` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-ideation/SKILL.md`, `skills/amadeus-inception/SKILL.md`, `skills/amadeus-construction/SKILL.md`, `skills/amadeus-grilling/SKILL.md`, `skills/amadeus-validator/SKILL.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `.agents/skills/amadeus-ideation/SKILL.md`, `.agents/skills/amadeus-inception/SKILL.md`, `.agents/skills/amadeus-construction/SKILL.md`, `.agents/skills/amadeus-grilling/SKILL.md`, `.agents/skills/amadeus-validator/SKILL.md` | 未確認 | なし | 未確認 |

## 未確認事項

- なし。
