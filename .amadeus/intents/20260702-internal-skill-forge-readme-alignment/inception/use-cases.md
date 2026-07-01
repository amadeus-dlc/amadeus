# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | なし | S001 | R001, R004 | なし | [UC001-inventory-readme-and-skill-roles.md](use-cases/UC001-inventory-readme-and-skill-roles.md) |
| UC002 | ACT002 Agent | なし | S001 | R002, R003 | UC001 | [UC002-define-skill-forge-review-scope.md](use-cases/UC002-define-skill-forge-review-scope.md) |
| UC003 | ACT002 Agent | なし | S001 | R003, R005 | UC001, UC002 | [UC003-plan-source-and-promoted-alignment.md](use-cases/UC003-plan-source-and-promoted-alignment.md) |
| UC004 | ACT001 Maintainer | EXT001 GitHub | S002 | R001, R004, R005 | UC001, UC002, UC003 | [UC004-review-compatibility-and-validation.md](use-cases/UC004-review-compatibility-and-validation.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | README と skill 一覧の棚卸しが、後続確認の前提であるため。 |
| UC002 | UC001 | skill-forge の確認範囲は、確認対象の分類を前提に決めるため。 |
| UC003 | UC001, UC002 | source と昇格先成果物の整合計画は、対象分類と確認観点を前提にするため。 |
| UC004 | UC001, UC002, UC003 | 互換性と検証のレビューは、棚卸し、確認範囲、整合計画を前提にするため。 |
