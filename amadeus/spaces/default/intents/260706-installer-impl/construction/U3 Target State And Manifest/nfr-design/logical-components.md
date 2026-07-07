# Logical Components — U3 Target State And Manifest

> Stage: construction / nfr-design  
> Unit: U3 Target State And Manifest

## Component Inventory

| Component | Responsibility | Failure Domain |
|---|---|---|
| `TargetDetector` | orchestrates manifest-first detection and sentinel fallback | target classification only |
| `ManifestReader` | reads and validates installer manifest | invalid/unreadable manifest fallback |
| `ManifestSchemaValidator` | validates schemaVersion, required fields, file entries, portable paths | manifest trust boundary |
| `SentinelDetector` | evaluates fixed harness sentinel path sets | manual/partial/none/ambiguous classification |
| `StateClassifier` | maps valid manifest, sentinel results, and ambiguity outcomes to `TargetDetection` states | detection result only |
| `PromptResolver` | resolves `kiro` / `kiro-ide` ambiguity when allowed | interactive ambiguity only |
| `PathPolicy` | normalizes target paths and rejects unsafe manifest relative paths | traversal and portability |
| `TargetSnapshotBuilder` | builds expected-file existence/md5 snapshot | snapshot unknowns only |
| `HashingAdapter` | computes binary md5 | integrity metadata |
| `DiagnosticsCollector` | records reason codes without file contents | user reporting input |

## Boundaries

`TargetDetector` depends on read-only filesystem and manifest ports. It does not depend on U4 planner, U5 applier, backup writer, release resolver, release publisher, GitHub Actions release dispatch, npm publish, or package shell.

`ManifestReader` owns schema validation but not manifest write sequencing. `business-logic-model.md` assigns writes to Application Service after U5 apply succeeds.

`TargetSnapshotBuilder` receives expected paths from distribution metadata and valid manifest context. It does not discover files recursively and does not decide whether a file can be overwritten.

## Data Flow

1. Application Service calls `TargetDetector.detectTarget(target, requestedHarness, interactionMode, ports)`.
2. `TargetDetector` asks `ManifestReader` for a valid manifest.
3. If valid manifest exists, `StateClassifier` returns `manifest-installed` or harness mismatch no-write error.
4. If valid manifest does not exist, `SentinelDetector` evaluates fixed sentinel paths.
5. `PromptResolver` resolves only `kiro` / `kiro-ide` ambiguity when prompts are allowed.
6. Application Service calls `TargetSnapshotBuilder.snapshotTarget(detection, metadata, ports)`.
7. `TargetSnapshotBuilder` reads expected files and `HashingAdapter` computes md5 when readable.
8. U4 receives `TargetDetection` and `TargetSnapshot`.

## Isolation Strategy

| Isolation | Design |
|---|---|
| Read/write isolation | U3 ports expose read behavior only. Write behavior is unavailable in U3 components. |
| Harness isolation | each harness owns explicit sentinel set and tests. |
| Manifest isolation | invalid manifest cannot become `manifest-installed`. |
| Snapshot isolation | snapshot records observation only; planning decisions stay in U4. |
| Diagnostics isolation | diagnostics contain reason codes and paths, not file contents. |

## Blast Radius

Manifest parser defects can misclassify only the current target invocation. They must not write or repair target files.

Sentinel table defects can misclassify manual/partial/none states. Review and fixture coverage are the mitigation.

Hashing defects can affect U4 shared-file comparison. md5 fixtures across macOS/Linux/Windows-compatible shells are required by `tech-stack-decisions.md`.

Prompt resolution defects affect only ambiguous `kiro` / `kiro-ide` detection. Non-interactive mode remains no-write.

## Infrastructure Bridge

U3 has no cloud infrastructure. The component view bridges to implementation and CI: fake filesystem tests assert no-write behavior, temp target fixtures assert portability and md5 stability, and package gates ensure TypeScript/Bun compatibility.

## Upstream Coverage

- `performance-requirements.md`: components preserve bounded hot paths and p95 benchmark surfaces.
- `security-requirements.md`: trust boundaries, path validation, no-write controls, no content leakage map to components.
- `scalability-requirements.md`: local single-process model, no shared mutable state, fixed sentinel sets map to component isolation.
- `reliability-requirements.md`: deterministic states, fallback handling, unknown md5, diagnostics map to failure domains.
- `tech-stack-decisions.md`: TypeScript/Bun, ports, schema validation, binary md5, optional prompt handling map to components.
- `business-logic-model.md`: detection workflow、snapshot workflow、manifest write contract を component boundaries に反映した。
