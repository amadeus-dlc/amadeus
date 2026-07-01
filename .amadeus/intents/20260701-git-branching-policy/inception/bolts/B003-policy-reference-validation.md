# B003: policy 参照と検出境界

## 概要

- Intent の traceability、acceptance、PR 説明から Git ブランチ戦略 policy を参照する方針を記録する。
- validator または evaluator で検出する候補と、人間判断に残す候補を分ける。

## 対象ユニット

- U002

## 設計

- [U002 Unit Design](../units/U002-policy-traceability-validation/design.md)

## 完了条件

- policy 参照を残す成果物または PR 説明の候補を読める。
- validator または evaluator で検出する候補を読める。
- merge 可否、例外の妥当性、人間承認が必要な判断を機械検査と混同しないことを読める。

## 依存

- B001
- B002

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/steering/policies/git-branching.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.amadeus/intents/20260701-git-branching-policy/construction/traceability.md` | 未確認 | なし | 未確認 |

## 未確認事項

- validator または evaluator の変更が必要か、policy 文書だけで足りるかは Construction で確定する。
