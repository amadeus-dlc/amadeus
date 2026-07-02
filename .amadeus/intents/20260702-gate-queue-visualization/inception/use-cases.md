# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT001 Maintainer | なし | なし | R001, R002, R004, R005 | なし | [UC001-list-approval-queue.md](use-cases/UC001-list-approval-queue.md) |
| UC002 | ACT001 Maintainer | なし | なし | R002, R003, R005 | UC001 | [UC002-confirm-no-waiting.md](use-cases/UC002-confirm-no-waiting.md) |
| UC003 | ACT002 Agent | なし | なし | R001, R002, R004 | UC001 | [UC003-agent-presents-queue.md](use-cases/UC003-agent-presents-queue.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | 承認待ちの一覧は他の相互作用に依存せず成立するため。 |
| UC002 | UC001 | 0 件時の確認は UC001 の一覧の出力契約を前提にするため。 |
| UC003 | UC001 | Agent の提示は UC001 と同じ一覧の実行と出力を前提にするため。 |
