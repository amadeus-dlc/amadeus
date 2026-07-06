# Memory: feasibility

## Interpretations

- この Intent は Amadeus skill 英語化の実施計画だけでなく、#395、#400、#401、#402 の完了まで追跡する。
- 外部市場や build-vs-buy の判断はないため、Market Research は skip した。
- Feasibility は、言語ルール、昇格フロー、PR gate、子 Issue 完了証拠の制約を扱うため実行する。
- 交渉不能な制約は、日本語生成成果物契約、source skill から昇格先成果物への昇格フロー、PR 作成後の監視、merge は人間が行うことである。
- 主なリスクは、英語化と意味変更の混在、source skill と昇格先成果物のずれ、子 Issue の完了証拠欠落である。
- 外部依存は、GitHub Issue、Pull Request、CI、レビューボットの状態である。
- 子 Issue の完了証拠は、GitHub 上の PR merge または Issue close で確認できることを前提にする。

## Deviations

- なし。

## Tradeoffs

- 子 Issue の完了まで含めると Intent の期間は長くなるが、親タスクとしての一体性を保てる。
- 完了証拠に PR merge と Issue close の両方を許すと、実装 PR と判断整理の両方を扱える。
- 意味変更混入を避けるには PR の分割と説明が必要だが、分割しすぎると子 Issue の完了追跡が散らばる。

## Open questions

- なし。
