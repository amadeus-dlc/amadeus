# Initiative Brief

## Initiative

GitHub issue #610 asks the project to decide whether the Amadeus repository should normalize framework-owned code into a package-owned layout such as `packages/<name>/{core,harness,dist,scripts}`, continue the staged mixed layout, or retain the current root-level framework structure.

## Problem

The current architecture is explicitly documented as a root-level three-zone model:

- `core/` is the harness-neutral source of truth.
- `harness/` contains authored harness-specific surfaces.
- `dist/` contains generated committed distributions that users copy.

Issue 610 raises a structural concern: future package-owned work such as the separate `packages/setup` intent may make the repo read as a mix of package-owned and root-owned responsibility boundaries. That may be acceptable, but it should be an explicit decision rather than an accidental result of staged installer work.

## Scope Summary

In scope:

- Compare status quo, staged mixed layout, full workspace normalization, and any lower-risk variant discovered during reverse engineering.
- Produce an ADR or equivalent decision record linked to issue #610.
- Inventory path impact for packaging, self-promotion, generated distributions, harness installs, tests, README, and docs.
- Preserve existing drift and release guard semantics.
- Plan a staged migration if migration is selected, or document no-migration rationale if root-level `core/` and `harness/` remain.

Out of scope:

- Implementing `packages/setup`.
- Publishing/changing the npm installer package.
- Replacing Bun, TypeScript, Biome, CI, or the test runner.
- Hand-editing generated `dist/<harness>/`.
- Cloud infrastructure, UI, or market research work.

## Feasibility And Risk Highlights

The work is feasible as a design and possible migration, but high-risk as a one-shot directory move. Key constraints:

- `scripts/package.ts` currently derives root-level `CORE_ROOT`, `HARNESS_ROOT`, and `dist` paths.
- `scripts/promote-self.ts` uses root-level `dist/` as the source for root-level self-install trees.
- README/docs and tests contain explicit root-level path assumptions.
- The current checkout has no `packages/` directory; the user clarified `packages/setup` is a separate parallel intent.

Primary mitigations:

- Run reverse engineering before any migration decision.
- Treat `packages/setup` as an external sibling dependency.
- Keep `bun run dist:check`, `bun run promote:self:check`, `bun run typecheck`, `bun run lint`, and relevant `tests/run-tests.sh` profiles as hard verification gates.

## Handoff To Inception

The initiative is ready for Inception. The next stage should perform reverse engineering focused on:

- concrete root-level path assumptions in scripts, tests, README, and docs;
- generated distribution ownership and drift guard behavior;
- self-install promotion behavior;
- candidate package-owned layout effects;
- explicit cross-intent dependency on `packages/setup`.

## Go / No-Go Recommendation

Go to Inception.

This is not approval to migrate files. It is approval to gather detailed path-impact evidence and design a decision-ready layout recommendation for issue #610.
