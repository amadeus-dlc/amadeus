# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| [tasks.md](bolts/B001-discovery-dry-run-mode-contract/tasks.md) | B001/T001, B001/T002 | `skills/amadeus-discovery/SKILL.md` | [test-results.md](bolts/B001-discovery-dry-run-mode-contract/test-results.md) | 未作成 | verified |
| [tasks.md](bolts/B002-dry-run-sync-verification/tasks.md) | B002/T001, B002/T002 | `dev-scripts/evals/amadeus-templates/check.ts`, `.agents/skills/amadeus-discovery/SKILL.md` | [test-results.md](bolts/B002-dry-run-sync-verification/test-results.md) | 未作成 | verified |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001, B001/T002 | [test-results.md](bolts/B001-discovery-dry-run-mode-contract/test-results.md) | 検証済み |
| B002 | B002/T001, B002/T002 | [test-results.md](bolts/B002-dry-run-sync-verification/test-results.md) | 検証済み |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| `skills/amadeus-discovery/SKILL.md` | B001/T001, B001/T002 | 実装済み | [test-results.md](bolts/B001-discovery-dry-run-mode-contract/test-results.md) | 未作成 | verified |
| `dev-scripts/evals/amadeus-templates/check.ts` | B002/T001 | 実装済み | [test-results.md](bolts/B002-dry-run-sync-verification/test-results.md) | 未作成 | verified |
| `.agents/skills/amadeus-discovery/SKILL.md` | B002/T002 | 実装済み | [test-results.md](bolts/B002-dry-run-sync-verification/test-results.md) | 未作成 | verified |
