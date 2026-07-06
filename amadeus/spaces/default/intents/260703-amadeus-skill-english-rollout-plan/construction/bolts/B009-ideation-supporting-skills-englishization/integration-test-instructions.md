# Integration Test Instructions：B009 Ideation and supporting skills 英語化

## 対象

B009 では、source skill と昇格先 skill の同期、および Amadeus DLC 成果物の実行時構造を確認する。

## 実行コマンド

```sh
npm run test:it:promote-skill
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
```

## 判定

- `test:it:promote-skill` が pass し、source skill と `.agents/skills/` の内容が一致する。
- Amadeus Validator の判定が `pass` であれば pass とする。
