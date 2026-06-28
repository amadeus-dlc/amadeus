# スコープ

## 対象

- 大きな入力テーマを、Intent 化前に Discovery Brief として記録できるようにする。
- Discovery Brief に入力テーマ、確認した前提、判定、判定理由、Intent 候補、候補判断、推奨次アクションを残せるようにする。
- `multi_intent` の場合に、最初に Intent 化する候補を1件に絞れるようにする。
- 後続の Ideation と Inception が参照できる粒度で、Discovery の責務境界を保つ。

## 対象外

- Intent 初期化の自動実行。
- Requirement、Use Case、Unit、Bolt、Task の定義。
- 実装方針や Construction の証拠化。
- Discovery 以外の phase 成果物を Discovery Brief 内で先取りすること。

## 詳細度

- Discovery Brief の記録項目と Intent 候補提示の振る舞いを、後続の要求候補へ渡せる粒度で整理する。
- Requirement、Use Case、Unit、Bolt、Task へ分解しない。
- 実装方式、保存形式、画面構成の詳細はこの phase では固定しない。

## 検証深度

- Discovery Brief に必要な記録項目が揃うことを確認する。
- `multi_intent` 判定時に最初の Intent 候補が1件に絞られることを確認する。
- Discovery の責務境界が、Requirement 以降の成果物を含まない形で保たれることを確認する。

## Inception への引き継ぎ

- Discovery Brief 記録を要求候補にする。
- Intent 候補提示を要求候補にする。
- 最初に Intent 化する候補を1件に絞る判断を要求候補にする。
- Discovery の対象外として、Requirement、Use Case、Unit、Bolt、Task の定義を引き継ぐ。
