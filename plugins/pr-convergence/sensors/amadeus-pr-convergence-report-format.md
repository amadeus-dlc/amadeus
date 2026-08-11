---
id: pr-convergence-report-format
kind: deterministic
command: bun {{HARNESS_DIR}}/plugins/pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts
default_severity: advisory
description: Flags a pr-convergence-report.md whose required fields the plugin CLI would have written are missing, blank, or self-contradictory
category: governance
matches: "**/construction/*/code-generation/pr-convergence-report.md"
input_schema:
  output_path: string
  stage_slug: string
output_schema:
  pass: boolean
  findings_count: integer
  reason: string
  findings:
    - field: string
      reason: string
timeout_seconds: 5
---

# pr-convergence-report-format sensor

Advisory Write/Edit-time surface for the PR convergence report (FR-6a). The
`code-generation` artifact guard only asks whether `pr-convergence-report.md`
exists; this sensor asks whether it looks like something the `pr-convergence`
plugin's CLI produced. It never enforces — a failing verdict is data for the
human at the gate, and the `advisory` severity is the only one shipped.

## Scope

Fires on the per-unit report path the guard resolves (FR-2b):
`<record>/construction/<unit>/code-generation/pr-convergence-report.md`. Any
other output is skipped (`reason: "not-a-report"`), and an output path that
does not exist yet is a clean pass (`reason: "no-file"`) — absence is the
artifact guard's business.

## Checked shape

Both canonical report kinds (ADR-3) are accepted:

- **converged** — `kind`, `pull request`, `generated at`, and `converged: true`.
- **override** — the same four fields with `converged: false`, plus the human
  ruling record that makes FR-7b auditable: `human turn`, `recorded at`, and a
  non-blank `reason`.

Timestamps must parse, `pull request` must read `<repo>#<number>`, and `kind`
must agree with `converged` — a report claiming `kind: override` while also
claiming `converged: true` contradicts itself and is reported.

## Independence from the plugin

The checker re-reads the report with its own minimal line reader instead of
importing `tools/pr-convergence-cli.ts`. The sensor and CLI are sibling plugin
resources, but keeping the reader independent prevents report validation from
sharing the implementation that renders the report. The shipped integration
test renders its fixtures from the plugin's own `renderReport`, so the two
readers cannot drift unobserved.

## Failure mode

Findings emit `SENSOR_FAILED` through the existing dispatcher and write detail
under `.amadeus-sensors/<stage-slug>/`. Findings name only the offending field
and a fixed reason; report contents are never echoed.
