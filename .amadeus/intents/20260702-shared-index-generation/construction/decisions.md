# Construction 判断

## 一覧

| 識別子 | タイトル | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|---|
| D001 | Functional Design scope | U001 の Functional Design を必須にし、UI 構成なしとして core 3 文書を作る。見出し契約、並び順、抽出規約、スクリプト契約、検査方式を確定する。 | accepted | なし | [D001-functional-design-scope.md](decisions/D001-functional-design-scope.md) |
| D002 | Task Generation 承認 | B001 の Task 分解を Maintainer が承認した。 | accepted | D001 | [D002-task-generation-approval.md](decisions/D002-task-generation-approval.md) |
| D003 | B002 と B003 の Task Generation 承認 | B002 と B003 の Task 分解を Maintainer が承認した。実装は Sonnet へ順次委譲する。 | accepted | D001 | [D003-b002-b003-task-generation-approval.md](decisions/D003-b002-b003-task-generation-approval.md) |
| D004 | greenfield のゼロ状態整合 | 生成器がゼロ件時にテンプレートと同じ案内文を出力し、検証でテンプレートとの一致を固定する。 | accepted | D001 | [D004-greenfield-zero-state-alignment.md](decisions/D004-greenfield-zero-state-alignment.md) |
| D005 | B004 の Task Generation 承認 | B004 の Task 分解を Maintainer が承認した。実装は Sonnet へ委譲する。 | accepted | D001 | [D005-b004-task-generation-approval.md](decisions/D005-b004-task-generation-approval.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Functional Design の設計判断が Task 分解と実装の前提であるため。 |
| D002 | D001 | Task 分解は Functional Design と Unit Design Brief を根拠にするため。 |
| D003 | D001 | Task 分解は Functional Design と Unit Design Brief を根拠にするため。 |
| D004 | D001 | ゼロ状態の出力形式は D001 で確定した生成契約の補完であるため。 |
| D005 | D001 | Task 分解は Functional Design と Unit Design Brief を根拠にするため。 |

## Domain Map と Context Map

| 対象 | 判断 | 根拠 |
|---|---|---|
| Domain Map | 更新しない | U001 は既存の BC001 自己開発運用内のインデックス管理手段の変更であるため。 |
| Context Map | 更新しない | 新しい Bounded Context 間依存は採用しないため。 |
