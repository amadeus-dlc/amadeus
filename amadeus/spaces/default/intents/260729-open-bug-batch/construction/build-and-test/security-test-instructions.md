# Security Test Instructions — open-bug-batch

Upstream: `construction/*/code-generation/code-summary.md`. Strategy: Comprehensive. Security is the core NFR of issue-1680 (caller authorization) and issue-1681 (mirror authorization receipts).

## Focus areas

1. **Caller authorization boundary (issue-1680)**
   - `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` — adversarial matrix: reviewer/support/explore roles attempt `next` / `report` / `park` / `gate-reserve` / `gate-reject` / direct state mutation; all must be denied with state + audit + reservation-dir byte-invariance
   - Existing-reservation path: an ambient subagent must not retrieve an already-armed `presence_reservation_id` carrier
   - fail-closed lifecycle: missing/malformed/locked markers, deny latch, SessionEnd cleanup
   - main-conductor compatibility matrix (host-stamped main keeps `next`/`report`/`park`/state mutation)
2. **Gate provenance (issue-1680 / FR-1680-3)**
   - `t-solo-gate-transaction-carrier` tests: carrier-bound approval, stale/foreign HUMAN_TURN rejection, Request-Changes carrier retirement
3. **Mirror authorization (issue-1681)**
   - `t282-amadeus-mirror-lifecycle`, `t265` engine boundary: receipt-boundary idempotency and authorization evidence
4. **Static checks**
   - `bun run lint` (Biome) and `bun run typecheck` as the static floor; no SAST/DAST tooling is configured in this repo

## Commands

```sh
bun test tests/integration/t365-kimi-reviewer-boundary.integration.test.ts
bun test tests/integration/t-solo-gate-transaction-carrier.test.ts tests/integration/t-kimi-adapter.test.ts
bun run typecheck && bun run lint
```

## Expectations

- Any change to `amadeus-orchestrate.ts` / `amadeus-state.ts` / Kimi hooks must extend the adversarial matrix, not just the happy path
- State and audit byte-invariance assertions are mandatory for every new denial case
