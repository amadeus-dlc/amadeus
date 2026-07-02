# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 | 理由 |
|---|---|---|---|---|---|---|
| [tasks.md](bolts/B001-scaffold-script-and-eval/tasks.md) | B001/T001, B001/T002, B001/T003 | `skills/amadeus-validator/scripts/StateScaffold.ts` と昇格先, `dev-scripts/evals/state-scaffold/check.ts`, `package.json` | [test-results.md](bolts/B001-scaffold-script-and-eval/test-results.md) | 未作成 | passed | B001/T003 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B002-procedure-reference-and-promotion/tasks.md) | B002/T001, B002/T002, B002/T003 | 6 つの SKILL.md と各昇格先 | [test-results.md](bolts/B002-procedure-reference-and-promotion/test-results.md) | 未作成 | passed | B002/T003 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001, B001/T002, B001/T003 | 未登録 | 未確認 |
| B002 | B002/T001, B002/T002, B002/T003 | 未登録 | 未確認 |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| `skills/amadeus-validator/scripts/StateScaffold.ts` と昇格先 | B001/T002, B001/T003 | 実装済み | 検証済み | 未作成 | passed |
| `dev-scripts/evals/state-scaffold/check.ts`, `package.json` | B001/T001 | 実装済み | 検証済み | 未作成 | passed |
| state 更新手順を持つ 5 つの phase skill の SKILL.md と各昇格先 | B002/T001, B002/T003 | 実装済み | 検証済み | 未作成 | passed |
| `skills/amadeus-validator/SKILL.md` と昇格先 | B002/T002, B002/T003 | 実装済み | 検証済み | 未作成 | passed |
