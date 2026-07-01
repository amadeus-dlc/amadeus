# Construction Decisions

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Functional Design は skill 契約と template 整合に限定する。 | accepted | なし | [D001-functional-design-scope.md](decisions/D001-functional-design-scope.md) |
| D002 | 標準 template に `Construction からの追跡` を追加する。 | accepted | D001 | [D002-template-trace-table.md](decisions/D002-template-trace-table.md) |
| D003 | example は完了済み Construction の有無で更新要否を判断する。 | accepted | D002 | [D003-example-impact.md](decisions/D003-example-impact.md) |
| D004 | PR #249 の merge を Construction 完了証拠として採用する。 | accepted | D002, D003 | [D004-pr-249-merge-finalization.md](decisions/D004-pr-249-merge-finalization.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Construction の設計境界を先に決めるため。 |
| D002 | D001 | template の追加対象は設計境界に含まれるため。 |
| D003 | D002 | example 更新要否は採用した template 契約を基準に判断するため。 |
| D004 | D002, D003 | 実装 PR の merge は、採用した template 契約と example 判断の後に完了証拠として扱うため。 |
