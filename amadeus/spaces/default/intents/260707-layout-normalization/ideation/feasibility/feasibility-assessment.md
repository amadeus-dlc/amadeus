# Feasibility Assessment

## Upstream Basis

This assessment uses the `intent-statement` from `amadeus/spaces/default/intents/260707-layout-normalization/ideation/intent-capture/intent-statement.md` as its source. That statement defines the problem as a repository architecture decision: whether to keep root-level `core/`, `harness/`, `dist/`, and `scripts/`, continue a staged mixed layout, or normalize framework-owned code into a package-owned layout such as `packages/<name>/{core,harness,dist,scripts}`.

Market research artifacts such as `competitive-analysis`, `market-trends`, and `build-vs-buy` were not produced for this custom scope and are not required for this repository-internal design question.

## Technical Viability

The layout normalization is technically viable, but not as a blind directory move. The current repository has a strong root-level build contract:

- `scripts/package.ts` sets `REPO_ROOT`, `CORE_ROOT`, and `HARNESS_ROOT`, then builds committed `dist/<harness>/` trees from root-level `core/` and `harness/`.
- `scripts/package.ts --check` rebuilds into a temporary directory and byte-diffs against root-level `dist/`, including generated harness trees and out-of-harness files such as `dist/<name>/amadeus/`.
- `scripts/promote-self.ts` treats `dist/claude/.claude`, `dist/codex/.codex`, and `dist/codex/.agents` as the generated sources for root-level self-install trees.
- README and docs explain the architecture as a three-zone model: `core/` is what AI-DLC is, `harness/` is how each harness speaks, and `dist/` is what users copy.

Because those assumptions are centralized and explicit, migration is feasible if done through scripted path indirection and guard-preserving stages. It is high-risk if done as a one-shot move that edits imports, docs, tests, generated output, and self-install trees at once.

## Current Checkout Fact

Issue 610 mentions `packages/setup/`, but the current worktree does not contain a `packages/` directory. This means later stages must distinguish between:

- the design premise recorded in Issue 610 and the planned separate `packages/setup` intent, and
- the concrete file-system state of this checkout.

The user clarified that `packages/setup` will be handled by a separate intent in parallel. This intent should not block on that implementation. Instead, it should model `packages/setup` as a planned sibling package and keep integration points explicit.

## AWS Platform Perspective

No AWS infrastructure feasibility concern is present. This intent does not add cloud resources, accounts, regions, IAM, networking, or deployment environments. The closest platform concern is release/distribution integrity: any migration must keep repository checks deterministic and avoid introducing local-only manual packaging steps.

## Compliance And Governance Perspective

No external regulatory framework is apparent. The relevant compliance surface is governance evidence:

- a clear decision record linked to GitHub issue #610,
- preservation of generated-distribution drift guards,
- preservation of self-install drift checks,
- auditable migration checkpoints if directory moves occur,
- no hand edits to generated `dist/<harness>/` trees.

The project practices already contain strong controls for this: source changes go through `core/` or `harness/<name>/`, `dist/` is regenerated with `bun scripts/package.ts`, and self-install is updated with `bun run promote:self` when affected.

## Feasibility Conclusion

Proceed with design and impact analysis before any mechanical migration. The recommended feasibility posture is:

1. Treat full normalization as possible but not yet selected.
2. Require a path-impact inventory before implementation.
3. Preserve status quo and staged layout as valid alternatives.
4. If migration is selected, introduce path abstraction or package-root discovery first, then move one ownership boundary at a time.
5. Use `bun run dist:check`, `bun run promote:self:check`, `bun run typecheck`, `bun run lint`, and relevant `tests/run-tests.sh` profiles as non-negotiable verification gates.
