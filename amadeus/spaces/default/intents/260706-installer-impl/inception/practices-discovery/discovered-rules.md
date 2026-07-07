# Discovered Rules

## Mandated

- ALWAYS edit `core/` or `harness/<name>/` as the source of truth, then regenerate `dist/` with `bun scripts/package.ts`.
- ALWAYS run `bun run promote:self` after source changes that affect the self-installed `.claude/`, `.codex/`, `.agents/`, or `CLAUDE.md` trees.
- ALWAYS include `bun run dist:check` and `bun run promote:self:check` in installer-related validation because the installer depends on generated distribution parity.
- ALWAYS validate installer changes with `bun run typecheck`, `bun run lint`, and the relevant `tests/run-tests.sh` profile before merge.
- ALWAYS treat the first installer Construction Bolt as a small end-to-end package setup slice and gate it before broader installer expansion.

## Forbidden

- NEVER hand-edit `dist/<harness>/` as an implementation shortcut.
- NEVER let source, distribution, and self-install trees drift across commits when installer behavior changes.
- NEVER rely on a local-only manual checklist for installer release readiness when a deterministic drift guard already exists.
- NEVER add runtime dependencies to the shipped framework without documenting why the user-side Bun-only premise changes.
