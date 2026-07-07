# Integration Test Instructions — インストーラ実装

## Upstream Inputs

U6 `code-summary.md` の harness integration scenarios と U7 `run-installer-smoke.ts` / `run-installer-integration.ts` を Standard strategy の integration 層とする。unit test（t208）内の harness integration も cross-cutting に U6 をカバーする。

## Test Scope

| Runner | シナリオ |
|--------|---------|
| `run-installer-smoke.ts` | Bun entrypoint help、Node wrapper `bun-required` |
| `run-installer-integration.ts` | clean install、manifest upgrade no-write、collision no-write、archive retry failure、kiro ambiguity、plan/report snapshot |

対象外（Standard strategy）:

- live GitHub archive fetch
- real npm publish
- performance benchmark

## Commands

```bash
bun tests/setup/run-installer-smoke.ts
bun tests/setup/run-installer-integration.ts
```

CI 向け report 付き:

```bash
bun tests/setup/run-installer-smoke.ts --report .amadeus-ci/setup/smoke.json
bun tests/setup/run-installer-integration.ts --report .amadeus-ci/setup/integration.json
```

U7 gate plan 全体（installer-related PR）:

```bash
bun packages/setup/src/maintainer/change-detector.ts \
  --file packages/setup/package.json \
  --report .amadeus-ci/setup/change-set.json
bun packages/setup/src/maintainer/run-installer-gates.ts \
  --change-set .amadeus-ci/setup/change-set.json \
  --summary .amadeus-ci/setup/gate-summary.json
```

## Expected Coverage

- smoke: 2 cases pass（help-bun-entrypoint、bun-required-wrapper）
- integration: 6 coverage keys pass（clean-install 〜 plan-report-snapshot）
- fake ports のみ使用、target directory は temp fixture

## Test Data

- `tests/helpers/setup/` — shared harness
- integration report の `coverageKeys` は U7 coverage gate ratchet と連動
