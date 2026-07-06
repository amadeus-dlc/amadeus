# Language Policy

This document defines the language policy for files under `docs/amadeus/`: which language is canonical, how the paired translation stays in sync, and how documents in this tree cross-link.

Issue #509 established this policy so that the ongoing englishization of the existing 15 `docs/amadeus/` files (#515–#523) has a stable contract to reference.

## Scope

This policy governs `docs/amadeus/*.md` and their `*.ja.md` counterparts. The user guide under `docs/guide/` follows the same pairing, synchronization, and cross-linking rules (Issue #533).

It does not govern `amadeus/**/*.md`, Markdown generated from templates, `.kiro/specs/**/*.md`, `openspec/**/*.md`, or user-facing gate wording — those remain Japanese per [AMADEUS.md](../../AMADEUS.md)'s 作業言語 (working language) section, which this policy does not change.

It also does not govern skill sources (`SKILL.md`, TypeScript scripts); [skill-language-policy.md](skill-language-policy.md) governs those (see [Relation to skill-language-policy](#relation-to-skill-language-policy) below).

## Canonical and translation

Every document under `docs/amadeus/` is published as a pair:

- `<name>.md` — English, canonical.
- `<name>.ja.md` — Japanese, the translation.

A document that has not yet been paired (pending #515–#523) is still Japanese-only until its englishization lands; this policy governs the target state, not a mandate to translate every existing file immediately.

## Synchronization rules

- On divergence between the two languages, the English `<name>.md` is authoritative.
- A pull request that updates a `docs/amadeus/` document includes both `<name>.md` and `<name>.ja.md`.
- If a pull request updates only one language, its description states the reason and the plan to bring the other language current.

## Cross-linking rules

- Links from `<name>.md` target other `<name>.md` files.
- Links from `<name>.ja.md` target the corresponding `<name>.ja.md` file when one exists; otherwise they target `<name>.md`.

## Relation to skill-language-policy

[skill-language-policy.md](skill-language-policy.md) governs the language of Amadeus skill sources: `SKILL.md` files and TypeScript scripts under `skills/amadeus*/` and `.agents/skills/amadeus*/`.

This document governs the language of `docs/amadeus/` documents themselves. The two policies do not overlap: a skill's `SKILL.md` is English-required regardless of this policy, and a `docs/amadeus/` document's canonical-language pairing is unaffected by skill-language-policy.
