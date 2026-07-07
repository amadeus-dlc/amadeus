# Domain Entities — U3 Target State And Manifest

> Stage: functional-design / Unit: `U3 Target State And Manifest`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Entity Overview

U3 entities describe target installation state before planning. They are read-models and contracts, not mutation plans. U3 consumes distribution metadata from U2 and produces `TargetDetection`, `InstallerManifest`, and `TargetSnapshot` for U4/U5.

## InstallerManifest

| Attribute | Type | Rule |
|---|---|---|
| `schemaVersion` | `1` | Reject unsupported schema versions unless migration is explicitly designed later. |
| `installerPackageVersion` | string | Version of `@amadeus-dlc/setup`. |
| `distributionVersion` | string | Installed Amadeus distribution version. |
| `sourceTag` | string | Git tag used as source. |
| `installedAt` | ISO timestamp | Written after successful apply. |
| `harness` | harness | Installed harness. |
| `files` | `DistributionFile[]` | Expected installed files and md5/class metadata. |

Lifecycle: read before upgrade, written after apply by Application Service and Manifest Store, consumed by future upgrade and verification.

## TargetDetection

| Variant | Attributes | Meaning |
|---|---|---|
| `manifest-installed` | target, manifest, inferredHarness | Valid installer manifest exists. |
| `manual-or-unknown` | target, inferredHarness | Sentinels exist without manifest. |
| `partial` | target, optional inferredHarness, missing, ambiguousHarnesses | Some sentinel files exist. |
| `none` | target | No recognizable install for selected harness. |
| `unsupported-layout` | target, reason | Old or unrecognized layout detected. |
| `ambiguous-harness` | target, candidates, reason | Multiple harnesses possible without manifest. |

Lifecycle: produced by `detectTarget`, consumed by U4 planner and U5 reporting.

## TargetSnapshot

| Attribute | Type | Rule |
|---|---|---|
| `target` | path | Target project root. |
| `detection` | TargetDetection | Classification context. |
| `existingFiles` | list | For expected paths: path, exists, optional md5. |

Lifecycle: produced by `snapshotTarget`, consumed by U4 Operation Planning And Safety.

## ManifestStorePort

| Method | Contract |
|---|---|
| `readManifest(path)` | Returns valid manifest or null. Null covers absent, unreadable, or invalid manifest for this upstream contract; detection then falls back to sentinels. |
| `writeManifestAtomic(path, manifest)` | Writes through temp file and rename; called by Application Service after apply. |

The write method is part of the store contract, but U3 functional design does not schedule the write. `services.md` and `component-methods.md` assign write sequencing to the Application Service.

## SentinelSet

| Attribute | Type | Rule |
|---|---|---|
| `harness` | harness | Candidate harness. |
| `requiredPaths` | path list | Minimum sentinels from `requirements.md`. |
| `presentPaths` | path list | Existing sentinel paths. |
| `missingPaths` | path list | Missing sentinel paths. |
| `matchKind` | full / partial / none | Derived classification input. |

Lifecycle: internal detection value object, not persisted.

## Relationships

```text
target + optional requestedHarness
  -> ManifestStorePort.readManifest
  -> manifest-installed | sentinel fallback
  -> SentinelSet[]
  -> TargetDetection
  -> DistributionFile[]
  -> TargetSnapshot
  -> U4 Operation Planning And Safety
```

## State Boundaries

- U3 reads target files and manifest; it does not mutate target files.
- U3 does not perform source archive loading.
- U3 does not choose add/update/backup/conflict operations.
- U3 does not verify final install readiness; U5 owns post-apply verification.
- Manifest write is atomic store behavior invoked by Application Service after U5 apply succeeds.
- Existing files that cannot yield md5 are represented by omitted `md5` in `TargetSnapshot.existingFiles`, not by a separate diagnostics field.

## Traceability

- `requirements.md` FR-006 and FR-013 define target states, sentinels, and manifest fields.
- `unit-of-work.md` U3 defines target/manifest ownership.
- `unit-of-work-story-map.md` maps U3 to US-002, US-005, US-006, and US-007.
- `components.md`, `component-methods.md`, and `services.md` define Target Detector, Manifest Store, `TargetDetection`, and `TargetSnapshot`.
