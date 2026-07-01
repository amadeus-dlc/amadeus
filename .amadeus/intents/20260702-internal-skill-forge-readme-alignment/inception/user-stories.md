# ユーザーストーリー

## 一覧

| 識別子 | アクター | 概要 | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|
| S001 | ACT002 Agent | README の公開入口案内と内部 skill の役割を取り違えず、`skill-forge` の確認範囲を選べる。 | R001, R002, R003 | なし | [S001-agent-entrypoint-review.md](user-stories/S001-agent-entrypoint-review.md) |
| S002 | ACT001 Maintainer | README 分類、互換性維持対象、検証条件が Amadeus の自己開発方針と合っていることを判断できる。 | R001, R004, R005 | S001 | [S002-maintainer-compatibility-review.md](user-stories/S002-maintainer-compatibility-review.md) |

## 依存関係

| ユーザーストーリー | 依存 | 理由 |
|---|---|---|
| S001 | なし | Agent が確認範囲を選ぶことが、この Intent の実行価値であるため。 |
| S002 | S001 | Maintainer の判断は、Agent が整理した README 分類と確認範囲を前提にするため。 |
