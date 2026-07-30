---
id: self-scope-consistency
kind: deterministic
command: bun .claude/tools/amadeus-sensor-self-scope-consistency.ts
default_severity: advisory
description: Amadeus self-development only — checks that the five dogfood harnesses expose the same canonical self-* scope files and scope-grid rows
category: framework-integrity
matches: "**/{scopes/amadeus-self-*.md,tools/data/scope-grid.json}"
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
      path: string
  skipped: string | null
timeout_seconds: 5
---

# self-scope-consistency sensor

This sensor is exclusively for developing Amadeus itself. It is dormant when
no `self-*` scope exists.

Once any self scope is present, the sensor checks the five dogfood harness
surfaces (`.claude`, `.codex`, `.cursor`, `.opencode`, and `.kimi-code`). Each
must contain the canonical `self-document`, `self-feature`, `self-fix`, and
`self-refactor` identities both as `scopes/amadeus-self-*.md` files and as
rows in `tools/data/scope-grid.json`. A scope filename whose frontmatter
declares a different `name:` also fails.

The check is advisory at write time. Package and promotion drift guards remain
the release-blocking verification surfaces.
