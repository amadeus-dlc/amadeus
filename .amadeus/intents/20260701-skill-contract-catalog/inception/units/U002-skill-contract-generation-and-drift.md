# U002: Skill Contract generation and drift

## ユニット

- Skill Contract 生成物と `contracts:check` のずれ検出を扱う。

## 対象要求

- R003
- R004

## 価値境界

- この Unit は、Skill Contract catalog から JSON、Markdown、validator 用 TypeScript を生成する。
- この Unit は、生成物の欠落と差分を `contracts:check` で検出する。
- この Unit は、Skill Contract の内容評価や全 skill 一括適用を所有しない。

## 検証観点

- `contracts:generate` で Skill Contract 生成物が作成される。
- `contracts:check` で Skill Contract 生成物のずれを検出できる。
- eval が Skill Contract 生成物の追跡と直接編集検出を確認する。

## 未確認事項

- なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `dev-scripts/amadeus-contracts.ts`, `dev-scripts/evals/amadeus-contracts/check.ts` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `amadeus-contracts/generated/skills.json`, `skills/amadeus-*/references/skill-contract.md`, `.agents/skills/amadeus-*/references/skill-contract.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-validator/validator/generated/skill-contracts.ts`, `.agents/skills/amadeus-validator/validator/generated/skill-contracts.ts` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U002-skill-contract-generation-and-drift/design.md)
