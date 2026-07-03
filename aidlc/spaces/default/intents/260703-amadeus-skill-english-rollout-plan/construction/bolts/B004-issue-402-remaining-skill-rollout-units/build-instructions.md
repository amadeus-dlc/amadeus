# Build Instructions：B004 #402 残り展開単位

## 目的

残り Amadeus skill の英語化単位、優先順位、検証コマンド、#391 から #394 との衝突回避を定義した文書、および Amadeus DLC 成果物の構造を確認する。

## 実行コマンド

```sh
npm run test:all
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
git diff --check
```

## 前提

- `mise trust` は実行済み。
- B004 では skill 本文を変更していないため、昇格フローは実行しない。
- 依存パッケージの追加インストールは行わない。

## 成功条件

- `npm run test:all` が pass する。
- Amadeus Validator が対象 Intent で pass する。
- whitespace check が pass する。
