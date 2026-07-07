---
name: sdd
depth: Standard
keywords:
  - sdd
  - spec-driven
  - cc-sdd
  - kiro-spec
  - spec driven
description: Spec-driven development (cc-sdd / Kiro-style SDD loop)
---

# sdd scope

Standard depth for **spec-driven development** — the cc-sdd / Kiro-style loop:
requirements → design → tasks → implementation → validation. Skips product
discovery (market-research, mockups, team-formation) and the operation phase;
keeps the minimum Inception arc that produces auditable specs before code.

## Why these stages, why skip those

SDD treats the spec as the contract: state what to build, design the shape,
break work into bounded tasks, implement, then verify. That maps to
requirements-analysis, application-design, units-generation (task boundaries),
code-generation, and build-and-test. Intent-capture frames the initiative;
reverse-engineering runs when the codebase already exists (brownfield /
`kiro-validate-gap`). Ideation ceremony beyond intent-capture and the full
operation phase are out of scope for this loop.

## Membership

Keyword triggers: `sdd`, `spec-driven`, `cc-sdd`, `kiro-spec`, `spec driven`.
Initialization, intent-capture, reverse-engineering, requirements-analysis,
application-design, units-generation, code-generation, and build-and-test
execute; the rest is SKIP.
