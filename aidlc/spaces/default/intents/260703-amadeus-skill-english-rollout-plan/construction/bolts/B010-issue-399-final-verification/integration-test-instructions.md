# Integration Test Instructions：B010 #399 最終検証

## 対象

B010 では、Amadeus DLC 成果物の実行時構造と、repo 内 snapshot の整合を確認する。

## 実行コマンド

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
npm run validate:all
```

## 判定

Amadeus Validator の判定が `pass` であり、`validate:all` が exit code 0 で終了すれば pass とする。
