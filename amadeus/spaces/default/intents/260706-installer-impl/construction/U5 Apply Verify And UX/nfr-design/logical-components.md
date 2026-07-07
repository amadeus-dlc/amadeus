# Logical Components — U5 Apply Verify And UX

> Stage: construction / nfr-design  
> Unit: U5 Apply Verify And UX

## Component Inventory

| Component | Responsibility | Failure Domain |
|---|---|---|
| `SetupApplicationService` | sequences render, prompt, apply, manifest write, verification, final report | transaction sequencing |
| `Reporter` | renders plan, classified errors, final result as deterministic plain text | user-visible output |
| `PromptAdapter` | asks only allowed harness/target/apply confirmations | interaction boundary |
| `FileApplier` | executes plan operations in order without policy recalculation | target mutation |
| `ManifestStore` | atomic temp-file plus rename manifest write | installer state persistence |
| `Verifier` | checks manifest entries and readiness paths without repair | post-apply readiness |
| `ResultClassifier` | maps apply/manifest/verification outcomes to final `SetupResult` | exit classification |
| `FileSystemPort` | adapter for copy, backup, existence, temp write, rename | filesystem fault injection |

## Boundaries

`SetupApplicationService` owns sequencing but not policy decisions. It consumes U4 `FileOperationPlan` and must not recalculate file class, target state, version ordering, or overwrite policy.

`FileApplier` consumes operation data only. It copies from `sourcePath` for `add` / `update` / `force-update`, performs backup for `backup`, and ignores `skip` / `conflict` as mutations.

`ManifestStore` writes only after `ApplyResult.ok === true`. `Verifier` runs only after manifest write succeeds. `Reporter` renders from structured result inputs and does not inspect target filesystem.

U5 does not resolve versions, fetch archives, detect target state, plan operations, publish releases, dispatch GitHub Actions, or run npm publish.

## Data Flow

1. Application Service receives `FileOperationPlan`.
2. Reporter renders the pre-apply plan.
3. If `canApply:false`, ResultClassifier returns no-write result and stops.
4. If confirmation is required, PromptAdapter asks only when allowed.
5. FileApplier executes operations in order and returns `ApplyResult`.
6. If apply failed, ResultClassifier returns apply-failed result and stops.
7. ManifestStore writes manifest atomically.
8. If manifest write failed, ResultClassifier returns `manifest-write-failed` and stops.
9. Verifier checks required files and readiness paths.
10. Reporter renders final result.

## Failure Domains

Reporter defects can confuse users but must not cause mutation. Tests assert render happens before mutation.

PromptAdapter defects can cause unexpected prompting. Tests assert it is unused when prompts are disallowed.

FileApplier defects can damage target files. Tests cover no-write block, backup-before-copy ordering, sourcePath usage, and fault stops.

ManifestStore defects can make future upgrade fallback. Tests cover atomic write and manifest-write-failed classification.

Verifier defects can misreport readiness. Tests cover named failed checks and fresh-install tolerated absences.

## Infrastructure Bridge

U5 has no cloud infrastructure. Its CI bridge is temp-directory integration tests, fake-port fault injection, reporter snapshots, and portability fixtures under Bun.

## Upstream Coverage

- `performance-requirements.md`: components map to render/apply/manifest/verification benchmarks.
- `security-requirements.md`: no-write block、prompt suppression、backup ordering、manifest sequencing、report minimization map to component boundaries.
- `scalability-requirements.md`: single-target sequential apply、capacity targets、growth triggers map to execution strategy.
- `reliability-requirements.md`: outcome states、ordering invariants、diagnostics map to ResultClassifier and tests.
- `tech-stack-decisions.md`: Bun-first TypeScript、FileSystemPort、PromptPort、Reporter、atomic manifest adapter、no rollback map to components.
- `business-logic-model.md`: Apply、Manifest、Verification、Reporter、Prompt workflows と integration boundaries を component boundaries に反映した。
