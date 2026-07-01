# Unit Design Brief

## 概要

この文書は、U002 の Unit Design Brief である。

Inception では、前提不成立分類と説明境界の課題解決方針、Bolt 分割、Construction へ渡す設計入力だけを扱う。

## 設計戦略

前提不成立は、成果物構造だけで解ける場合、前段成果物の不足が現在の成功条件を妨げる場合、現在 Intent 外の小さな課題である場合に分ける。

repo 内代表例は、Amadeus の自己開発成果物に残す。

配布対象 skill では、同じ内容を source skill、昇格先成果物、host environment、stage 前提の一般説明へ置き換える。

## 責務境界

| 区分 | 内容 |
|---|---|
| 所有するもの | 前提不成立分類、repo 内代表例、配布対象 skill の説明境界、検証観点。 |
| 所有しないもの | stage 前提確認の入力証拠そのもの、GitHub Issue の自動作成、全 skill の一括移行。 |
| 依存してよいもの | U001 の確認結果、decision review の outcome、feedback learning loop の分類語彙。 |
| 再確認条件 | 分類語彙が増える場合、または配布対象 skill の説明範囲が変わる場合。 |

## 構成候補

- Prerequisite failure classifier。
- Upstream feedback route。
- Follow-up issue candidate route。
- Repository-local example boundary。
- Distribution-safe explanation check。

## データと契約候補

| 種別 | 候補 |
|---|---|
| 入力候補 | U001 の前提確認結果、前提不成立原因、対象 Intent の成功条件、repo 内代表例。 |
| 出力候補 | `repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate`、一般化説明。 |
| 状態候補 | 分類済み、確認待ち、後続候補。 |
| 事前条件候補 | U001 の前提確認結果を読める。 |
| 事後条件候補 | 前提不成立の戻り先または後続候補が説明されている。 |
| 不変条件候補 | 人間承認なしに GitHub Issue を作成しない。 |

## 検証観点

- 前提不成立の分類先が条件別に説明されている。
- repo 内 Issue 番号を前提にした説明が配布対象 skill に混入していない。
- 代表例は repo 内成果物で追跡できる。
- follow-up は候補に留まり、人間承認なしに GitHub Issue 化されていない。

## Bolt 分割方針

- B003 で前提不成立分類と repo 内代表例の説明境界を扱う。

## Construction への引き継ぎ

- Functional Design で、`repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` の条件を確定する。
- 実装では、配布対象 skill の説明を一般化し、repo 内 Issue 番号前提の説明を混ぜない。
- 検証では、eval またはレビュー観点で説明境界を確認する。
