---
slug: conformance-fixture
phase: construction
---

# Formal Model Check (fixture fragment)

This fixture reproduces the shape of a composed plugin stage body that carries a
repo-only `scripts/` reference — the exact class of distribution-boundary
violation t377's sweep must flag. A shipped plugin runs from the host workspace,
where the repository's own scripts tree does not exist, so such a reference is
unusable at the destination.

Both the narrative mention above and the runnable command below are violations
(BR-U3-3: no prose exemption); the guard over this fixture with the empty plugin
allowlist MUST return more than one finding.

```
bun scripts/fixture-tools/run-fixture.ts --mode probe
```
