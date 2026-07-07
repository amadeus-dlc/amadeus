# Deployment Architecture — U3 Target State And Manifest

> Stage: construction / infrastructure-design  
> Unit: U3 Target State And Manifest

## Architecture Summary

U3 has no hosted deployment. It runs inside the local installer process as a read-only target state reader. The only external environment is the user-selected target filesystem.

## Runtime Topology

| Layer | Deployment surface | Notes |
|---|---|---|
| ManifestReader | target-local manifest read | `amadeus/.installer/amadeus-setup-manifest.json` only |
| ManifestSchemaValidator | in-process validation | trust manifest only after schema success |
| SentinelDetector | fixed path existence checks | no recursive scan |
| TargetSnapshotBuilder | expected file reads/hash | expected paths from metadata/manifest context |
| PromptResolver | optional ambiguity prompt | only `kiro` / `kiro-ide` ambiguity |
| DiagnosticsCollector | reason-code output | no file contents |

## Environment Definitions

| Environment | Purpose |
|---|---|
| local developer | fake filesystem and temp target tests |
| GitHub Actions PR | U6/U7 target-state fixtures and no-write assertions |
| user target machine | read manifest/sentinels/expected files |

There is no dev/staging/prod hosted runtime and no cloud resource sizing.

## Storage And Network

U3 writes no storage and uses no network. It reads target-local manifest/sentinels/expected files. Manifest write is downstream U5/Application Service responsibility.

## Upstream Coverage

- `performance-design.md`: deployment path is bounded to manifest/sentinel/expected-file reads.
- `security-design.md`: read-only target boundary and path validation shape topology.
- `scalability-design.md`: no daemon/cache and fixed sentinel table define runtime scale.
- `reliability-design.md`: deterministic classification and unknown md5 define behavior.
- `logical-components.md`: read-only components map directly to deployment surfaces.
- `components.md`: Target Detector and Manifest Store boundaries define ownership.
- `services.md`: manifest lifecycle and Application Service sequencing keep writes out of U3.
- `business-logic-model.md`: detection and snapshot workflows define deployment flow.
