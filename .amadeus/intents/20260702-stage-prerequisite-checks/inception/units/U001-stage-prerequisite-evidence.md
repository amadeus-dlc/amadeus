# U001 stage 前提証拠

## ユニット

phase skill 起動時の skill 供給元、実行環境、stage 前提を入力証拠として扱う Unit である。

## 対象要求

- R001
- R002
- R003

## 価値境界

この Unit は、phase skill 起動時に前提を確認するための証拠項目と配置先を扱う。

source skill、昇格先成果物、host environment、stage0、stage1、stage2、stage0 採用判断を分ける。

前提不成立後の分類や repo 内代表例の説明境界は U002 が扱う。

## 検証観点

- decision review の入力証拠に、skill 供給元と stage 前提が含まれている。
- Skill Contract に、stage 前提確認が入力証拠として表現されている。
- phase skill 起動時の説明が、stage0 採用判断を validator pass や CI pass と混同していない。

## 未確認事項

- stage 前提確認を decision review と Skill Contract のどちらに主として置くかは Construction で確定する。
- host environment の利用可否を確認する最小証拠は Construction で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-decision-review/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.agents/skills/amadeus-decision-review/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-decision-review/references/skill-contract.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `skills/amadeus-ideation/SKILL.md`, `skills/amadeus-inception/SKILL.md`, `skills/amadeus-construction/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |

## 関連成果物

- [design.md](U001-stage-prerequisite-evidence/design.md)
