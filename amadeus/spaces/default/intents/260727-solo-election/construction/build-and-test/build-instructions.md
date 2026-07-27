# Build Instructions — 260727-solo-election

## Prerequisites

- **bun** on PATH (required by project policy)
- No additional env vars for this intent (election model changes are pure TS)

## Dependency Installation

```bash
cd /Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.claude/worktrees/supervise-feature
bun install
```

## Build / Compile

This intent adds no new packages. Verify TypeScript compiles:

```bash
bun run typecheck
```

Expected: exit 0 (validates `tsconfig.json` + `tsconfig.tests.json`).

## Harness Sync Verification

After changes to `packages/framework/core/tools/` or `packages/framework/core/skills/`:

```bash
bun run dist:check
bun run promote:self:check
```

Expected: both exit 0.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `HoldReason` type mismatch after adding `split` | Update `SubjectTally` in `scripts/formal-verif/arm-s-oracle.ts` |
| dist:check drift | Run `bun scripts/package.ts --apply` |
| promote:self:check drift | Run `bun run promote:self` |

## Upstream References

- U1: `construction/solo-election-core/code-generation/code-summary.md`
- U2: `construction/solo-election-surface/code-generation/code-summary.md`
