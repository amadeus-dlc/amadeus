# B002: Skill Contract generation and drift

## 概要

- Skill Contract 生成物と `contracts:check` のずれ検出を追加する。

## 対象ユニット

- U002

## 設計

- [U002 Unit Design](../units/U002-skill-contract-generation-and-drift/design.md)

## 完了条件

- `npm run contracts:generate` で Skill Contract 生成物が作成される。
- `npm run contracts:check` で Skill Contract 生成物のずれを検出できる。
- eval が Skill Contract 生成物を追跡している。
- `npm run typecheck` が通る。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `dev-scripts/amadeus-contracts.ts`, `dev-scripts/evals/amadeus-contracts/check.ts` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `amadeus-contracts/generated/skills.json`, `skills/amadeus-*/references/skill-contract.md`, `.agents/skills/amadeus-*/references/skill-contract.md` | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-validator/validator/generated/skill-contracts.ts`, `.agents/skills/amadeus-validator/validator/generated/skill-contracts.ts` | 未確認 | なし | 未確認 |

## 未確認事項

- なし。
