# R004 前提不成立分類

## 要求

stage 前提が成立しない場合に、`repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` へ分類できる。

## 背景

前提不成立の原因が成果物構造だけであれば、現在の phase skill の repair で扱える。

前段 phase または前段 stage の成果物不足が現在の成功条件を妨げる場合は、上流へ戻す必要がある。

現在 Intent の成功条件外の小さな課題であれば、後続 Issue 候補として扱う。

## 受け入れ条件

- 成果物構造の補修だけで解ける前提不成立は `repair_only` に分類できる。
- 前段成果物の不足、矛盾、粒度誤りが現在の成功条件を妨げる場合は `upstream_feedback_required` に分類できる。
- 現在 Intent の成功条件外だが小さく追跡できる課題は `follow_up_issue_candidate` に分類できる。
- 分類結果は、人間承認なしに GitHub Issue を作成しない方針と矛盾しない。

## 依存

- R002
- R003

## 対応する対象境界

- SC-IN-005

## 未確認事項

- `repair_only` と `upstream_feedback_required` の境界を eval で確認するか、人間レビューに留めるかは Construction で確定する。
