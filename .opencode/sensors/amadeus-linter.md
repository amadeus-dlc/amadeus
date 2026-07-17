---
id: linter
kind: deterministic
command: bun .opencode/tools/amadeus-sensor-linter.ts
default_severity: advisory
description: Wraps the project's configured linter; prefers the workspace's `lint:check` npm script when declared, otherwise falls back to eslint detection (absent tool/config = exit 127 = quiet PASS); fires on TS/JS code outputs
category: code-quality
matches: "**/*.{ts,js}"
input_schema:
  file_path: string
output_schema:
  pass: boolean
  violations:
    - file: string
      line: number
      rule: string
      message: string
timeout_seconds: 30
---

# linter sensor

Wraps the project's configured linter with two detection tiers (Issue #538,
re-grounded per Issue #847):

1. **`lint:check` script** — when the workspace's `package.json` declares a
   `lint:check` script, the sensor runs it (`bun run lint:check` at the
   nearest-package.json root). Exit 0 = pass; any non-zero exit = one
   error-severity violation carrying the harness's own diagnostic output. This
   keeps the sensor generic (no workspace-specific paths) while making gate-time
   fires reflect the project's real lint rules (e.g. Biome).
2. **eslint fallback** — without a `lint:check` script, the sensor probes
   eslint (`bunx eslint`). Absent tool or config exits 127, which the dispatcher
   reclassifies as a quiet PASS (tool-unavailable). Multi-language
   auto-detection (ruff, golangci-lint, clippy) is deferred to v0.6.0+.

Echoes Fowler's "Eslint, Semgrep" examples from the harness-engineering article.

## Failure mode

Emits `SENSOR_FAILED` and writes detail to
`amadeus-docs/.amadeus-sensors/<stage-slug>/linter-<fire-id>.md` (Fire id is the 8-hex correlator from the SENSOR_FIRED audit row) containing the
linter's structured output (file, line, rule, message per violation).

## v0.6.0 carry-forward

Multi-language detection at framework boundary (read project type from
practices `## Tech Stack` section, dispatch appropriate linter).
