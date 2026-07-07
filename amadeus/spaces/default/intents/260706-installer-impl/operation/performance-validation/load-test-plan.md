# Load Test Plan — @amadeus-dlc/setup

## Upstream Inputs

- U4 `performance-requirements.md`: planning p95 targets（2,000 files）
- U7 `performance-requirements.md`: CI gate p95 <= 20 min
- U4 `scalability-design.md`: capacity boundaries
- U7 `performance-design.md`: gate group budgets
- `dashboards.md`: GHA timing SLI

## Test Strategy

CLI/npm モデルのため **HTTP load test（k6/Gatling）は N/A**。以下 3 層で検証する。

| Layer | Method | Environment |
|-------|--------|-------------|
| L1 Planning microbench | in-memory fixtures、Bun bench（将来） | E1 local |
| L2 Test suite duration | `bun test` wall clock | E1 local + CI |
| L3 CI workflow duration | GHA job timing | E2（post-merge 測定） |

## L1: U4 Planning Benchmarks（設計済み）

| Scenario | Target p95 | Fixture size |
|----------|-----------|--------------|
| clean install plan | <= 250ms | 2,000 files |
| manifest upgrade plan | <= 350ms | 2,000 files |
| manual-or-unknown plan | <= 350ms | 2,000 files |
| backup path generation | <= 100ms | 500 candidates |
| version no-write | <= 20ms | unit |

**Protocol**: 50 samples、warmup 5 discard（U4 performance-requirements）

**v1 status**: correctness は t206 unit で検証済み。formal p95 bench script は v2 backlog。

## L2: Test Suite Throughput

```bash
bun test tests/unit/t202-setup-package-shell.test.ts ... t210-setup-release-docs.test.ts
bun tests/setup/run-installer-smoke.ts
bun tests/setup/run-installer-integration.ts
```

Pass criteria: 全 pass、suite wall clock < 5 min local。

## L3: CI Gate Workflow

| Measurement | Source | Target |
|-------------|--------|--------|
| full installer PR | GHA `installer-gates` job | p95 <= 20 min |
| per-gate | step timing / gate JSON | U7 table |

**Execution**: merge 後の GHA 実行で baseline 取得（本 intent では structural validation のみ）。

## Non-Goals

- npm registry load test
- multi-tenant concurrent install simulation
- CloudWatch load generator

## Execution Schedule

| When | What |
|------|------|
| Pre-release | L2 full suite |
| Post-merge CI | L3 automatic |
| v2 | L1 formal bench in CI |
