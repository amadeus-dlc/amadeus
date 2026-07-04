# Quality Gates

## 入力成果物

この `quality-gates` は、各 Unit の `code-summary`、`build-and-test-summary`、`build-test-results` を入力として作成した。

## Required Gates

| Gate | Command | Required Result | Current Result |
|---|---|---|---|
| Type check | `npm run typecheck` | exit 0 | pass |
| Lint | `npm run lint:check` | exit 0 | pass |
| Amadeus contracts | `npm run contracts:check` | exit 0 | pass |
| Parity | `npm run parity:check` | exit 0 | fail |
| Claude wiring | `npm run claude-wiring:check` | exit 0 | pass |
| Integration eval | `npm run test:it:all` | exit 0 | pass |
| Engine e2e | `npm run test:it:engine-e2e` | exit 0 | pass |
| Diff hygiene | `npm run diff:check` | exit 0 | pass |
| Dependency vulnerability | `bun audit` | no vulnerabilities | pass |
| Validator | `AmadeusValidator.ts . 260704-workflow-failure-observa` | pass | pass |

## Blocking Gate

`parity:check` が唯一の既知の blocking gate である。

It fails with 8 engine file hash mismatches.

Affected paths are:

- `aidlc-common/stages/inception/practices-discovery.md`
- `hooks/aidlc-log-subagent.ts`
- `knowledge/aidlc-shared/audit-format.md`
- `tools/aidlc-lib.ts`
- `tools/aidlc-orchestrate.ts`
- `tools/aidlc-state.ts`
- `tools/aidlc-utility.ts`
- `tools/data/stage-graph.json`

## Merge Readiness

`parity:check` が失敗している間、この branch は merge-ready ではない。

PR merge is a human action.

No workflow in this Intent should auto-merge the PR.

## Resolution Policy

Do not modify `dev-scripts/data/parity-map.json` without explicit human approval.

Acceptable resolution paths are:

- update the distribution baseline when the changed engine files are intentionally accepted;
- move behavior behind adapter or wrapper code when parity-locked files do not need to change;
- record a human-approved exception when parity lock must be bypassed.

## Scope Boundary

Collector、dashboard、cloud infrastructure は required gate ではない。

これらはこの Intent の対象外である。
