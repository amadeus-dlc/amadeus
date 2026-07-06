# Unit Test Instructions：B002 #400 小さい土台 PR

## 対象

B002 はアプリケーション実装ではなく skill 文面、promotion flow、eval 契約の変更である。

## 実行コマンド

```sh
npm run test:all
```

`test:all` 内で typecheck、lint、contract check、integration eval、mock e2e、example validation、diff check をまとめて実行する。

## 判定

`npm run test:all` が exit code 0 で終了すれば pass とする。
