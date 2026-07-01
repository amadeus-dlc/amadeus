# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、Skill Contract generation and drift の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
詳細な Domain Design、Logical Design、実装設計、テスト設計は Construction で確定する。

## 設計戦略

- `dev-scripts/amadeus-contracts.ts` の `generatedContractFiles` に Skill Contract 生成物を追加する。
- `amadeus-contracts/generated/skills.json` を生成する。
- 初期対象 skill の `references/skill-contract.md` を生成する。
- validator 用 `skill-contracts.ts` を `skills/**` と `.agents/skills/**` の必要な場所へ生成する。
- eval で生成対象の追跡と直接編集検出を確認する。

## 責務境界

- 所有するもの: `contracts:generate` への生成対象追加、`contracts:check` のずれ検出、eval の追跡確認。
- 所有しないもの: Skill Contract の内容評価、全 skill への生成物追加、semantic validator 化。
- 依存してよいもの: U001 の Skill Contract catalog、既存生成処理、既存 contract eval。
- 後続で再確認が必要になる条件: 生成先が代表 skill 以外へ広がる場合。

## 構成候補

- `skills.json` 生成。
- 代表 skill の `references/skill-contract.md` 生成。
- validator 用 `skill-contracts.ts` 生成。
- `contracts:check` 差分検出。
- contract eval の追跡確認。

## データと契約候補

- `amadeus-contracts/generated/skills.json`: catalog の機械参照用 JSON。
- `skills/amadeus-*/references/skill-contract.md`: 配布先 skill の人間参照用契約。
- `.agents/skills/amadeus-*/references/skill-contract.md`: 開発用 skill の人間参照用契約。
- `skills/amadeus-validator/validator/generated/skill-contracts.ts`: validator 参照用 TypeScript。
- `.agents/skills/amadeus-validator/validator/generated/skill-contracts.ts`: 開発用 validator 参照用 TypeScript。

## 検証観点

- `npm run contracts:generate` で生成物が作成される。
- `npm run contracts:check` で最新状態を確認できる。
- eval が Skill Contract 生成物の追跡と直接編集検出を確認する。

## Bolt 分割方針

- B002 で、Skill Contract 生成物と `contracts:check` のずれ検出を追加する。

## Construction への引き継ぎ

- `references/skill-contract.md` は手書き禁止の生成物として扱う。
- 生成先を増やす場合は `generatedContractFiles` に集約する。
