# Construction 判断

## 一覧

| 識別子 | タイトル | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|---|
| D001 | 記録照合セマンティクスの採用 | `provenance:check` は現在のファイルではなく、記録時点（`git show <commit>:<path>`）の内容を照合対象にする。 | accepted | なし | [D001-check-reconciliation-semantics.md](decisions/D001-check-reconciliation-semantics.md) |
| D002 | 記録ファイル命名規則の採用 | `provenance/Pnnn-<slug>.json`。3桁連番で欠番を再利用せず、slug は小文字英数字とハイフンにする。 | accepted | なし | [D002-record-file-naming.md](decisions/D002-record-file-naming.md) |
| D003 | Task Generation の人間承認 | 3 Bolt の Task 生成を人間が承認し、taskGeneration を passed にする。 | accepted | D001, D002 | [D003-task-generation-approval.md](decisions/D003-task-generation-approval.md) |
| D004 | PR #354 merge finalization | PR #354 の merge を Construction 完了証拠として採用する。 | accepted | D001, D002, D003 | [D004-pr-354-merge-finalization.md](decisions/D004-pr-354-merge-finalization.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | 照合セマンティクスは、記録形式や命名規則と独立に、drift 検出方式そのものを確定する判断であるため。 |
| D002 | なし | 記録ファイル命名規則は、GD001（記録先を Intent 直下の `provenance/` にする）の具体化であり、照合セマンティクスの選択に依存しないため。 |
| D003 | D001, D002 | 承認対象の Task は照合セマンティクスと命名規則の判断を前提にするため。 |
| D004 | D001, D002, D003 | 実装 PR の merge は、照合セマンティクス、命名規則、承認済み Task の実行結果を完了証拠としてまとめるため。 |

## Domain Map と Context Map

| 対象 | 判断 | 根拠 |
|---|---|---|
| Domain Map | 更新しない | U001 は既存の BC001 自己開発運用内の provenance 記録契約を扱うため。 |
| Context Map | 更新しない | 新しい Bounded Context 間依存は採用しないため。 |

## 未確認事項

なし。
