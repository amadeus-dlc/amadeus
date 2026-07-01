# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| [tasks.md](bolts/B001-decision-review-stage-prerequisite-evidence/tasks.md) | B001/T001, B001/T002 | `skills/amadeus-decision-review/SKILL.md`, `.agents/skills/amadeus-decision-review/SKILL.md` | [test-results.md](bolts/B001-decision-review-stage-prerequisite-evidence/test-results.md) | [PR #280](bolts/B001-decision-review-stage-prerequisite-evidence/pr.md) | verified |
| [tasks.md](bolts/B002-skill-contract-prerequisite-alignment/tasks.md) | B002/T001, B002/T002, B002/T003 | `amadeus-contracts/catalog/skills.ts`, `skills/amadeus-decision-review/references/skill-contract.md`, `.agents/skills/amadeus-decision-review/references/skill-contract.md`, `skills/amadeus-ideation/SKILL.md`, `skills/amadeus-inception/SKILL.md`, `skills/amadeus-construction/SKILL.md`, `.agents/skills/amadeus-ideation/SKILL.md`, `.agents/skills/amadeus-inception/SKILL.md`, `.agents/skills/amadeus-construction/SKILL.md` | [test-results.md](bolts/B002-skill-contract-prerequisite-alignment/test-results.md) | [PR #280](bolts/B002-skill-contract-prerequisite-alignment/pr.md) | verified |
| [tasks.md](bolts/B003-failure-routing-and-example-boundary/tasks.md) | B003/T001, B003/T002, B003/T003 | `dev-scripts/evals/amadeus-templates/check.ts`, `skills/amadeus-decision-review/SKILL.md`, `.agents/skills/amadeus-decision-review/SKILL.md` | [test-results.md](bolts/B003-failure-routing-and-example-boundary/test-results.md) | [PR #280](bolts/B003-failure-routing-and-example-boundary/pr.md) | verified |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001, B001/T002 | [test-results.md](bolts/B001-decision-review-stage-prerequisite-evidence/test-results.md), [PR #280](bolts/B001-decision-review-stage-prerequisite-evidence/pr.md) | verified |
| B002 | B002/T001, B002/T002, B002/T003 | [test-results.md](bolts/B002-skill-contract-prerequisite-alignment/test-results.md), [PR #280](bolts/B002-skill-contract-prerequisite-alignment/pr.md) | verified |
| B003 | B003/T001, B003/T002, B003/T003 | [test-results.md](bolts/B003-failure-routing-and-example-boundary/test-results.md), [PR #280](bolts/B003-failure-routing-and-example-boundary/pr.md) | verified |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| `skills/amadeus-decision-review/SKILL.md` | B001/T001, B001/T002, B003/T002 | stage 前提確認、判断ノード、outcome、配布対象 skill の一般説明を追加 | [B001 test-results](bolts/B001-decision-review-stage-prerequisite-evidence/test-results.md), [B003 test-results](bolts/B003-failure-routing-and-example-boundary/test-results.md) | [PR #280](bolts/B001-decision-review-stage-prerequisite-evidence/pr.md), [PR #280](bolts/B003-failure-routing-and-example-boundary/pr.md) | verified |
| `.agents/skills/amadeus-decision-review/SKILL.md` | B001/T001, B001/T002, B003/T002 | source skill と同じ契約へ同期 | [B001 test-results](bolts/B001-decision-review-stage-prerequisite-evidence/test-results.md), [B003 test-results](bolts/B003-failure-routing-and-example-boundary/test-results.md) | [PR #280](bolts/B001-decision-review-stage-prerequisite-evidence/pr.md), [PR #280](bolts/B003-failure-routing-and-example-boundary/pr.md) | verified |
| `amadeus-contracts/catalog/skills.ts` | B002/T001 | Skill Contract に stage 前提確認と `upstream_feedback_required` を追加 | [B002 test-results](bolts/B002-skill-contract-prerequisite-alignment/test-results.md) | [PR #280](bolts/B002-skill-contract-prerequisite-alignment/pr.md) | verified |
| `skills/amadeus-decision-review/references/skill-contract.md` | B002/T002 | 生成された Skill Contract を更新 | [B002 test-results](bolts/B002-skill-contract-prerequisite-alignment/test-results.md) | [PR #280](bolts/B002-skill-contract-prerequisite-alignment/pr.md) | verified |
| `.agents/skills/amadeus-decision-review/references/skill-contract.md` | B002/T002 | 生成された Skill Contract を更新 | [B002 test-results](bolts/B002-skill-contract-prerequisite-alignment/test-results.md) | [PR #280](bolts/B002-skill-contract-prerequisite-alignment/pr.md) | verified |
| `skills/amadeus-ideation/SKILL.md` | B002/T003 | phase skill 起動時の stage 前提確認を追加 | [B002 test-results](bolts/B002-skill-contract-prerequisite-alignment/test-results.md) | [PR #280](bolts/B002-skill-contract-prerequisite-alignment/pr.md) | verified |
| `skills/amadeus-inception/SKILL.md` | B002/T003 | phase skill 起動時の stage 前提確認を追加 | [B002 test-results](bolts/B002-skill-contract-prerequisite-alignment/test-results.md) | [PR #280](bolts/B002-skill-contract-prerequisite-alignment/pr.md) | verified |
| `skills/amadeus-construction/SKILL.md` | B002/T003 | phase skill 起動時の stage 前提確認を追加 | [B002 test-results](bolts/B002-skill-contract-prerequisite-alignment/test-results.md) | [PR #280](bolts/B002-skill-contract-prerequisite-alignment/pr.md) | verified |
| `.agents/skills/amadeus-ideation/SKILL.md` | B002/T003 | source skill と同じ契約へ同期 | [B002 test-results](bolts/B002-skill-contract-prerequisite-alignment/test-results.md) | [PR #280](bolts/B002-skill-contract-prerequisite-alignment/pr.md) | verified |
| `.agents/skills/amadeus-inception/SKILL.md` | B002/T003 | source skill と同じ契約へ同期 | [B002 test-results](bolts/B002-skill-contract-prerequisite-alignment/test-results.md) | [PR #280](bolts/B002-skill-contract-prerequisite-alignment/pr.md) | verified |
| `.agents/skills/amadeus-construction/SKILL.md` | B002/T003 | source skill と同じ契約へ同期 | [B002 test-results](bolts/B002-skill-contract-prerequisite-alignment/test-results.md) | [PR #280](bolts/B002-skill-contract-prerequisite-alignment/pr.md) | verified |
| `dev-scripts/evals/amadeus-templates/check.ts` | B003/T001, B003/T002, B003/T003 | stage 前提確認と repo 内 Issue 番号非混入の text contract を追加 | [B003 test-results](bolts/B003-failure-routing-and-example-boundary/test-results.md) | [PR #280](bolts/B003-failure-routing-and-example-boundary/pr.md) | verified |
