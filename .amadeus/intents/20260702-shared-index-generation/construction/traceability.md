# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 | 理由 |
|---|---|---|---|---|---|---|
| [tasks.md](bolts/B001-regeneration-script-and-verification/tasks.md) | B001/T001, B001/T002, B001/T003 | `dev-scripts/evals/index-generate/check.ts`, `package.json`, `skills/amadeus-validator/scripts/IndexGenerate.ts` と昇格先 | [test-results.md](bolts/B001-regeneration-script-and-verification/test-results.md) | 未登録 | passed | B001/T003 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B002-validator-consistency-checks/tasks.md) | B002/T001, B002/T002, B002/T003 | `skills/amadeus-validator/validator/AmadeusValidator.ts` と昇格先, `dev-scripts/evals/index-generate/check.ts` | [test-results.md](bolts/B002-validator-consistency-checks/test-results.md) | 未登録 | passed | B002/T003 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B003-skill-procedures-and-templates/tasks.md) | B003/T001, B003/T002, B003/T003, B003/T004 | `skills/amadeus-ideation-intent-capture/`, `skills/amadeus-discovery/SKILL.md`, `skills/amadeus-steering/templates/steering/` と各昇格先 | [test-results.md](bolts/B003-skill-procedures-and-templates/test-results.md) | 未登録 | passed | B003/T004 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B004-workspace-and-examples-migration/tasks.md) | B004/T001, B004/T002, B004/T003, B004/T004 | `.amadeus/intents/*.md`, `.amadeus/intents.md`, `.amadeus/discoveries.md`, `dev-scripts/evals/*/fixture`, `examples/*/.amadeus/`, `examples/skill-provenance.json` | [test-results.md](bolts/B004-workspace-and-examples-migration/test-results.md) | 未登録 | passed | B004/T002 と B004/T003 は fixture と examples の適合作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
