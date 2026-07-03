# Build Instructions：B002 #400 小さい土台 PR

## 目的

代表 skill `amadeus-construction-functional-design` の英語化差分、promotion flow、検証契約、Amadeus DLC 成果物構造を確認する。

## 実行コマンド

```sh
npm run test:it:promote-skill
npm run test:all
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
```

## 前提

- `mise trust` は実行済み。
- 依存パッケージの追加インストールは行わない。
- `.agents/skills/amadeus-construction-functional-design/SKILL.md` は手作業で編集せず、promotion flow で source から同期する。

## 成功条件

- promotion flow eval が pass する。
- `npm run test:all` が pass する。
- Amadeus Validator が対象 Intent で pass する。
- source と promoted copy の `SKILL.md` が一致する。
- source と promoted copy の `agents/openai.yaml` が一致する。
