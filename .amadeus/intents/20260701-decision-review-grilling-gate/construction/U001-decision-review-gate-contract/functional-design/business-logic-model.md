# Business Logic Model

## 目的

phase skill 起動時に、既存成果物と現在参照できる証拠から decision tree を再評価し、次に進む処理分岐を説明できるようにする。

## 対象 Unit

U001 decision review gate contract。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | 対象 phase skill、対象 Intent、実行モード、既存成果物、Issue、PR、作業ツリー、validator 結果、Skill Contract、信頼できる参照元を入力証拠として集める。 | phase skill 起動入力、作業ツリー、GitHub 情報、Skill Contract | Decision Review Input | R001, UC001 |
| BL002 | phase skill が実行前に選ぶ判断を Decision Node として列挙し、現在の証拠で説明できるかを再評価する。 | Decision Review Input、phase skill の実行モード、既存成果物 | Decision Node の評価結果 | R001, R002, UC001 |
| BL003 | 評価結果を `grill_required`、`no_grill`、`repair_only`、`follow_up_issue_candidate` に分類する。 | Decision Node の評価結果 | Decision Review Outcome | R002, UC001, UC002 |
| BL004 | `grill_required` の場合だけ、`amadeus-grilling` に渡す一問、確認理由、推奨回答、推奨理由、反映先候補を作る。 | Decision Review Outcome、不明瞭ノード | Grilling Handoff | R003, UC002 |
| BL005 | decision review 自体は質問を実行せず、質問実行と Grilling Decision Trail 記録を呼び出し元 phase skill と `amadeus-grilling` に委譲する。 | Grilling Handoff、呼び出し元 phase skill | handoff 指示 | R003, UC002 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| phase skill 起動入力 | 対象 phase、対象 Intent、実行モード、ユーザー指定を含む。 | R001 |
| 既存成果物 | `.amadeus/` の Intent 成果物、steering layer、Domain Map、Context Map を含む。 | R001 |
| 現在参照できる証拠 | Issue、PR、作業ツリー、validator 結果、Skill Contract、信頼できる参照元を含む。 | R001, R005 |
| 判断ノード | 対象 phase skill が進行前に選ぶ分岐または未確定事項を表す。 | R002 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| Decision Review Outcome | `grill_required`、`no_grill`、`repair_only`、`follow_up_issue_candidate` のいずれか。 | phase skill の起動時判断 |
| 判断理由 | outcome を選んだ理由と根拠証拠。 | phase skill の報告、traceability |
| Grilling Handoff | 一問、確認理由、推奨回答、推奨理由、反映先候補。 | `amadeus-grilling` |
| 後続 Issue 候補 | 現在 Intent の成功条件外だが、別途扱うべき小さな課題。 | 人間承認後の Issue 化 |

## 未確認事項

なし。
