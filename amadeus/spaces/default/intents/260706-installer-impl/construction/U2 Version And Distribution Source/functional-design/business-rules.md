# Business Rules — U2 Version And Distribution Source

> Stage: functional-design / Unit: `U2 Version And Distribution Source`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Version Resolution Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U2-001 | The canonical source repository is `https://github.com/amadeus-dlc/amadeus`. | `requirements.md` FR-007 |
| BR-U2-002 | Default resolution selects the highest stable SemVer tag. | `requirements.md` FR-007, `unit-of-work.md` U2 |
| BR-U2-003 | Stable tags match `vMAJOR.MINOR.PATCH` or `MAJOR.MINOR.PATCH` with no prerelease segment. | `requirements.md` FR-007 |
| BR-U2-004 | SemVer precedence determines latest; lexicographic ordering is forbidden. | `requirements.md` FR-007 |
| BR-U2-005 | If `v1.2.3` and `1.2.3` both exist, `v1.2.3` is canonical and the duplicate is reported as ignored. | `requirements.md` FR-007 |
| BR-U2-006 | Prerelease tags are excluded from default resolution. | `requirements.md` FR-007 |
| BR-U2-007 | Explicit prerelease versions are allowed only when requested through `--version`. | `requirements.md` FR-007 |
| BR-U2-008 | GitHub Release metadata is supplemental and cannot change version ordering. | `requirements.md` FR-007 |

## Explicit Version Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U2-009 | `--version v1.2.3` requires exact tag `v1.2.3`. | `requirements.md` FR-007 |
| BR-U2-010 | `--version 1.2.3` resolves to `v1.2.3` when that tag exists. | `requirements.md` FR-007 |
| BR-U2-011 | `--version 1.2.3` resolves to `1.2.3` when no `v1.2.3` tag exists and `1.2.3` exists. | `requirements.md` FR-007 |
| BR-U2-012 | Unknown explicit version returns `version-not-found` and no target writes occur. | `requirements.md` FR-007 |

## Archive Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U2-013 | `ArchiveSourcePort` / `GitHubArchiveAdapter` owns exactly one internal retry for transient archive fetch failure. `loadDistribution` must not add a second retry loop. | `requirements.md` FR-012 |
| BR-U2-014 | When the archive port exhausts its single retry, it returns a classified error and concrete retry instruction. | `requirements.md` FR-012, `stories.md` US-012 |
| BR-U2-015 | Archive extraction must select `dist/<harness>/` only. | `components.md` Archive Extractor, `unit-of-work.md` U2 |
| BR-U2-016 | Missing selected harness distribution returns `harness-dist-missing`. | `component-methods.md` `loadDistribution` |
| BR-U2-017 | U2 must not write target files before, during, or after source loading. | `services.md`, `external-dependency-map.md` |

## Metadata Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U2-018 | Source metadata wins when present and valid. | `components.md` Distribution Metadata Reader |
| BR-U2-019 | First-release fallback derives metadata from `dist/<harness>/` and path policies only when metadata is absent. | `component-methods.md` `readDistributionMetadata` |
| BR-U2-020 | Each emitted distribution file has `path`, `class`, `required`, and `md5`. | `requirements.md` FR-013, `component-methods.md` `DistributionFile` |
| BR-U2-021 | U2 does not decide whether target files are overwritten, skipped, backed up, or conflicted. | `unit-of-work.md` U4, `component-dependency.md` |
| BR-U2-022 | Metadata that is present but invalid is a hard `distribution-metadata-invalid` error; it must not fall back to path policy. | `requirements.md` FR-013, `components.md` Distribution Metadata Reader |

## Error Outcomes

| Condition | Error Code | Files Modified |
|---|---|---|
| no stable SemVer tag | `no-stable-version` | none |
| explicit version absent from tags | `version-not-found` | none |
| tag listing unavailable | `tag-list-failed` or network-specific classified error | none |
| archive fetch exhausts adapter-owned retry | `archive-fetch-failed` | none |
| archive format invalid | `archive-invalid` | none |
| selected harness dist missing | `harness-dist-missing` | none |
| metadata present but invalid | `distribution-metadata-invalid` | none |

## Testable Invariants

- `v1.10.0` sorts after `v1.2.0`.
- `v1.2.3` wins over `1.2.3`.
- `v1.2.3-beta.1` is ignored by default.
- Explicit `1.2.3-beta.1` can resolve when the tag exists.
- An archive fetch that exhausts the adapter-owned retry does not create files in the target project.
- Missing `dist/codex/` produces `harness-dist-missing`.
- Absent metadata fallback emits md5 for every extracted file.
- Invalid present metadata fails with `distribution-metadata-invalid`.
