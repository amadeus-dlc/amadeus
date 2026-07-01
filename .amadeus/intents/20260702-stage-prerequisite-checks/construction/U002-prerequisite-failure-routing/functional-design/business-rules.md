# Business Rules

## 目的

前提不成立分類と配布対象 skill の説明境界を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 成果物構造の補修だけで解ける場合は `repair_only` として扱う。 | R004, UC002 | accepted |
| BR002 | 前段 phase または前段 stage の不足が現在 Intent の成功条件を妨げる場合は `upstream_feedback_required` として扱う。 | R004, UC002 | accepted |
| BR003 | 現在 Intent の成功条件外の小さな課題は `follow_up_issue_candidate` として扱う。 | R004, UC002 | accepted |
| BR004 | GitHub Issue は人間承認なしに作成しない。 | R004, UC002 | accepted |
| BR005 | 配布対象 skill では、repo 内 Issue 番号を前提にした説明を使わない。 | R005, UC003 | accepted |

## 例外

| 条件 | 扱い | 根拠 |
|---|---|---|
| repo 内代表例を説明する必要がある。 | `.amadeus/` 成果物では Issue 番号を使えるが、配布対象 skill では一般説明にする。 | R005 |
| 前提不成立の分類が既存証拠だけで判断できない。 | `grill_required` の候補として扱い、一問だけ確認する。 | R004 |
| 同じ前提不成立が繰り返される。 | 人間判断を仰ぐ。 | R004 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | U001 の stage 前提確認結果を読める。 | R004 | accepted |
| POST001 | 事後条件 | 前提不成立を `repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` のいずれかへ分類できる。 | R004 | accepted |
| POST002 | 事後条件 | repo 内代表例と配布対象 skill の一般説明を分けて説明できる。 | R005 | accepted |
| INV001 | 不変条件 | 人間承認なしに GitHub Issue を作成しない。 | R004 | accepted |
| INV002 | 不変条件 | 配布対象 skill に repo 内 Issue 番号前提の説明を混ぜない。 | R005 | accepted |

## 未確認事項

なし。
