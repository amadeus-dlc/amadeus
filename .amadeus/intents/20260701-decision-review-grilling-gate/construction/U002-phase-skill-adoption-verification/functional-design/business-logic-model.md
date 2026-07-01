# Business Logic Model

## 目的

Ideation、Inception、Construction の公開 phase skill が、同じ decision review 規則を起動時判断として参照できるようにする。

## 対象 Unit

U002 phase skill adoption verification。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | 公開 phase skill の起動時に decision review を共通前処理として参照する規則を定義する。 | U001 の outcome、phase skill の実行モード | Phase Skill Entry Rule | R004, UC003 |
| BL002 | `guided`、`refine`、`repair` と decision review outcome の関係を説明する。 | Decision Review Outcome、実行モード | Mode Interaction | R002, R004, UC003 |
| BL003 | Skill Contract、validator、evaluator、eval を decision review の入力または確認候補として扱い、内容承認とは分ける。 | Skill Contract、validator 結果、evaluator 結果、eval 結果 | Contract Boundary | R005, UC001, UC003 |
| BL004 | source skill と昇格先 skill が同じ規則を説明しているか確認する。 | `skills/amadeus-*`、`.agents/skills/amadeus-*` | 同期確認結果 | R004, UC003 |
| BL005 | evaluator の本格実装を初期 Construction に含めない場合、後続 Issue 候補として報告する。 | Contract Boundary、検証結果 | 後続 Issue 候補 | R005, UC003 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| U001 の Decision Review Outcome | phase skill が次に進む処理分岐を表す。 | R001, R002 |
| phase skill の実行モード | `auto`、`guided`、`refine`、`repair` などの実行方針を表す。 | R004 |
| Skill Contract | phase skill の前提、不変条件、事後条件、読み取り境界、書き込み境界を表す。 | R005 |
| validator、evaluator、eval 結果 | 構造検出、品質評価、template または contract 確認の結果を表す。 | R005 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| Phase Skill Entry Rule | 公開 phase skill が decision review を参照する起動時規則。 | B002 |
| Contract Boundary | Skill Contract、validator、evaluator、eval と decision review の責務境界。 | B003 |
| 同期確認結果 | source skill と昇格先 skill の説明が一致しているかの証拠。 | B002, B003 |
| 後続 Issue 候補 | 初期 Construction の成功条件外に置く検証または evaluator 課題。 | 人間承認後の Issue 化 |

## 未確認事項

なし。
