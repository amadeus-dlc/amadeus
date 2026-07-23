---
name: amadeus-refactor
depth: Minimal
testStrategy: Comprehensive
keywords: []
description: Refactor Amadeus internals while preserving behavior and harness parity
---

# amadeus-refactor scope

Lean self-hosted refactoring for Amadeus. It follows the bugfix route but adds
functional design to make the preserved behavior and target structure
explicit before implementation.

Unlike the generic `refactor` scope, verification remains Comprehensive so the
build-and-test boundary covers applicable tests, generated harness parity,
`dist:check`, and `promote:self:check`.

Not inferable by keyword; select it explicitly with `--scope amadeus-refactor`.
