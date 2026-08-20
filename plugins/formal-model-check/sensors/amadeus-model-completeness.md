---
id: model-completeness
kind: deterministic
command: bun {{HARNESS_DIR}}/plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts
default_severity: advisory
description: Detects drift between each registered TLA model and its canonical implementation files
category: formal-verification
matches: "**/{amadeus/spaces/*/specs/tla/**,packages/framework/core/tools/amadeus-election*.ts,packages/framework/core/tools/amadeus-mirror-*.ts,packages/framework/core/tools/amadeus-orchestrate.ts,packages/framework/core/tools/amadeus-state.ts,*/plugins/github-pr-convergence/tools/*.ts}"
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

Reads `amadeus/spaces/<space>/specs/tla/model-map.json` (the active space's
canonical spec root), recalculates SHA-256 for every canonical
implementation entry, and reports drift without modifying the map, model,
configuration, or implementation. Missing or malformed maps and unreadable
entries fail closed.

The checker owns a nine-second deadline and returns a valid failed verdict
before the dispatcher's ten-second hard cap. The outer cap remains the
framework's `SENSOR_BUDGET_OVERRIDE` emergency path.

## Updating the registry

After changing the model or configuration, the developer explicitly runs:

`bun {{HARNESS_DIR}}/tools/amadeus-sensor-model-completeness.ts updateModelMap`

The update is rejected with `MODEL_UNCHANGED` when model and configuration
identities are unchanged. Accepted updates publish one canonical record using
an exclusive lock, file fsync, atomic rename, and parent-directory fsync.

## Refreshing implementation hashes only

When only implementation files moved — the model and configuration are
untouched, and `SOURCE_DRIFT` or a drift verdict names an implementation entry —
the supported recovery is:

`bun {{HARNESS_DIR}}/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only`

The flag is a declaration that model semantics did not change. It is refused
with `INVALID_ARGUMENT` if either identity has moved (publish that revision
through the unflagged command instead), and with `MODEL_UNCHANGED` if no
implementation entry has drifted. An accepted run reports `IMPL_ONLY_UPDATED`
with the entries whose hashes changed, so the update is recorded in the command
output as well as in the published map. Editing the map by hand is not a
supported path.

## Failure mode

Drift and fail-closed input errors emit `SENSOR_FAILED` through the existing
dispatcher. Findings contain only repository-relative paths and fixed reason
codes; file contents, absolute paths, and expected or actual hashes are never
included.
