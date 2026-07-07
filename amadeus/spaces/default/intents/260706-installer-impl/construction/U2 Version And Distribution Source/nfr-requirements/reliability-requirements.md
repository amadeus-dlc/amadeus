# Reliability Requirements — U2 Version And Distribution Source

> Stage: construction / nfr-requirements  
> Unit: U2 Version And Distribution Source  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U2 reliability means deterministic version selection, classified external-source failures, exactly one archive retry, cleanup-safe extraction, stable metadata output, and no target project mutation on any source-load failure.

## Reliability Targets

| Scenario | Requirement | Evidence |
|---|---|---|
| no stable tag exists | returns `no-stable-version` with no target writes | resolver unit test |
| explicit version missing | returns `version-not-found` with no target writes | resolver unit test |
| transient archive failure then success | exactly one retry, then success | fake adapter test |
| two transient archive failures | returns `archive-fetch-failed` with retry instruction | fake adapter test |
| missing `dist/<harness>/` | returns `harness-dist-missing` | archive fixture |
| invalid archive | returns `archive-invalid` | archive fixture |
| absent metadata | fallback emits complete `DistributionFile[]` | metadata fixture |
| invalid present metadata | returns `distribution-metadata-invalid` with no fallback | metadata fixture |

## Failure Handling

- Tag listing failures are classified as `tag-list-failed` or a network-specific classified error.
- Archive fetch retry is owned by `ArchiveSourcePort` / adapter and is not repeated by `loadDistribution`.
- Extraction failures do not produce partial `LoadedDistribution`.
- Metadata failures do not produce partial metadata.
- U2 never attempts rollback because U2 does not mutate target files.
- Temp cleanup failure after successful source load is reported as diagnostic and should not convert a successful source load into a target-safety failure.

## No-Target-Write Reliability

For every U2 error outcome:

- no target file read;
- no target file write;
- no manifest read/write;
- no operation plan generated;
- no prompt for target mutation confirmation.

This implements `business-rules.md` BR-U2-017 and `requirements.md` FR-012 no-target-modification behavior.

## Portability Reliability

U2 must satisfy `requirements.md` NFR-004 for archive extraction and metadata generation:

| Surface | Requirement | Verification |
|---|---|---|
| Archive paths | entry normalization rejects path traversal and handles `/` archive separators | archive fixture tests |
| Extracted file paths | distribution file paths are normalized to portable relative paths using `/` in metadata | metadata fixture tests |
| Temp dirs | use platform temp APIs, not hard-coded `/tmp` | unit test / code review gate |
| md5 | stable across macOS, Linux, and Windows-compatible shells | fixture md5 snapshot |
| File names | preserve valid distribution filenames and fail on unsupported path shapes | archive fixture |

## Observability And Diagnostics

- Diagnostics include selected source repo, selected source tag, distribution version, ignored duplicate tags, and classified failure code.
- Diagnostics must not log archive contents wholesale.
- Network failures include a concrete retry instruction.
- Metadata invalid diagnostics identify schema field failures without silently falling back.

## Upstream Coverage

- `business-logic-model.md`: decision tree defines reliability outcomes.
- `business-rules.md`: error outcomes and testable invariants define pass/fail conditions.
- `requirements.md`: FR-007, FR-012, FR-013, and NFR-004 define reliability and portability behavior.
- `technology-stack.md`: Bun-based CI and package scripts define how reliability checks run.
