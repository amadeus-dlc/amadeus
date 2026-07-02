# B002 責務分担の相互参照

## 概要

`git-branching.md` の `責務分担` に並行運用ポリシーへの相互参照を追記し、両 policy の責務境界（単一 branch の lifecycle と複数 worktree の並行判断）が両方から読める状態にする。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-parallel-operation-policy-contract/design.md)

## 完了条件

- `git-branching.md` から並行運用ポリシーへの参照と責務分担が読める。
- `parallel-operation.md` 側の責務分担の記述と矛盾しない。
- 追記は相互参照の明記に限定し、`git-branching.md` の既存の判断基準を変更しない。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT002 | amadeus-dlc/amadeus | `.amadeus/steering/policies/git-branching.md`（責務分担の相互参照追記） | 未確認 | なし | 未確認 |

## 未確認事項

- 追記する位置と文言は Construction Functional Design で確定する。
