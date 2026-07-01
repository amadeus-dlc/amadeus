# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | `dry-run` の対象境界、実行スコープ、成果物深度、検証戦略を採用し Ideation を完了する。 | 採用 | なし | [D001-complete-ideation.md](decisions/D001-complete-ideation.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Ideation gate を通す判断であり、対象境界と scope 制御値を Inception へ渡すため。 |

## 採用した判断

- Issue #272 は、`amadeus-discovery` に読み取り専用の `dry-run` mode を追加する Intent として扱う。
- 依存 Intent は Issue #277 の `20260701-history-learning-review-skills` とする。
- Issue #259 は学習分類契約の参照元として扱う。
- `dry-run` は `.amadeus/` 配下の成果物更新、GitHub Issue 作成、Intent Record 作成、`amadeus-ideation` 自動実行を行わない。
- `scaffold-only` は質問しない成果物作成 mode として残し、`dry-run` と混同しない。
- `amadeus-history-review` と `amadeus-learning-review` は入力候補として扱い、過去分析と学習分類を `dry-run` 自体へ混ぜない。
- Ideation では要求、Unit、Bolt、実装を作らず、対象、対象外、未確定事項、初期モック、追跡、判断を確定する。

## 置き換えられた判断

なし。

## 再確認条件

- Inception で `dry-run` が `amadeus-history-review` または `amadeus-learning-review` を直接起動する判断になった場合。
- `dry-run` の出力に機械向け JSON を含める判断になった場合。
- `dry-run` が GitHub Issue 作成または Intent Record 作成を行う要件が追加される場合。
- `dry-run` が Discovery 成果物を更新する要件が追加される場合。
- `scaffold-only` の責務を読み取り専用へ変える判断になった場合。
