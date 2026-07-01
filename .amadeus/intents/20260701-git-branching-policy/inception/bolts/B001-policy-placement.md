# B001: policy 配置

## 概要

- `.amadeus/steering/policies.md` に Git ブランチ戦略の概要と、個別 policy への導線を記録する。
- `.amadeus/steering/policies/git-branching.md` を具体ルールの配置先として作る。

## 対象ユニット

- U001

## 設計

- [U001 Unit Design](../units/U001-git-branching-policy/design.md)

## 完了条件

- `.amadeus/steering/policies.md` から Git ブランチ戦略の存在を読める。
- `.amadeus/steering/policies/git-branching.md` への導線を読める。
- 対象外が Issue #254 と矛盾していない。

## 依存

- なし

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/steering/policies.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.amadeus/steering/policies/git-branching.md` | 未確認 | なし | 未確認 |

## 未確認事項

- なし。
