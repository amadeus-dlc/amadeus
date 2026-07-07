# Domain Entities — U2 Version And Distribution Source

> Stage: functional-design / Unit: `U2 Version And Distribution Source`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Entity Overview

U2 entities describe the selected source distribution before any target mutation. They are consumed by downstream planning and apply units. The entity boundary follows `component-methods.md`: tag listing and archive fetching are separate ports, while resolved version, loaded distribution, and distribution file metadata are value objects.

## Core Entities

### VersionRequest

| Attribute | Type | Rule |
|---|---|---|
| `requestedVersion` | optional string | Empty means latest stable SemVer. |
| `sourceRepo` | string | Must be `https://github.com/amadeus-dlc/amadeus`. |
| `allowExplicitPrerelease` | boolean | True only for explicit prerelease input. |

Lifecycle: created from U1 `SetupCommand`, consumed by version resolver.

### ResolvedVersion

| Attribute | Type | Rule |
|---|---|---|
| `distributionVersion` | SemVer string | Normalized semantic version without leading `v`. |
| `sourceTag` | string | Exact tag used for archive fetch. |
| `sourceRepo` | string | Canonical repository. |
| `ignoredTags` | list | Diagnostics for duplicates, prereleases, malformed tags, and ignored metadata. |

Lifecycle: produced by version resolver, consumed by archive loader, planner, manifest writer, reporter, and release workflow.

### TagCandidate

| Attribute | Type | Rule |
|---|---|---|
| `tag` | string | Raw tag from `TagSourcePort`. |
| `kind` | `stable` / `prerelease` / `malformed` | Derived from SemVer parsing. |
| `version` | optional SemVer | Present when parseable. |
| `preferred` | boolean | True for `vX.Y.Z` over duplicate bare tag. |
| `ignoredReason` | optional string | Explains why it is not selected. |

Lifecycle: internal resolver value object, not persisted.

### LoadedDistribution

| Attribute | Type | Rule |
|---|---|---|
| `root` | path | Temporary extracted root for selected harness distribution. |
| `harness` | harness | Selected harness from U1/U3. |
| `resolvedVersion` | ResolvedVersion | Source identity. |
| `files` | list | Extracted files with path, absolute path, and md5. |

Lifecycle: produced by archive extractor, consumed by metadata reader and planner, cleaned up by archive extractor lifecycle.

### DistributionFile

| Attribute | Type | Rule |
|---|---|---|
| `path` | relative path | Path inside target distribution. |
| `class` | `owned` / `shared` / `user-preserved` | Source metadata wins; fallback path policy otherwise. |
| `required` | boolean | Required for verification when installed. |
| `md5` | string | Used by manifest and shared-file safety policy. |

Lifecycle: produced by metadata reader, consumed by U4 planner, U5 manifest/verification, and tests.

### ArchiveFetchOutcome

| Attribute | Type | Rule |
|---|---|---|
| `archivePath` | path | Temporary local archive path. |
| `diagnostics` | optional list | Adapter-level diagnostics for tests/logging; not required by Reporter output. |

Lifecycle: produced by `ArchiveSourcePort`, consumed by `ArchiveExtractorPort`. The public port result remains compatible with the upstream `{ archivePath }` contract; diagnostics are optional and must not be required for CLI rendering. The retry policy is a port/adapter rule, not a required data attribute.

## Port Contracts

| Port | Method | Responsibility |
|---|---|---|
| `TagSourcePort` | `listTags(sourceRepo)` | Return raw repository tags without target filesystem side effects. |
| `ArchiveSourcePort` | `fetchArchive({ sourceRepo, sourceTag })` | Fetch source archive and classify transient failures. |
| `ArchiveExtractorPort` | `extractHarness({ archivePath, harness })` | Extract selected `dist/<harness>/` and compute file inventory. |
| `ArchiveExtractorPort` | `cleanup(distribution)` | Remove temporary extraction directories when safe. |

## Relationships

```text
VersionRequest
  -> TagSourcePort
  -> TagCandidate[]
  -> ResolvedVersion
  -> ArchiveSourcePort
  -> { archivePath }
  -> ArchiveExtractorPort
  -> LoadedDistribution
  -> DistributionFile[]
```

## State Boundaries

- U2 has no target-project persistent state.
- U2 may create temporary archive/extraction files owned by the archive adapter.
- U2 does not update the installer manifest.
- U2 does not decide target collision or backup behavior.
- U2 does not publish npm packages; release workflow uses the same version rules later.
- U2 treats present-but-invalid source metadata as a hard error; path-policy fallback is allowed only when metadata is absent.

## Traceability

- `requirements.md` FR-007 and FR-012 define version and network behavior.
- `unit-of-work.md` U2 defines source loading boundaries.
- `unit-of-work-story-map.md` maps U2 to US-002, US-005, US-008, US-009, and US-012.
- `components.md`, `component-methods.md`, and `services.md` define the ports and external GitHub contract.
