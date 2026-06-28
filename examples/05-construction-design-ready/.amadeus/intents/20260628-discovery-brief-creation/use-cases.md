# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | Amadeus 利用者 | なし | S001 | R001 | なし | [UC001-record-input-theme-and-judgement.md](use-cases/UC001-record-input-theme-and-judgement.md) |
| UC002 | Amadeus 利用者 | なし | S001 | R002 | UC001 | [UC002-confirm-intent-candidates.md](use-cases/UC002-confirm-intent-candidates.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | Discovery Brief の記録が候補確認の前提になるため。 |
| UC002 | UC001 | Intent 候補は記録済みの入力テーマと判断を根拠に確認するため。 |
