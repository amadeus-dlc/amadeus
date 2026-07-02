# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 | 理由 |
|---|---|---|---|---|---|---|
| [tasks.md](bolts/B001-regeneration-script-and-verification/tasks.md) | B001/T001, B001/T002, B001/T003 | `dev-scripts/evals/index-generate/check.ts`, `package.json`, `skills/amadeus-validator/scripts/IndexGenerate.ts` と昇格先 | [test-results.md](bolts/B001-regeneration-script-and-verification/test-results.md) | [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified | B001/T003 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B002-validator-consistency-checks/tasks.md) | B002/T001, B002/T002, B002/T003 | `skills/amadeus-validator/validator/AmadeusValidator.ts` と昇格先, `dev-scripts/evals/index-generate/check.ts` | [test-results.md](bolts/B002-validator-consistency-checks/test-results.md) | [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified | B002/T003 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B003-skill-procedures-and-templates/tasks.md) | B003/T001, B003/T002, B003/T003, B003/T004 | `skills/amadeus-ideation-intent-capture/`, `skills/amadeus-discovery/SKILL.md`, `skills/amadeus-steering/templates/steering/` と各昇格先 | [test-results.md](bolts/B003-skill-procedures-and-templates/test-results.md) | [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified | B003/T004 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B004-workspace-and-examples-migration/tasks.md) | B004/T001, B004/T002, B004/T003, B004/T004 | `.amadeus/intents/*.md`, `.amadeus/intents.md`, `.amadeus/discoveries.md`, `dev-scripts/evals/*/fixture`, `examples/*/.amadeus/`, `examples/skill-provenance.json` | [test-results.md](bolts/B004-workspace-and-examples-migration/test-results.md) | [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified | B004/T002 と B004/T003 は fixture と examples の適合作業であり、アクターとの相互作用がないためユースケースを参照しない。 |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001, B001/T002, B001/T003 | [test-results.md](bolts/B001-regeneration-script-and-verification/test-results.md), [pr.md](bolts/B001-regeneration-script-and-verification/pr.md), [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified |
| B002 | B002/T001, B002/T002, B002/T003 | [test-results.md](bolts/B002-validator-consistency-checks/test-results.md), [pr.md](bolts/B002-validator-consistency-checks/pr.md), [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified |
| B003 | B003/T001, B003/T002, B003/T003, B003/T004 | [test-results.md](bolts/B003-skill-procedures-and-templates/test-results.md), [pr.md](bolts/B003-skill-procedures-and-templates/pr.md), [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified |
| B004 | B004/T001, B004/T002, B004/T003, B004/T004 | [test-results.md](bolts/B004-workspace-and-examples-migration/test-results.md), [pr.md](bolts/B004-workspace-and-examples-migration/pr.md), [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| `skills/amadeus-validator/scripts/IndexGenerate.ts` と昇格先 | B001/T002, B001/T003 | 実装済み | 検証済み | [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified |
| `dev-scripts/evals/index-generate/check.ts`, `package.json` | B001/T001 | 実装済み | 検証済み | [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified |
| `skills/amadeus-validator/validator/AmadeusValidator.ts` と昇格先 | B002/T002, B002/T003 | 実装済み | 検証済み | [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified |
| intent-capture、discovery、steering の SKILL.md、テンプレートと各昇格先 | B003/T001, B003/T002, B003/T003, B003/T004 | 実装済み | 検証済み | [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified |
| `.amadeus/` の 22 モジュールと index、eval fixture、examples 4 snapshot | B004/T001, B004/T002, B004/T003 | 実装済み | 検証済み | [PR #348](https://github.com/amadeus-dlc/amadeus/pull/348) | verified |
