# Code Generation Plan — U6 Installer Test Harness

> Stage: construction / code-generation  
> Unit: U6 Installer Test Harness

## Scope

U6 owns deterministic unit, integration, and smoke test fixtures for `packages/setup`. It supplies typed fixture builders, fake ports/adapters, temp target builders, snapshot normalizers, and coverage handoff helpers so U1–U5 contracts are verifiable without live GitHub or real user project mutation.

## Plan

- [x] Step 1: Add shared setup test harness helpers under `tests/helpers/setup/`.
  - Traceability: BR-U6-001, BR-U6-002, BR-U6-003, domain-entities.md `FakePorts`, `TestFixture`.
  - Add `fixtures.ts`, `fake-ports.ts`, `source-fixtures.ts`, `target-fixtures.ts`, `snapshot.ts`, `coverage.ts`, and `index.ts`.

- [x] Step 2: Implement typed fixture builders for source and target states.
  - Traceability: BR-U6-006, business-logic-model.md Fixture Workflow, US-005, US-006, US-007.
  - Builders for clean, manifest-installed, manual-or-unknown, partial, none, unsupported, ambiguous harness, and codex source distribution directories.

- [x] Step 3: Implement fake ports with deterministic failure controls.
  - Traceability: BR-U6-002, BR-U6-004, BR-U6-005, US-012, stories:US-012.
  - `FakeTagSource`, `FakeArchiveSource` (transient retry + exhausted failure), `FakeTargetFiles`, `FakePromptPort`, `StubManifestReader`.

- [x] Step 4: Implement snapshot normalizer for stable CLI output.
  - Traceability: BR-U6-007, tech-stack-decisions.md Snapshot strategy.
  - Normalize temp roots, timestamps, and version placeholders in reporter output.

- [x] Step 5: Add coverage handoff helper for U7 CI.
  - Traceability: BR-U6-008, business-logic-model.md Coverage Registry Workflow.
  - Enumerate setup test files and verify `covers:` headers map to FR/US identifiers.

- [x] Step 6: Add U6 harness and integration/smoke tests (`t208-setup-test-harness.test.ts`).
  - Traceability: Required Test Matrix (business-rules.md), NFR-001–NFR-004, US-001–US-012.
  - Harness self-tests, temp-target install/upgrade, no-write collision, network retry failure, kiro ambiguity, plan/report snapshot consistency.

- [x] Step 7: Add Japanese code-summary and append U6 to construction memory.
  - Traceability: code-generation deliverables.

- [x] Step 8: Run focused verification.
  - Traceability: t202–t208, typecheck, lint, package-check, git diff --check.

## Non-Goals

- Do not refactor existing t202–t207 tests to use harness helpers in this slice (helpers are available for incremental migration).
- Do not implement U7 CI workflow YAML or coverage ratchet schema changes.
- Do not add runtime dependency additions.
- Do not require live GitHub or npm credentials.

## Verification Expectations

- Harness builders produce deterministic fake port and temp filesystem fixtures.
- Integration tests prove clean install, manifest-first upgrade, no-write collision, and archive retry failure without mutating real projects.
- Smoke tests prove CLI `--help` and bun-required behavior via harness constants.
- Snapshot normalizer removes host-specific temp paths from reporter output.
- Coverage handoff lists t202–t208 with `covers:` headers for U7.
- Generated TypeScript passes focused tests, root typecheck, and lint.
