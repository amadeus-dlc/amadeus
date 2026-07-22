---
name: book
depth: Standard
keywords: []
description: Write a book with chapter-unit Bolts (pilot)
---

# book scope (pilot)

Standard-depth scope for writing a book with the AI-DLC engine: chapters are
units of work, Bolts draft chapters, and the walking skeleton is a sample
chapter. This is the PILOT cut established in amadeus-dlc/amadeus#643 — a
minimal EXECUTE set built to measure how the engine and stage prose hold up
against real writing, not a general-purpose authoring scope.

Not inferable by keyword — reachable only via `--scope book` (keywords
granted: none).

## Why these stages, why skip those

10/35 stages EXECUTE: the three initialization stages, intent-capture
(what book, for whom, why), scope-definition (in/out boundary),
requirements-analysis (reader and content requirements), then the book
chain — book-structure-design (part/chapter map, reader contracts,
conventions), the book fork of units-generation (unit = chapter,
dependency DAG), chapter-drafting (per-unit Bolt drafting with an editor
review gate), and manuscript-review (whole-manuscript pass + the
construction phase-check).

Everything else SKIPs: no market-research (pilot subject is fixed), no
mockups or user-stories (reader contracts live in requirements and
book-structure), no application-design/functional-design/nfr chain
(replaced by the book chain), no code-generation/build-and-test (replaced
by chapter-drafting/manuscript-review), no ci/infra/operation stages (a
manuscript has no deploy target; errata live outside the pilot).

## Sample chapter (walking skeleton)

`book` is not in `SKELETON_ON_SCOPES`, so the skeleton defaults off. The
pilot WANTS the sample-chapter gate: at the skeleton-gate classify
round-trip, answer with stance `on` (`report --skeleton-stance on`). The
first chapter unit then runs as a solo, human-gated Bolt before the
remaining chapters are released.

## Workspace expectations

This scope assumes a DEDICATED book workspace: the book pack replaces
`units-generation` with the chapter fork and its memory layers are written
for authoring, not software delivery. Do not run software scopes in a
workspace carrying this pack — the stock scopes lose `units-generation`
by design (loud degrade instead of silently running chapter semantics on
code).
