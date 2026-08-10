---
id: numeric-provenance
kind: deterministic
command: bun {{HARNESS_DIR}}/tools/amadeus-sensor-numeric-provenance.ts
default_severity: advisory
description: Reports numeric claims in mapped stage artifacts when no accepted command, measurement reference, commit SHA, or measurement link appears in the approved structural window
category: evidence
matches: "**/*.md"
input_schema:
  output_path: string
  stage_slug: string
output_schema:
  pass: boolean
  skipped: boolean
  findings_count: integer
  reason: string
  metrics: object
  findings:
    - path: string
      stage: string
      claim_class: string
      line: integer
      column: integer
      excerpt: string
      expected: array
timeout_seconds: 5
---

# Numeric provenance sensor

Checks the four numeric-claim classes fixed by `fr-pred-v1`. The sensor accepts
only an inline command token, a fixed measurement reference, a 7–40 digit hex
SHA, or an existing relative link under the approved measurement roots.

The generated mapping determines the stage/output/class mode and structural
search window. Enforcement produces one advisory finding per unprovenanced
claim. Measurement-only policies emit metrics without findings. Missing,
pre-cutoff, excluded, lightweight, and unmapped artifacts return an observable
passing skip instead of guessing a policy.

The process emits one JSON verdict and exits zero for every business outcome,
including a failing advisory verdict. Invalid invocation or a corrupt generated
mapping is a startup failure.
