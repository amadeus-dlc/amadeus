# R004 生成とずれ検出

## 概要

`contracts:generate` と `contracts:check` で Skill Contract 生成物の生成とずれ検出を扱える。

## 背景

既存の Contract Catalog は `generatedContractFiles` と `staleGeneratedContractFiles` によって生成物と catalog のずれを検出している。Skill Contract も同じ経路で検出対象にする。

## 要求

| 項目 | 内容 |
|---|---|
| 生成対象登録 | Skill Contract 生成物を `generatedContractFiles` に含める。 |
| ずれ検出 | `staleGeneratedContractFiles` が Skill Contract 生成物の欠落と差分を検出する。 |
| eval | `dev-scripts/evals/amadeus-contracts/check.ts` が Skill Contract 生成物の追跡と直接編集検出を確認する。 |

## 受け入れ

- `npm run contracts:check` が Skill Contract 生成物のずれを検出できる。
- 直接編集検出の eval が Skill Contract 生成物を含めて確認している。

## 依存

- R003。

## 未確認事項

- なし。
