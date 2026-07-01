# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | EXT001 GitHub | S001 | R001, R003 | なし | [UC001-define-policy-placement.md](use-cases/UC001-define-policy-placement.md) |
| UC002 | ACT002 Agent | EXT001 GitHub | S001 | R002, R003 | UC001 | [UC002-apply-branch-lifecycle.md](use-cases/UC002-apply-branch-lifecycle.md) |
| UC003 | ACT001 Maintainer | EXT001 GitHub | S001 | R004 | UC001, UC002 | [UC003-review-policy-compliance.md](use-cases/UC003-review-policy-compliance.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | policy の配置と責務分担は branch lifecycle の前提であるため。 |
| UC002 | UC001 | branch lifecycle は配置済み policy の具体ルールとして扱うため。 |
| UC003 | UC001, UC002 | policy compliance の確認は、配置と lifecycle ルールを前提にするため。 |
