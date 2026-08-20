# ADR-0001: Project Directory Resolution Order

- Status: Accepted
- Date: 2026-08-20
- Scope: `resolveProjectDir` and `resolveProjectDirFromHook`

## Context

Issue #1279 established that the project-directory ladder can determine
whether cursor-dependent engine paths work at all. When `CLAUDE_PROJECT_DIR`
points at a main checkout or another tree that is not a marker-carrying
workspace, the environment rung fixes the process on that non-resolving tree.
Issue #1287 (E-DAGRA3) therefore required an ADR before changing this
cross-cutting order. The same precedence exists in the CLI and hook resolvers;
changing only one would create a new asymmetry.

The canonical workspace predicate is an `amadeus/` directory together with a
known harness `tools/` directory. A marker miss is a diagnosable condition,
not proof that the caller's explicit environment override is invalid: tests,
scratch projects, and callers intentionally targeting a different workspace
depend on the override remaining authoritative.

## Options considered

### Option 1: Put script-path resolution above the environment rung

Use the physical location of the tool or hook as the project root before
consulting `CLAUDE_PROJECT_DIR`. This could avoid pinning a worktree session to
a non-resolving environment path, but it would override the documented way to
target another workspace. It would affect hook startup, team worktrees,
fixtures, and scratch project-root overrides and would require a full caller
inventory before adoption.

### Option 2: Keep environment precedence and add loud mismatch diagnostics

Retain the existing contract, but when the environment value is outside a
marker-carrying workspace, emit one stderr diagnostic naming the value, the
failed marker predicate, and the directory the next rung would select. This
preserves intentional overrides while making the cursor/worktree mismatch
visible to operators and CI.

## Decision

Choose Option 2. `CLAUDE_PROJECT_DIR` remains above the workspace-marker,
script-path, and CWD fallback rungs in both resolvers. A marker-miss diagnostic
is emitted at most once per process, and the resolver returns the environment
value unchanged. If the environment value itself is inside or below a
marker-carrying workspace, no diagnostic is emitted.

## Consequences

- Existing explicit environment overrides remain compatible.
- Worktree and cursor failures caused by a marker-less environment value are
  visible on stderr instead of being silent.
- The diagnostic is bounded to one line per process, so repeated resolver calls
  do not flood logs.
- A future priority change remains a separate ADR-level decision and must
  revisit the callers named under Option 1.
