# Business Logic Model — U3 Target State And Manifest

> Stage: functional-design / Unit: `U3 Target State And Manifest`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Scope

U3 identifies target installation state and defines the installer manifest contract. It owns manifest schema validation, manifest store read/write contract, manifest-first target detection, sentinel fallback, ambiguity handling, and target snapshots for planning. It does not resolve source versions, plan overwrite policy, apply file operations, or verify final installation readiness.

Primary stories from `unit-of-work-story-map.md`:

- US-002: install writes a manifest through downstream apply flow.
- US-005: manifest-installed upgrade reads harness/version/file list.
- US-006: manual, partial, none, and unsupported target states are classified safely.
- US-007: shared-file safety can compare target files against manifest/source md5 values.

## Detection Workflow

### Manifest-First Detection

1. Receive target path, optional requested harness, interaction mode, filesystem, and manifest store.
2. Read `amadeus/.installer/amadeus-setup-manifest.json` through `ManifestStorePort`.
3. If manifest is present and valid, classify as `manifest-installed`.
4. If requested harness conflicts with manifest harness, return validation error and no-write result.
5. If requested harness is absent, infer harness from manifest.
6. If manifest is absent, unreadable, or invalid under the upstream `readManifest(): InstallerManifest | null` contract, treat it as not `manifest-installed` and proceed to sentinel fallback.
7. Return manifest version, source tag, file entries, and inferred harness to downstream planning.

### Sentinel Fallback

1. If no manifest is present, inspect selected or inferable harness sentinel files.
2. If requested harness is supplied, classify only against that harness.
3. If requested harness is absent and exactly one sentinel set matches, infer that harness.
4. If `kiro` and `kiro-ide` both match the same sentinel set and `PromptPort` is provided with prompts allowed, `detectTarget` prompts inside the detection flow and returns the resolved detection.
5. If `kiro` and `kiro-ide` both match and prompts are not allowed, return `ambiguous-harness`.
6. Application Service does not re-detect solely to resolve this ambiguity; it passes prompt capability into `detectTarget`.

### Target State Classification

| State | Detection Signal | Downstream Meaning |
|---|---|---|
| `manifest-installed` | valid installer manifest | use manifest harness/version/files |
| `manual-or-unknown` | no manifest, selected harness sentinels present | conservative upgrade may be planned |
| `partial` | some selected harness sentinels present | no-write unless force policy later allows |
| `none` | no selected harness sentinels present | instruct user to run `install` |
| `unsupported-layout` | recognized old/unhandled layout outside current sentinels | no-write |
| `ambiguous-harness` | multiple candidate harnesses without manifest | prompt or no-write |

## Snapshot Workflow

1. Receive target, detection, distribution metadata, and filesystem.
2. List expected target paths from metadata and manifest context.
3. For each expected file, record existence and md5 when readable.
4. If a file exists but md5 cannot be read, include the file with `exists: true` and omit `md5`; U4 treats it as unknown.
5. Return `TargetSnapshot` to U4 Operation Planning And Safety.
6. Do not decide update/backup/conflict policy in U3.

## Manifest Write Contract

U3 defines the schema and `ManifestStorePort`, but the write call is owned by the Setup Application Service after U5 apply succeeds. If manifest write fails after file copy, the Application Service classifies `manifest-write-failed`; future upgrade must not treat that target as `manifest-installed`.

## Integration Boundaries

- U2 supplies source distribution metadata used by snapshot.
- U3 supplies `TargetDetection`, `InstallerManifest`, and `TargetSnapshot` to U4 and U5.
- `component-methods.md` defines `detectTarget`, `snapshotTarget`, `ManifestStorePort`, `InstallerManifest`, and `TargetDetection`.
- `services.md` assigns manifest write sequencing to the Application Service and Manifest Store boundary.
