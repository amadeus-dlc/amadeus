# G004: Bolt の束ね方と walking skeleton

## 概要

- 状態: completed
- 反映先: [delivery-planning/bolt-plan.md](delivery-planning/bolt-plan.md)

Delivery Planning で、Bolt の束ね方と walking skeleton の範囲を確定した。
実行指示により人間への逐次質問を行わず、推奨回答を実行指示による事前承認として確定した。
順序付けの優先は Ideation の D004（リスク先行）を踏襲したため、新しい確定判断にしていない。

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD010 | 3 Unit を単一の B001 に束ねる | active | [delivery-planning/bolt-plan.md](delivery-planning/bolt-plan.md) | |
| GD011 | B001 は、商品一覧の表示から注文番号の表示までの注文作成経路を貫通する walking skeleton にする | active | [delivery-planning/bolt-plan.md](delivery-planning/bolt-plan.md) | |

## 質問記録

### Q001

- 確認したいこと: Bolt の束ね方はどれか（Unit 1 個ずつ、関連 Unit の束、Unit をまたぐ薄いスライス）。
- 確認が必要な理由: Bolt は Construction の実行単位であり、PR とゲートの粒度を決める。
- 推奨回答: 関連 Unit の束として、3 Unit を単一の B001 に束ねる。
- 推奨理由: 依存 DAG（U003 → U001, U002）により注文作成の貫通には全 Unit が必要であり、分割しても価値を観測できる中間出荷がない。単独開発者のため並行実施の利点もない。
- ユーザー回答: 実行指示による事前承認（推奨回答を採用）。
- 確定判断: GD010

### Q002

- 確認したいこと: 最初の Bolt（walking skeleton）で貫通させる最小スライスはどこか。
- 確認が必要な理由: walking skeleton は統合前提を最初に証明する範囲であり、狭すぎると統合リスクが残る。
- 推奨回答: 商品一覧の表示、商品と数量の選択、在庫参照、注文作成、リレーショナルデータベースへの記録、注文番号の表示まで。
- 推奨理由: 実行指示の指定（注文作成を貫通する walking skeleton）と一致し、統合制約（REST API 連携、リレーショナルデータベース記録）をすべて貫通できる。
- ユーザー回答: 実行指示による事前承認（推奨回答を採用）。
- 確定判断: GD011
