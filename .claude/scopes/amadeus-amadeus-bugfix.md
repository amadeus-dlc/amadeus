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

Evidence-mined 2026-07-28 (user decision, same methodology as the
amadeus-feature lightening): across the 12 completed amadeus-bugfix
intents, reverse-engineering changed an outcome in 9/12 (filed premise
wrong or incomplete, second defect found, fix surface retargeted) and
requirements-analysis in 8/12 (reviewer caught real defects in 5, human
rulings overturned the drafter's recommendation in 3). Only 2/12 intents
were trivial on both stages, so no stage moves to SKIP — this scope stays
as-is. The trivial runs share mechanical signatures (RE: zero source
change in the diff interval; RA: every answer equals the recommended
option with a first-iteration READY); prefer a per-intent
`/amadeus compose` SKIP when those hold, not a scope-level cut.

Not inferable by keyword; select it explicitly with `--scope amadeus-bugfix`.
