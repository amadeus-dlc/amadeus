# Code Generation Plan — U5 Apply Verify And UX

> Stage: construction / code-generation  
> Unit: U5 Apply Verify And UX

## Scope

U5 turns an approved `FileOperationPlan` into user-visible output and target filesystem effects. It owns Reporter plan/result rendering, Prompt Adapter confirmation, File Applier execution, manifest write after successful apply, manifest-write failure classification, and post-apply verification. It does not resolve versions, detect target state, or recalculate planning policy.

## Plan

- [x] Step 1: Add U5 apply, verification, and result domain types.
  - Traceability: BR-U5-006a, BR-U5-006b, domain-entities.md `ApplyResult`, `VerificationResult`, `SetupResult`, `ApplyDecision`, `ManifestWriteResult`.
  - Add discriminated `ApplyResult`, `ApplyDecision`, `VerificationResult`, `SetupResult`, and manifest write status types.

- [x] Step 2: Define filesystem and manifest store ports.
  - Traceability: BR-U5-012, infrastructure-design deployment architecture, tech-stack-decisions.md.
  - Add `TargetFilePort` with copy, backup, existence, and atomic write methods.
  - Add `ManifestStorePort` with `writeManifestAtomic`.

- [x] Step 3: Implement file applier (`applyPlan`).
  - Traceability: BR-U5-002, BR-U5-003, BR-U5-004, BR-U5-005, BR-U5-006, BR-U5-006b, FR-009.
  - Execute operations in plan order without policy recalculation.
  - Skip `skip` and `conflict`; run `backup` before dependent copies; copy mutating operations from `sourcePath`.

- [x] Step 4: Implement manifest builder and atomic manifest store adapter.
  - Traceability: BR-U5-011, BR-U5-012, BR-U5-013, FR-013.
  - Build `InstallerManifest` from plan context; write temp file in manifest directory and rename into place.

- [x] Step 5: Implement verifier (`verifyInstallation`).
  - Traceability: BR-U5-015, BR-U5-016, BR-U5-017, BR-U5-018, FR-014.
  - Check required manifest entries, harness directory, tools directory, active-space memory shell; tolerate absent state/intent on fresh install.

- [x] Step 6: Extend Reporter with `renderPlan` and `renderResult`.
  - Traceability: BR-U5-001, BR-U5-019, BR-U5-020, BR-U5-021, BR-U5-022, BR-U5-023.
  - Stable `Operation` / `Files` / `Example` columns; backup visibility; force markers; classified errors with no-change guarantee and one next action.

- [x] Step 7: Extend PromptPort with `confirmApply` (and `chooseTarget` contract).
  - Traceability: BR-U5-007, BR-U5-008, BR-U5-009, BR-U5-010.
  - Default confirmation is no-write; never call prompt adapter when prompts or confirmations are disallowed.

- [x] Step 8: Wire `setup-service.ts` end-to-end and remove `downstream-not-implemented`.
  - Traceability: business-logic-model.md Apply/Manifest/Verification workflows, FR-005, FR-008, FR-011, FR-014.
  - Sequence: plan -> render -> confirm -> apply -> manifest -> verify -> result with proper exit codes.

- [x] Step 9: Add focused U5 unit tests (`t207-setup-apply-verify-ux.test.ts`).
  - Traceability: BR-U5-001 through BR-U5-023 testable invariants, business-rules.md Testable Invariants.
  - Use fake ports; no real target mutation in unit tests.

- [x] Step 10: Update U3/U4 service boundary tests for U5 completion.
  - Traceability: t205 service boundary, U4 planning integration.
  - Replace downstream-not-implemented expectations with U5 flow assertions.

- [x] Step 11: Add Japanese code-summary and append U5 to construction memory.
  - Traceability: code-generation deliverables.

- [x] Step 12: Run focused verification.
  - Traceability: t202–t207, typecheck, lint, package-check, git diff --check.

## Non-Goals

- Do not implement U6 integration harness, CI workflow YAML, release workflow YAML, or docs updates beyond U5 deliverables.
- Do not recalculate U4 planning policy during apply or reporting.
- Do not add runtime dependency additions.
- Do not add rollback restore semantics.

## Verification Expectations

- Apply tests prove operation order, backup-before-update, no-write on `canApply:false`, and manifest write only after successful apply.
- Prompt tests prove `--yes` suppression, default no-write confirmation, and declined confirmation leaves target unchanged.
- Reporter tests prove stable table columns generated from `FileOperationPlan`.
- Manifest and verification tests prove atomic write sequencing and named failed checks.
- Generated TypeScript passes focused tests, root typecheck, and lint.
