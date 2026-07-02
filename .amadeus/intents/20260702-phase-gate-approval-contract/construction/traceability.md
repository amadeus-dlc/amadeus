# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 | 理由 |
|---|---|---|---|---|---|---|
| [tasks.md](bolts/B001-implementation-gate-contract/tasks.md) | B001/T001, B001/T002, B001/T003 | `skills/amadeus-construction-implementation-execution/SKILL.md`, `skills/amadeus-construction-bolt-preparation/SKILL.md` と各昇格先 | [test-results.md](bolts/B001-implementation-gate-contract/test-results.md) | 未作成 | passed | B001/T003 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B002-trigger-and-scaffold-contract/tasks.md) | B002/T001, B002/T002, B002/T003, B002/T004 | `skills/amadeus-decision-review/SKILL.md`, `skills/amadeus-ideation/SKILL.md`, `skills/amadeus-inception/SKILL.md`, `skills/amadeus-construction/SKILL.md` と各昇格先 | [test-results.md](bolts/B002-trigger-and-scaffold-contract/test-results.md) | 未作成 | passed | B002/T004 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B003-approval-evidence-check/tasks.md) | B003/T001, B003/T002 | `dev-scripts/evals/amadeus-validator/check.ts` | [test-results.md](bolts/B003-approval-evidence-check/test-results.md) | 未作成 | passed | 該当なし。 |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001, B001/T002, B001/T003 | 未登録 | 未確認 |
| B002 | B002/T001, B002/T002, B002/T003, B002/T004 | 未登録 | 未確認 |
| B003 | B003/T001, B003/T002 | 未登録 | 未確認 |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| `skills/amadeus-construction-implementation-execution/SKILL.md` と昇格先 | B001/T001, B001/T003 | 未実施 | 未実施 | 未作成 | ready_for_approval |
| `skills/amadeus-construction-bolt-preparation/SKILL.md` と昇格先 | B001/T002, B001/T003 | 未実施 | 未実施 | 未作成 | ready_for_approval |
| `skills/amadeus-decision-review/SKILL.md` と昇格先 | B002/T001, B002/T004 | 未実施 | 未実施 | 未作成 | ready_for_approval |
| `skills/amadeus-ideation/SKILL.md`, `skills/amadeus-inception/SKILL.md`, `skills/amadeus-construction/SKILL.md` と各昇格先 | B002/T002, B002/T003, B002/T004 | 未実施 | 未実施 | 未作成 | ready_for_approval |
| `skills/amadeus-validator/validator/AmadeusValidator.ts` と昇格先 | B003/T002 | 未実施 | 未実施 | 未作成 | ready_for_approval |
| `dev-scripts/evals/amadeus-validator/check.ts` | B003/T001 | 未実施 | 未実施 | 未作成 | ready_for_approval |
