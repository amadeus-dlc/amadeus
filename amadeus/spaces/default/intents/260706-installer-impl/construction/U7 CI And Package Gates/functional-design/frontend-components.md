# Frontend Components — U7 CI And Package Gates

> Stage: construction / functional-design  
> Unit: U7 CI And Package Gates  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Scope

U7 は end-user frontend を持たない。人間が見る surface は GitHub Actions check summary、PR check details、CI log、package gate report である。したがってこの artifact は UI component ではなく contributor-facing reporting components を定義する。

## Reporting Components

| Component | Surface | Purpose |
|---|---|---|
| Installer Change Summary | GitHub Actions summary | installer-related 判定と matched path scope を表示する |
| Gate Matrix | GitHub Actions summary / PR check details | blocking gate の pass/fail/skipped を一覧化する |
| Failure Diagnostics | CI log / artifact | command、reason、diagnostics path、next action を表示する |
| Vulnerability Exception Panel | GitHub Actions summary | allowlist exception の advisory、owner、expiry、reason を表示する |
| Coverage Ratchet Report | GitHub Actions summary / artifact | registry freshness、baseline、added/removed coverage keys を表示する |
| U8 Handoff Status | GitHub Actions summary | release workflow に渡せる前提条件が満たされているか表示する |

## Display Rules

| Rule | Statement |
|---|---|
| UI-U7-001 | installer-related でない PR では、U7 package-specific gates が skipped である理由を 1 行で表示する。 |
| UI-U7-002 | installer-related PR では、実行対象 gate を matrix として表示し、blocking failure を上部に集約する。 |
| UI-U7-003 | `passed-with-exception` は success と同じ色や wording にしない。例外つき通過であること、owner、expiry を明示する。 |
| UI-U7-004 | failure diagnostics は「何が失敗したか」「どの command か」「次に何を直すか」を含む。 |
| UI-U7-005 | U7 report は publish 完了や release 完了を表示してはならない。U8 handoff readiness だけを表示する。 |

## Suggested Summary Shape

```text
Installer gates: required
Changed scopes: setup-package, installer-test

Blocking failures:
- coverage-registry: FR-011 no-write coverage key removed
- dependency-audit: GHSA-xxxx High vulnerability requires fix or valid allowlist

Gate matrix:
- package-metadata: passed
- package-dry-run: passed
- installer-smoke: passed
- installer-integration: failed
- coverage-registry: failed
- typecheck: passed
- lint: passed
- dist-check: passed
- promote-self-check: passed
- dependency-audit: failed
- secret-scan: passed

U8 handoff: not ready
```

## Accessibility And Log Ergonomics

- Summary is plain text / markdown table first; color is supplementary only.
- Every failure line includes a stable gate name that can be searched in logs.
- Large scanner output is linked as artifact path instead of pasted into the summary.
- The output is deterministic enough for snapshot tests where feasible.

## Upstream Coverage

- `unit-of-work.md`: U7 has no end-user UI but owns CI/reporting surfaces for package gates.
- `unit-of-work-story-map.md`: US-010 requires PR gate feedback that developers can act on.
- `requirements.md`: FR-016 acceptance criteria become visible pass/fail rows in the gate matrix.
- `components.md`: Reporter boundary is extended to maintainer-facing package gate output without changing CLI Reporter ownership.
- `component-methods.md`: `PackageCheckResult` and gate method results are rendered as CI summaries, not application stdout.
- `services.md`: GitHub Actions PR Gates define the external surface where these reporting components appear.
