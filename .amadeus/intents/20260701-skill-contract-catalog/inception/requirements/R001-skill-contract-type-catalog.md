# R001 Skill Contract 型と catalog

## 概要

Skill Contract の TypeScript 型と catalog を `amadeus-contracts` に追加できる。

## 背景

Skill 実行契約は現在 `SKILL.md` の自然文に分散している。validator、evaluator、decision review、learning review が同じ契約を参照するには、TypeScript catalog として管理できる必要がある。

## 要求

| 項目 | 内容 |
|---|---|
| 型 | skill 識別子、対象 skill path、契約要素、生成対象、consumer 参照入口を表現できる。 |
| catalog | 初期対象 skill の契約を `amadeus-contracts/catalog/skills.ts` で定義できる。 |
| 公開 | `amadeus-contracts/catalog/index.ts` と `amadeus-contracts/catalog/types.ts` から参照できる。 |

## 受け入れ

- `amadeus-contracts/catalog/skill-contract.ts` が Skill Contract 型を提供している。
- `amadeus-contracts/catalog/skills.ts` が Skill Contract catalog を提供している。
- `npm run typecheck` が通る。

## 依存

- なし。

## 未確認事項

- なし。
