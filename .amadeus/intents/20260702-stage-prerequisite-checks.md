# phase skill 起動時の stage 前提確認

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | phase skill 起動時の入力証拠と stage 前提確認を追加する技術目標である。 |
| scope | refactor | 既存の decision review、Skill Contract、stage 判定語彙を前提に、前提不成立を検出しやすくする Intent である。 |
| labels | stage, skill-supply, host-environment, decision-review, skill-contract, self-development | stage 前提、skill 供給元、host environment、decision review、Skill Contract、自己開発を表す。 |

## 目的

phase skill 起動時に、対象 skill の供給元と実行環境の stage 前提を確認できるようにする。

この Intent は [Issue #278](https://github.com/amadeus-dlc/amadeus/issues/278) を根拠にする。

Issue #277 では、Issue #272 が前提にしていた内部 skill 候補が実際には存在しない問題を補修した。
この問題は、内部 skill の不足だけでなく、phase skill 起動時に skill の供給元と実行環境の状態を入力証拠として扱っていないことにも起因する。

この Intent では、source skill、昇格先成果物、host environment での利用可否、stage0、stage1、stage2 の前提を確認する契約を整理する。
また、前提不成立時に `repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` などへ分類できるようにする。

## 成功条件

- phase skill 起動時の判断材料に、skill 供給元と実行環境の状態が含まれている。
- `amadeus-decision-review` または Skill Contract に、stage 前提の確認項目が追加されている。
- source skill、昇格先成果物、host environment での利用可否を区別して記録できる。
- 前提不成立時の分類先が明記されている。
- Issue #277 と Issue #272 の関係を、前提不成立の代表例として説明できる。
- 配布対象 skill には、このリポジトリ固有の Issue 番号を前提にした説明を混ぜない方針が説明されている。

## 範囲

含めるもの:

- phase skill 起動時に確認する skill 供給元の入力証拠。
- source skill、昇格先成果物、host environment での利用可否の区別。
- stage0、stage1、stage2 と stage0 採用判断の確認観点。
- `amadeus-decision-review` の判断ノードまたは Skill Contract の入力証拠への接続。
- 前提不成立時の分類先。
- Issue #277 と Issue #272 の関係を、このリポジトリ内の代表例として扱うこと。
- 配布対象 skill に repo 内 Issue 番号を前提にした説明を混ぜない制約。

含めないもの:

- phase skill の全面再設計。
- host environment を実行時に自動検出する仕組み。
- 全 skill の契約一括移行。
- stage0 採用判断を自動化すること。
- GitHub Issue の自動作成。
- 完了済み Intent 成果物の一括移行。
- Inception の前に要求、ユースケース、Unit、Bolt、Task、実装を作ること。

## 現在の phase

Ideation を開始する。

Inception では、stage 前提確認の要求、受け入れ状態、必要なユースケース、Unit、Bolt、既存コード分析を具体化する。
