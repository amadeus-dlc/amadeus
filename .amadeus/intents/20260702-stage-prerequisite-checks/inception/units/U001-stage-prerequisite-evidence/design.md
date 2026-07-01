# Unit Design Brief

## 概要

この文書は、U001 の Unit Design Brief である。

Inception では、phase skill 起動時に stage 前提を確認する課題解決方針、Bolt 分割、Construction へ渡す設計入力だけを扱う。

## 設計戦略

stage 前提確認は、decision review の判断材料として読まれる入口と、Skill Contract の入力証拠として読まれる契約境界の両方に接続する。

phase skill は、起動時に source skill、昇格先成果物、host environment、stage0、stage1、stage2、stage0 採用判断を確認する順序を参照できるようにする。

## 責務境界

| 区分 | 内容 |
|---|---|
| 所有するもの | stage 前提確認の入力証拠、確認順序、decision review と Skill Contract への接続。 |
| 所有しないもの | 前提不成立時の分類詳細、repo 内代表例と配布対象 skill の説明分離、実行時の自動検出。 |
| 依存してよいもの | `.amadeus/steering/policies.md`、`.amadeus/glossary.md`、Skill Contract、phase skill の起動時 decision review。 |
| 再確認条件 | stage0 採用判断の証拠項目が変わる場合、または host environment の扱いが変わる場合。 |

## 構成候補

- Stage prerequisite evidence。
- Skill supply evidence。
- Host availability evidence。
- Decision review prerequisite node。
- Skill Contract prerequisite input。

## データと契約候補

| 種別 | 候補 |
|---|---|
| 入力候補 | source skill path、昇格先成果物 path、host environment の利用可否、stage 判定、stage0 採用判断。 |
| 出力候補 | 前提確認結果、decision review の判断材料、Skill Contract の入力証拠。 |
| 状態候補 | 確認済み、未確認、前提不成立。 |
| 事前条件候補 | 対象 phase skill と対象 Intent を特定できる。 |
| 事後条件候補 | stage 前提確認結果を後続分類または通常処理へ渡せる。 |
| 不変条件候補 | stage2 は stage0 採用判断なしに次回 stage0 として扱わない。 |

## 検証観点

- `amadeus-decision-review` の文書に stage 前提確認が含まれている。
- Skill Contract に stage 前提の入力証拠が含まれている。
- phase skill 文書が decision review 経由で stage 前提確認を参照している。
- source skill と昇格先成果物の差分、host environment の利用可否、stage0 採用判断が混同されていない。

## Bolt 分割方針

- B001 で decision review の stage 前提証拠を扱う。
- B002 で Skill Contract と phase skill への接続を扱う。

## Construction への引き継ぎ

- Functional Design で、stage 前提確認の判断順序と Skill Contract 上の入力証拠を確定する。
- 実装では、source skill と昇格先成果物を同期し、昇格手順を検証する。
- 検証では、stage0 採用判断が validator pass や CI pass と混同されていないことを確認する。
