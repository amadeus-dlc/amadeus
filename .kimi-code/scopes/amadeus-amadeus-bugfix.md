---
name: amadeus-bugfix
depth: Minimal
testStrategy: Comprehensive
keywords: []
description: Fix a bounded Amadeus defect with comprehensive framework verification
---

# amadeus-bugfix scope

Lean self-hosted bug fixing for Amadeus. It runs initialization,
reverse-engineering, requirements analysis, code generation, and build and
test. Discovery, architecture, NFR, and operations stages stay out because the
change repairs known behavior rather than introducing a new design.

Unlike the generic `bugfix` scope, verification remains Comprehensive so the
build-and-test boundary covers applicable tests, generated harness parity,
`dist:check`, and `promote:self:check`.

Not inferable by keyword; select it explicitly with `--scope amadeus-bugfix`.
