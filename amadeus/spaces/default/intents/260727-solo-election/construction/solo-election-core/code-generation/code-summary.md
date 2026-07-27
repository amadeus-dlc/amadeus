# Code Summary — solo-election-core (U1)

## Files Modified

| Path | Change |
|------|--------|
| `packages/framework/core/tools/amadeus-election-model.ts` | Added `split` HoldReason; 2-voter branch in `tally()` |
| `packages/framework/core/tools/amadeus-election.ts` | Added `split` HOLD_RESOLUTIONS (adopted/rejected/reopen) |
| `specs/tla/FormalElection.tla` | Added SPLIT hold reason; 2-voter HoldReason branch |
| `specs/tla/model-map.json` | Updated model + impl SHA identities |
| `tests/unit/t234-election-model.test.ts` | 2-voter FR-05 tests; 3+ voter regression preserved |
| `tests/integration/t236-election-loop.integration.test.ts` | Solo subagent 2-0 established + 1-1 split integration |
| Harness dist + self-install | Regenerated via `bun run dist` / `promote:self` |

## Key Implementation Decisions

- **2-voter detection** uses `election.voters.length === 2` (declaration count, ADR-2) — transport-agnostic.
- **Split hold** fires when favor=1 and against=1 before choice winner logic, even on same choice (FR-05 iii).
- **3+ voter path** unchanged (discuss≥2, quorum-short when favor+against=0).
- **TLA** uses `Cardinality(Voters) = 2` branch; default cfg still uses 3 voters (3+ path exercised in TLC).

## Test Coverage

- **t234**: 26 unit tests green — includes failing-proof cases {5,1}/{4,1}/{1,7} as holds, 3-voter lone-GoA-5 still establishes.
- **t236**: New solo subagent integration — 2-0 established walk + split hold after tallied report.
- **t244 / regression**: Verified green alongside t234/t236 election suite.
- **dist:check / promote:self:check**: exit 0.

## Deviations from Plan

- Subagent delegation blocked (usage limit); conductor implemented inline.
- TLC 2-voter instance cfg not added separately — TLA semantics updated structurally; full 2-voter TLC exploration deferred to build-and-test stage.

## Walking Skeleton Status

- **2-0 established**: integration test `E-SOLO1` — subagent ballots, tally established, tallied report OK.
- **1-1 split escalation**: integration test `E-SOLO2` — split hold after tally, state=hold (human resolution path ready).
