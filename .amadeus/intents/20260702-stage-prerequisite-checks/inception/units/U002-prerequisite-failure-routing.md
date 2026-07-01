# U002 前提不成立分類

## ユニット

前提不成立の分類と、repo 内代表例と配布対象 skill の説明境界を扱う Unit である。

## 対象要求

- R004
- R005

## 価値境界

この Unit は、U001 の stage 前提確認結果を受け取り、`repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` へ分類する。

また、Issue #277 と Issue #272 の関係を repo 内代表例として扱いながら、配布対象 skill では Issue 番号に依存しない説明へ分ける。

stage 前提確認の入力証拠そのものは U001 が扱う。

## 検証観点

- 前提不成立の分類先が条件付きで説明されている。
- repo 内代表例と配布対象 skill の一般説明が分けられている。
- GitHub Issue は、人間承認なしに自動作成しない方針と矛盾していない。

## 未確認事項

- repo 内 Issue 番号前提の混入を eval で検出するか、人間レビューに留めるかは Construction で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-decision-review/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `.agents/skills/amadeus-decision-review/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `dev-scripts/evals/amadeus-templates/check.ts` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `skills/amadeus-ideation/SKILL.md`, `skills/amadeus-inception/SKILL.md`, `skills/amadeus-construction/SKILL.md` | `codex/issue-278-stage-prerequisites` | なし | 未確認 |

## 関連成果物

- [design.md](U002-prerequisite-failure-routing/design.md)
