# Build Instructions：B005 #391〜#394 AI-DLC v2 differences

## 目的

AI-DLC v2 との意味差分 4 件（reviewer、sensor と Learn、Build and Test 失敗時処理、Operation phase 境界）の判断記録と、関連 skill・docs・Amadeus DLC 成果物の構造を確認する。

## 実行コマンド

```sh
npm run test:all
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
git diff --check
```

skill を変更した PR（#391、#393、#392）では、加えて次を実行した。

```sh
bun run dev-scripts/promote-skill.ts <skill-name> --replace
npm run test:it:promote-skill
npm run test:it:amadeus-templates
```

## 前提

- `mise trust` は実行済み。
- B005 は Issue ごとの個別 PR（#391: PR #419、#393: PR #420、#392: PR #421、#394: 本 PR）で対応し、各 PR で検証を実行した。

## 成功条件

- 各 PR で `npm run test:all` が pass する。
- Amadeus Validator が対象 Intent で pass する。
- whitespace check が pass する。
