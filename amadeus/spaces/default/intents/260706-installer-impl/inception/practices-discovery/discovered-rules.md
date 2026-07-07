# Discovered Rules

## Mandated

- ALWAYS add installer source under `packages/setup/` for this intent while keeping the existing `core/`, `harness/`, `dist/`, and `scripts/` layout in place.
- ALWAYS treat a full repository package-layout normalization as a separate refactor, not part of the installer implementation scope.
- ALWAYS edit `core/` or `harness/<name>/` as the framework source of truth, then regenerate `dist/` with `bun scripts/package.ts`.
- ALWAYS run `bun run promote:self` after source changes that affect the self-installed `.claude/`, `.codex/`, `.agents/`, or `CLAUDE.md` trees.
- ALWAYS include `bun run typecheck`, `bun run lint`, `bun run dist:check`, `bun run promote:self:check`, installer smoke/unit/integration tests, and coverage registry/ratchet checks as blocking installer PR validation.
- ALWAYS release the installer through a manually triggered GitHub Actions `workflow_dispatch` release flow that normally publishes from the latest stable tag.
- ALWAYS make deterministic installer PR security checks blocking, including package dry-run, installer smoke/integration, dependency audit or OSV, and secret scanning.
- ALWAYS require SBOM/provenance generation in the release workflow for installer publication.
- ALWAYS make `amadeus-setup` human-readable by default while keeping internal operations structured enough for tests and automation.
- ALWAYS fail non-interactive installer conflicts unless the user provided an explicit force or backup policy.

## Forbidden

- NEVER convert the root dev-only `package.json` into the publishable installer package for this intent.
- NEVER move existing `core/`, `harness/`, `dist/`, or `scripts/` paths during this installer implementation unless a separate repo-layout refactor is explicitly approved.
- NEVER hand-edit `dist/<harness>/` as an implementation shortcut.
- NEVER let source, distribution, and self-install trees drift across commits when installer behavior changes.
- NEVER use line coverage percentage as the primary installer quality floor unless the team explicitly replaces the coverage registry/ratchet practice.
- NEVER publish the installer automatically on ordinary `main` merge without a human-triggered release gate.
- NEVER treat security/supply-chain checks as advisory-only for installer-related PRs when they can be deterministically evaluated.
- NEVER make JSON envelopes the default user-facing `amadeus-setup` output style.
