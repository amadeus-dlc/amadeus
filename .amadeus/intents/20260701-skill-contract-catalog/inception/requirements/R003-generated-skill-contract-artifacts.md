# R003 Skill Contract 生成物

## 概要

Skill Contract から JSON、Markdown、validator 用 TypeScript を生成できる。

## 背景

Skill Contract は TypeScript catalog を管理元にし、配布先 skill と validator から同じ契約を参照できる必要がある。`references/skill-contract.md` は手書きではなく生成物として扱う。

## 要求

| 項目 | 内容 |
|---|---|
| JSON | `amadeus-contracts/generated/skills.json` を生成する。 |
| Markdown | 代表 skill の `references/skill-contract.md` または同等の参照ファイルを生成する。 |
| TypeScript | validator 用の `skill-contracts.ts` を生成する。 |
| 配布先 | `skills/**` と `.agents/skills/**` の必要な配布先へ生成する。 |

## 受け入れ

- `npm run contracts:generate` で Skill Contract 生成物が作成される。
- 生成物の文面は日本語で、直接編集禁止を明示している。
- 生成物が catalog から導出されている。

## 依存

- R001。
- R002。

## 未確認事項

- なし。
