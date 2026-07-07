# Tech Stack Decisions — U7 CI And Package Gates

> Stage: construction / nfr-requirements  
> Unit: U7 CI And Package Gates  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| CI platform | GitHub Actions | Existing CI uses GitHub Actions and FR-016 targets PR checks. |
| Runtime | Bun-first TypeScript scripts | Matches `technology-stack.md` and installer package stack. |
| Gate reports | JSON artifacts under `.amadeus-ci/setup/` | Provides machine-readable and uploadable evidence. |
| Change detection | repo-relative changed-file classifier | Enables installer-related path conditions without weakening global gates. |
| Security scanner integration | scanner adapters produce normalized JSON consumed by `security-gate.ts` | Keeps U7 independent of final scanner tool choice. |
| Dependency exception model | explicit allowlist JSON at `packages/setup/security/vulnerability-allowlist.json` | Makes High/Critical exceptions reviewable and expiring. |
| Coverage floor | U6 coverage registry + ratchet | Matches BR-U7-022 and avoids misleading line coverage gates. |
| Release boundary | no npm token, no publish, no GitHub Release in U7 | U8 owns manual release workflow. |

## Dependency Policy

- U7 scripts should use Bun/TypeScript and standard APIs where practical.
- Any CI/security tool dependency must be justified as dev/publish tooling and must not become installer runtime dependency unless explicitly required.
- Scanner-specific output must be normalized before blocking decisions.
- Package dry-run must validate publish contents without uploading artifacts to npm.

## Gate Script Surface

| Script or step | Required role |
|---|---|
| `package-check.ts` | validate package metadata and root dev-only boundary |
| `package-dry-run.ts` | validate publish contents and bin/files allowlist |
| U6 smoke command | validate executable CLI basics |
| U6 integration command | validate temp filesystem behavior and coverage keys |
| `coverage-gate.ts` | validate registry freshness and ratchet |
| `security-gate.ts audit` | validate dependency findings and allowlist |
| `security-gate.ts secrets` | validate secret findings and redaction |
| existing `bun run typecheck` | validate TypeScript contracts |
| existing `bun run lint` | validate static/style checks |
| existing `bun run dist:check` | validate generated distribution drift |
| existing `bun run promote:self:check` | validate self-install promotion drift |

Final script names may be confirmed in code-generation, but each role must remain independently callable and map to a stable check name.

## Interfaces To Keep Stable

- `change-set.json` containing installer-related decision and matched reasons.
- `GatePlan` with GateName, check name, command, cwd, inputs, artifact, pass/fail mapping, timeout, dependencies, and path condition.
- normalized dependency finding schema defined in "Normalized Security Schemas".
- normalized secret finding schema defined in "Normalized Security Schemas".
- allowlist schema defined in "Normalized Security Schemas".
- gate report status values: `passed`, `failed`, `skipped`, `passed-with-exception`.

## Normalized Security Schemas

Scanner tool choice remains open, but the adapter output schema is fixed for U7.

### Dependency Finding

| Field | Required | Type | Valid values / format | Invalid when |
|---|---|---|---|---|
| `id` | yes | string | stable finding id | empty |
| `scanner` | yes | string | scanner adapter name | empty |
| `packageName` | yes | string | package name | empty |
| `advisoryId` | yes | string | CVE/GHSA/OSV or scanner id | empty |
| `affectedRange` | yes | string | scanner-normalized affected range | empty |
| `severity` | yes | string | `low`, `medium`, `high`, `critical` | other value or mixed case |
| `reachable` | no | boolean | `true` or `false` | non-boolean when present |
| `surface` | yes | string | `installer-runtime`, `publish-tooling`, `dev-only`, `unknown` | other value |
| `fingerprint` | yes | string | stable dedupe key | empty |
| `url` | no | string | advisory URL | non-string when present |

Blocking logic treats a finding as blocking when `severity` is `high` or `critical` and either `reachable:true` or `surface` is `installer-runtime` or `publish-tooling`. `surface:"dev-only"` is report-only. `surface:"unknown"` for High/Critical is blocking unless a later stage deliberately narrows reachability with evidence.

### Secret Finding

| Field | Required | Type | Valid values / format | Invalid when |
|---|---|---|---|---|
| `id` | yes | string | stable finding id | empty |
| `scanner` | yes | string | scanner adapter name | empty |
| `verified` | yes | boolean | `true` or `false` | non-boolean |
| `fingerprint` | yes | string | stable dedupe key | empty |
| `path` | yes | string | repo-relative file path | empty or absolute path |
| `line` | yes | integer | 1 or greater | missing, non-integer, or less than 1 |
| `ruleId` | yes | string | scanner rule id | empty |

Secret finding output must not include the secret value. Any `verified:true` finding is blocking.

### Vulnerability Allowlist Entry

| Field | Required | Type | Valid values / format | Invalid when |
|---|---|---|---|---|
| `advisoryId` | yes | string | exact advisory id | empty |
| `packageName` | yes | string | exact package name | empty |
| `affectedRange` | yes | string | exact affected range from finding | empty or mismatch |
| `reason` | yes | string | human-readable rationale | empty |
| `owner` | yes | string | accountable owner | empty |
| `expiresAt` | yes | string | ISO 8601 date `YYYY-MM-DD` interpreted UTC | invalid date or CI date later than value |

Allowlist matching requires exact `advisoryId`, `packageName`, and `affectedRange`. A malformed findings file, malformed allowlist file, missing required field, invalid enum, invalid type, or expired allowlist entry is a CI failure.

## Alternatives Rejected

| Alternative | Reason |
|---|---|
| always run installer gates for every PR | wastes CI time and makes unrelated PRs slower without improving installer confidence. |
| skip dependency/secret gates until release | violates FR-016 and shifts merge risk to release time. |
| rely only on package dry-run | does not prove safety behavior, coverage, drift, or security posture. |
| make scanner tool choice part of NFR | functional design intentionally normalizes scanner output; CI design can choose OSV/gitleaks/etc. |
| auto-fix drift in CI | hides source/dist mismatch and creates unreviewed generated changes. |
| publish dry-run with npm token | unnecessary for PR validation and risks credential exposure. |

## Upstream Coverage

- `business-logic-model.md`: gate contract, security workflows, coverage workflow, drift guard, and U8 handoff define technology decisions.
- `business-rules.md`: gate, metadata, test, security, drift, and reporting rules drive stable interfaces.
- `requirements.md`: FR-016, FR-017 boundary, NFR-003, NFR-005, and CON-002 define constraints.
- `technology-stack.md`: GitHub Actions, Bun, TypeScript, existing scripts, and package metadata posture are the baseline.
