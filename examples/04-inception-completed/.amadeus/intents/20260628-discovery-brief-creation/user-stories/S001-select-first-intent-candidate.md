# S001: Discovery Brief を読み、最初の Intent 候補を選べる

## ストーリー

- Amadeus 利用者として、Discovery Brief を読み、入力テーマの判定と Intent 候補を確認したい。
- それにより、大きなテーマを無理に1つの Intent にせず、最初に進める Intent 候補を選べる。

## 受け入れ条件

- Discovery Brief に入力テーマと判断が記録されている。
- Intent 候補と候補判断が確認できる。
- 最初に Intent 化する候補が1件に絞られている。
- 候補を選んでも、Intent 初期化の自動実行は行わない。

## 根拠

- [ideation.md](../ideation.md) の体制で、Amadeus 利用者は最初に進める候補を確認したい判断者として定義されている。
- [scope.md](../scope.md) の対象は、Discovery Brief 記録と Intent 候補提示を含む。
- [scope.md](../scope.md) の対象外は、Intent 初期化の自動実行を含む。

## 未確認事項

- 候補選択後に Intent 初期化へ移る具体的な操作は、この Intent では固定しない。
