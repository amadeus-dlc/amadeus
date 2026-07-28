# Unit Test Instructions — 260727-solo-election

## Framework

- **Runner:** `bun test` via `tests/run-tests.ts`
- **Strategy:** Comprehensive (10–15 tests per component floor)

## U1: Election Model (t234)

```bash
bun test tests/unit/t234-election-model.test.ts
```

### Coverage Targets

| Area | Tests |
|------|-------|
| 2-voter FR-05 holds ({5,1}, {4,1}, {1,7} → hold) | `tally GoA holds: 2-voter rules` |
| 3+ voter regression (lone GoA-5 still establishes) | same test block |
| split HoldReason | hold reason assertion |
| Existing t234 regression | all 26 cases green |

## Formal Verification Oracle (arm-s)

```bash
bun test tests/unit/t-formal-verif-arm-s-oracle.test.ts
```

Ensures `SubjectTally` type includes `split` after model extension.

## Upstream References

- `construction/solo-election-core/code-generation/code-generation-plan.md` Steps 1–4
- `construction/solo-election-core/code-generation/code-summary.md`
