# B002: branch lifecycle ルール

## 概要

- Git ブランチ戦略 policy に、Issue 起点の branch 作成、`origin/main` 追従、PR 作成前検証、merge 後処理の判断基準を記録する。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design](../units/U001-git-branching-policy/design.md)

## 完了条件

- default branch、agent 作業 branch prefix、1 Issue 1 branch の扱いを読める。
- `origin/main` 追従、rebase、merge commit、fast-forward の扱いを読める。
- PR 作成前検証、merge 人間委譲、merge 後処理を読める。
- docs-only や緊急修正の例外を同一 policy で扱うか、後続 Issue 候補にするかを読める。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/steering/policies/git-branching.md` | 未確認 | なし | 未確認 |

## 未確認事項

- docs-only 例外の記述粒度は Construction で確定する。
