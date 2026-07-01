# B001 decision review stage 前提証拠

## 概要

`amadeus-decision-review` に、skill 供給元と実行環境の stage 前提を入力証拠として確認する判断ノードを追加する。

## 対象ユニット

- U001

## 設計

- [U001 design](../units/U001-stage-prerequisite-evidence/design.md)

## 完了条件

- decision review の入力証拠に、source skill、昇格先成果物、host environment の利用可否が含まれる。
- decision review の判断ノードに、stage0、stage1、stage2、stage0 採用判断の確認が含まれる。
- stage2 を stage0 として扱うには stage0 採用判断が必要であることが説明されている。
- validator pass や CI pass を stage0 採用判断そのものとして扱わないことが説明されている。

## 依存

なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-decision-review/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.agents/skills/amadeus-decision-review/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |

## 未確認事項

- 判断ノードの識別子を新規追加するか、既存ノードを拡張するかは Functional Design で確定する。
