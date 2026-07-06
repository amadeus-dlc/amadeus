# integration-test instructions（260706-docs-consistency）

上流入力: [code-generation-plan.md](../docs-consistency/code-generation/code-generation-plan.md)、[code-summary.md](../docs-consistency/code-generation/code-summary.md)

## 適用判断

適用する。受け入れ条件（NFR-1）の決定論的検証は次で行う。

## 手順

1. リンク切れ grep: `skill-englishization-rollout-plan` の横断 grep — record 外は skill-language-policy の `git log --` 参照文字列（リンクではない、意図的な履歴参照）のみ
2. Operation 矛盾表現 5 文字列の単純横断 grep（docs/amadeus/ + amadeus/spaces/default/memory/、record 除外）— 0 件
3. `npm run test:all`（typecheck 〜 diff:check の全チェーン）
4. validator: `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-docs-consistency`

## 期待結果

1〜2 は分類どおり、3〜4 は pass。
