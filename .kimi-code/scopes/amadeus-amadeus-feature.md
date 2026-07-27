---
name: amadeus-feature
depth: Standard
testStrategy: Comprehensive
keywords: []
description: Build a substantial new Amadeus feature with full framework verification
---

# amadeus-feature scope

Self-hosted feature development for Amadeus. This is the explicitly named
successor to the legacy `amadeus` scope and uses the same 18-stage route:
product-market, GUI, infrastructure, deployment, and operations ceremony stay
out, while the requirements, architecture, NFR, implementation, and
release-quality verification spine remains.

Use this scope for substantial new behavior or cross-component changes. Use
`amadeus-bugfix` for a bounded defect and `amadeus-refactor` for a
behavior-preserving structural change.

Not inferable by keyword; select it explicitly with `--scope amadeus-feature`.
