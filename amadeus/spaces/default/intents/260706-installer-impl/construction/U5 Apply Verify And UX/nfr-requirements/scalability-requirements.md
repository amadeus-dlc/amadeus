# Scalability Requirements — U5 Apply Verify And UX

> Stage: construction / nfr-requirements  
> Unit: U5 Apply Verify And UX  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U5 scalability covers growth in operation count, copied file volume, backup count, manifest entry count, and reporter output size for a single installer invocation. It does not cover multi-project orchestration, concurrent installs into the same target, or repository-wide package normalization.

## Capacity Targets

| Dimension | First-release target | Requirement |
|---|---:|---|
| operations per plan | 2,000 | linear execution and rendering |
| manifest file entries | 2,000 | atomic write and verification within performance targets |
| changed shared-file backups | 500 | deterministic backup records and ordered copy |
| total copied bytes | 50 MiB | no application-level full-content string buffering |
| reporter output rows | 2,000 | stable table format without quadratic concatenation |
| prompts per invocation | <= 3 | harness, target, apply confirmation only when allowed |

## Scaling Constraints

- U5 remains a single-target, single-harness command path for this release.
- Apply execution is sequential to preserve backup-before-copy ordering and deterministic diagnostics.
- Any future parallel copy optimization must preserve operation-order evidence and backup dependency ordering.
- Verification scales with manifest entry count and readiness checks, not full target tree traversal.
- Reporter may summarize repeated operation groups only if file-level traceability remains available in output or structured test data.

## Growth Triggers

| Trigger | Required response |
|---|---|
| plan exceeds 2,000 operations | benchmark target must be recalibrated before widening support |
| copied bytes exceed 50 MiB in fixtures | streaming/copy primitive review is required |
| backup count exceeds 500 | backup record memory usage and report readability must be reviewed |
| multiple harnesses in one invocation requested | separate unit/ADR; current U5 contract rejects it upstream |
| concurrent writes to the same target requested | locking strategy and manifest concurrency ADR required |

## Test Data Strategy

- Generate synthetic `FileOperationPlan` fixtures with deterministic path names.
- Use temporary directories for copy, backup, manifest, and verification scalability tests.
- Keep network, version resolution, and target-state detection out of U5 scalability benchmarks.
- Validate reporter output snapshots for small canonical cases and benchmark large cases without committing huge snapshots.

## Upstream Coverage

- `business-logic-model.md`: single invocation apply, manifest, verification, and reporter workflows define scalability boundaries.
- `business-rules.md`: operation ordering and prompt rules constrain concurrency and batching choices.
- `requirements.md`: FR-004, FR-008, FR-009, FR-013, FR-014, NFR-001, NFR-003, NFR-004, and NFR-006 define capacity and traceability requirements.
- `technology-stack.md`: Bun/TypeScript fixture tests define the scalable test implementation path.

