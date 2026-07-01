# Unit Design Brief: 内部 skill ポリシー整合

## 概要

この文書は Unit Design Brief である。

Inception では、内部 skill の分類、README 一覧、暗黙起動ポリシー設定対象、後続候補分離を Construction へ渡すための設計入力として整理する。

## 設計戦略

内部 skill の分類を最初に固定し、その分類を README 一覧と暗黙起動ポリシー設定の共通入力にする。

次に、Codex と Claude Code の設定配置確認を行い、設定できる対象と未確認対象を分ける。

最後に、Issue #284 のうち `skill-forge` 監査と `SKILL.md` 英語化を後続候補として残し、今回の PR に混ぜない。

## 責務境界

| 種別 | 内容 |
|---|---|
| 所有するもの | Internal Skills 一覧、内部 skill 判定、暗黙起動ポリシー設定対象、設定配置確認、後続候補分離。 |
| 所有しないもの | `skill-forge` 内容監査、`SKILL.md` 英語化、skill 本文の大規模責務変更、新規内部 skill 追加。 |
| 依存してよいもの | Issue #284、README、source skill、昇格先成果物、`skill-forge` の Codex metadata 参照文書、Domain Map の BC001。 |
| 再確認条件 | Claude Code 側の同等設定が見つからない場合、または `agents/openai.yaml` の生成元が決められない場合。 |

## 構成候補

| 候補 | 役割 |
|---|---|
| 内部 skill 棚卸し | `amadeus-*` skill の構成と README 一覧の差分を整理する。 |
| 分類判断 | Phase Skills、Cross-Cutting Support Skills、Internal Skills の境界を整理する。 |
| ポリシー設定確認 | Codex と Claude Code の暗黙起動抑制設定の配置先を確認する。 |
| 後続候補分離 | `skill-forge` 監査と英語化を今回の対象外として追跡する。 |

## データと契約候補

| 種別 | 候補 |
|---|---|
| 入力候補 | Issue #284、README、`skills/amadeus-*`、`.agents/skills/amadeus-*`、`skill-forge` 参照文書。 |
| 出力候補 | README の Internal Skills 更新、暗黙起動ポリシー設定、対象外判断、検証結果。 |
| 状態候補 | 内部 skill 判定済み、Codex 設定確認済み、Claude Code 設定確認済み、後続候補分離済み。 |
| 事前条件候補 | Ideation gate が passed であり、BC001 を参照できる。 |
| 事後条件候補 | README 一覧と暗黙起動ポリシー設定対象が同じ分類判断に基づいている。 |
| 不変条件候補 | `skill-forge` 監査と `SKILL.md` 英語化をこの Unit の Construction slice に混ぜない。 |

## 検証観点

- validator が対象 Intent で pass する。
- `git diff --check` が pass する。
- README の Internal Skills 一覧が英語版と日本語版で対応している。
- Codex 向け metadata の構造確認が実行できる。
- Claude Code 側の同等設定の確認結果が記録されている。

## Bolt 分割方針

| Bolt | 方針 |
|---|---|
| B001 | README と内部 skill 分類を整合させる。 |
| B002 | 暗黙起動ポリシー設定と配置確認を扱う。 |
| B003 | 後続候補分離と検証証拠を扱う。 |

## Construction への引き継ぎ

- Claude Code 側の同等設定の有無を確認する。
- `agents/openai.yaml` を生成または追加する場合は、source hash と昇格手順を確認する。
- `skill-forge` 監査と `SKILL.md` 英語化は後続候補として扱う。
- README、設定、検証結果を PR 説明または Construction 成果物に記録する。
