# インテント

## 一覧

| 識別子 | 概要 | 依存 | 詳細 |
|---|---|---|---|
| 20260629-self-dev-steering-layer | Amadeus 本体リポジトリに自己開発用 steering layer を導入する。 | なし | [20260629-self-dev-steering-layer.md](intents/20260629-self-dev-steering-layer.md) |
| 20260701-stage-workspace-records | 自己開発 cycle の stage 判定と workspace 対応記録を定義する。 | 20260629-self-dev-steering-layer | [20260701-stage-workspace-records.md](intents/20260701-stage-workspace-records.md) |

## 依存関係

| インテント | 依存 | 理由 |
|---|---|---|
| 20260629-self-dev-steering-layer | なし | 初回導入 Intent であり、既存 Intent に依存しないため。 |
| 20260701-stage-workspace-records | 20260629-self-dev-steering-layer | 自己開発用 steering layer が現在の契約で validator pass していることを前提に、後続 cycle の記録単位を定義するため。 |
