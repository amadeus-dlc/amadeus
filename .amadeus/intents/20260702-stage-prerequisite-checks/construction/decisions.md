# Construction 判断

## 一覧

| 識別子 | タイトル | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|---|
| D001 | Functional Design scope | U001 と U002 の Functional Design を必須にする。 | accepted | なし | [D001-functional-design-scope.md](decisions/D001-functional-design-scope.md) |
| D002 | decision review stage 前提 | stage 前提確認を decision review の入力証拠と判断ノードに置く。 | accepted | D001 | [D002-decision-review-stage-prerequisite.md](decisions/D002-decision-review-stage-prerequisite.md) |
| D003 | Skill Contract alignment | stage 前提確認を Skill Contract と phase skill 起動時説明へ反映する。 | accepted | D002 | [D003-skill-contract-alignment.md](decisions/D003-skill-contract-alignment.md) |
| D004 | distribution example boundary | repo 内代表例と配布対象 skill の一般説明を分ける。 | accepted | D002, D003 | [D004-distribution-example-boundary.md](decisions/D004-distribution-example-boundary.md) |
| D005 | PR #280 merge finalization | PR #280 の merge を Construction 完了証拠として採用する。 | accepted | D002, D003, D004 | [D005-pr-280-merge-finalization.md](decisions/D005-pr-280-merge-finalization.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Functional Design の対象 Unit が後続判断の前提であるため。 |
| D002 | D001 | stage 前提確認の詳細は U001 の Functional Design を根拠にするため。 |
| D003 | D002 | Skill Contract と phase skill 反映は decision review の判断ノードを前提にするため。 |
| D004 | D002, D003 | 説明境界は stage 前提確認の配置先と契約反映を前提にするため。 |
| D005 | D002, D003, D004 | 実装 PR の merge は、stage 前提確認、Skill Contract 整合、説明境界の判断を完了証拠としてまとめるため。 |

## Domain Map と Context Map

| 対象 | 判断 | 根拠 |
|---|---|---|
| Domain Map | 更新しない | U001 と U002 は既存の BC001 自己開発運用内の詳細であるため。 |
| Context Map | 更新しない | 新しい Bounded Context 間依存は採用しないため。 |

## 未確認事項

なし。
