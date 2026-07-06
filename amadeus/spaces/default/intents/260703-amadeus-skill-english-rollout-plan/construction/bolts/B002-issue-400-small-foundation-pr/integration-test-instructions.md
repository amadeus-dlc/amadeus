# Integration Test Instructions：B002 #400 小さい土台 PR

## 対象

代表 skill 英語化に対して、source から `.agents/skills` への promotion flow と、Amadeus DLC 成果物の実行時構造を確認する。

## 実行コマンド

```sh
npm run test:it:promote-skill
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
```

## 判定

- promotion flow eval が exit code 0 で終了すれば pass とする。
- Amadeus Validator の判定が `pass` であれば pass とする。
