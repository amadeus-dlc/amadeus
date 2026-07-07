# Security Requirements — U3 Target State And Manifest

> Stage: construction / nfr-requirements  
> Unit: U3 Target State And Manifest  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U3 security covers target-state reads, manifest schema validation, sentinel inference, ambiguity handling, and snapshot data passed to planning. It does not decide overwrite policy, write backups, write manifest files, or run post-install verification.

## Threat Considerations

| Threat | Requirement | Verification |
|---|---|---|
| forged manifest causes wrong harness update | valid manifest must satisfy schema and requested harness mismatch fails no-write | manifest fixture |
| invalid manifest hides manual install | invalid/unreadable manifest is not `manifest-installed`; sentinel fallback runs | fixture test |
| ambiguous `kiro` / `kiro-ide` silently picks wrong harness | non-interactive ambiguity returns `ambiguous-harness`; interactive only resolves through prompt | target detection test |
| target path traversal through manifest file paths | snapshot uses normalized relative paths and rejects absolute/up-level manifest paths | manifest schema test |
| sensitive target content leakage | snapshot records path, existence, md5 only; no file contents | snapshot test |
| unreadable file fatal failure | unreadable md5 is represented as `exists:true` with omitted md5 | fake filesystem test |

## Data Classification

| Data | Classification | Handling |
|---|---|---|
| installer manifest | target-local installer metadata | schema validate before trust |
| sentinel file existence | target-local structural signal | read-only |
| md5 values | integrity metadata | passed to U4/U5, no file contents |
| target path | user-provided local path | do not disclose beyond necessary diagnostics |
| prompt answer for ambiguous harness | user decision | used only to choose harness classification |

## Controls

- Manifest-first detection is allowed only for valid schema.
- Requested harness mismatch with manifest harness is no-write.
- Sentinel fallback cannot overwrite manifest-installed state.
- `detectTarget` prompts only when `PromptPort` exists and prompts are allowed.
- `snapshotTarget` must not make policy decisions.
- Manifest write sequencing is outside U3 and must remain owned by Application Service after U5 apply succeeds.

## Compliance Mapping

U3 does not process regulated personal data. It reads local project structure and file hashes. Compliance-relevant controls are auditability and safety: target state classification, manifest schema validation result, ambiguous harness decision, and snapshot unknown-md5 handling must be testable and reproducible.

## Upstream Coverage

- `business-logic-model.md`: manifest-first, sentinel fallback, and snapshot workflows define trust boundaries.
- `business-rules.md`: manifest, ambiguity, no-write, and snapshot unknown-md5 rules define controls.
- `requirements.md`: FR-006, FR-011, FR-013, NFR-002, NFR-003, and NFR-004 define security-relevant acceptance.
- `technology-stack.md`: Bun/TypeScript and CI baseline inform test implementation.
