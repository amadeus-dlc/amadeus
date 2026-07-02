# Construction 判断

## 一覧

| 識別子 | タイトル | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|---|
| D001 | Functional Design scope | U001 の Functional Design を必須にし、UI 構成なしとして core 3 文書を作る。policy の見出し構成、判断基準の規則、根拠リンクの対象、validator 検査の不追加を確定する。 | accepted | なし | [D001-functional-design-scope.md](decisions/D001-functional-design-scope.md) |
| D002 | Task Generation 承認 | B001 の Task 分解を Maintainer が承認した。 | accepted | D001 | [D002-task-generation-approval.md](decisions/D002-task-generation-approval.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Functional Design の設計判断が Task 分解と文書作成の前提であるため。 |
| D002 | D001 | Task 分解は Functional Design と Unit Design Brief を根拠にするため。 |

## Domain Map と Context Map

| 対象 | 判断 | 根拠 |
|---|---|---|
| Domain Map | 更新しない | U001 は既存の BC001 自己開発運用内の運用判断基準の追加であるため。 |
| Context Map | 更新しない | 新しい Bounded Context 間依存は採用しないため。 |
