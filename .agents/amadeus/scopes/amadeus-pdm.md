---
name: pdm
depth: Standard
keywords:
  - pdm
  - prd
  - product-discovery
description: Product planning and requirements definition without implementation
---

# pdm scope

Standard depth for product-management work that ends at a PRD: planning,
research, and requirements definition with no implementation. The full
Ideation pass plus Inception's requirements-side stages execute, and the
whole Construction and Operation phases are skipped — the endpoint artifact
set (intent-statement, competitive-analysis, build-vs-buy, scope-document,
initiative-brief, requirements, stories, personas, wireframes) is exactly a
PRD bundle.

## Why these stages, why skip those

A PdM intent produces decisions and documents, not code. So intent-capture,
market-research, feasibility, scope-definition, and approval-handoff run in
Ideation, and requirements-analysis, user-stories, and refined-mockups run
in Inception. Both mockups stages stay EXECUTE because they are CONDITIONAL
at runtime — a non-UI initiative skips them via their own condition, while a
UI-heavy one keeps wireframes in the PRD. team-formation, units-generation,
and delivery-planning are about staffing and sequencing implementation work
that will not happen here, so they are SKIP; practices-discovery and
reverse-engineering are engineering-side surveys (the infra scope sets the
precedent for skipping reverse-engineering); application-design and every
Construction / Operation stage are SKIP because there is nothing to build
or run. No new stage exists for "artifact generation" — the PRD is the sum
of the existing stages' produces (Issue #429's parity constraint).

## Membership

Keyword triggers: `pdm`, `prd`, `product-discovery`. Initialization, the
six Ideation stages above, and the three Inception requirements-side
stages execute — 12 stages total.
