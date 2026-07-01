# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | EXT001 GitHub | S001 | R001, R002, R003 | なし | [UC001-preview-intent-candidates.md](use-cases/UC001-preview-intent-candidates.md) |
| UC002 | ACT002 Agent | EXT001 GitHub | S001 | R002, R004 | UC001 | [UC002-consume-history-learning-results.md](use-cases/UC002-consume-history-learning-results.md) |
| UC003 | ACT002 Agent | なし | S001 | R005 | UC001, UC002 | [UC003-verify-dry-run-contract.md](use-cases/UC003-verify-dry-run-contract.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | `dry-run` の候補表示が基本の相互作用であるため。 |
| UC002 | UC001 | 過去分析と学習分類の結果利用は、候補表示の入力拡張として扱うため。 |
| UC003 | UC001, UC002 | 同期検証は、候補表示と consumer 境界が定義されてから扱うため。 |
