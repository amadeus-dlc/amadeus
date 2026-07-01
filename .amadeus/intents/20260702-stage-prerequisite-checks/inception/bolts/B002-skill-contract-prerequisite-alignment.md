# B002 Skill Contract stage 前提整合

## 概要

Skill Contract と phase skill 起動時説明を、B001 の stage 前提確認と整合させる。

## 対象ユニット

- U001

## 設計

- [U001 design](../units/U001-stage-prerequisite-evidence/design.md)

## 完了条件

- `amadeus-decision-review` の Skill Contract に、stage 前提確認の入力証拠が含まれる。
- Ideation、Inception、Construction の phase skill が、起動時に stage 前提確認を参照できる。
- Skill Contract 生成物または確認入口が、追加した契約と矛盾しない。
- source skill と昇格先成果物の反映は、定められた昇格手段で扱われる。

## 依存

- B001

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-decision-review/references/skill-contract.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.agents/skills/amadeus-decision-review/references/skill-contract.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-ideation/SKILL.md`, `skills/amadeus-inception/SKILL.md`, `skills/amadeus-construction/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `.agents/skills/amadeus-ideation/SKILL.md`, `.agents/skills/amadeus-inception/SKILL.md`, `.agents/skills/amadeus-construction/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |

## 未確認事項

- Skill Contract 生成物の更新対象は Functional Design で確定する。
