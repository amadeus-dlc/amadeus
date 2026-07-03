# Memory：application-design

## 解釈

Application Design は実行対象として扱う。

理由は、子 Issue の順序、完了証拠、PR 境界、親 Issue 完了判断を後続 stage の分割材料として整理する必要があるためである。

## 逸脱

実装コード、テストコード、Unit、Bolt は作成しない。

GitHub API クライアント、永続ストア、Web UI は定義しない。

## トレードオフ

論理コンポーネントとして設計する。

これにより、後続 stage は成果物責務を Unit 候補へ分割できる。

一方で、実装コードの追加要否はこの stage では確定しない。

## 未解決の問い

現時点では未解決の問いはない。
