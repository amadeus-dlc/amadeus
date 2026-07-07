# Domain Entities — U5 Apply Verify And UX

> Stage: functional-design / Unit: `U5 Apply Verify And UX`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Entity Overview

U5 entities represent execution results and user interaction boundaries. Planning entities come from U4; U5 consumes them and produces apply, manifest, verification, and rendered output results.

## ApplyResult

| Variant | Attributes | Rule |
|---|---|---|
| `ok: true` | applied, backups, manifestWrite, diagnostics | All mutating operations completed. Manifest/verify may proceed. |
| `ok: false` | failedPhase, failedOperation, applied, backups, manifestWrite, diagnostics | Backup/copy failed. Manifest write must remain `not-started`. |

## ApplyDecision

| Variant | Meaning |
|---|---|
| `apply: true` | User/application approved apply. |
| `apply: false, reason: declined` | User declined confirmation. |
| `apply: false, reason: not-allowed` | Mode or plan disallows apply. |

## VerificationResult

| Variant | Attributes |
|---|---|
| `ok: true` | passed checks |
| `ok: false` | passed/failed checks and optional reasons |

## ReporterPort

| Method | Input | Output |
|---|---|---|
| `renderPlan` | FileOperationPlan | Plain-text pre-apply plan. |
| `renderError` | SetupError | Plain-text classified error. |
| `renderResult` | SetupResult | Plain-text final result including plan, apply result, manifest, verification, and classified error when present. |

Reporter owns final wording, table columns, and snapshot-testable text. U4 supplies data and reason codes only.

## SetupResult

| Attribute | Rule |
|---|---|
| `exit` | Final process exit result. |
| `plan` | Present when a plan was produced or reported. |
| `applyResult` | Present when apply was attempted. |
| `manifest` | Present when manifest content was written or intended for reporting. |
| `verificationResult` | Present when verification ran. |
| `classifiedError` | Present for no-write, manifest, verification, or unexpected classified failures. |

## PromptPort

| Method | Rule |
|---|---|
| `chooseHarness` | Only called when prompts are allowed. |
| `chooseTarget` | Only called when prompts are allowed. |
| `confirmApply` | Only called when confirmation is allowed and plan requires confirmation. |

## ManifestWriteResult

| State | Meaning |
|---|---|
| `written` | Manifest persisted atomically. |
| `failed` | File apply already succeeded but manifest write failed. |
| `not-started` | Apply did not reach manifest write stage. |

## Relationships

```text
FileOperationPlan
  -> Reporter.renderPlan
  -> Prompt.confirmApply when needed
  -> applyPlan
  -> writeManifest
  -> verifyInstallation
  -> Reporter.renderResult / renderError
```

## State Boundaries

- U5 writes target files only through approved `FileOperationPlan`.
- U5 writes manifest only after apply succeeds.
- U5 does not decide file class, target state, or version ordering.
- U5 does not publish npm packages or configure CI.

## Traceability

- `requirements.md` FR-005, FR-008, FR-013, and FR-014 define U5 behavior.
- `unit-of-work.md` U5 defines apply/verify/UX ownership.
- `unit-of-work-story-map.md` maps U5 to US-002, US-003, US-004, US-005, US-006, US-007, and US-011.
- `components.md`, `component-methods.md`, and `services.md` define `ApplyResult`, `ReporterPort`, `PromptPort`, manifest write, and verifier boundaries.
