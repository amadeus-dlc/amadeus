# Reliability Requirements — U3 Target State And Manifest

> Stage: construction / nfr-requirements  
> Unit: U3 Target State And Manifest  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U3 reliability means deterministic target-state classification, robust manifest fallback behavior, stable snapshot output, and strict no-write behavior. U3 must produce safe input for U4 even when local files are missing, unreadable, or ambiguous.

## Reliability Targets

| Scenario | Requirement | Evidence |
|---|---|---|
| valid manifest | `manifest-installed`, harness inferred when absent | manifest fixture |
| requested harness conflicts with manifest | validation error, no-write | fixture |
| invalid/unreadable manifest | not `manifest-installed`; sentinel fallback | fixture |
| no manifest + all selected sentinels | `manual-or-unknown` | target fixture |
| partial sentinels | `partial` | target fixture |
| no sentinels | `none` | target fixture |
| unsupported old layout | `unsupported-layout` | target fixture |
| `kiro` / `kiro-ide` ambiguous non-interactive | `ambiguous-harness`, no-write | fixture |
| unreadable md5 in snapshot | `exists:true`, md5 omitted | fake filesystem fixture |

## Failure Handling

- Manifest read failure under `readManifest(): InstallerManifest | null` is not fatal by itself.
- Invalid manifest does not allow `manifest-installed`.
- Target read failures for expected files are represented as unknown when possible.
- Snapshot failures must not produce overwrite decisions.
- Prompt unavailability for ambiguity yields no-write classification.
- U3 never attempts rollback because it does not write.

## No-Write Reliability

U3 may read target manifest, sentinel paths, and expected files. U3 must not:

- write target files;
- write or repair the manifest;
- create backup files;
- apply source files;
- classify overwrite/backup/conflict policy;
- verify final readiness after apply.

This keeps U3 aligned with `business-rules.md` BR-U3-015 through BR-U3-022.

## Portability Reliability

U3 must satisfy `requirements.md` NFR-004 for path handling and file hashing:

| Surface | Requirement | Verification |
|---|---|---|
| Manifest path | `amadeus/.installer/amadeus-setup-manifest.json` resolved with platform path APIs | manifest store fixture |
| Manifest file paths | stored as portable relative paths, not absolute platform paths | schema fixture |
| Sentinel paths | `.codex/`, `.agents/`, `.kiro/`, `.claude/`, `AGENTS.md`, `amadeus/` handled with platform APIs | target fixtures |
| md5 | binary hash stable across macOS/Linux/Windows-compatible shells | snapshot fixture |
| Paths with spaces | target path with spaces remains readable through filesystem port | temp target fixture |

## Observability And Diagnostics

- Classification result includes enough reason data for U5 reporter to explain no-write states.
- Diagnostics distinguish manifest-invalid fallback from valid manifest-installed.
- Ambiguous harness diagnostics list candidate harnesses.
- Snapshot diagnostics do not include file contents.

## Upstream Coverage

- `business-logic-model.md`: target state table and snapshot workflow define reliability outcomes.
- `business-rules.md`: classification rules, no-write rules, and manifest write ownership define pass/fail conditions.
- `requirements.md`: FR-006, FR-011, FR-013, NFR-002, NFR-003, and NFR-004 define reliability behavior.
- `technology-stack.md`: Bun-based CI and package scripts define how reliability checks run.
