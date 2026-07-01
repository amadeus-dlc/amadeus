# 既存コード分析

## 対象コード

- `amadeus-contracts/catalog/index.ts`
- `amadeus-contracts/catalog/types.ts`
- `amadeus-contracts/catalog/artifacts.ts`
- `amadeus-contracts/catalog/functional-design.ts`
- `amadeus-contracts/catalog/task-generation.ts`
- `dev-scripts/amadeus-contracts.ts`
- `dev-scripts/generate-amadeus-contracts.ts`
- `dev-scripts/check-amadeus-contracts.ts`
- `dev-scripts/evals/amadeus-contracts/check.ts`
- `amadeus-contracts/generated/artifacts.json`
- `amadeus-contracts/generated/stages.json`
- `amadeus-contracts/generated/references.md`
- `skills/amadeus-validator/validator/generated/artifact-contracts.ts`
- `skills/amadeus-validator/validator/generated/functional-design-contract.ts`
- `skills/amadeus-validator/validator/generated/task-generation-contract.ts`
- `skills/amadeus-ideation/SKILL.md`
- `skills/amadeus-inception/SKILL.md`
- `skills/amadeus-construction/SKILL.md`
- `skills/amadeus-grilling/SKILL.md`
- `skills/amadeus-validator/SKILL.md`
- `.agents/skills/amadeus-ideation/SKILL.md`
- `.agents/skills/amadeus-inception/SKILL.md`
- `.agents/skills/amadeus-construction/SKILL.md`
- `.agents/skills/amadeus-grilling/SKILL.md`
- `.agents/skills/amadeus-validator/SKILL.md`
- `.amadeus/domain-map.md`

## 既存能力

- `amadeus-contracts/catalog/index.ts` は、既存 contract catalog の公開口として機能している。
- `amadeus-contracts/catalog/types.ts` は、Artifact、Phase、Stage などの contract 型を公開している。
- `dev-scripts/amadeus-contracts.ts` は、JSON、Markdown、validator 用 TypeScript の生成対象を集約している。
- `staleGeneratedContractFiles` は、生成物の欠落と catalog との差分を検出している。
- `dev-scripts/evals/amadeus-contracts/check.ts` は、生成対象の追跡、生成物の最新性、直接編集検出を確認している。
- validator 用生成物は、`skills/amadeus-validator/validator/generated/**` と `.agents/skills/amadeus-validator/validator/generated/**` の両方へ出力されている。
- 代表 skill の `SKILL.md` には、事前条件、不変条件、事後条件、読み取り境界、書き込み境界、委譲、grilling、feedback に相当する自然文契約が含まれている。

## 統合点

- `amadeus-contracts/catalog/skill-contract.ts` を新設し、Skill Contract 型の定義元にする。
- `amadeus-contracts/catalog/skills.ts` を新設し、初期対象 skill の catalog を置く。
- `amadeus-contracts/catalog/index.ts` と `types.ts` に Skill Contract の公開口を追加する。
- `dev-scripts/amadeus-contracts.ts` に Skill Contract JSON、Markdown、validator 用 TypeScript の生成を追加する。
- `dev-scripts/evals/amadeus-contracts/check.ts` に Skill Contract 生成物の追跡と直接編集検出を追加する。
- `skills/amadeus-validator/validator/generated/skill-contracts.ts` を validator 参照入口にする。

## ギャップ

- Skill 実行契約の TypeScript 型が `amadeus-contracts` に存在しない。
- 代表 skill の事前条件、不変条件、事後条件、読み取り境界、書き込み境界、委譲、grilling、feedback 条件が catalog 化されていない。
- `references/skill-contract.md` 相当の生成物がない。
- Skill Contract 生成物が `contracts:check` のずれ検出対象ではない。
- validator、evaluator、decision review、learning review が Skill Contract を入力として参照する入口がない。

## リスク

- `references/skill-contract.md` を手書きにすると、TypeScript catalog と配布先参照文書のずれが発生する。
- 代表 skill 以外へ一括適用すると、契約型と生成経路の検証範囲が大きくなりすぎる。
- validator の `passed` を内容承認として扱うと、構造検出と品質評価の責務が混ざる。
- #257 と #259 の詳細実装まで含めると、Skill Contract の生成参照という今回の目的がぼやける。

## Inception への入力

- Requirement は、型と catalog、代表 skill 契約、生成物、生成とずれ検出、consumer 参照入口に分ける。
- User Story は、Maintainer が Skill Contract の catalog と生成物をレビューできる価値として扱う。
- Use Case は、catalog 保守、生成と検査、consumer 参照に分ける。
- Unit は、catalog model、generation and drift、consumer integration の3つに分ける。
- Bolt は、Unit と同じ3境界に合わせる。
- 初期対象 skill は `amadeus-ideation`、`amadeus-inception`、`amadeus-construction`、`amadeus-grilling`、`amadeus-validator` に限定する。

## 証拠

- `amadeus-contracts/catalog/index.ts`
- `amadeus-contracts/catalog/types.ts`
- `dev-scripts/amadeus-contracts.ts`
- `dev-scripts/evals/amadeus-contracts/check.ts`
- `skills/amadeus-validator/validator/generated/artifact-contracts.ts`
- `skills/amadeus-validator/validator/generated/functional-design-contract.ts`
- `skills/amadeus-validator/validator/generated/task-generation-contract.ts`
- `skills/amadeus-ideation/SKILL.md`
- `skills/amadeus-inception/SKILL.md`
- `skills/amadeus-construction/SKILL.md`
- `skills/amadeus-grilling/SKILL.md`
- `skills/amadeus-validator/SKILL.md`
- `.agents/skills/amadeus-ideation/SKILL.md`
- `.agents/skills/amadeus-inception/SKILL.md`
- `.agents/skills/amadeus-construction/SKILL.md`
- `.agents/skills/amadeus-grilling/SKILL.md`
- `.agents/skills/amadeus-validator/SKILL.md`
- `.amadeus/domain-map.md`
- commit `da9f20013b2f8a7e00d3af9b34f0c431ad7be0d6`

## 鮮度

- analyzedAt: `2026-07-01T12:33:20Z`
- freshness: current

## 未確認事項

- なし。
