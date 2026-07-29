---
name: feature-known-market-team
depth: Standard
keywords: []
description: Feature scope with market-research and team-formation skipped (market and team already known)
---

# feature-known-market-team scope

The `feature` lifecycle scope with two stages dropped: `market-research` (1.2)
and `team-formation` (1.5). Use this when the market is already understood and
the team is already assembled — the full greenfield lifecycle runs otherwise.

## Why these two stages

`market-research` is skipped because the team already knows the competitive
landscape and user need; no external research is required before ideation.
`team-formation` is skipped because the roster and RACI are already settled;
the conductor still adopts domain-expert personas inline at each stage.

All other 30 stages remain EXECUTE — the full construction and operation
ceremony is preserved. This scope honours the request precisely without
stripping additional ceremony.

## Membership

30 stages EXECUTE (all except `market-research` and `team-formation`).
This scope ships with `keywords: []` and will not participate in automatic
scope detection; invoke it explicitly via `--scope feature-known-market-team`.
