# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| [tasks.md](bolts/B001-provenance-generate-script-and-eval/tasks.md) | B001/T001, B001/T002 | dev-scripts/provenance-generate.ts、dev-scripts/evals/provenance-generate/check.ts、package.json | [test-results.md](bolts/B001-provenance-generate-script-and-eval/test-results.md) | [PR #354](https://github.com/amadeus-dlc/amadeus/pull/354) | verified |
| [tasks.md](bolts/B002-provenance-check-script-and-ci-integration/tasks.md) | B002/T001, B002/T002 | dev-scripts/provenance-check.ts、dev-scripts/evals/provenance-check/check.ts、package.json | [test-results.md](bolts/B002-provenance-check-script-and-ci-integration/test-results.md) | [PR #354](https://github.com/amadeus-dlc/amadeus/pull/354) | verified |
| [tasks.md](bolts/B003-record-method-and-boundary-documentation/tasks.md) | B003/T001, B003/T002 | .amadeus/steering/policies.md、.amadeus/development.md | [test-results.md](bolts/B003-record-method-and-boundary-documentation/test-results.md) | [PR #354](https://github.com/amadeus-dlc/amadeus/pull/354) | verified |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001 | [B001 test-results](bolts/B001-provenance-generate-script-and-eval/test-results.md)、[B001 pr.md](bolts/B001-provenance-generate-script-and-eval/pr.md) | verified |
| B001 | B001/T002 | [B001 test-results](bolts/B001-provenance-generate-script-and-eval/test-results.md)、[B001 pr.md](bolts/B001-provenance-generate-script-and-eval/pr.md) | verified |
| B002 | B002/T001 | [B002 test-results](bolts/B002-provenance-check-script-and-ci-integration/test-results.md)、[B002 pr.md](bolts/B002-provenance-check-script-and-ci-integration/pr.md) | verified |
| B002 | B002/T002 | [B002 test-results](bolts/B002-provenance-check-script-and-ci-integration/test-results.md)、[B002 pr.md](bolts/B002-provenance-check-script-and-ci-integration/pr.md) | verified |
| B003 | B003/T001 | [Inception D001](../inception/decisions/D001-inspection-boundary-adoption.md)、[B003 test-results](bolts/B003-record-method-and-boundary-documentation/test-results.md)、[B003 pr.md](bolts/B003-record-method-and-boundary-documentation/pr.md) | verified |
| B003 | B003/T002 | [B003 test-results](bolts/B003-record-method-and-boundary-documentation/test-results.md)、[B003 pr.md](bolts/B003-record-method-and-boundary-documentation/pr.md) | verified |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| Amadeus dev tooling | B001/T001, B001/T002 | dev-scripts/provenance-generate.ts、dev-scripts/evals/provenance-generate/check.ts | [B001 test-results](bolts/B001-provenance-generate-script-and-eval/test-results.md) | [PR #354](https://github.com/amadeus-dlc/amadeus/pull/354) | verified |
| Amadeus dev tooling | B002/T001, B002/T002 | dev-scripts/provenance-check.ts、dev-scripts/evals/provenance-check/check.ts、package.json、.github/workflows/ci.yaml | [B002 test-results](bolts/B002-provenance-check-script-and-ci-integration/test-results.md) | [PR #354](https://github.com/amadeus-dlc/amadeus/pull/354) | verified |
| Amadeus documentation | B003/T001, B003/T002 | .amadeus/steering/policies.md、.amadeus/development.md | [B003 test-results](bolts/B003-record-method-and-boundary-documentation/test-results.md) | [PR #354](https://github.com/amadeus-dlc/amadeus/pull/354) | verified |
