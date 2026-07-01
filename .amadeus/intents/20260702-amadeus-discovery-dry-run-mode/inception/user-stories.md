# ユーザーストーリー

## 一覧

| 識別子 | アクター | 概要 | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|
| S001 | ACT001 Maintainer, ACT002 Agent | 成果物を作る前に、次に起こすべき Intent 候補を読み取り専用で確認できる。 | R001, R002, R003, R004 | なし | [S001-review-intent-candidates-without-writing.md](user-stories/S001-review-intent-candidates-without-writing.md) |

## 依存関係

| ストーリー | 依存 | 理由 |
|---|---|---|
| S001 | なし | `dry-run` の利用価値は、候補確認と副作用禁止を一体で扱うため。 |
