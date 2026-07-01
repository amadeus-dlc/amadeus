# Construction 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Functional Design の対象と UI 構成を固定する。 | active | なし | [D001-functional-design-scope.md](decisions/D001-functional-design-scope.md) |
| D002 | stage と workspace 対応記録を既存 steering layer に追加する。 | active | D001 | [D002-steering-layer-records.md](decisions/D002-steering-layer-records.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Construction の先頭判断であり、他の Construction 判断に依存しないため。 |
| D002 | D001 | Functional Design の対象を確定した後に、実装対象文書への反映を決めるため。 |
