# Build Instructions：B008 Inception stage skills 英語化

## 目的

Inception stage の 8 skillの `SKILL.md` 英語化について、翻訳後の契約検査、昇格同期、Amadeus DLC 成果物の構造を確認する。

## 実行コマンド

```sh
bun run dev-scripts/promote-skill.ts <skill-name> --replace
npm run test:it:amadeus-templates
npm run test:it:promote-skill
npm run test:all
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
git diff --check
```

## 前提

- `mise trust` は実行済み。
- 変更した全 source skill に対して `promote-skill.ts --replace` を実行済み。
- B006〜B009 は単一リカバリ PR（PR #417）で統合実行するため、`npm run test:all` と Amadeus Validator は統合して 1 回実行し、結果を各 Bolt record から参照する。

## 成功条件

- 英語化した skill の日本語残存が、許容リテラル（`未確認` 等の成果物向けリテラル、生成成果物の見出し名、ユーザー向け日本語文言、埋め込みテンプレート）だけである。
- `test:it:amadeus-templates` が、契約 needle 更新前に RED、更新後に GREEN である。
- `npm run test:all` が pass する。
- Amadeus Validator が対象 Intent で pass する。
