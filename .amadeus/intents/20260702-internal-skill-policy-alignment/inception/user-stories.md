# ユーザーストーリー

## 一覧

| 識別子 | アクター | 概要 | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|
| S001 | ACT001 Maintainer | 内部 skill と公開入口 skill の境界を判断できる。 | R001, R002, R005 | なし | [S001-maintainer-classification-review.md](user-stories/S001-maintainer-classification-review.md) |
| S002 | ACT002 Agent | README と暗黙起動設定を同じ対象範囲で更新できる。 | R001, R002, R003, R004 | S001 | [S002-agent-policy-alignment.md](user-stories/S002-agent-policy-alignment.md) |
| S003 | ACT003 Reviewer | Issue #284 のうち今回扱った範囲と後続候補を確認できる。 | R004, R005 | S001, S002 | [S003-reviewer-scope-verification.md](user-stories/S003-reviewer-scope-verification.md) |

## 依存関係

| ユーザーストーリー | 依存 | 理由 |
|---|---|---|
| S001 | なし | Maintainer の分類判断が、Agent と Reviewer の確認前提になるため。 |
| S002 | S001 | Agent は分類判断に従って README と設定対象を揃えるため。 |
| S003 | S001, S002 | Reviewer は分類判断と反映結果を確認するため。 |
