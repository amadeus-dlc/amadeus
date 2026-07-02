# R005 責務分担と索引登録

## 要求

並行運用ポリシーが steering の索引から参照でき、既存 Git Branching Policy との責務分担が両 policy から読める。

## 背景

G001 の確定判断（GD001）により、並行運用ポリシーは新規 `policies/parallel-operation.md` に置く。
Git Branching Policy は単一 branch の lifecycle を扱っており、責務の重なり（統合手順、PR 運用）があるため、境界を両 policy に明記しないと判断基準が分散する。

## 受け入れ条件

- `policies/parallel-operation.md` が `policies.md` と `policies/README.md` の索引から参照できる。
- 並行運用ポリシーと Git Branching Policy の責務分担（単一 branch の lifecycle と複数 worktree の並行判断）が両 policy から読める。
- 責務分担の記述が既存の policy 本文と矛盾しない。

## 依存

R001、R002、R003、R004。

## 対応する対象境界

- SC-IN-002
- SC-IN-004

## 未確認事項

- policy 本文の見出し構成（git-branching.md の形式の踏襲）は Construction Functional Design で確定する。
