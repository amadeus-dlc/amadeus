# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | 確認済み | 既存の Discovery Brief 例示に、入力テーマ、判定、Intent 候補、候補判断、推奨次アクションが記録されている。 |
| 運用 | 確認済み | Amadeus 利用者が大きな開発テーマを渡した後、Intent 化前に内容を確認できる流れとして扱う。 |
| セキュリティ | 確認済み | この Intent は成果物の記録粒度を扱い、外部連携、認証、権限変更を含めない。 |
| 依存 | 確認済み | Discovery Brief の形式と、Intent 一覧への参照を前提にする。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Amadeus 利用者 | 判断者 | 入力テーマを無理に1つの Intent にせず、最初に進める候補を確認したい。 |
| Amadeus メンテナー | 参照者 | Discovery で生成される例示が、後続 phase の責務境界とずれないことを確認したい。 |
| Inception 担当 | 後続担当 | Discovery Brief 記録と Intent 候補提示を要求候補として受け取りたい。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| Discovery Brief 確認カード | 入力テーマ、判定、Intent 候補、最初に進める候補を、Intent 化前に確認できることを示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- Discovery Brief の具体的な保存操作や UI 実装は Inception 以降で扱う。
- Intent 初期化をどの操作で開始するかは、この Intent では固定しない。

## 学習候補

- 既存 Discovery Brief の項目が、Inception の要求候補へ過不足なく渡せるかを確認する。
- `multi_intent` 判定時に、候補の依存順序と最初の候補が読み取りやすいかを確認する。
