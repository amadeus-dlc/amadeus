# Business Rules — pdm-scope

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## ルール

| ID | ルール | 出典 |
|---|---|---|
| BR-1 | 新ステージを追加しない（上流パリティ契約） | Issue 確定判断 |
| BR-2 | grid と SKILL 表は compile / scope-table の生成物とし手編集しない | R003 / R004 |
| BR-3 | validator のステージ scopes 配列は grid と手動同期し、pdm の 9 post-init ステージへ追記する | R005 |
| BR-4 | project.md（命名規約等）と既存 scope は変更しない | スコープ外 |

## 検証の分担

BR-2 / BR-3 は eval（grid 定義検査 + validator 検査有効性）で、BR-1 / BR-4 は diff レビューで担保する。
