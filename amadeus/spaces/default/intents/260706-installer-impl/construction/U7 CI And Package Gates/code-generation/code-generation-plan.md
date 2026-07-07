# Code Generation Plan — U7 CI And Package Gates

> Stage: construction / code-generation  
> Unit: U7 CI And Package Gates

## Scope

U7 owns installer-related PR gate selection, blocking package/test/coverage/security/drift validation, and U8 handoff-ready CI artifacts. It does not publish npm packages or configure release credentials.

## Plan

- [x] Step 1: Add installer change detector and gate registry/planner.
  - Traceability: BR-U7-001, BR-U7-002, BR-U7-003, BR-U7-006, domain-entities.md `InstallerChangeSet`, `GatePlan`.
  - Add `change-detector.ts`, `gate-registry.ts`, `gate-planner.ts`.

- [x] Step 2: Extend package metadata gate and add package dry-run gate.
  - Traceability: BR-U7-010, BR-U7-011, BR-U7-012, business-logic-model.md package gates.
  - Add `--report` to `package-check.ts`; add `package-dry-run.ts`.

- [x] Step 3: Add installer smoke/integration CI runners from U6 harness.
  - Traceability: BR-U7-020, BR-U7-021, BR-U7-024, business-logic-model.md smoke/integration contract.
  - Add `tests/setup/run-installer-smoke.ts`, `tests/setup/run-installer-integration.ts`.

- [x] Step 4: Add installer coverage registry/ratchet gate.
  - Traceability: BR-U7-022, BR-U7-023, business-logic-model.md Coverage Registry Workflow.
  - Add `coverage-gate.ts`; extend `tests/.coverage-ratchet.json` with `installer` baseline.

- [x] Step 5: Add normalized security gates and scanner adapters.
  - Traceability: BR-U7-030, BR-U7-031, BR-U7-033, BR-U7-035, BR-U7-036, BR-U7-037.
  - Add `security-gate.ts`, `scanner-adapters.ts`, `packages/setup/security/vulnerability-allowlist.json`.

- [x] Step 6: Wire GitHub Actions installer gate job.
  - Traceability: cicd-pipeline.md, US-010, FR-016.
  - Extend `.github/workflows/ci.yml` with `installer-gates` job, change detection, artifact upload.

- [x] Step 7: Add gate wiring tests (`t209-setup-ci-gates.test.ts`).
  - Traceability: reliability-requirements.md classifier/registry/security fixtures.

- [x] Step 8: Add Japanese code-summary and append U7 to construction memory.
  - Traceability: code-generation deliverables.

- [x] Step 9: Run focused verification.
  - Traceability: t202–t209, typecheck, lint, package-check, git diff --check.

## Non-Goals

- Do not implement U8 manual release workflow or npm publish.
- Do not add runtime dependency additions to `@amadeus-dlc/setup`.
- Do not auto-fix dist/self-install drift in CI.
- Do not weaken existing global `check` job gates.

## Verification Expectations

- Installer-related paths produce a required `GatePlan` with stable check names.
- Non-installer PRs skip package-specific gates without failing the workflow.
- Package metadata and dry-run gates reject invalid publish contents.
- Smoke/integration runners execute without live GitHub or real project mutation.
- Coverage gate enforces installer `covers:` freshness and ratchet baseline.
- Security gate validates normalized findings, allowlist exceptions, and secret redaction.
- CI uploads `.amadeus-ci/setup/` artifacts for U8 handoff.
