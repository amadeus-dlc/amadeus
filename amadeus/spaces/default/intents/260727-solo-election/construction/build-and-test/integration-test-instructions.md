# Integration Test Instructions — 260727-solo-election

## U1: Election CLI Loop (t236)

```bash
bun test tests/integration/t236-election-loop.integration.test.ts
```

### Key Scenarios

| Test | FR/BR |
|------|-------|
| `solo-election U1: subagent 2-voter loop` | FR-01/03/05 — 2-0 established + 1-1 split hold |
| Existing directive loop | regression |

## U2: SKILL Guards (t242 + t269)

```bash
bun test tests/integration/t242-election-skill-vocabulary.integration.test.ts \
         tests/integration/t269-election-solo-skill-template.integration.test.ts
```

### Coverage Targets

| Test file | Validates |
|-----------|-----------|
| t242 | BR-K1/K3/K4 — 4-section structure, forbidden rule vocabulary |
| t269 | BR-U2-1..8 — spawn template, activation sync, team.md alignment |

## Combined Election Suite

```bash
bun test tests/unit/t234-election-model.test.ts \
         tests/integration/t236-election-loop.integration.test.ts \
         tests/integration/t242-election-skill-vocabulary.integration.test.ts \
         tests/integration/t269-election-solo-skill-template.integration.test.ts
```

Expected: 63 pass, 0 fail.

## Upstream References

- U1/U2 code-summary.md files under `construction/*/code-generation/`
