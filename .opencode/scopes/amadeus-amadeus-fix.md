---
name: amadeus-fix
depth: Minimal
testStrategy: Comprehensive
keywords: []
description: Correct a bounded Amadeus mismatch with comprehensive framework verification
---

# amadeus-fix scope

Lean self-hosted correction for Amadeus. Use it when the intended behavior or
contract already exists and the work restores alignment with it: defects,
cross-harness parity gaps, generated or documentation drift, and corrections
to an existing project policy all qualify. A new capability, specification, or
architecture belongs in `amadeus-feature`; a behavior-preserving internal
change belongs in `amadeus-refactor`.

It runs initialization, reverse-engineering, requirements analysis, code
generation, and build and test. Discovery, architecture, NFR, and operations
stages stay out because the change follows an existing design rather than
introducing a new one.

Unlike the generic `bugfix` scope, verification remains Comprehensive so the
build-and-test boundary covers applicable tests, generated harness parity,
`dist:check`, and `promote:self:check`.

Evidence-mined 2026-07-28 (under the former `amadeus-bugfix` name): across the
12 completed intents, reverse-engineering changed an outcome in 9/12 and
requirements-analysis in 8/12. Only 2/12 intents were trivial on both stages,
so no stage moves to SKIP. Prefer a per-intent `/amadeus compose` SKIP for
mechanical corrections rather than weakening the scope-level route.

Not inferable by keyword; select it explicitly with `--scope amadeus-fix`.
