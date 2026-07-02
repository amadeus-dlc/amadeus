# インテント：並行運用ポリシー

## 概要

worktree 並行、フェーズパイプライン、ゲート承認のバッチ化の運用判断を steering policy として記録する。

## 依存

| 依存 | 理由 |
|---|---|
| 20260702-shared-index-generation | Discovery 候補の待機条件「生成物化後の並行運用で得た経験を根拠にするため、共有インデックスの生成物化の後に扱う」が、この Intent（Issue #334）の cycle 完了で解消したため。 |
| 20260701-git-branching-policy | 並行運用の判断基準は、この Intent が定義した Git Branching Policy の branch lifecycle と worktree 衝突回避の規則を前提にし、責務分担を整合させる必要があるため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | 並行運用の判断基準を steering policy として記録する技術目標である。 |
| scope | infra | 複数 worktree の並行作業基準を `.amadeus/steering/policies/**` に整備する Intent である。 |
| labels | parallel-execution, worktree, phase-pipeline, steering, governance, self-development | 並行実行、worktree、フェーズパイプライン、steering policy、運用統制、自己開発を表す。 |

## 目的

worktree 並行、フェーズパイプライン、ゲート承認のバッチ化の運用判断を steering policy として記録し、複数 worktree の並行作業を policy を根拠に進められるようにする。

この Intent は [Issue #351](https://github.com/amadeus-dlc/amadeus/issues/351) と Discovery [20260702-parallel-execution](../discoveries/20260702-parallel-execution.md) の候補「並行運用ポリシー」を根拠にする。

並行運用の判断（どの Intent を並行させるか、統合の順序、同一 worktree での Bolt 実行の直列化など）は現在都度判断であり、記録されていない。
Issue #334 の cycle が並行運用の実例（Issue #309 や #315 との並行、マージ後再生成による衝突解消、同一 worktree での検証競合を避けた Bolt の直列実行）を提供しており、推測ではなく観察を根拠に policy 化できる。

## 成功条件

- 並行運用の判断基準（並行させる単位、共有成果物の統合手順、ゲート承認の運用）が steering policy から読める。
- 複数 worktree での並行作業を、policy を根拠に進められる。

## 範囲

含めるもの:

- 並行運用の判断基準（並行させる単位、共有成果物の統合手順、ゲート承認の運用）の steering policy への記録。
- Issue #334 の cycle で観察した並行運用の実例を、判断基準の根拠として記録すること。
- 既存 Git Branching Policy との責務分担の整理。

含めないもの:

- 新しい phase や人間ゲートの追加。
- 並行実行の他候補（ゲート待ちキューの可視化、Bolt の依存 wave 並行実行）。
- 複数人チームでの並行と、複数 workspace での組織利用。

## 現在の phase

Ideation を開始する。

Inception では、policy の配置先（既存 Git Branching Policy への追記か、新規 policy ファイルか）、判断基準の粒度、validator または evaluator で検出する対象を具体化する。
