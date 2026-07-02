# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | なし | なし | R001, R002 | なし | [UC001-judge-consolidation-conditions.md](use-cases/UC001-judge-consolidation-conditions.md) |
| UC002 | ACT002 Agent | なし | なし | R002, R003 | UC001 | [UC002-create-consolidated-pr.md](use-cases/UC002-create-consolidated-pr.md) |
| UC003 | ACT003 Reviewer, ACT001 Maintainer | なし | なし | R003, R004 | UC002 | [UC003-review-and-gate-judgment.md](use-cases/UC003-review-and-gate-judgment.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | 統合条件の判定は他の相互作用に依存せず成立するため。 |
| UC002 | UC001 | 統合 PR の作成は、条件判定で許可された場合だけ行うため。 |
| UC003 | UC002 | レビューと gate 判定は、作成された統合 PR の記録を入力にするため。 |
