# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-amadeus-discovery-dry-run-mode | [20260702-amadeus-discovery-dry-run-mode.md](../../20260702-amadeus-discovery-dry-run-mode.md) | Inception の要求分析で参照する。 |
| Issue | #272 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/272) | Requirement、Acceptance、Use Case、Unit、Bolt の根拠にする。 |
| 先行 Intent | 20260701-history-learning-review-skills | [state.json](../../20260701-history-learning-review-skills/state.json) | `dry-run` が過去分析と学習分類の結果を入力にできる前提にする。 |
| 関連 Intent | 20260701-feedback-learning-loop | [state.json](../../20260701-feedback-learning-loop/state.json) | 学習先分類と後続 Intent 候補の扱いを参照する。 |
| 対象境界 | 読み取り専用の Intent 候補探索 mode | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | refactor、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | 読み取り対象、出力項目、禁止する副作用、責務境界を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | source skill、昇格先成果物、eval、validator の確認を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で `dry-run` の入力、出力、副作用禁止を確認する例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-amadeus-discovery-dry-run-mode | 20260701-history-learning-review-skills | `dry-run` は過去分析と学習分類の結果を入力にできる必要があるため。 | [intents.md](../../../intents.md) |
| Issue | #272 | #259 | 後段 feedback と Intent 横断学習の分類結果を候補表示に利用できるため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/259) |
| Issue | #272 | #277 | `amadeus-history-review` と `amadeus-learning-review` の責務を入力候補として参照するため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/277) |
| 外部システム | EXT001 GitHub | なし | Issue、PR、CI 結果、後続 Issue 候補を追跡の根拠に使うため。 | [external-systems.md](../../../steering/external-systems.md) |
| アクター | ACT001 Maintainer | なし | `dry-run` の責務、出力、禁止する副作用、後続 Intent 化を承認するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| `amadeus-discovery` に `dry-run` mode の説明が追加されている。 | scope の SC-IN-001 に記録した。 | source skill と昇格先成果物の変更対象として要求化する。 |
| `dry-run` が読み取り専用であることが明記されている。 | scope の SC-IN-001 と SC-OUT-001 から SC-OUT-004 に記録した。 | `.amadeus/` 更新、Issue 作成、Intent Record 作成、Ideation 自動実行の禁止を acceptance に落とす。 |
| `dry-run` と `scaffold-only` の違いが説明されている。 | scope の SC-IN-004 に記録した。 | mode ごとの責務表を要求または判断へ落とす。 |
| `dry-run` の出力に、候補、分類、根拠、未確認事項、推奨次アクションが含まれる。 | scope の SC-IN-003 と mock に記録した。 | 出力項目を Requirement と Use Case へ分解する。 |
| 自己開発で `.amadeus/` 全体から次 Intent 候補を探索する用途を扱える。 | scope の SC-IN-002 と ideation の学習候補に記録した。 | 読み取り対象と探索対象を要求化する。 |
| `dry-run` が `amadeus-history-review` または `amadeus-learning-review` の結果を入力にできる。 | scope の SC-IN-005 と traceability の先行 Intent に記録した。 | 入力として受け取るか直接起動するかを判断する。 |
| 過去分析、学習分類、Intent 候補表示の責務が混ざらない。 | scope の SC-IN-006 と SC-OUT-005、SC-OUT-006 に記録した。 | 責務境界を acceptance と decisions に落とす。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降で `dry-run` と `scaffold-only` の責務差分、または過去分析と学習分類との境界が不足すると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。
