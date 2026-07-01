# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | なし | S001 | R001, R002 | なし | [UC001-detect-and-classify-execution-concern.md](use-cases/UC001-detect-and-classify-execution-concern.md) |
| UC002 | ACT001 Maintainer | EXT001 GitHub | S001 | R001, R002, R003 | UC001 | [UC002-review-follow-up-issue-candidate.md](use-cases/UC002-review-follow-up-issue-candidate.md) |
| UC003 | ACT003 Reviewer | なし | S001 | R004 | UC001, UC002 | [UC003-review-contract-alignment.md](use-cases/UC003-review-contract-alignment.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | 懸念検出と分類が他の相互作用の前提であるため。 |
| UC002 | UC001 | 後続 Issue 候補レビューは、分類済みの報告を前提にするため。 |
| UC003 | UC001, UC002 | 契約整合レビューは、分類基準と Issue 候補化の扱いを前提にするため。 |
