# Deployment Architecture — U5 Apply Verify And UX

> Stage: construction / infrastructure-design  
> Unit: U5 Apply Verify And UX

## Architecture Summary

U5 has no hosted deployment. It runs inside one local `amadeus-setup` process after U4 returns a `FileOperationPlan`. Its deployment architecture is a sequential transaction boundary: report plan, optionally confirm, apply filesystem operations, write manifest atomically, verify readiness, and render final result.

U5 does not resolve versions, fetch archives, detect targets, plan operations, publish packages, or dispatch release workflows.

## Runtime Topology

| Layer | Deployment surface | Notes |
|---|---|---|
| `SetupApplicationService` | local application service | owns sequencing and outcome classification |
| `Reporter` | local CLI output renderer | plain text; no target reads |
| `PromptAdapter` | optional terminal prompt | only harness/target/apply confirmation where allowed |
| `FileApplier` | target filesystem adapter boundary | executes approved operations in order |
| `ManifestStore` | target-local manifest writer | temp file plus rename after apply success |
| `Verifier` | target-local readiness checker | checks required entries and fixed readiness paths only |
| `ResultClassifier` | local result mapper | separates no-write, apply-failed, manifest-write-failed, verification-failed, success |

## Environment Definitions

| Environment | Purpose |
|---|---|
| local developer | temp-dir integration tests, fault injection, reporter snapshots |
| GitHub Actions PR | blocking installer tests, typecheck/lint, dist/self-install parity, security checks |
| user target machine | execute a single synchronous apply/manifest/verify flow |

There is no dev/staging/prod hosted runtime and no infrastructure sizing beyond local file copy and manifest write budgets.

## Storage And Network

U5 writes only target-local files explicitly named by the approved plan, backup paths, and installer manifest path. It uses no network. Source bytes come from `sourcePath` embedded in mutating operations and copied through the filesystem adapter.

Manifest writes use a temp file in the manifest directory followed by rename. If manifest write fails after apply, U5 returns `manifest-write-failed` and does not pretend the target is manifest-installed.

## Failure Containment

| Failure | Containment |
|---|---|
| `canApply:false` | Reporter only; no FileApplier or ManifestStore call |
| confirmation declined or disallowed | no mutation, classified no-write |
| backup failure | stop before dependent copy; manifest write not started |
| copy failure | stop immediately; completed operations/backups reported |
| manifest write failure | applied operations remain visible; future upgrade falls back |
| verification failure | report failed checks; no automatic repair or rollback |

## Upstream Coverage

- `performance-design.md`: topology maps to render/apply/manifest/verification budgets.
- `security-design.md`: no-write block, prompt suppression, backup durability, and manifest sequencing define deployment controls.
- `scalability-design.md`: single-target sequential apply and capacity boundaries define runtime scale.
- `reliability-design.md`: result state machine and ordering invariants define failure containment.
- `logical-components.md`: application service, reporter, prompt, applier, manifest store, verifier, and classifier map to deployment surfaces.
- `components.md`: File Applier, Manifest Store, Verifier, Reporter, Prompt Adapter, and Setup Application Service are represented without moving U4 policy into U5.
- `services.md`: local in-process service model and manifest lifecycle define the deployment path.
- `business-logic-model.md`: Apply, Manifest, Verification, Reporter, and Prompt workflows define sequencing.
