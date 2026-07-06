# Unit Test Instructions：B005 #391〜#394 AI-DLC v2 differences

## 対象

B005 は意味差分の判断記録（docs）、skill の Gate 節と手順への注記、Amadeus DLC 成果物の更新である。

## 実行コマンド

```sh
npm run test:all
```

`test:all` 内で typecheck、lint、contract check、integration eval、mock e2e、example validation、diff check をまとめて実行する。

## 判定

各 Issue の PR で `npm run test:all` が exit code 0 で終了すれば pass とする。
