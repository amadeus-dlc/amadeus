# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent, ACT001 Maintainer | なし | なし | R001 | なし | [UC001-stop-and-wait-for-approval.md](use-cases/UC001-stop-and-wait-for-approval.md) |
| UC002 | ACT002 Agent | なし | なし | R001 | UC001 | [UC002-implementation-gate-judgment.md](use-cases/UC002-implementation-gate-judgment.md) |
| UC003 | ACT002 Agent | なし | なし | R002 | なし | [UC003-deterministic-grilling-trigger.md](use-cases/UC003-deterministic-grilling-trigger.md) |
| UC004 | ACT002 Agent | なし | なし | R003 | なし | [UC004-scaffold-only-permission.md](use-cases/UC004-scaffold-only-permission.md) |
| UC005 | ACT002 Agent | なし | なし | R004, R005 | UC001 | [UC005-approval-evidence-validation.md](use-cases/UC005-approval-evidence-validation.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | 停止と承認は他の相互作用に依存せず成立するため。 |
| UC002 | UC001 | 実装ゲートが読む `passed` は、UC001 の承認で作られるため。 |
| UC003 | なし | grilling 起動の判定は前段成果物だけを入力にするため。 |
| UC004 | なし | scaffold-only の許可判定は入力の確定判断の記録だけを入力にするため。 |
| UC005 | UC001 | 検査対象の approval evidence は、UC001 の承認で追加されるため。 |
