# U001: Git ブランチ戦略 policy

## ユニット

- Git ブランチ戦略 policy の配置、AGENTS.md との責務分担、branch lifecycle の判断基準を扱う。

## 対象要求

- R001
- R002
- R003

## 価値境界

- Maintainer と Agent が、Issue 起点の branch 作成から merge 後処理までを一貫した policy として参照できる範囲を扱う。
- policy 参照の検証境界と機械検査候補は U002 に渡す。

## 検証観点

- `.amadeus/steering/policies.md` と `.amadeus/steering/policies/git-branching.md` の責務が追跡できる。
- branch 作成、`origin/main` 追従、PR 作成前検証、merge 後処理の判断基準が追跡できる。
- AGENTS.md の操作指示と steering policy の責務分担が追跡できる。

## 未確認事項

- docs-only 例外を同一 policy 内に含めるかは Construction で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/steering/policies.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.amadeus/steering/policies/git-branching.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-git-branching-policy/design.md)
