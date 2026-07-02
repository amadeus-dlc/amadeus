# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 | 理由 |
|---|---|---|---|---|---|---|
| [tasks.md](bolts/B001-listing-script-and-verification/tasks.md) | B001/T001, B001/T002, B001/T003 | `dev-scripts/evals/gate-queue-list/check.ts`, `package.json`, `skills/amadeus-validator/scripts/GateQueueList.ts` と昇格先 | [test-results.md](bolts/B001-listing-script-and-verification/test-results.md) | 未作成 | passed | B001/T003 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B002-skill-procedure-and-promotion/tasks.md) | B002/T001, B002/T002 | `skills/amadeus-validator/SKILL.md` と昇格先 | 未実施 | 未作成 | ready_for_approval | B002/T002 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
