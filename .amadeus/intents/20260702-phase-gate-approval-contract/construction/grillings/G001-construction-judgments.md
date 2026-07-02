# G001: トリガーの記述位置と approval evidence の path 検査

## 概要

- 状態: completed
- 対象: Intent
- 反映先: [U001 business-rules.md](U001-phase-gate-skill-contract/functional-design/business-rules.md)、[U002 business-rules.md](U002-approval-evidence-validation/functional-design/business-rules.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | grilling 起動トリガーの判定規則の定義は `amadeus-decision-review` に 1 箇所だけ置き、3 つの phase skill（ideation、inception、construction）の Decision Review 節はその規則を参照する短い記述を置く。 | active | [U001 business-rules.md](U001-phase-gate-skill-contract/functional-design/business-rules.md) | なし |
| GD002 | validator の approval evidence 検査は `kind: approval` の実在だけを対象にし、`path` が指す成果物の種類は限定しない。 | active | [U002 business-rules.md](U002-approval-evidence-validation/functional-design/business-rules.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: grilling 起動トリガーの記述位置を、`amadeus-decision-review` の判断ノード表への統合、各 phase skill の Decision Review 節、その両方のどれにするか。
- 確認が必要な理由: B002 の変更対象ファイルと Functional Design の業務ルールの置き場所が変わるため。Inception の未確認事項に「Construction で判断する」と記録されていた。
- 推奨回答: 両方に書く。定義は `amadeus-decision-review` に 1 箇所だけ置き、3 つの phase skill からはその規則を参照する短い記述を置く。
- 推奨理由: 定義の重複を避けつつ、phase skill 単体を読んでもトリガーの存在が分かる。Issue #306 の受け入れ条件（3 つの phase skill の decision review 記述に定義されている）も満たす。既存の outcome 分類の書き方とも一致する。
- ユーザー回答: 推奨回答どおり採用する。

### Q002

- 確定判断: GD002
- 確認したいこと: validator の approval evidence 検査で、`path` が指す成果物の種類を限定するか。
- 確認が必要な理由: B003 の検査実装と eval の fail 条件が変わるため。Inception の未確認事項に「Construction で判断する」と記録されていた。
- 推奨回答: 限定しない。検査は `kind: approval` の実在だけとする。
- 推奨理由: 既存実データ 34 件の approval の path は pr.md、notes.md、test-results.md、decisions/*.md と多様であり、種類を限定すると既存成果物の pass 維持（R004 の受け入れ条件）と衝突する。内容の妥当性判断は Issue #307 の対象外である。
- ユーザー回答: 推奨回答どおり採用する。
