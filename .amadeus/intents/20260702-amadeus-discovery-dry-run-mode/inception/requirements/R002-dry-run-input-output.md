# R002: `dry-run` の入力と出力

## 要求

- `dry-run` は、`.amadeus/discoveries.md`、`.amadeus/discoveries/**/*.md`、`.amadeus/intents.md`、候補抽出に必要な `.amadeus/intents/**/*.md`、steering layer、Domain Map、Context Map を読めることを説明している。
- `dry-run` は、入力された GitHub Issue、PR、validator 結果、evaluator 結果、CI 結果を候補表示の材料にできる。
- `dry-run` は、入力テーマまたは探索対象、既存 Discovery との関係、既存 Intent との関係、Intent 候補、候補ごとの分類、根拠、未確認事項、判定案、推奨次アクションを表示できる。
- `dry-run` は、`single_intent`、`multi_intent`、`existing_intent_update`、`research_only`、`no_intent`、`undecided` の判定案を表示できる。
- `multi_intent` の場合、`dry-run` は recommended 候補を1件示せる。

## 受け入れ条件

- 入力対象が skill 本文で列挙されている。
- 出力項目が skill 本文で列挙されている。
- 判定案の値が Discovery の既存 decision 値と矛盾しない。
- `multi_intent` の場合に recommended 候補を示すことが説明されている。

## 根拠

- [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272)
- [initial-confirmation.puml](../../ideation/mocks/initial-confirmation.puml)
- [codebase-analysis.md](../codebase-analysis.md)

## 未確認事項

- 出力を人間向け Markdown だけにするか、機械向け JSON も含めるかは Construction で確認する。
