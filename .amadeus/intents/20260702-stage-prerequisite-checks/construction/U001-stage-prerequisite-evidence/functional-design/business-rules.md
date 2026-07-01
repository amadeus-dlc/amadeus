# Business Rules

## 目的

stage 前提確認の判断規則と Intent Contracts を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | phase skill 起動時は、skill 供給元と実行環境の stage 前提を decision review の入力証拠として扱う。 | R001, R003, UC001 | accepted |
| BR002 | source skill、昇格先成果物、host environment での利用可否は混同しない。 | R001, UC001 | accepted |
| BR003 | stage2 は、stage0 採用判断なしに次回 stage0 として扱わない。 | R002, UC001 | accepted |
| BR004 | validator や CI の成功は stage0 採用判断の証拠候補であり、判断そのものではない。 | R002, R003 | accepted |
| BR005 | phase skill は、stage 前提が現在 Intent の成功条件を妨げる場合に `upstream_feedback_required` へ戻せる。 | R003, R004 | accepted |

## 例外

| 条件 | 扱い | 根拠 |
|---|---|---|
| source skill は存在するが、昇格先成果物が古い。 | 昇格手順で解ける場合は `repair_only`、前段 stage の不足であれば `upstream_feedback_required` として扱う。 | R001, R004 |
| target workspace の stage2 成果物を参照している。 | stage0 採用判断がない限り、次回 stage0 として扱わない。 | R002 |
| host environment の利用可否を判断できない。 | 現在の成功条件を妨げる場合は `upstream_feedback_required` として扱う。 | R001, R004 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | 対象 phase skill、対象 Intent または成果物セット、実行モードを解決できる。 | R003 | accepted |
| PRE002 | 事前条件 | 既存成果物と現在参照できる証拠の範囲を説明できる。 | R003 | accepted |
| PRE003 | 事前条件 | skill 供給元と実行環境の stage 前提を、source skill、昇格先成果物、host environment、stage0、stage1、stage2、stage0 採用判断として区別できる。 | R001, R002 | accepted |
| POST001 | 事後条件 | stage 前提確認を含めて decision review outcome を分類できる。 | R003, R004 | accepted |
| INV001 | 不変条件 | decision review 自体は質問を実行しない。 | R003 | accepted |
| INV002 | 不変条件 | validator の `pass` を質問不要または内容承認として扱わない。 | R002, R003 | accepted |

## 未確認事項

なし。
