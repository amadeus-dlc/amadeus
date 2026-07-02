# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 | 理由 |
|---|---|---|---|---|---|---|
| [tasks.md](bolts/B001-listing-script-and-verification/tasks.md) | B001/T001, B001/T002, B001/T003 | `dev-scripts/evals/gate-queue-list/check.ts`, `package.json`, `skills/amadeus-validator/scripts/GateQueueList.ts` と昇格先 | [test-results.md](bolts/B001-listing-script-and-verification/test-results.md) | [PR #359](https://github.com/amadeus-dlc/amadeus/pull/359) | verified | B001/T003 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B002-skill-procedure-and-promotion/tasks.md) | B002/T001, B002/T002 | `skills/amadeus-validator/SKILL.md` と昇格先 | [test-results.md](bolts/B002-skill-procedure-and-promotion/test-results.md) | [PR #359](https://github.com/amadeus-dlc/amadeus/pull/359) | verified | B002/T002 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001, B001/T002, B001/T003 | [test-results.md](bolts/B001-listing-script-and-verification/test-results.md), [pr.md](bolts/B001-listing-script-and-verification/pr.md), [PR #359](https://github.com/amadeus-dlc/amadeus/pull/359) | verified |
| B002 | B002/T001, B002/T002 | [test-results.md](bolts/B002-skill-procedure-and-promotion/test-results.md), [pr.md](bolts/B002-skill-procedure-and-promotion/pr.md), [PR #359](https://github.com/amadeus-dlc/amadeus/pull/359) | verified |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| `skills/amadeus-validator/scripts/GateQueueList.ts` と昇格先 | B001/T002, B001/T003 | 実装済み | 検証済み | [PR #359](https://github.com/amadeus-dlc/amadeus/pull/359) | verified |
| `dev-scripts/evals/gate-queue-list/check.ts`, `package.json` | B001/T001 | 実装済み | 検証済み | [PR #359](https://github.com/amadeus-dlc/amadeus/pull/359) | verified |
| `skills/amadeus-validator/SKILL.md` と昇格先 | B002/T001, B002/T002 | 実装済み | 検証済み | [PR #359](https://github.com/amadeus-dlc/amadeus/pull/359) | verified |
