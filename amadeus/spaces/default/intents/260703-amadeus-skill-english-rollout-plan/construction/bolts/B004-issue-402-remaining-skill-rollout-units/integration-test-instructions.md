# Integration Test Instructions：B004 #402 残り展開単位

## 対象

B004 では、Amadeus DLC 成果物の実行時構造を確認する。

## 実行コマンド

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
```

## 判定

Amadeus Validator の判定が `pass` であれば pass とする。
