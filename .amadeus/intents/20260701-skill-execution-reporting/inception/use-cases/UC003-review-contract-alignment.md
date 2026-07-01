# UC003: 報告契約整合レビュー

## システム境界

- Reviewer が source skill、昇格先 skill、関連 eval の報告契約が揃っているか確認する相互作用を扱う。

## 事前条件

- R001、R002、R003 の報告契約が Inception 成果物として定義されている。
- Construction で対象にする代表 skill と eval の候補が分かっている。

## 基本フロー

1. Reviewer は source skill の報告契約を確認する。
2. Reviewer は昇格先 skill が source skill と同じ報告契約を持つか確認する。
3. Reviewer は関連 eval が報告契約の存在、または対象外理由を確認できるか確認する。
4. Reviewer は validator の `pass` を内容承認として扱っていないか確認する。

## 代替フロー

- 代表 skill の差分が大きい場合、Reviewer は対象を最小の公開 skill に絞る判断を促す。
- eval で直接確認できない場合、Reviewer は対象外理由を Construction の decisions または traceability に残すよう促す。

## 事後条件

- source skill、昇格先 skill、関連 eval の整合確認結果が Construction の証拠として扱える。

## BCE候補

| 種別 | 候補 | 責務 |
|---|---|---|
| 境界 | Contract Alignment Review Boundary | source skill、昇格先 skill、eval の整合を確認する。 |
| 制御 | Skill Promotion Verification Control | 昇格手順と整合確認の順序を制御する。 |
| エンティティ | Execution Reporting Contract | 分類基準、最低項目、人間承認、検証後段候補を保持する。 |

## 責務候補

| 候補 | 判断 | 保持 | 依頼 |
|---|---|---|---|
| Reviewer | 採用 | 契約整合の確認 | Agent へ差分補修を依頼する。 |
| Agent | 採用 | source skill、昇格先 skill、eval の更新と検証 | Reviewer へ検証結果を提示する。 |
| Validator または Evaluator | 採用 | 構造条件または内容評価の確認候補 | Agent が対象外理由または検証結果を残す。 |
