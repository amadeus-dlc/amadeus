---
id: self-scope-consistency
kind: deterministic
command: bun .codex/tools/amadeus-sensor-self-scope-consistency.ts
default_severity: advisory
description: Amadeus self-development only — checks that the five dogfood harnesses agree on all five promoted scope files and scope-grid rows, down to the prose bytes and the shared stage cells
category: framework-integrity
matches: "**/{scopes/{amadeus-self-*.md,amadeus-installer-distribution.md},tools/data/scope-grid.json}"
input_schema:
  output_path: string
  stage_slug: string
output_schema:
  pass: boolean
  findings_count: integer
  findings:
    - harness: string
      surface: string
      reason: string
      scope: string (optional — absent when the finding is not scope-specific)
      stage: string (optional — set on cell-mismatch only)
      expected: string (optional — set on cell-mismatch only, the canonical face's cell)
      actual: string (optional — set on cell-mismatch only, this face's cell)
      path: string
  skipped: string | null
timeout_seconds: 5
---

# self-scope-consistency sensor

This sensor is exclusively for developing Amadeus itself. It is dormant when
no `self-*` scope exists.

Once any self scope is present, the sensor checks the five dogfood harness
surfaces (`.claude`, `.codex`, `.cursor`, `.opencode`, and `.kimi-code`). Each
must contain the canonical `installer-distribution`, `self-document`,
`self-feature`, `self-fix`, and `self-refactor` identities both as scope files
and as rows in `tools/data/scope-grid.json`. A scope filename whose
frontmatter declares a different `name:` also fails.

Identities are not enough on their own: the faces are copies of one another,
so the sensor also compares their content. Scope prose must be byte-identical
across faces (`body-mismatch`), and every stage cell the faces share must hold
the same `EXECUTE`/`SKIP` value (`cell-mismatch`). No expected cell values are
declared anywhere — agreement between faces is the invariant, so the check has
nothing to keep in step with a legitimate scope change. Stage keys that only
some faces carry are exempt by construction, because plugin composition is
per-face and that asymmetry is intentional.

The check is advisory at write time — it is the early-detection surface while
a face is being edited. The release-blocking verification is the parity test
`tests/integration/t413-self-scope-face-parity.test.ts`, which enforces the
same contract against the real faces in CI.
