# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 | 理由 |
|---|---|---|---|---|---|---|
| [tasks.md](bolts/B001-detection-script-and-eval/tasks.md) | B001/T001, B001/T002 | 実装済み | 検証済み | 未作成 | passed | 該当なし |
| [tasks.md](bolts/B002-skill-auto-rule-and-promotion/tasks.md) | B002/T001, B002/T002 | 実装済み | 検証済み | 未作成 | passed | B002/T002 の昇格同期は相互作用がない内部作業のため、ユースケースを参照しない。 |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001, B001/T002 | [test-results.md](bolts/B001-detection-script-and-eval/test-results.md) | passed |
| B002 | B002/T001, B002/T002 | [test-results.md](bolts/B002-skill-auto-rule-and-promotion/test-results.md) | passed |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| `skills/amadeus-construction/scripts/list-unfinalized-intents.ts` | B001/T002 | 実装済み | 検証済み | 未作成 | passed |
| `skills/amadeus-construction/evals/list-unfinalized-intents/check.ts`, `package.json` | B001/T001 | 実装済み | 検証済み | 未作成 | passed |
| `skills/amadeus-construction/SKILL.md`, `.agents/skills/amadeus-construction/**` | B002/T001, B002/T002 | 実装済み | 検証済み | 未作成 | passed |
