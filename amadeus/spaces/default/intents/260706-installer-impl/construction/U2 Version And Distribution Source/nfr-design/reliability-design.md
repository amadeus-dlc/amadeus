# Reliability Design — U2 Version And Distribution Source

> Stage: construction / nfr-design  
> Unit: U2 Version And Distribution Source  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Design Summary

U2 reliability is deterministic source selection and classified source-load failure. The unit returns either a complete `ResolvedVersion`/`LoadedDistribution`/`DistributionFile[]` or a classified error with no target project mutation.

## Outcome Design

| Scenario | Result design | Side-effect design |
|---|---|---|
| no stable tag | `no-stable-version` | no target access |
| explicit tag/version missing | `version-not-found` | no target access |
| tag list unavailable | `tag-list-failed` or network-specific classified error | no target access |
| transient archive failure then success | adapter records exactly two attempts and returns success | temp source only |
| retry exhausted | `archive-fetch-failed` with retry instruction | no target access |
| invalid archive | `archive-invalid` | no partial distribution |
| missing selected harness | `harness-dist-missing` | no alternate harness fallback |
| invalid present metadata | `distribution-metadata-invalid` | no fallback |
| absent metadata | complete fallback metadata with md5 | extracted source only |

## Retry And Failure Boundary Design

- `ArchiveSourcePort` / adapter owns the single retry.
- `loadDistribution` treats the port as already retried and does not wrap another retry loop.
- Archive extraction failure does not produce partial `LoadedDistribution`.
- Metadata failure does not produce partial `DistributionFile[]`.
- Cleanup failure after successful source load is reported as diagnostic and does not rewrite the primary success/failure classification.

## No-Target-Write Proof Design

U6 tests and fake ports prove that every U2 error outcome performs:

- no target file read;
- no target file write;
- no manifest read/write;
- no operation plan generation;
- no prompt for target mutation.

## Portability Design

- archive entry paths use `/` as archive-relative separator and are normalized before extraction.
- metadata paths use portable relative paths with `/` separators.
- temp directories use platform APIs.
- md5 is computed from binary content, independent of newline conversion.
- fixtures include traversal attempts, Windows-style separators, and paths with spaces.

## Upstream Coverage

- `performance-requirements.md`: retry accounting and local fixture benchmarks shape reliability tests.
- `security-requirements.md`: archive containment and metadata validation define failure boundaries.
- `scalability-requirements.md`: per-invocation temp dirs and no cache support deterministic retries.
- `reliability-requirements.md`: scenario targets, failure handling, no-target-write, portability, and diagnostics define this design.
- `tech-stack-decisions.md`: port ownership and no double retry define implementation constraints.
- `business-logic-model.md`: decision tree and integration boundaries define reliable outcomes.

