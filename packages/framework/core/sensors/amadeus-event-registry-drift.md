---
id: event-registry-drift
kind: deterministic
command: bun {{HARNESS_DIR}}/tools/amadeus-sensor-event-registry-drift.ts
default_severity: advisory
description: VER-1 drift guard — derives the canonical audit-event vocabulary from the Event Registry, extracts the state-machine/hooks reference set, and refuses any four-set divergence or cardinality drift; fires when the registry or the audit tool changes
category: code-quality
matches: "**/{event-registry,amadeus-audit}.ts"
input_schema:
  file_path: string
output_schema:
  pass: boolean
  errors:
    - file: string
      line: number
      column: number
      message: string
timeout_seconds: 30
---

# event-registry-drift sensor

Layer 3 of the VER-1 drift guard (FR-EVT-1). The check is self-locating — the
script resolves the harness dir from its own path and compares:

- the canonical audit-event vocabulary in `otel/event-registry.ts`,
- the state-machine + hooks reference set (every `tools/` + `hooks/` source
  except the defining table),
- the canonical registry set (`otel/event-registry.ts` canonical defs),
- the AuditLogExporter accept set (registry-derived; the reader decode set
  activates when the U3 codec table lands).

The 81-event cardinality (#1672, #1602, #1919) is pinned so vacuous equality fails.

## Failure mode

Emits `SENSOR_FAILED` with one error per divergence (missing/unregistered
event, telemetry misclassification, cardinality drift). The unit-test layer
(`tests/unit/event-registry-drift.test.ts`) runs the same extraction in CI.
