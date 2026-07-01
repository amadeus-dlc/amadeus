# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| [tasks.md](bolts/B001-finalization-skill-guidance/tasks.md) | B001/T001, B001/T002 | `skills/amadeus-construction/SKILL.md`, `.agents/skills/amadeus-construction/SKILL.md`, `skills/amadeus-construction-traceability-finalization/SKILL.md`, `.agents/skills/amadeus-construction-traceability-finalization/SKILL.md` | [test-results.md](bolts/B001-finalization-skill-guidance/test-results.md) | [PR #249](bolts/B001-finalization-skill-guidance/pr.md) | verified |
| [tasks.md](bolts/B002-template-and-example-alignment/tasks.md) | B002/T001, B002/T002, B002/T003 | `skills/amadeus-construction/templates/intents/construction/traceability.md`, `.agents/skills/amadeus-construction/templates/intents/construction/traceability.md`, `dev-scripts/evals/amadeus-templates/check.ts`, `dev-scripts/evals/llm-templates/check.ts` | [test-results.md](bolts/B002-template-and-example-alignment/test-results.md) | [PR #249](bolts/B002-template-and-example-alignment/pr.md) | verified |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001, B001/T002 | [test-results.md](bolts/B001-finalization-skill-guidance/test-results.md), [PR #249](bolts/B001-finalization-skill-guidance/pr.md) | verified |
| B002 | B002/T001, B002/T002, B002/T003 | [test-results.md](bolts/B002-template-and-example-alignment/test-results.md), [PR #249](bolts/B002-template-and-example-alignment/pr.md) | verified |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| `skills/amadeus-construction/SKILL.md` | B001/T001 | 完了済み Construction の追跡表要件を追加 | [B001 test-results](bolts/B001-finalization-skill-guidance/test-results.md) | [PR #249](bolts/B001-finalization-skill-guidance/pr.md) | verified |
| `.agents/skills/amadeus-construction/SKILL.md` | B001/T001 | 完了済み Construction の追跡表要件を追加 | [B001 test-results](bolts/B001-finalization-skill-guidance/test-results.md) | [PR #249](bolts/B001-finalization-skill-guidance/pr.md) | verified |
| `skills/amadeus-construction-traceability-finalization/SKILL.md` | B001/T002 | traceability finalization 手順へ完了時表の作成または補修を追加 | [B001 test-results](bolts/B001-finalization-skill-guidance/test-results.md) | [PR #249](bolts/B001-finalization-skill-guidance/pr.md) | verified |
| `.agents/skills/amadeus-construction-traceability-finalization/SKILL.md` | B001/T002 | traceability finalization 手順へ完了時表の作成または補修を追加 | [B001 test-results](bolts/B001-finalization-skill-guidance/test-results.md) | [PR #249](bolts/B001-finalization-skill-guidance/pr.md) | verified |
| `skills/amadeus-construction/templates/intents/construction/traceability.md` | B002/T001 | `Construction からの追跡` 表を追加 | [B002 test-results](bolts/B002-template-and-example-alignment/test-results.md) | [PR #249](bolts/B002-template-and-example-alignment/pr.md) | verified |
| `.agents/skills/amadeus-construction/templates/intents/construction/traceability.md` | B002/T001 | `Construction からの追跡` 表を追加 | [B002 test-results](bolts/B002-template-and-example-alignment/test-results.md) | [PR #249](bolts/B002-template-and-example-alignment/pr.md) | verified |
| `dev-scripts/evals/amadeus-templates/check.ts` | B002/T002 | template eval の期待見出しを更新 | [B002 test-results](bolts/B002-template-and-example-alignment/test-results.md) | [PR #249](bolts/B002-template-and-example-alignment/pr.md) | verified |
| `dev-scripts/evals/llm-templates/check.ts` | B002/T002 | template に完了時表がある場合の finalization mock を更新 | [B002 test-results](bolts/B002-template-and-example-alignment/test-results.md) | [PR #249](bolts/B002-template-and-example-alignment/pr.md) | verified |
| `examples/**/construction/traceability.md` | B002/T003 | 完了済み example は既に完了時表を持つため更新不要 | construction/decisions.md | [PR #249](bolts/B002-template-and-example-alignment/pr.md) | verified |
