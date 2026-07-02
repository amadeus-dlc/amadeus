# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | なし | なし | R001, R002, R003 | なし | [UC001-generate-transition-scaffold.md](use-cases/UC001-generate-transition-scaffold.md) |
| UC002 | ACT002 Agent | なし | なし | R001, R005 | UC001 | [UC002-validate-after-generation.md](use-cases/UC002-validate-after-generation.md) |
| UC003 | ACT002 Agent | なし | なし | R004, R006 | UC001 | [UC003-follow-skill-procedure-reference.md](use-cases/UC003-follow-skill-procedure-reference.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | 雛形の生成、更新は他の相互作用に依存せず成立するため。 |
| UC002 | UC001 | 検証対象の state は UC001 の生成、更新で作られるため。 |
| UC003 | UC001 | 手順が参照するスクリプトの動作は UC001 で定義されるため。 |
