# Business Rules — u002-kanban-sync-cli

上流入力: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md)

## ルール

| ID | ルール | 出典 |
|---|---|---|
| BR-1 | 書き込みは一方向（ローカル → board）。board の値を読み戻してローカルへ反映しない | C01 |
| BR-2 | 反映は冪等な全上書き。同一入力での再実行・同時実行は同じ最終状態に収束する | FR-3.4 / N1 |
| BR-3 | board 側の手編集は次回 sync で上書きされる（挙動として保証。警告等は出さない） | 受け入れ条件 6 |
| BR-4 | 削除はしない。registry に無い既存 item は放置する | D-AD3 |
| BR-5 | 承認待ち（`[?]`）は phase 列より優先して Awaiting Approval 列に置く | FR-3.2 |
| BR-6 | Synced At は sync 実行時刻の ISO 8601（UTC）を text フィールドに書く | FR-3.7、US-4 |
| BR-7 | `--all` はメインリポジトリの cwd でだけ実行できる。worktree では明示エラー | D-AD11 |
| BR-8 | scope 不足・project 不在は書き込み前に検知して明示エラーで終了する（部分状態を作らない） | FR-4.1、FR-3.1 |
| BR-9 | project 自体・repo リンクは作成しない（人間操作） | C11、FR-3.1 |
| BR-10 | 実行時依存は Bun + gh CLI のみ。GraphQL は `gh api graphql` 経由 | C03、C04 |

## 検証の分担

BR-2 / BR-5 / BR-7 / BR-8 は TDD の自動検証対象とする（fixture と引数生成境界）。
BR-3 / BR-6 は board 実表示の人間確認（walking skeleton gate）で担保する。
BR-4 / BR-9 は「実装しない」ことの規律であり、コードレビューで担保する。
