# Unit Test Instructions：B010 #399 最終検証

## 対象

B010 は検証記録と traceability の確定であり、skill 本文とテンプレートを変更しない。

## 実行コマンド

```sh
npm run test:all
```

`test:all` 内で typecheck、lint、contract check、integration eval、mock e2e、example validation、diff check をまとめて実行する。

## 判定

`npm run test:all` が exit code 0 で終了すれば pass とする。
