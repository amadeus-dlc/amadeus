---
id: malformed-unknown-severity
kind: deterministic
command: bun .claude/tools/amadeus-sensor.ts fire malformed-unknown-severity
default_severity: arbitrary-bogus
description: Negative-case fixture — default_severity is outside the accepted set
category: document-shape
icon: ❌
timeout_seconds: 5
---

# malformed-unknown-severity sensor

Negative-case fixture for the `default_severity` vocabulary (#2671 論点 (c)).
Carries `default_severity: arbitrary-bogus` — the schema accepts only
`advisory` and `blocking`, so validateSensorManifest rejects this file.

Deliberately NOT a near-miss of a future value: the point is that an
unrecognised severity is a loud rejection, not a silent downgrade to
advisory.
