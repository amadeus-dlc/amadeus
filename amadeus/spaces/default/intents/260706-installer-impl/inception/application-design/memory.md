# Application Design Memory

## Interpretations

- 2026-07-07T05:40:53Z — Application Design treats `packages/setup/` as a new installer application boundary inside the existing modular monolith; existing `core/`, `harness/`, `dist/`, and `scripts/` remain in place per requirements and team practices.
- 2026-07-07T05:40:53Z — AWS Platform support is scoped to release/publish workflow touchpoints only because this intent has no deployed AWS runtime infrastructure.
- 2026-07-07T05:44:57Z — The installer package design uses a hexagonal package boundary with domain planning core and adapters, not a thin imperative script.
- 2026-07-07T05:44:57Z — Distribution metadata is owned by setup-side reader abstractions, preferring release archive metadata when present and falling back to path policy for the first release.
- 2026-07-07T05:44:57Z — `packages/setup/package.json` is independently publishable while the root `package.json` remains dev-only.
- 2026-07-07T05:55:00Z — Architecture review required manifest-first upgrade detection because `--harness` is optional for manifest-installed targets and `kiro`/`kiro-ide` sentinels are ambiguous without manifest.
- 2026-07-07T05:55:00Z — Manifest write failure is a distinct failure state after file copy; future upgrade must classify that target conservatively rather than assuming manifest-installed.
- 2026-07-07T06:05:00Z — Second architecture review required a single owner for manifest writes; Application Service now calls Manifest Store after File Applier succeeds and owns `manifest-write-failed` classification.

## Deviations

- 2026-07-07T05:40:53Z — The stage consumes list omits refined mockup files even though `requires_stage` includes refined-mockups; design uses refined CLI/DX artifacts as additional context and still references the declared consumes for sensors.

## Tradeoffs

- 2026-07-07T05:40:53Z — Design questions focus on architectural boundaries rather than exact per-harness file inventories; the latter remains assigned to Functional Design by requirements OQ-001.
- 2026-07-07T05:55:00Z — Tag listing and archive fetching are split into separate ports to keep version ordering policy independent from archive download retry behavior.
- 2026-07-07T06:05:00Z — Dependency diagrams distinguish code dependencies from return flow; App depends on PromptPort/ReporterPort instead of Reporter depending back on App.

## Open questions

- 2026-07-07T05:44:57Z — Exact required file inventory for each harness remains deferred to Functional Design, matching requirements OQ-001.
