# Code Generation Plan — U8 Manual Release And Docs

> Stage: construction / code-generation  
> Unit: U8 Manual Release And Docs

## Scope

U8 owns the manual `workflow_dispatch` release workflow for `@amadeus-dlc/setup`, release preflight scripts that reuse U7 gates unconditionally, user-facing installer docs, and release/docs wiring tests. Real npm publish runs only when `dry_run:false` with protected environment approval.

## Plan

- [x] Step 1: Add release tag selector and release validation plan builder.
  - Traceability: BR-U8-010..BR-U8-014, domain-entities.md `ReleaseTagSelection`, `ReleaseValidationPlan`.
  - Add `release-tag-selector.ts`, `release-preflight.ts`.

- [x] Step 2: Add release build/evidence and publish validation scripts.
  - Traceability: BR-U8-022, BR-U8-025, BR-U8-026, business-logic-model.md build/sbom/publish-validation.
  - Add `build-package.ts`, `release-evidence.ts`, `publish-validate.ts`.

- [x] Step 3: Add post-publish verification and docs consistency gate.
  - Traceability: BR-U8-030..BR-U8-036, BR-U8-041, business-logic-model.md docs workflow.
  - Add `post-publish-verify.ts`, `docs-consistency.ts`.

- [x] Step 4: Add manual release GitHub Actions workflow.
  - Traceability: BR-U8-001..BR-U8-005, cicd-pipeline.md, FR-017.
  - Add `.github/workflows/release-setup.yml` with `workflow_dispatch`, U7 preflight, dry-run default, protected publish job.

- [x] Step 5: Update user-facing installer docs.
  - Traceability: BR-U8-030..BR-U8-035, US-011, FR-015.
  - Update root `README.md` and `packages/setup/README.md` for installer-first guidance.

- [x] Step 6: Add release/docs wiring tests (`t210-setup-release-docs.test.ts`).
  - Traceability: reliability-requirements.md, US-009, US-013.

- [x] Step 7: Add Japanese code-summary and append U8 to construction memory.
  - Traceability: code-generation deliverables.

- [x] Step 8: Run focused verification.
  - Traceability: t202–t210, typecheck, lint, package-check, git diff --check.

## Non-Goals

- Do not auto-publish on `main` merge or tag push.
- Do not add runtime dependencies to `@amadeus-dlc/setup`.
- Do not replace U7 PR gate classifier; release mode bypasses changed-file skip only in release workflow.

## Verification Expectations

- `workflow_dispatch` release workflow exists with dry-run default and guarded publish job.
- Release preflight runs all U7 gates unconditionally for selected tag checkout.
- Docs enforce installer-first `install` / `upgrade` guidance and forbid `init`.
- `t210-setup-release-docs.test.ts` validates tag selection, preflight plan, docs, and workflow wiring.
- t202–t210 pass with typecheck, lint, package-check, and `git diff --check`.
