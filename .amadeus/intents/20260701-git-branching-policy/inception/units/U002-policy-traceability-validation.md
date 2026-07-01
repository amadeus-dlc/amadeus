# U002: policy 参照と検出境界

## ユニット

- Git ブランチ戦略 policy を Intent 成果物や PR 説明から参照する方法と、validator または evaluator で検出する候補を扱う。

## 対象要求

- R004

## 価値境界

- Reviewer と Maintainer が、branch 戦略への準拠を成果物と PR から確認できる範囲を扱う。
- branch lifecycle の具体ルール本文は U001 に置く。

## 検証観点

- Intent の traceability、acceptance、PR 説明から参照する policy を追跡できる。
- validator または evaluator で検出する候補と、人間判断に残す候補を分けられる。
- merge 可否や例外の妥当性を機械検査と混同していない。

## 未確認事項

- validator と evaluator のどちらに検出候補を置くかは Construction で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `.amadeus/steering/policies/git-branching.md` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.amadeus/intents/20260701-git-branching-policy/inception/traceability.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U002-policy-traceability-validation/design.md)
