# D001: Ideation を完了し、Inception へ進める

## 状態

accepted

## 背景

Issue #272 は、`amadeus-discovery` に `dry-run` mode を追加することを求めている。

既存の `scaffold-only` は、質問せずに Discovery 成果物を作る mode である。
しかし、自己開発では成果物を作る前に、既存 Discovery、既存 Intent、Issue、validator 結果、evaluator 結果、CI 結果から、次に起こすべき Intent 候補だけを確認したい場面がある。

Issue #259 は後段 feedback と Intent 横断学習の分類を定義した。
Issue #277 は、`.amadeus/` の過去分析と学習分類を `amadeus-history-review` と `amadeus-learning-review` の内部 skill として整理した。
そのため、`dry-run` はこれらの結果を入力にできるが、過去分析や学習分類そのものは所有しない。

## 判断

Ideation を完了し、Inception へ進める。

この Intent では、`amadeus-discovery dry-run` を読み取り専用の Intent 候補探索 mode として扱う。
Inception では、入力対象、出力項目、禁止する副作用、`scaffold-only` との差分、過去分析と学習分類との責務境界、検証観点を具体化する。

## 根拠

- [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272)
- [Issue #272 comment](https://github.com/amadeus-dlc/amadeus/issues/272#issuecomment-4855725512)
- [Issue #272 comment](https://github.com/amadeus-dlc/amadeus/issues/272#issuecomment-4855754804)
- [Issue #259](https://github.com/amadeus-dlc/amadeus/issues/259)
- [Issue #277](https://github.com/amadeus-dlc/amadeus/issues/277)
- [scope.md](../scope.md)
- [ideation.md](../ideation.md)
- [initial-confirmation.puml](../mocks/initial-confirmation.puml)

## 影響

Inception では、`dry-run` の読み取り対象、出力項目、判定案、禁止する副作用を要求、受け入れ状態、ユースケース、Unit、Bolt へ分解する。

Construction では、必要に応じて source skill、昇格先成果物、eval または text contract、validator を更新する。

## 再確認条件

- `dry-run` が `.amadeus/` 配下を更新する判断に変わる場合。
- `dry-run` が GitHub Issue 作成、Intent Record 作成、`amadeus-ideation` 自動実行を行う判断に変わる場合。
- `dry-run` が過去分析または学習分類そのものを所有する判断に変わる場合。
- `scaffold-only` を読み取り専用 mode として再定義する判断に変わる場合。
- `dry-run` の出力形式に機械向け JSON が必要になる場合。
