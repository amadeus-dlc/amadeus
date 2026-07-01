# U001: Skill Contract catalog model

## ユニット

- Skill Contract の型、catalog、代表 skill 契約を扱う。

## 対象要求

- R001
- R002

## 価値境界

- この Unit は、skill 実行契約を TypeScript catalog として表現する。
- この Unit は、代表 skill 5件の契約要素を同じ型で扱えるようにする。
- この Unit は、生成物や consumer 参照入口の実装は所有しない。

## 検証観点

- Skill Contract 型が `amadeus-contracts` から参照できる。
- 代表 skill 5件が catalog に含まれている。
- 既存 `SKILL.md` の契約と矛盾しない。

## 未確認事項

- なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `amadeus-contracts/catalog/skill-contract.ts`, `amadeus-contracts/catalog/skills.ts`, `amadeus-contracts/catalog/index.ts`, `amadeus-contracts/catalog/types.ts` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-ideation/SKILL.md`, `skills/amadeus-inception/SKILL.md`, `skills/amadeus-construction/SKILL.md`, `skills/amadeus-grilling/SKILL.md`, `skills/amadeus-validator/SKILL.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `.agents/skills/amadeus-ideation/SKILL.md`, `.agents/skills/amadeus-inception/SKILL.md`, `.agents/skills/amadeus-construction/SKILL.md`, `.agents/skills/amadeus-grilling/SKILL.md`, `.agents/skills/amadeus-validator/SKILL.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-skill-contract-catalog-model/design.md)
