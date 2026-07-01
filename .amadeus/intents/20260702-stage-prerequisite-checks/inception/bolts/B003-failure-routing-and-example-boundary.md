# B003 前提不成立分類と代表例境界

## 概要

前提不成立時の分類条件と、repo 内代表例と配布対象 skill の説明境界を確定する。

## 対象ユニット

- U002

## 設計

- [U002 design](../units/U002-prerequisite-failure-routing/design.md)

## 完了条件

- `repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` の分類条件が stage 前提確認の文脈で説明されている。
- Issue #277 と Issue #272 の関係が、repo 内成果物では代表例として説明されている。
- 配布対象 skill では、repo 内 Issue 番号を前提にしない一般説明へ置き換えられている。
- eval、text contract、またはレビュー観点で、説明境界を確認できる。

## 依存

- B001
- B002

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-decision-review/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.agents/skills/amadeus-decision-review/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `dev-scripts/evals/amadeus-templates/check.ts` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |

## 未確認事項

- repo 内 Issue 番号前提の混入を自動検出する範囲は Functional Design で確定する。
