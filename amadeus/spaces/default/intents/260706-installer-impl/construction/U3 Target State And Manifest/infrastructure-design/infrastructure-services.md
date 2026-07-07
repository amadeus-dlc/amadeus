# Infrastructure Services — U3 Target State And Manifest

> Stage: construction / infrastructure-design  
> Unit: U3 Target State And Manifest

## Service Inventory

U3 introduces no managed service. It uses local read-only filesystem service boundaries:

| Boundary | Role | Write access |
|---|---|---|
| ManifestStore read contract | read/validate target manifest | none in U3 |
| TargetManifestReadPort | read manifest with diagnostic result | none |
| TargetReadOnlyFilePort | sentinel and expected-file reads/hash | none |
| HashingAdapter | binary md5 for readable expected files | none |
| PromptPort | optional ambiguity resolution | no filesystem access |
| fake filesystem ports | CI no-write and fault injection | test only |

## Read-Only Port Boundary

`detectTarget` and `snapshotTarget` must not depend on the broad application-level `FileSystemPort`, because that port also contains write/copy/backup methods for downstream U5. U3 receives narrowed read-only ports:

| Port | Allowed methods | Used by |
|---|---|---|
| `TargetManifestReadPort` | `readManifestForDetection(path)` | `ManifestReader`, `StateClassifier` |
| `TargetReadOnlyFilePort` | `exists(path)`, `readFile(path)`, `md5(path)` | `SentinelDetector`, `TargetSnapshotBuilder` |

`TargetReadOnlyFilePort` deliberately omits `writeFileAtomic`, `copyFile`, `renameOrCopyBackup`, and recursive `listFiles`. If the concrete adapter implements those methods for U5, U3 still receives only the narrowed TypeScript type so no-write behavior is enforced at the dependency boundary, not only by fake filesystem assertions.

## Manifest Boundary

Manifest path is fixed to `amadeus/.installer/amadeus-setup-manifest.json`. U3 can read and validate it, but cannot repair, migrate, or write it. Invalid or unreadable manifest falls back to sentinel detection and cannot become `manifest-installed`.

The upstream compatibility method `readManifest(path): InstallerManifest | null` collapses absent, invalid, and unreadable manifests into `null`, so U3 implementation must use `readManifestForDetection(path): ManifestReadResult` internally when diagnostics are required:

| Result | Meaning | Detection impact |
|---|---|---|
| `valid` | schema-valid manifest returned | may become `manifest-installed` |
| `absent` | manifest file is not present | sentinel fallback |
| `invalid` | manifest exists but schema validation failed | diagnostic + sentinel fallback |
| `unreadable` | manifest exists but cannot be read | diagnostic + sentinel fallback |

`ManifestReadResult` is a read-only diagnostic contract. It does not authorize manifest repair, migration, or write.

## Target Filesystem Boundary

U3 reads only:

- manifest path;
- fixed sentinel paths for supported harnesses;
- expected files from metadata/manifest context.

It does not inspect arbitrary target directories, perform recursive discovery, or decide overwrite policy.

## Failure Behavior

| Failure | Service result |
|---|---|
| manifest missing | sentinel fallback |
| manifest unreadable/invalid | diagnostic + sentinel fallback |
| requested harness mismatch | no-write classification |
| ambiguous `kiro` / `kiro-ide` without prompt | `ambiguous-harness` |
| expected file unreadable | `exists:true`, md5 omitted |
| broad filesystem port accidentally passed to U3 | compile-time mismatch or adapter narrowing in tests |

## Upstream Coverage

- `performance-design.md`: service boundaries preserve bounded reads.
- `security-design.md`: manifest trust, path policy, and no content leakage define service controls.
- `scalability-design.md`: fixed sentinel and expected-file lists prevent target-size coupling.
- `reliability-design.md`: failure handling maps directly to service results.
- `logical-components.md`: read-only ports and classifiers define service boundaries.
- `components.md`: Target Detector and Manifest Store are represented without write sequencing.
- `services.md`: Manifest writes remain Application Service after apply.
- `business-logic-model.md`: Target State Classification and Snapshot Workflow define service outputs.
