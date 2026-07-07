# Logical Components — U2 Version And Distribution Source

> Stage: construction / nfr-design  
> Unit: U2 Version And Distribution Source  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Component Inventory

| Component | Responsibility | Failure domain | Blast radius |
|---|---|---|---|
| Version Resolver | stable SemVer filtering, duplicate grouping, explicit version mapping | in-memory resolver | source selection failure only |
| TagSourcePort | list tags from canonical repository | external GitHub tags | classified tag-list failure |
| ArchiveSourcePort / GitHubArchiveAdapter | fetch selected tag archive with exactly one retry | external GitHub archive | classified archive-fetch failure |
| ArchiveExtractorPort | extract selected `dist/<harness>/` under temp root | untrusted archive handling | temp source directory only |
| Distribution Metadata Reader | validate present metadata or absent-only fallback | extracted source metadata | source metadata failure only |
| Temp Directory Manager | create and cleanup per-invocation source temp roots | local temp filesystem | diagnostic cleanup failure |
| Source Diagnostics Reporter | expose selected source and classified failure details | output/reporting | no target mutation |

## Isolation Strategy

- Version Resolver is pure and independent of archive/network/filesystem.
- TagSourcePort and ArchiveSourcePort are separate ports; changing tag listing cannot accidentally change archive retry ownership.
- ArchiveExtractorPort owns path containment and selected-harness extraction.
- Metadata Reader consumes only extracted source files.
- U2 exports source distribution data to U4/U5 through application service data, not by touching target files.

## Failure Domain Mapping

| Failure | Contained by | Expected result |
|---|---|---|
| malformed tag list | Version Resolver | ignored diagnostic or `no-stable-version` |
| tag listing unavailable | TagSourcePort | `tag-list-failed` |
| transient archive fetch | ArchiveSourcePort | one retry then success/failure |
| invalid archive path traversal | ArchiveExtractorPort | `archive-invalid` |
| selected harness missing | ArchiveExtractorPort | `harness-dist-missing` |
| invalid present metadata | Metadata Reader | `distribution-metadata-invalid` |
| cleanup failure | Temp Directory Manager | diagnostic, primary result preserved |

## Infrastructure Bridge

Infrastructure Design should treat U2 as local CLI supply-chain ingestion infrastructure:

- outbound GitHub tag/archive access;
- local temp storage for archive/extraction;
- package/runtime dependencies for SemVer/archive/md5 if any are justified;
- CI fixtures for fake ports and malicious archive tests;
- no target project storage, database, queue, daemon, or hosted service.

## Upstream Coverage

- `performance-requirements.md`: components map to resolver, archive, metadata, fallback md5, and retry benchmarks.
- `security-requirements.md`: component boundaries implement supply-chain, extraction, metadata, and no-target-write controls.
- `scalability-requirements.md`: components isolate tag/file growth and temp invocation state.
- `reliability-requirements.md`: failure domains map to classified errors and diagnostics.
- `tech-stack-decisions.md`: ports, adapter ownership, temp APIs, hashing, and dependency policy define the component set.
- `business-logic-model.md`: version resolution, archive loading, source metadata reading, and integration boundaries define responsibilities.

