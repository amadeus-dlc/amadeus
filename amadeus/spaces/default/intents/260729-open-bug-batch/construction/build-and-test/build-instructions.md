# Build Instructions — open-bug-batch

Upstream: `construction/*/code-generation/code-generation-plan.md`, `construction/*/code-generation/code-summary.md` (8 units: issue-1336, issue-1607, issue-1662, issue-1663, issue-1664, issue-1667, issue-1680, issue-1681).

## Prerequisites

- Bun 1.3.13+ (`export PATH="$HOME/.bun/bin:$PATH"` if the installer line is not sourced)
- Each unit's code lives in its own Bolt worktree under `.amadeus/worktrees/bolt-issue-*`; merged units (issue-1607, issue-1681) are on `main`

## Dependency installation

```sh
bun install --frozen-lockfile
```

## Build / verification commands

This is a Bun-only TypeScript monorepo — there is no compile/bundle step. "Build" = typecheck + lint + generated-surface drift guards.

```sh
bun run typecheck                 # tsc --noEmit (tsconfig + tsconfig.tests)
bun run lint                      # biome; exits 0 with existing cognitive-complexity warnings (baseline)
bun tests/complexity-gate.ts --check   # CCN ratchet: 0 new violations / 0 regressions required
bun scripts/package.ts --check    # dist/* drift guard (regenerate with: bun scripts/package.ts)
bun run promote:self:check        # promoted AGENTS.md/CLAUDE.md suffix drift guard
```

## Build verification

- All commands above exit 0
- `bun run lint` warnings are the expected baseline, not a regression
- If `package.ts --check` fails after editing `packages/framework/**`, run `bun scripts/package.ts` and commit the regenerated `dist/` trees

## Troubleshooting

- `bun: command not found` → prefix `export PATH="$HOME/.bun/bin:$PATH"`
- Stale `dist/` drift failures after framework-source edits → regenerate, never hand-edit `dist/`
- Bolt worktrees have their own `node_modules`; run `bun install --frozen-lockfile` inside the worktree after a rebase
