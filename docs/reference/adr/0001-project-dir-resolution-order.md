# ADR-0001: Project Directory Resolution Order

> Languages: **English** | [日本語](0001-project-dir-resolution-order.ja.md)

- Status: Accepted
- Date: 2026-08-20
- Scope: `resolveProjectDir` and `resolveProjectDirFromHook`

## Context

Issue #1279 established that cursor-dependent engine paths can fail after the
project-directory ladder has already returned a value. When
`CLAUDE_PROJECT_DIR` points at the wrong workspace, active-space or active-intent
resolution can come up empty under that project directory even though the
environment rung behaved according to contract. Issue #1287 (E-DAGRA3)
therefore required an ADR before changing this cross-cutting order. The same
precedence exists in the CLI and hook resolvers; changing only one would create
a new asymmetry.

The canonical workspace predicate is an `amadeus/` directory together with a
known harness `tools/` directory. A marker miss is not proof that the caller's
explicit environment override is invalid: tests,
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

### Option 2: Keep environment precedence and diagnose cursor-resolution failure

Retain the existing contract, but when active-space or active-intent resolution
fails under the selected project directory, emit a stderr diagnostic naming the
project directory and the provenance of the selected value (`CLAUDE_PROJECT_DIR`,
workspace marker, script path, or CWD). This diagnoses the failure at the cursor
resolution boundary, where the actionable problem is known, while leaving
marker-less scratch fixtures silent when they never attempt cursor resolution.

## Decision

Choose Option 2. `CLAUDE_PROJECT_DIR` remains above the workspace-marker,
script-path, and CWD fallback rungs in both resolvers. The resolver records the
source of the selected project directory through a small provenance seam. When
cursor resolution fails under a project directory that has intent records, the
failure surface emits one diagnostic naming both the project directory and its
source. Project-directory resolution itself remains silent and returns the
selected value unchanged.

## Consequences

- Existing explicit environment overrides remain compatible.
- Cursor failures name the project directory and provenance at the point where
  active-space or active-intent resolution fails.
- Scratch fixtures that never resolve cursors produce no new stderr.
- A future priority change remains a separate ADR-level decision and must
  revisit the callers named under Option 1.
