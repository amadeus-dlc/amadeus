# Smoke Test Results — Deployment Execution

## Upstream Inputs

- `cd-config.md`: installer-smoke gate 定義
- `build-test-results.md`: 先行 smoke 結果（2 pass）

**Timestamp**: 2026-07-07T15:15:00Z  
**Runner**: `bun tests/setup/run-installer-smoke.ts`  
**Environment**: E1 local-developer

## Results

| Case ID | Description | Status |
|---------|-------------|--------|
| help-bun-entrypoint | Bun entrypoint exposes install and upgrade help | **passed** |
| bun-required-wrapper | Node wrapper reports bun-required without Bun on PATH | **passed** |

**Summary**: 2/2 pass，`ok: true`

## Comparison with build-test-results

| Metric | build-and-test | deployment-execution |
|--------|---------------|-------------------|
| Smoke cases | 2 pass | 2 pass |
| Regression | — | none detected |

## Notes

- smoke は live npm install を行わない（repository constants + PATH isolation）
- GHA E2 上の smoke は `run-installer-smoke.ts --report .amadeus-ci/setup/smoke.json` で同一ケースを再実行可能
