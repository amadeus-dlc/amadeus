# D001: Ideation 完了判断

## 背景

- 対象は、ユーザーが大きな開発テーマを渡したとき、AI が Discovery Brief と Intent 候補を記録できる体験である。
- 対象外は、Intent 初期化の自動実行、Requirement、Use Case、Unit、Bolt、Task の定義、実装方針や Construction の証拠化である。
- 初期モックとして Discovery Brief 確認カードを作成した。

## 判断

- 採用。
- Ideation を完了し、Inception へ進める。

## 理由

- Discovery Brief 記録と Intent 候補提示を要求候補として引き継げる。
- `multi_intent` の場合に最初に Intent 化する候補を1件に絞る判断を引き継げる。
- Discovery の責務境界が、Requirement 以降の成果物を含まない形で明示されている。

## 影響

- Inception では、Discovery Brief 記録と Intent 候補提示を要求候補として扱う。
- Inception では、Discovery の対象外にした Requirement、Use Case、Unit、Bolt、Task の定義を、この Intent の後続成果物として扱う。
