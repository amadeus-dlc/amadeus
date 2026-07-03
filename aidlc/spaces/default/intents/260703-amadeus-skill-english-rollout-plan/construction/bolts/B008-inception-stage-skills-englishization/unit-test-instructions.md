# Unit Test Instructions：B008 Inception stage skills 英語化

## 対象

B008 は Inception stage の 8 skillの `SKILL.md` 翻訳と、契約検査・provenance の整合更新である。

## 実行コマンド

```sh
npm run test:it:amadeus-templates
npm run test:all
```

`test:all` 内で typecheck、lint、contract check、integration eval、mock e2e、example validation、diff check をまとめて実行する。

## 判定

- 契約 needle を持つ skill は、翻訳直後（needle 更新前）に `test:it:amadeus-templates` が FAIL（RED）することを確認する。
- needle 更新と昇格反映後に `test:it:amadeus-templates` と `npm run test:all` が exit code 0 で終了すれば pass とする。
