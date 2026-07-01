# Business Rules

## 目的

U002 の業務ルールは、policy 参照、検出候補、人間判断対象を混同しないための判断基準を固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 対象 Intent の traceability または PR 説明から Git ブランチ戦略 policy を参照できるようにする。 | [R004](../../../inception/requirements/R004-policy-reference-validation.md) | adopted |
| BR002 | validator は実行時に参照できる構造、path、明示リンクの検出候補だけを扱う。 | [U002 Unit Design](../../../inception/units/U002-policy-traceability-validation/design.md) | adopted |
| BR003 | evaluator は文書上の説明不足や論理不整合の検出候補を扱う。 | [U002 Unit Design](../../../inception/units/U002-policy-traceability-validation/design.md) | adopted |
| BR004 | merge 可否、例外の妥当性、人間承認は機械検査へ寄せず、人間判断として扱う。 | [B003](../../../inception/bolts/B003-policy-reference-validation.md) | adopted |

## 例外

現在の Intent の成功条件を満たすために必要な検出でない場合は、validator または evaluator の変更を後続 Issue 候補にする。

policy 文書の追加だけで R004 の説明責務を満たせる場合は、validator または evaluator の実装変更を行わない。

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | `.amadeus/steering/policies/git-branching.md` が存在する。 | [B001](../../../inception/bolts/B001-policy-placement.md) | adopted |
| POST001 | 事後条件 | Construction traceability から policy 参照、実装、検証を追跡できる。 | [R004](../../../inception/requirements/R004-policy-reference-validation.md) | adopted |
| INV001 | 不変条件 | validator の `pass` を内容承認として扱わない。 | [U002 Unit Design](../../../inception/units/U002-policy-traceability-validation/design.md) | adopted |

## 未確認事項

- なし。
