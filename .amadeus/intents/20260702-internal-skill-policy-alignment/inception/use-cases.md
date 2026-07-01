# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | EXT001 GitHub | S001, S002 | R001, R002 | なし | [UC001-inventory-internal-skills.md](use-cases/UC001-inventory-internal-skills.md) |
| UC002 | ACT001 Maintainer | なし | S001 | R002, R005 | UC001 | [UC002-classify-internal-skills.md](use-cases/UC002-classify-internal-skills.md) |
| UC003 | ACT002 Agent | なし | S002 | R003, R004 | UC002 | [UC003-confirm-policy-placement.md](use-cases/UC003-confirm-policy-placement.md) |
| UC004 | ACT003 Reviewer | EXT001 GitHub | S003 | R004, R005 | UC001, UC002, UC003 | [UC004-review-scope-and-evidence.md](use-cases/UC004-review-scope-and-evidence.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | 現在の一覧と skill 構成の棚卸しが最初の入力になるため。 |
| UC002 | UC001 | 分類判断は棚卸し結果を前提にするため。 |
| UC003 | UC002 | 設定配置確認は内部 skill 判定を前提にするため。 |
| UC004 | UC001, UC002, UC003 | レビューは棚卸し、分類、設定配置確認を前提にするため。 |
