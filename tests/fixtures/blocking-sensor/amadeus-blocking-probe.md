---
id: blocking-probe
kind: deterministic
command: bun .claude/tools/amadeus-sensor-blocking-probe.ts
default_severity: blocking
description: Test-only manifest that declares the blocking severity.
category: framework-integrity
matches: "**/{amadeus-docs,intents,codekb}/**"
---

# Blocking probe (fixture)

Fixture manifest for the `default_severity: blocking` vocabulary. No shipped
sensor declares `blocking`; this file is the corpus for the schema-acceptance
and graph-carriage tests and for the approve-gate falling proof. It is never
compiled into a shipped stage graph.
