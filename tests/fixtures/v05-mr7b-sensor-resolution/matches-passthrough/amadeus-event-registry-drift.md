---
id: event-registry-drift
kind: deterministic
command: bun .claude/tools/amadeus-sensor-event-registry-drift.ts
default_severity: advisory
description: Event registry drift guard for fixture compile testing
category: code-quality
matches: "**/{event-registry,amadeus-audit}.ts"
---

# event-registry-drift (fixture)
