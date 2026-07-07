# Security Requirements — U1 Setup Package Shell

> Stage: construction / nfr-requirements  
> Unit: U1 Setup Package Shell  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U1 security covers the process boundary before installer business logic starts: argv parsing, runtime detection, Node/npm wrapper delegation, package metadata, files allowlist, and top-level error rendering. It does not authenticate users, authorize target writes, fetch GitHub archives, or write the installer manifest; those are owned by later units.

## Threat Considerations

| Threat | Requirement | Verification |
|---|---|---|
| Command injection through wrapper delegation | Bun delegation must pass argv as argv array, not shell-concatenated string | wrapper unit test |
| Confused command contract | `init` and unknown commands must fail before application-service delegation | parser unit test |
| Accidental target mutation on invalid input | Help, parser errors, and Bun-required errors must not read/write target files | fake filesystem spy |
| Secret leakage in errors | Top-level error rendering must not print full env or token-like values | reporter snapshot |
| Overbroad npm package contents | `files` allowlist must exclude local state, audit, memory, credentials, and unrelated repo dev files | package dry-run |
| Runtime dependency supply-chain expansion | New runtime dependency requires documented rationale | package metadata/security gate |

## Data Classification

| Data | Classification | Handling |
|---|---|---|
| CLI argv | user-provided, potentially sensitive paths | may appear in human-readable diagnostics only when needed; do not log env secrets |
| Process env | sensitive | use only for runtime detection; never dump wholesale |
| Package metadata | public | validated before publish |
| Help text | public | must not include local paths or secrets |
| Target path string | user-provided | U1 may carry as value but must not inspect target files |

## Controls

- Runtime detection must not execute arbitrary user-controlled command names.
- Bun lookup uses a fixed executable name and safe spawn API.
- Parser rejects duplicate `--harness` values and unsupported harness values before downstream effects.
- `SetupError` must include a stable error code and human-readable next action, but not sensitive environment dumps.
- Package metadata validation must assert `name`, `bin`, `license`, `repository`, and `files`.
- Root `package.json` remains dev-only per `requirements.md` FR-003 and `technology-stack.md`; U1 must not publish the root package.

## Compliance Mapping

No regulated personal data, PHI, payment data, or customer records are processed by U1. Compliance requirements are therefore limited to supply-chain hygiene, auditability of release evidence, and avoiding accidental disclosure of local environment data in CLI output.

## Upstream Coverage

- `business-logic-model.md`: Startup, parser, help, and delegation boundaries define trust boundaries.
- `business-rules.md`: Safety, runtime, and package metadata rules define controls.
- `requirements.md`: FR-001 / FR-002 / FR-003 / FR-004 / FR-011 / NFR-005 define security-relevant acceptance.
- `technology-stack.md`: Current root package metadata risks drive package metadata controls.
