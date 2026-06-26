# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT001 | EXT001 | S001 | R001 | なし | [UC001-password-reset-request.md](use-cases/UC001-password-reset-request.md) |
| UC002 | ACT001 | なし | S002 | R002 | UC001 | [UC002-credential-update-with-reset-token.md](use-cases/UC002-credential-update-with-reset-token.md) |

ユースケースは、要求の言い換えではなく、システムとの相互作用に含まれる手順を叙述的に示す。

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | パスワード再設定要求の入口であり、先行ユースケースの完了を前提にしない。 |
| UC002 | UC001 | 認証情報更新は、UC001 で発行された再設定トークンを利用者が受け取ることを前提にする。 |
