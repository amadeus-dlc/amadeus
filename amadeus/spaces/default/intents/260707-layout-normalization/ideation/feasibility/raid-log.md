# RAID Log

## Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R-01 | Full normalization causes widespread path churn across scripts, tests, docs, generated dist, and self-install trees. | High | High | Inventory path assumptions before selecting a migration option; prefer staged migration. |
| R-02 | A one-shot move breaks `dist:check` or `promote:self:check`. | Medium | High | Keep existing checks as hard gates; migrate path discovery before moving directories. |
| R-03 | The design over-optimizes for MECE layout and loses the current simple maintainer mental model. | Medium | Medium | Compare status quo and staged layout honestly; require no-migration rationale if selected. |
| R-04 | Issue 610 assumes `packages/setup/`, but the current checkout lacks `packages/` and that package is planned in a separate parallel intent. | Medium | Medium | Treat `packages/setup` as an external sibling dependency; do not absorb installer implementation into this workflow. |
| R-05 | Generated `dist/` becomes confused with package source if nested under `packages/<name>/dist`. | Medium | High | Preserve generated-output labeling and drift guard semantics in any candidate layout. |

## Assumptions

| ID | Assumption | Validation |
| --- | --- | --- |
| A-01 | The goal is a design decision first, not immediate mechanical migration. | Matches Issue 610 acceptance criteria and approved custom scope. |
| A-02 | Existing root-level `core/` and `harness/` remain valid candidates. | Explicitly required by the acceptance criterion for no-migration rationale. |
| A-03 | The current CI/release guard set should remain authoritative. | Team and project practices mandate drift, typecheck, lint, and test validation. |
| A-04 | No cloud infrastructure or regulated data-flow change is in scope. | Supported by repository inspection and issue text. |

## Issues

| ID | Issue | Owner | Disposition |
| --- | --- | --- | --- |
| I-01 | `packages/` is absent in this checkout even though Issue 610 references `packages/setup/`. | Architect / Developer | User clarified `packages/setup` is a separate parallel intent; model it as a planned sibling dependency. |
| I-02 | Existing custom scope data was added under `.codex/` for this workflow. | Conductor | Preserve as runtime composed scope data; do not treat it as generated `dist` drift. |

## Dependencies

| ID | Dependency | Why It Matters |
| --- | --- | --- |
| D-01 | GitHub issue #610 | Source of acceptance criteria and traceability. |
| D-02 | `intent-statement` | Upstream scope and success metric definition for this stage. |
| D-03 | `scripts/package.ts` | Primary packaging path assumption surface. |
| D-04 | `scripts/promote-self.ts` | Primary self-install path assumption surface. |
| D-05 | README and docs | Current user/maintainer explanation of repository layout. |
| D-06 | Existing drift/test commands | Verification gates for any future migration. |
| D-07 | Parallel `packages/setup` intent | Sibling package context for layout candidates; not an implementation dependency that blocks this workflow. |
