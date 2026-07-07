# Load Test Results — @amadeus-dlc/setup

## Upstream Inputs

- `load-test-plan.md`: L1/L2/L3 層
- U7 `performance-design.md`: measurement plan
- `dashboards.md`: CI timing 観測点

**Timestamp**: 2026-07-07T15:25:00Z  
**Environment**: E1 local-developer（Bun 1.3.13）

## L2 Test Suite Results

| Suite | Duration | Result |
|-------|----------|--------|
| Unit t202–t210（122 tests） | ~229ms | pass |
| Smoke（2 cases） | <1s | pass |
| Integration（6 cases） | <1s | pass |
| package-check | <1s | pass |
| package-dry-run | <1s | pass |

**Verdict**: L2 **PASS** — local wall clock 十分に bounded。

## L1 Planning Microbench Results

| Scenario | Target p95 | Measured p95 | Status |
|----------|-------------|--------------|--------|
| clean install 2k | <= 250ms | not run | **deferred**（v2 bench） |
| manifest upgrade 2k | <= 350ms | not run | deferred |
| backup 500 | <= 100ms | not run | deferred |
| version no-write | <= 20ms | not run | deferred |

**Proxy evidence**: t206 21 unit tests pass — planning correctness verified at small fixture scale。U4 scalability-design の O(n) 制約は code review + unit で確認。

## L3 CI Workflow Results

| Metric | Target | Measured | Status |
|--------|--------|----------|--------|
| installer-gates p95 | <= 20 min | no GHA sample yet | **pending** |
| check job | <= 20 min | no GHA sample yet | pending |

**Structural validation**: workflow YAML + GATE_REGISTRY timeoutMinutes 整合は pass（U7 performance-design）。

## Error Rates

| Layer | Error rate |
|-------|-----------|
| L2 local | 0%（130/130 checks pass） |
| L3 CI | pending baseline |

## Bottleneck Analysis

| Candidate | Risk | Mitigation |
|-----------|------|------------|
| installer-integration gate | medium | fake ports、temp targets |
| smoke Bun spawn | low | bounded cases |
| archive fetch（runtime） | medium | single retry、classified error |
| GHA cold start | low | bun cache |

## Recommendations

1. v2: L1 formal bench を `packages/setup` maintainer script として CI optional gate 化
2. 初回 merge 後に L3 GHA duration を `slo-config.md` baseline として記録
3. planning 2k bench は release 前の manual check として追加
