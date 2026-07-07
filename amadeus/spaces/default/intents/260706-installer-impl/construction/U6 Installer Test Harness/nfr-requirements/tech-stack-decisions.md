# Tech Stack Decisions — U6 Installer Test Harness

> Stage: construction / nfr-requirements  
> Unit: U6 Installer Test Harness  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Test runtime | Bun test runner with TypeScript | Matches `technology-stack.md` and installer runtime constraint. |
| Fixture model | typed fixture builders | Keeps U1-U5 cases deterministic and reusable without broad ad hoc setup. |
| External dependencies | fake ports for GitHub, archive, filesystem faults, prompt, manifest, and verification | Satisfies BR-U6-002 and enables failure injection. |
| Temp filesystem | per-test isolated temp directories | Prevents real user project mutation and flakes. |
| Snapshot strategy | focused snapshots with normalizers | Verifies human-readable CLI UX without host-path churn. |
| Coverage quality floor | requirement/story coverage registry plus ratchet | Implements BR-U6-008 and feeds U7 CI. |
| Smoke commands | small installer command set for `--help`, install, and no-write collision | Provides executable confidence without slow broad e2e. |
| Release credentials | excluded from U6 | Publication belongs to U8 and must not be required for deterministic tests. |

## Dependency Policy

- Prefer built-in Bun test features and local helpers.
- Avoid adding snapshot, fixture, or assertion dependencies unless Bun test primitives are insufficient.
- Any test-only dependency must be documented and must not become an installer runtime dependency.
- No test dependency may require live GitHub or npm credentials for deterministic CI.

## Command Surface For U7

| Command | Purpose |
|---|---|
| installer unit tests | parser, resolver, planner, manifest schema, and pure helpers |
| installer integration tests | temp filesystem, apply, manifest, verification, backup behavior |
| installer smoke tests | package executable and minimal CLI behavior |
| installer snapshot tests | stable reporter and classified error output |
| coverage registry check | Must requirement/story mapping freshness |
| coverage ratchet check | coverage mapping does not decrease unexpectedly |

Concrete package script names are owned by code-generation/build-and-test, but U6 requires each command to be independently callable by U7 CI.

## Interfaces To Keep Stable

- fixture builders for tags, archives, source distributions, target states, manifests, plans, prompts, and apply failures.
- fake port call-history format for ordering assertions.
- coverage registry schema mapping test id to FR/US identifiers.
- normalized snapshot serializer for temp roots, separators, timestamps, and version placeholders.
- smoke command result model containing command, cwd, exit code, stdout, stderr, and normalized duration.

## Alternatives Rejected

| Alternative | Reason |
|---|---|
| live GitHub integration in blocking tests | creates flakes and violates deterministic CI requirement. |
| real user project fixtures | risks destructive mutation and host-specific failures. |
| line coverage percentage as primary gate | does not prove Must requirement coverage. |
| broad golden snapshots for large plans | hard to review and fragile across formatting changes. |
| npm publish dry-run inside U6 | belongs to U7/U8 package validation and release gates. |

## Upstream Coverage

- `business-logic-model.md`: test layers, fixture workflow, coverage registry workflow, and integration boundaries define technology needs.
- `business-rules.md`: required test matrix and invariants drive fake ports, registry, and snapshot choices.
- `requirements.md`: FR-001 through FR-016 and NFR-001 through NFR-006 define the verification surface.
- `technology-stack.md`: Bun, TypeScript, existing CI, and dependency posture are the baseline.

