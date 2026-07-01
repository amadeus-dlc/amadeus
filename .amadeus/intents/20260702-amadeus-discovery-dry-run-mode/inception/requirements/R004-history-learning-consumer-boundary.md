# R004: 過去分析と学習分類の consumer 境界

## 要求

- `dry-run` は、必要に応じて `amadeus-history-review` の過去分析結果を入力にできる。
- `dry-run` は、必要に応じて `amadeus-learning-review` の学習分類結果を入力にできる。
- `dry-run` は、過去分析そのものを所有しない。
- `dry-run` は、学習分類そのものを所有しない。
- `dry-run` は、分析結果や分類結果を使って Intent 候補、分類、根拠、未確認事項、推奨次アクションを表示する consumer として説明されている。

## 受け入れ条件

- `dry-run` と `amadeus-history-review` の責務差分が説明されている。
- `dry-run` と `amadeus-learning-review` の責務差分が説明されている。
- `dry-run` が分析結果または分類結果を入力にできることが、読み取り専用契約と矛盾しない。

## 根拠

- [Issue #272 comment](https://github.com/amadeus-dlc/amadeus/issues/272#issuecomment-4855725512)
- [Issue #272 comment](https://github.com/amadeus-dlc/amadeus/issues/272#issuecomment-4855754804)
- [20260701-history-learning-review-skills](../../../20260701-history-learning-review-skills.md)

## 未確認事項

- `dry-run` が内部 skill を直接起動するか、呼び出し元から結果を受け取るだけにするかは Construction で確認する。
