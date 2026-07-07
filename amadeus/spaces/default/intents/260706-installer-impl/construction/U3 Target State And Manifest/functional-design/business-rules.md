# Business Rules — U3 Target State And Manifest

> Stage: functional-design / Unit: `U3 Target State And Manifest`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Manifest Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U3-001 | Manifest path is `amadeus/.installer/amadeus-setup-manifest.json`. | `requirements.md` FR-013 |
| BR-U3-002 | Manifest schema version starts at `1`. | `component-methods.md` `InstallerManifest` |
| BR-U3-003 | Manifest contains `schemaVersion`, `installerPackageVersion`, `distributionVersion`, `sourceTag`, `installedAt`, `harness`, and `files[]`. | `requirements.md` FR-013 |
| BR-U3-004 | Each manifest file entry contains `path`, `class`, `required`, and `md5`. | `requirements.md` FR-013 |
| BR-U3-005 | Valid manifest wins over sentinel inference. | `component-methods.md` `detectTarget`, project memory application-design:c6 |
| BR-U3-006 | Requested harness conflicting with manifest harness is a validation error and modifies no files. | `component-methods.md` `detectTarget` |
| BR-U3-007 | Present but invalid manifest is not `manifest-installed`; under the upstream `readManifest(): InstallerManifest | null` contract it is treated as null and detection proceeds to sentinel fallback. | `requirements.md` FR-006, `services.md` |

## Sentinel Rules

| Harness | Sentinel Files / Directories | Source |
|---|---|---|
| `claude` | `.claude/` and `amadeus/` | `requirements.md` FR-006 |
| `codex` | `.codex/`, `.agents/`, `AGENTS.md`, and `amadeus/` | `requirements.md` FR-006 |
| `kiro` | `.kiro/`, `AGENTS.md`, and `amadeus/` | `requirements.md` FR-006 |
| `kiro-ide` | `.kiro/`, `AGENTS.md`, and `amadeus/` | `requirements.md` FR-006 |

## Classification Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U3-008 | No manifest plus all selected harness sentinels present is `manual-or-unknown`. | `requirements.md` FR-006 |
| BR-U3-009 | Some but not all selected harness sentinels present is `partial`. | `requirements.md` FR-006 |
| BR-U3-010 | No selected harness sentinels present is `none`. | `requirements.md` FR-006 |
| BR-U3-011 | Files indicating older/unrecognized Amadeus layout outside current sentinels are `unsupported-layout`. | `requirements.md` FR-006 |
| BR-U3-012 | `kiro` and `kiro-ide` no-manifest sentinel ambiguity is resolved inside `detectTarget` when `PromptPort` is provided and prompts are allowed. | `component-methods.md` Harness / Target Validation Matrix |
| BR-U3-013 | Non-interactive `ambiguous-harness` is no-write. | `requirements.md` FR-011 |
| BR-U3-014 | When prompts are not allowed or no `PromptPort` is provided, `detectTarget` returns `ambiguous-harness` for Application Service to report as no-write. | `component-methods.md` `PromptPort` |

## Snapshot Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U3-015 | `detectTarget` never writes files. | `components.md` Target Detector |
| BR-U3-016 | `snapshotTarget` reads existence and md5 for expected files only. | `component-methods.md` `snapshotTarget` |
| BR-U3-017 | Snapshot output is input to U4 planning and must not contain overwrite decisions. | `unit-of-work.md` U4 |
| BR-U3-018 | Existing files whose md5 cannot be read are represented with `exists: true` and omitted `md5`; U4 treats them as unknown. | `services.md` |

## Manifest Write Ownership Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U3-019 | U3 defines manifest schema and store contract but does not sequence manifest writes. | `services.md`, project memory application-design:c8 |
| BR-U3-020 | Application Service calls Manifest Store after File Applier succeeds. | `services.md` Lifecycle Characteristics |
| BR-U3-021 | Manifest write failure after apply is classified separately as `manifest-write-failed`. | `component-methods.md` `applyPlan` |
| BR-U3-022 | Future upgrade after manifest-write failure must fall back to manual/partial detection instead of `manifest-installed`. | `services.md` Lifecycle Characteristics |

## Testable Invariants

- Manifest-installed upgrade can omit `--harness`.
- Requested harness mismatch with manifest harness fails no-write.
- No-manifest `kiro` / `kiro-ide` ambiguity fails no-write in non-interactive mode.
- `detectTarget` and `snapshotTarget` do not write target files.
- Manifest file entries expose md5 and file class to U4/U5.
