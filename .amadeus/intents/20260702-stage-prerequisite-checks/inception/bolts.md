# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 要求 | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| B001 | `amadeus-decision-review` に stage 前提確認の入力証拠と判断ノードを追加する。 | U001 | R001, R002, R003 | [design.md](units/U001-stage-prerequisite-evidence/design.md) | なし | [B001-decision-review-stage-prerequisite-evidence.md](bolts/B001-decision-review-stage-prerequisite-evidence.md) |
| B002 | Skill Contract と phase skill 起動時説明を stage 前提確認へ整合させる。 | U001 | R001, R002, R003 | [design.md](units/U001-stage-prerequisite-evidence/design.md) | B001 | [B002-skill-contract-prerequisite-alignment.md](bolts/B002-skill-contract-prerequisite-alignment.md) |
| B003 | 前提不成立分類と repo 内代表例の説明境界を確定し、検証観点へ渡す。 | U002 | R004, R005 | [design.md](units/U002-prerequisite-failure-routing/design.md) | B001, B002 | [B003-failure-routing-and-example-boundary.md](bolts/B003-failure-routing-and-example-boundary.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | decision review の判断材料が、Skill Contract と phase skill 反映の前提であるため。 |
| B002 | B001 | Skill Contract と phase skill は、decision review の確認順序を参照するため。 |
| B003 | B001, B002 | 前提不成立分類と説明境界は、stage 前提確認の配置先が決まってから確定するため。 |

## 未確認事項

- なし。
