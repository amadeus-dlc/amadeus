# G002：Bolt 束ね方と順序付け

## 概要

- 状態: completed
- 対象: Intent `260703-amadeus-skill-english-rollout-plan` の Delivery Planning
- 反映先: [delivery-planning-questions.md](delivery-planning/delivery-planning-questions.md)、[bolt-plan.md](delivery-planning/bolt-plan.md)

Issue #399 の子 Issue 完了追跡を Bolt へ割り当てるため、Bolt の束ね方、walking skeleton、順序付けの優先を確認した。

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD004 | Bolt は Unit 1 個ずつ束ねる。 | active | [delivery-planning-questions.md](delivery-planning/delivery-planning-questions.md) の Q001 | なし |
| GD005 | 最初の Bolt は U001 を扱う B001 とし、walking skeleton とする。 | active | [bolt-plan.md](delivery-planning/bolt-plan.md) の B001 | なし |
| GD006 | 順序付けは依存先行とする。 | active | [risk-and-sequencing-rationale.md](delivery-planning/risk-and-sequencing-rationale.md) | なし |

## 質問記録

### Q001

- 確認したいこと: Bolt の束ね方、最初の Bolt、順序付けの優先をどうするか。
- 確認が必要な理由: Delivery Planning は Unit DAG に経済的な順序付けを行い、Bolt 計画を確定する責務を持つため。
- 推奨回答: Unit 1 個ずつ、U001 を walking skeleton、依存先行。
- 推奨理由: #395、#400、#401、#402 の完了証拠をそのまま Bolt に対応させ、依存 DAG と親 Issue の追跡を崩さない。
- ユーザー回答: 1
- 確定判断: GD004、GD005、GD006
