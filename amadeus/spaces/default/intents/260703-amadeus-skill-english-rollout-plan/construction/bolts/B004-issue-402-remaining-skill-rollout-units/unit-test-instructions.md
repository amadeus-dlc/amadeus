# Unit Test Instructions：B004 #402 残り展開単位

## 対象

B004 は文書と Amadeus DLC 成果物の変更である。

## 実行コマンド

```sh
npm run test:all
```

`test:all` 内で typecheck、lint、contract check、integration eval、mock e2e、example validation、diff check をまとめて実行する。

## 判定

`npm run test:all` が exit code 0 で終了すれば pass とする。
