---
name: amadeus-feature
depth: Standard
testStrategy: Comprehensive
keywords: []
description: Build a substantial new Amadeus feature with full framework verification
---

# amadeus-feature scope

Self-hosted feature development for Amadeus. This is the explicitly named
successor to the legacy `amadeus` scope. Product-market, GUI, infrastructure,
deployment, and operations ceremony stay out, while the requirements,
architecture, implementation, and release-quality verification spine remains.

Lightened 2026-07-28 (user decision, evidence-mined from the 10 most recent
completed amadeus-feature intents): `feasibility` (9/10 trivial GO),
`approval-handoff` (0/10 rejections, brief consumed by no design stage),
`practices-discovery` (8/10 no-change), and `nfr-requirements` (~55% N/A
artifacts; code-generation consumes the nfr-design side) moved to SKIP —
each had no recorded case of changing an outcome, and every SKIP removes an
approval-gate wait point. `nfr-design` stays (its security slice has changed
implementations); re-add a skipped stage per-intent via `/amadeus compose`
when it genuinely applies (e.g. feasibility for unmeasured external seams).

Use this scope for substantial new behavior or cross-component changes. Use
`amadeus-bugfix` for a bounded defect and `amadeus-refactor` for a
behavior-preserving structural change.

Not inferable by keyword; select it explicitly with `--scope amadeus-feature`.
