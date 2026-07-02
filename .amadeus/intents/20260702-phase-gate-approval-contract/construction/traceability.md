# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 | 理由 |
|---|---|---|---|---|---|---|
| [tasks.md](bolts/B001-implementation-gate-contract/tasks.md) | B001/T001, B001/T002, B001/T003 | `skills/amadeus-construction-implementation-execution/SKILL.md`, `skills/amadeus-construction-bolt-preparation/SKILL.md` と各昇格先 | [test-results.md](bolts/B001-implementation-gate-contract/test-results.md) | [PR #322](https://github.com/amadeus-dlc/amadeus/pull/322) | verified | B001/T003 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B002-trigger-and-scaffold-contract/tasks.md) | B002/T001, B002/T002, B002/T003, B002/T004 | `skills/amadeus-decision-review/SKILL.md`, `skills/amadeus-ideation/SKILL.md`, `skills/amadeus-inception/SKILL.md`, `skills/amadeus-construction/SKILL.md` と各昇格先 | [test-results.md](bolts/B002-trigger-and-scaffold-contract/test-results.md) | [PR #322](https://github.com/amadeus-dlc/amadeus/pull/322) | verified | B002/T004 は promote 同期の内部作業であり、アクターとの相互作用がないためユースケースを参照しない。 |
| [tasks.md](bolts/B003-approval-evidence-check/tasks.md) | B003/T001, B003/T002 | `dev-scripts/evals/amadeus-validator/check.ts` | [test-results.md](bolts/B003-approval-evidence-check/test-results.md) | [PR #322](https://github.com/amadeus-dlc/amadeus/pull/322) | verified | 該当なし。 |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001, B001/T002, B001/T003 | [test-results.md](bolts/B001-implementation-gate-contract/test-results.md), [PR #322](https://github.com/amadeus-dlc/amadeus/pull/322) | verified |
| B002 | B002/T001, B002/T002, B002/T003, B002/T004 | [test-results.md](bolts/B002-trigger-and-scaffold-contract/test-results.md), [PR #322](https://github.com/amadeus-dlc/amadeus/pull/322) | verified |
| B003 | B003/T001, B003/T002 | [test-results.md](bolts/B003-approval-evidence-check/test-results.md), [PR #322](https://github.com/amadeus-dlc/amadeus/pull/322) | verified |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| `skills/amadeus-construction-implementation-execution/SKILL.md` と昇格先 | B001/T001, B001/T003 | 前提を `passed`（人間承認済み）だけに変更し、`ready_for_approval` の停止と報告を追加 | [B001 test-results](bolts/B001-implementation-gate-contract/test-results.md) | [PR #322](https://github.com/amadeus-dlc/amadeus/pull/322) | verified |
| `skills/amadeus-construction-bolt-preparation/SKILL.md` と昇格先 | B001/T002, B001/T003 | 目的と手順に停止、承認待ち、承認後の `passed` 化と approval evidence 追加を明記 | [B001 test-results](bolts/B001-implementation-gate-contract/test-results.md) | [PR #322](https://github.com/amadeus-dlc/amadeus/pull/322) | verified |
| `skills/amadeus-decision-review/SKILL.md` と昇格先 | B002/T001, B002/T004 | 「決定論的 grilling トリガー」節に判定規則、調査による解消の例外、記録規約を定義 | [B002 test-results](bolts/B002-trigger-and-scaffold-contract/test-results.md) | [PR #322](https://github.com/amadeus-dlc/amadeus/pull/322) | verified |
| `skills/amadeus-ideation/SKILL.md`, `skills/amadeus-inception/SKILL.md`, `skills/amadeus-construction/SKILL.md` と各昇格先 | B002/T002, B002/T003, B002/T004 | Decision Review 節へ規則参照を追加し、ideation の scaffold-only 条件を確定判断の記録 3 種の実在に限定 | [B002 test-results](bolts/B002-trigger-and-scaffold-contract/test-results.md) | [PR #322](https://github.com/amadeus-dlc/amadeus/pull/322) | verified |
| `dev-scripts/evals/amadeus-validator/check.ts` | B003/T001 | approval evidence の回帰 eval 3 ケースと `runExpectSuccessExcludes` helper を追加 | [B003 test-results](bolts/B003-approval-evidence-check/test-results.md) | [PR #322](https://github.com/amadeus-dlc/amadeus/pull/322) | verified |
