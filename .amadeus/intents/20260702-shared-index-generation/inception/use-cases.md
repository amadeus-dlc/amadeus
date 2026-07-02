# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | なし | なし | R001, R002, R003, R005 | なし | [UC001-regenerate-index-on-module-change.md](use-cases/UC001-regenerate-index-on-module-change.md) |
| UC002 | ACT002 Agent | なし | なし | R002, R007 | UC001 | [UC002-merge-parallel-branches.md](use-cases/UC002-merge-parallel-branches.md) |
| UC003 | ACT002 Agent | なし | なし | R004, R006, R007 | UC001 | [UC003-detect-and-fix-inconsistency.md](use-cases/UC003-detect-and-fix-inconsistency.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | モジュール変更時の再生成は他の相互作用に依存せず成立するため。 |
| UC002 | UC001 | 並行統合後の再生成は UC001 の再生成の動作を前提にするため。 |
| UC003 | UC001 | 不整合の検出対象と解消手段は UC001 の生成規則で定義されるため。 |
