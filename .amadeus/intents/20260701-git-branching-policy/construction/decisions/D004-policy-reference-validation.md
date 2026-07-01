# D004: policy 参照と検出境界

## 状態

active

## 文脈

R004 は、Intent の traceability、acceptance、PR 説明から参照する policy と、validator または evaluator で検出する候補を分けることを求めている。

## 判断

今回の変更では、validator または evaluator の実装変更を行わない。

検出候補と人間判断対象は `.amadeus/steering/policies/git-branching.md` に記録する。

Construction traceability には、Git ブランチ戦略 policy を参照した証拠を残す。

## 影響

validator は現時点では既存の成果物構造検証に使う。

policy 参照の説明不足や branch lifecycle の論理不整合を機械検査へ寄せる場合は、後続 Issue として扱う。

## 根拠

- [R004](../../inception/requirements/R004-policy-reference-validation.md)
- [U002 Unit Design](../../inception/units/U002-policy-traceability-validation/design.md)
- [B003](../../inception/bolts/B003-policy-reference-validation.md)
