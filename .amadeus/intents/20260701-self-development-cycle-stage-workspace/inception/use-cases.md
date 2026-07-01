# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | なし | S001 | R001, R002 | なし | [UC001-define-stage-policy.md](use-cases/UC001-define-stage-policy.md) |
| UC002 | ACT002 Agent | EXT001 GitHub | S001 | R003, R004 | UC001 | [UC002-record-workspace-correspondence.md](use-cases/UC002-record-workspace-correspondence.md) |
| UC003 | ACT001 Maintainer | EXT001 GitHub | S001 | R002, R003, R004 | UC001, UC002 | [UC003-review-stage0-adoption.md](use-cases/UC003-review-stage0-adoption.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | stage 判定方針は他の相互作用の前提であるため。 |
| UC002 | UC001 | workspace 対応記録には stage 判定を含めるため。 |
| UC003 | UC001, UC002 | 採用判断は stage 判定と workspace 対応記録を前提にするため。 |
