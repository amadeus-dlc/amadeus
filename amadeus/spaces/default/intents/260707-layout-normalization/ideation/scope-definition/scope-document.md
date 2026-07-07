# Scope Document

## Upstream Inputs

This scope is based on:

- `intent-statement` from Intent Capture, which defines Issue 610 as a repository architecture decision.
- `feasibility-assessment`, which finds layout normalization technically viable but high-risk as a blind directory move.
- `constraint-register`, which identifies root-level `core/`, `harness/`, `dist/`, self-install, docs, and test path assumptions.

## In Scope

### Must Have

- Compare repository layout candidates, including:
  - status quo: root-level `core/`, `harness/`, `dist/`, `scripts/`;
  - staged mixed layout: root-level framework plus package-owned installer/setup work;
  - full workspace normalization such as `packages/<name>/{core,harness,dist,scripts}`;
  - any lower-risk variant discovered during reverse engineering.
- Produce an ADR or equivalent design record linked to GitHub issue #610.
- Inventory path impact for:
  - `scripts/package.ts`;
  - `scripts/promote-self.ts`;
  - `dist/*`;
  - `.claude/`, `.codex/`, `.agents`;
  - tests and fixtures;
  - README and docs.
- Preserve existing release and drift guard expectations in the recommendation.
- If migration is recommended, provide a staged migration plan with validation checkpoints.
- If migration is not recommended, document why root-level `core/` and `harness/` should remain.

### Should Have

- Identify stable naming for any future package-owned framework directory, avoiding ambiguity between source packages and generated distributions.
- Define cross-intent coordination points with the separate `packages/setup` workflow.
- Keep the final recommendation reversible where possible.
- Keep documentation language aligned with the existing one-core-many-harnesses mental model or explicitly replace it.

### Could Have

- Introduce helper terminology for package-owned framework zones if it makes docs clearer.
- Propose follow-up issues for implementation slices if migration is selected but too large for this workflow.
- Capture candidate validation commands per migration slice.

## Out Of Scope

- Implementing `packages/setup`; the user clarified this will happen in a separate parallel intent.
- Publishing or changing the npm installer package.
- Replacing Bun, TypeScript, Biome, or the test runner.
- Replacing CI/CD.
- Hand-editing generated `dist/<harness>/` trees.
- Cloud infrastructure, AWS account, or deployment-environment changes.
- UI mockups, end-user product features, and market research.

## Scope Boundaries

This workflow may change repository documentation, design records, and possibly implementation support code only after later design stages decide that a migration or preparation slice is warranted. The default posture is decision-first: no directory move should happen before reverse engineering, application design, unit planning, and delivery planning establish a safe sequence.

`packages/setup` is an external sibling dependency. This workflow can reference it as a planned package boundary, but it must not absorb its implementation.

## Acceptance Criteria Mapping

| Issue 610 Acceptance Criterion | Scope Treatment |
| --- | --- |
| Compare repo layout candidates including `packages/<name>/{core,harness,dist,scripts}`. | Must-have design record content. |
| Record tradeoffs for status quo, staged layout, and full normalization. | Must-have ADR or equivalent section. |
| Inventory path impact for packaging, self-promotion, dist, harness installs, tests, docs. | Must-have reverse-engineering / design input. |
| If migrating, preserve release and drift guards through a staged plan. | Must-have delivery planning output. |
| If not migrating, explain why root-level `core/` and `harness/` remain. | Must-have decision record outcome. |

## Definition Of Done

- The workflow has a traceable design decision for Issue 610.
- The decision includes evidence from repository path-impact analysis.
- The chosen path explicitly handles the parallel `packages/setup` intent.
- The final artifact is clear enough for a maintainer to implement, defer, or close Issue 610 without re-litigating scope.
