# Monitoring Design — U3 Target State And Manifest

> Stage: construction / infrastructure-design  
> Unit: U3 Target State And Manifest

## Observability Model

U3 has no hosted metrics or alerts. Observability is deterministic classification diagnostics, snapshot diagnostics, and CI fixture evidence.

## Signals

| Signal | Source | Purpose |
|---|---|---|
| manifest validation result | ManifestReader | distinguish manifest-installed from fallback |
| target state reason code | StateClassifier | explain no-write/apply input to U4/U5 |
| ambiguous candidate list | SentinelDetector/PromptResolver | explain `kiro` / `kiro-ide` ambiguity |
| unknown md5 count | TargetSnapshotBuilder | explain conservative planning input |
| no-write port call history | fake filesystem tests | prove U3 writes nothing |

## Diagnostics Contract

Diagnostics are returned with U3 outputs, not inferred later from logs:

| Payload | Field | Values |
|---|---|---|
| `TargetDetection` | `diagnostics.manifestRead.status` | `valid`, `absent`, `invalid`, `unreadable` |
| `TargetDetection` | `diagnostics.manifestRead.reasonCode` | `manifest-valid`, `manifest-absent`, `manifest-invalid`, `manifest-unreadable` |
| `TargetDetection` | `diagnostics.sentinelMatches` | supported harness candidates from fixed sentinel checks |
| `TargetDetection` | `diagnostics.ambiguousHarnesses` | `kiro` / `kiro-ide` candidates when ambiguity remains |
| `TargetSnapshot` | `diagnostics.expectedFileCount` | bounded expected file count |
| `TargetSnapshot` | `diagnostics.unknownMd5Count` | files that exist but could not produce md5 |
| `TargetSnapshot` | `diagnostics.unreadableFiles[]` | target-relative path plus normalized error class only |

The existing compatibility contract `readManifest(): InstallerManifest | null` is insufficient for stable diagnostics because it collapses absent, invalid, and unreadable manifests. U3 therefore records the result of the detection-specific manifest read before falling back to sentinel classification. CI fixtures assert invalid and unreadable manifest cases separately.

## CI Evidence

U6 fixtures provide:

- valid/invalid/unreadable manifest cases;
- complete/partial/none sentinel sets;
- unsupported-layout fixture;
- `kiro` / `kiro-ide` ambiguity fixture;
- unreadable md5 fixture;
- no-write assertions for detection/snapshot.

## Runtime Diagnostics

Diagnostics include reason codes and target-relative paths where needed. File contents and secret-like values are not printed. Long OS errors should be normalized/classified before user output.

`TargetDetection` and `TargetSnapshot` are the handoff payloads consumed by U4 and U5. Reporter may render their diagnostics, but Application Service must not re-read the target solely to reconstruct manifest or snapshot reasons.

## Upstream Coverage

- `performance-design.md`: benchmark outcomes are paired with correct classification diagnostics.
- `security-design.md`: diagnostics avoid content leakage and preserve no-write evidence.
- `scalability-design.md`: summary counts keep diagnostics bounded for 2,000 files.
- `reliability-design.md`: reason codes and failed read handling define observability.
- `logical-components.md`: DiagnosticsCollector and failure domains are observed.
- `components.md`: Reporter consumes target detection/snapshot diagnostics downstream.
- `services.md`: Application Service reports U3 output without re-detecting ambiguity.
- `business-logic-model.md`: detection and snapshot workflows define signal points.
