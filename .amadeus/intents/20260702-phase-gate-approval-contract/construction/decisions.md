# Construction 判断

## 一覧

| 識別子 | タイトル | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|---|
| D001 | Functional Design scope | U001 と U002 の Functional Design を必須にし、UI 構成なしとして core 3 文書を作る。 | accepted | なし | [D001-functional-design-scope.md](decisions/D001-functional-design-scope.md) |
| D002 | Task Generation 承認 | B001、B002、B003 の Task 分解を Maintainer が承認した。 | accepted | D001 | [D002-task-generation-approval.md](decisions/D002-task-generation-approval.md) |
| D003 | PR #322 merge finalization | PR #322 の merge を Construction 完了証拠として採用する。 | accepted | D001, D002 | [D003-pr-322-merge-finalization.md](decisions/D003-pr-322-merge-finalization.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Functional Design の対象 Unit が後続判断の前提であるため。 |
| D002 | D001 | Task 分解は Functional Design と Unit Design Brief を根拠にするため。 |
| D003 | D001, D002 | 実装 PR の merge は、Functional Design と承認済み Task の実行結果を完了証拠としてまとめるため。 |

## Domain Map と Context Map

| 対象 | 判断 | 根拠 |
|---|---|---|
| Domain Map | 更新しない | U001 と U002 は既存の BC001 自己開発運用内の契約変更と検査追加であるため。 |
| Context Map | 更新しない | 新しい Bounded Context 間依存は採用しないため。 |

## 未確認事項

なし。
