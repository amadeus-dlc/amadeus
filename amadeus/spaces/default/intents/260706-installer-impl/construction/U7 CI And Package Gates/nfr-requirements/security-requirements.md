# Security Requirements — U7 CI And Package Gates

> Stage: construction / nfr-requirements  
> Unit: U7 CI And Package Gates  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U7 security covers dependency/advisory gating, secret scan gating, allowlist governance, package contents validation, metadata validation, and CI-safe reporting for installer-related PRs. U7 must not publish packages, use npm tokens, or create releases.

## Threat Considerations

| Threat | Requirement | Verification |
|---|---|---|
| vulnerable runtime/publish dependency enters installer | reachable High/Critical findings fail unless valid allowlist exists | security-gate fixture |
| expired or vague allowlist hides risk | allowlist requires advisory id, package, affected range, reason, owner, expiry | allowlist schema test |
| verified secret enters repo | any `verified:true` finding fails CI | secret fixture |
| secret value leaks in CI report | reports include fingerprint/path/line/rule id, not secret value | report snapshot |
| publish package contains local state | package dry-run allowlist rejects memory/audit/local state and unnecessary source | package fixture |
| root package becomes publishable accidentally | package metadata gate enforces root dev-only boundary | metadata fixture |
| malformed scanner output is ignored | invalid normalized schema exits 2 and fails CI | schema fixture |
| installer-related change skips gates | path classifier covers setup, tests, docs, release workflow, metadata, CI config | changed-file fixture |

## Data Classification

| Data | Classification | Handling |
|---|---|---|
| changed file list | PR metadata | used for gate selection and report summary |
| package dry-run contents | publish artifact evidence | stored as CI artifact without secrets |
| dependency findings | security metadata | normalized and allowlist-checked |
| secret findings | sensitive security metadata | never print secret values |
| allowlist entries | risk exception record | owner/reason/expiry required |
| coverage registry reports | quality evidence | stored as CI artifact |
| npm credentials | release secret | not used by U7 |

## Controls

- U7 package-specific gates are required for installer-related PRs.
- `dependency-audit` fails reachable High/Critical findings by default.
- `passed-with-exception` is allowed only for valid non-expired allowlist entries.
- Invalid scanner schema or allowlist schema is CI failure, not a soft warning.
- `secret-scan` fails on any verified secret.
- Secret reports must redact values and use fingerprint-only evidence.
- Package metadata gate validates `name`, `bin`, `license`, `repository`, `files`, and root boundary.
- U7 must not configure npm publish tokens.

## Compliance Mapping

U7 does not process regulated personal data. Compliance relevance is supply-chain and release-readiness evidence: blocking checks prove `requirements.md` FR-016, NFR-003 traceability, and NFR-005 dependency discipline before merge.

## Upstream Coverage

- `business-logic-model.md`: dependency/allowlist workflow, secret scan workflow, package metadata gate, and path conditions define security boundaries.
- `business-rules.md`: BR-U7-030 through BR-U7-037 and package metadata rules define required controls.
- `requirements.md`: FR-016, NFR-003, and NFR-005 define security-relevant acceptance.
- `technology-stack.md`: Bun/TypeScript and existing CI environment define implementation mechanics.

