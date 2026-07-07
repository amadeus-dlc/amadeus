# Intent Statement

## Problem Statement

The repository currently mixes two responsibility axes:

- Package-owned layout is starting to appear under `packages/`, currently with `packages/setup/`.
- Framework-owned source, harness, generated distribution, and build scripts remain at root under `core/`, `harness/`, `dist/`, and `scripts/`.

That staged layout was a deliberate low-risk choice for the initial installer work, but it is not a complete repository architecture decision. The unresolved question is whether Amadeus should keep the root-level framework layout, continue with a mixed staged layout, or normalize the framework side into a package-owned structure such as `packages/<name>/{core,harness,dist,scripts}`.

## Target Customer

The primary customer is the maintainer and contributor group responsible for changing Amadeus itself. They need a layout model that makes source ownership, generated artifacts, package boundaries, and release checks understandable without weakening existing drift guards.

Secondary beneficiaries are users of the framework, because clearer packaging boundaries reduce release mistakes and make installation behavior easier to reason about.

## Success Metrics

- A design record compares at least these options: status quo, staged layout continuation, and full workspace normalization.
- The comparison includes a `packages/<name>/{core,harness,dist,scripts}` candidate.
- Path impact is inventoried for `scripts/package.ts`, `scripts/promote-self.ts`, `dist/*`, `.claude/`, `.codex/`, `.agents/`, tests, and docs.
- If migration is selected, the plan preserves existing release and drift guards during a staged migration.
- If migration is rejected, the record explains why root-level `core/` and `harness/` should remain.

## Initiative Trigger

The trigger is the follow-up from the `260706-installer-impl` staged layout decision. The installer work added package structure in a narrow place to control blast radius. Issue 610 exists because the broader repository layout now needs an explicit design decision instead of remaining an implicit side effect of that earlier tradeoff.

## Initial Scope Signal

This is a brownfield repository-architecture design intent, not a market-facing feature and not an immediate mechanical move. The approved Amadeus scope is `workspace-layout-normalization`, a custom Standard-depth workflow that emphasizes feasibility, scope, reverse engineering, practices, requirements, application design, unit planning, delivery planning, functional design, implementation only if warranted, and build/test verification.
