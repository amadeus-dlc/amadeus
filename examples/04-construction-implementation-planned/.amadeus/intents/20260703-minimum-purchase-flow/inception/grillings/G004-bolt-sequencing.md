# G004：Bolt の束ね方と順序

## 概要

- 状態: completed
- 対象: Delivery Planning
- 反映先: [delivery-planning/bolt-plan.md](delivery-planning/bolt-plan.md)
- 経緯: 人間の指示が「B001 は注文作成を貫通する walking skeleton にする」と回答を先に与えたため、対話は行わず、指示と既存成果物から確定した。

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD006 | B001 は U001 商品閲覧と U002 注文作成を束ねた注文作成貫通の walking skeleton にし、U003 在庫参照連携は B002 として価値先行で後続させる | active | [delivery-planning/bolt-plan.md](delivery-planning/bolt-plan.md) | |

## 質問記録

### Q001

- 確認したいこと: 最初の Bolt（walking skeleton）で貫通させる最小スライスはどこか。
- 確認が必要な理由: walking skeleton は全層の接続を最初に証明する Bolt であり、束ねる Unit を確定する必要があるため。
- 推奨回答: 商品選択から注文作成までの一連の流れを貫通させる。
- 推奨理由: Ideation の判断 D003（価値先行）が、この流れを最初に成立させる前提で順序付けることを決めているため。
- ユーザー回答: 人間の指示のとおり、B001 は注文作成を貫通する walking skeleton にする。U001 と U002 を束ね、在庫状況の表示は含めない。
- 確定判断: GD006

### Q002

- 確認したいこと: 在庫参照連携をどの Bolt に置くか。
- 確認が必要な理由: 在庫管理システムの連携仕様が未確認であり、walking skeleton に含めるかどうかで B001 の完了条件が変わるため。
- 推奨回答: B002 として B001 の後続に分離する。
- 推奨理由: 未確定の外部依存を walking skeleton の進行から切り離し、U003 が U001 だけに依存する DAG とも整合するため。
- ユーザー回答: 推奨回答のとおり。人間の指示による承認として確定した。
- 確定判断: GD006
