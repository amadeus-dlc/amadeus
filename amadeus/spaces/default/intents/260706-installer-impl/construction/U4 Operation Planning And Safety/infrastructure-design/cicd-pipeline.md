# CI/CD Pipeline — U4 Operation Planning And Safety

> Stage: construction / infrastructure-design  
> Unit: U4 Operation Planning And Safety

## Pipeline Position

U4 does not deploy infrastructure. Its CI/CD design is a blocking PR validation slice for planner safety inside the installer package. Release publication remains U8/manual `workflow_dispatch`; ordinary `main` merge must not publish the installer.

## PR Gate Stages

| Stage | Required checks |
|---|---|
| setup package type/lint | `bun run typecheck`, `bun run lint` |
| planner unit tests | install/upgrade branch fixtures, collision policy, backup path, validator tests |
| installer integration | report-before-apply and no-write path tests using fake ports/temp targets |
| package parity | `bun run dist:check`, `bun run promote:self:check` when source changes affect generated/self-installed trees |
| security checks | package dry-run, dependency audit/OSV, secret scanning for installer-related PRs |
| coverage floor | coverage registry/ratchet freshness for installer planner tests |

U4-specific checks should fail the PR if a planner branch can produce unsafe `canApply:true`, misses backup-before-overwrite, omits `sourcePath` on copy operations, or lets `conflict` appear in an executable plan.

## Test Matrix

| Matrix item | Fixture expectation |
|---|---|
| target state | `manifest-installed`, `manual-or-unknown`, `partial`, `none`, `unsupported-layout`, `ambiguous-harness` |
| version state | equal, downgrade, installed-newer-than-default-latest, newer target |
| file class | `owned`, `shared`, `user-preserved` |
| collision mode | no force/non-interactive, confirmation-required, `--yes`, `--force` |
| backup candidates | changed shared, unknown md5, suffix collision |
| invalid plans | validator rejects unsafe combinations |

## Artifact Handling

CI artifacts should be limited to failing fixture output, plan snapshots, benchmark summaries, and package dry-run summaries. Do not upload user target contents or secrets. Snapshot fixtures should use synthetic paths and md5 values.

## Release Interaction

U4 contributes blocking evidence to the release workflow but does not own publishing. The manually triggered release flow should depend on the same planner unit/integration checks before package dry-run, SBOM/provenance generation, and npm publish validation.

## Rollback And Recovery

CI recovery is commit-based: fix the planner or fixtures and rerun checks. Runtime rollback is not a U4 feature; unsafe situations must stop as no-write before U5 file mutation. Backup artifacts are planned here and written downstream by U5.

## Upstream Coverage

- `performance-design.md`: benchmark fixtures enforce p95 planning budgets.
- `security-design.md`: destructive-operation prevention, `--force` / `--yes` limits, and source integrity become blocking tests.
- `scalability-design.md`: matrix dimensions cover capacity and extension guardrails.
- `reliability-design.md`: stable reason codes, plan states, and ordering invariants become CI assertions.
- `logical-components.md`: each planner component has a corresponding test boundary.
- `components.md`: CI preserves Operation Planner ownership without moving File Applier, Manifest Store, or Reporter policy into U4.
- `services.md`: GitHub Actions PR gates and manual release posture are the pipeline substrate.
- `business-logic-model.md`: install/upgrade planning, backup path, and output contract define the test matrix.
