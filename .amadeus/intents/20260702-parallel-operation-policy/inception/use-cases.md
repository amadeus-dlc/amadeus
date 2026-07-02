# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT001 Maintainer, ACT002 Agent | なし | なし | R001, R004 | UC004 | [UC001-decide-parallel-start.md](use-cases/UC001-decide-parallel-start.md) |
| UC002 | ACT002 Agent | なし | なし | R002 | UC004 | [UC002-integrate-after-merge.md](use-cases/UC002-integrate-after-merge.md) |
| UC003 | ACT001 Maintainer | なし | なし | R003 | UC004 | [UC003-operate-approval-queue.md](use-cases/UC003-operate-approval-queue.md) |
| UC004 | ACT002 Agent | なし | なし | R005 | なし | [UC004-locate-policy.md](use-cases/UC004-locate-policy.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | UC004 | 並行可否の判断は、policy を索引から見つけて参照できることが前提になるため。 |
| UC002 | UC004 | 統合手順の実行は、policy を参照できることが前提になるため。 |
| UC003 | UC004 | 承認キューの運用は、policy を参照できることが前提になるため。 |
| UC004 | なし | policy の参照は他の相互作用に依存せず成立するため。 |
