# G002：コンポーネントとサービスの境界

## 概要

- 状態: completed
- 対象: Application Design
- 反映先: [application-design/services.md](application-design/services.md)、[application-design/components.md](application-design/components.md)
- 経緯: 人間の指示が「質問せずに続行し、最も妥当な内容を選ぶ」と回答方針を先に与えたため、対話は行わず、推奨回答を人間の指示による承認として確定した。

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD003 | サービスを商品閲覧と注文作成の 2 つに分け、画面、サービス、外部連携、永続化の 4 つの責務で構成する | active | [application-design/services.md](application-design/services.md) | |
| GD004 | 在庫参照を C006 在庫参照クライアントに分離し、連携仕様確定の影響を 1 コンポーネントに閉じる | active | [application-design/components.md](application-design/components.md) | |

## 質問記録

### Q001

- 確認したいこと: サービスの分割単位はどうするか。
- 確認が必要な理由: Units Generation が Unit 境界の材料としてサービス分割を使うため。
- 推奨回答: Intent の 2 つの成功条件に 1 対 1 で対応させ、商品閲覧と注文作成の 2 サービスに分ける。
- 推奨理由: 成功条件ごとに独立して完了判断でき、最小構成を超える分割を避けられるため。
- ユーザー回答: 推奨回答のとおり。人間の指示による承認として確定した。
- 確定判断: GD003

### Q002

- 確認したいこと: 連携仕様が未確認の在庫参照を、設計にどう位置づけるか。
- 確認が必要な理由: RAID Log に「在庫管理システムとの REST API 連携の仕様が未確定」という依存が登録されているため。
- 推奨回答: 在庫参照を専用コンポーネントに分離する。
- 推奨理由: 仕様確定時の変更影響を 1 コンポーネントに閉じ、他のコンポーネントを在庫参照の詳細から独立させられるため。
- ユーザー回答: 推奨回答のとおり。人間の指示による承認として確定した。
- 確定判断: GD004
