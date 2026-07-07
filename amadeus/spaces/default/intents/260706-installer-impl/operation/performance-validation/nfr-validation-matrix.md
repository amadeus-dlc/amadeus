# NFR Validation Matrix — @amadeus-dlc/setup

## Upstream Inputs

- U4 `performance-requirements.md` / `scalability-requirements.md`
- U7 `performance-requirements.md` / `scalability-design.md`
- U4/U7 `performance-design.md` / `scalability-design.md`
- `dashboards.md`

**Validation date**: 2026-07-07

## U4 Operation Planning

| Requirement | Target | Actual | Status | Evidence |
|-------------|--------|--------|--------|----------|
| clean install plan p95 | <= 250ms @ 2k | deferred | **partial** | t206 correctness |
| upgrade plan p95 | <= 350ms @ 2k | deferred | partial | t206 correctness |
| backup gen p95 | <= 100ms @ 500 | deferred | partial | t206 invariants |
| O(n) planning | 2k entries | design OK | **pass** | scalability-design |
| no filesystem in plan | invariant | enforced | **pass** | t206 + code review |

## U7 CI Gates

| Requirement | Target | Actual | Status | Evidence |
|-------------|--------|--------|--------|----------|
| classification p95 | <= 5s | not measured | pending | t209 unit |
| package-metadata p95 | <= 2 min | local <1s | **pass** | package-check |
| integration p95 | <= 10 min | local <1s | **pass** | integration runner |
| full PR gate set p95 | <= 20 min | not measured | pending | GHA post-merge |
| gate correctness | 100% required | 122 unit pass | **pass** | t209 + build-test |

## U7 Scalability

| Requirement | Target | Actual | Status | Evidence |
|-------------|--------|--------|--------|----------|
| bounded JSON reports | readable @ 1k findings | design OK | **pass** | scalability-design |
| normalized findings only | schema | enforced | **pass** | t209 security gate |
| parallel independent gates | supported | ci.yml 2 jobs | **pass** | ci-config |

## Overall NFR Verdict

| Category | Verdict |
|----------|---------|
| Correctness NFRs | **PASS** |
| Structural performance design | **PASS** |
| Measured p95 (production CI) | **PENDING** baseline |

Standard test strategy に整合: formal load test より unit/integration + CI structural validation を優先。

## Follow-up Actions

1. Record first GHA `installer-gates` duration after merge
2. Add optional U4 2k bench in v2
3. Update matrix when L3 baseline available
