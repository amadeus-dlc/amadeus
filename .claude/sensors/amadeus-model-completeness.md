---
id: model-completeness
kind: deterministic
command: bun .claude/tools/amadeus-sensor-model-completeness.ts
default_severity: advisory
description: Detects drift between the FormalElection TLA model and its canonical implementation files
category: formal-verification
matches: "**/{specs/tla/**,packages/framework/core/tools/amadeus-election*.ts}"
input_schema:
  output_path: string
  stage_slug: string
output_schema:
  pass: boolean
  reason: string
  findings_count: integer
  findings:
    - path: string
      reason: string
timeout_seconds: 10
---

# model-completeness sensor

Reads `specs/tla/model-map.json`, recalculates SHA-256 for every canonical
implementation entry, and reports drift without modifying the map, model,
configuration, or implementation. Missing or malformed maps and unreadable
entries fail closed.

The checker owns a nine-second deadline and returns a valid failed verdict
before the dispatcher's ten-second hard cap. The outer cap remains the
framework's `SENSOR_BUDGET_OVERRIDE` emergency path.

## Updating the registry

After changing the model or configuration, the developer explicitly runs:

`bun .claude/tools/amadeus-sensor-model-completeness.ts updateModelMap`

The update is rejected with `MODEL_UNCHANGED` when model and configuration
identities are unchanged. Accepted updates publish one canonical record using
an exclusive lock, file fsync, atomic rename, and parent-directory fsync.

## Failure mode

Drift and fail-closed input errors emit `SENSOR_FAILED` through the existing
dispatcher. Findings contain only repository-relative paths and fixed reason
codes; file contents, absolute paths, and expected or actual hashes are never
included.
