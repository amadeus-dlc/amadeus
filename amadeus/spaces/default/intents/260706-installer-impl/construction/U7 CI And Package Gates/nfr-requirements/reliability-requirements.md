# Reliability Requirements — U7 CI And Package Gates

> Stage: construction / nfr-requirements  
> Unit: U7 CI And Package Gates  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U7 reliability means installer-related PRs deterministically receive every required blocking gate, non-installer PRs are skipped only for package-specific gates, failures produce actionable reports, and no successful U7 result implies release publication.

## Reliability Targets

| Scenario | Requirement | Evidence |
|---|---|---|
| installer-related path changed | GatePlan status is `required` and all required gates are listed | classifier fixture |
| non-installer path changed | package-specific gates skipped with reason and global gates unchanged | classifier fixture |
| package metadata invalid | metadata gate fails with report artifact | package fixture |
| coverage registry stale | coverage gate fails with missing/stale key names | registry fixture |
| ratchet decreased | coverage gate fails with baseline comparison | ratchet fixture |
| reachable High/Critical vulnerability | dependency audit fails unless valid allowlist exists | security fixture |
| verified secret found | secret scan fails and redacts value | secret fixture |
| dist/promote drift | drift gates fail without auto-committing fixes | drift fixture |
| U7 success | report says PR gate passed and U8 handoff ready, not release-ready | report snapshot |

## Failure Handling

- Missing scanner-producing output on a required path fails as schema/input failure.
- Invalid normalized finding schema exits 2 and fails CI.
- A failed gate must not prevent other independent gates from reporting when dependencies allow.
- Dependency setup failure may fail-fast because dependent gates are not executable.
- Reports must name gate, command, cwd, timeout, failure reason, and output artifact path where applicable.
- Allowlist exceptions must be visible as `passed-with-exception`, not hidden pass.

## Determinism Requirements

The following invariants are mandatory:

- path classification uses changed files from the PR event or an equivalent deterministic source.
- every GateName maps to a stable GitHub Actions check name.
- command, cwd, output artifact, pass/fail mapping, timeout, dependency, and path condition match `business-logic-model.md`.
- U7 never publishes, tags, or writes GitHub Releases.
- `fail-fast` is limited to execution-impossible setup failures.
- report artifacts are written under `.amadeus-ci/setup/`.
- U8 may reuse U7 gates as preflight, but U7 does not claim release success.

## Portability Reliability

| Surface | Requirement | Verification |
|---|---|---|
| GitHub Actions shell | commands use Bun/root scripts rather than shell-specific pipelines where practical | workflow fixture |
| path matching | patterns treat `/` in Git paths and do not depend on local OS separators | classifier fixture |
| report paths | artifact paths are repo-relative under `.amadeus-ci/setup/` | report fixture |
| Bun version | CI uses configured Bun baseline from `technology-stack.md` | workflow assertion |
| scanner adapters | normalized schema isolates tool-specific output differences | security fixture |

## Observability And Diagnostics

- Gate summary includes installer-related decision and matched path reasons.
- Each gate report includes status: `passed`, `failed`, `skipped`, or `passed-with-exception`.
- Failed dependency and secret findings include stable ids/fingerprints.
- Coverage failures name missing stale keys and decreased ratchet keys.
- Drift failures point to regeneration or promotion command guidance without modifying files.
- Reports are uploaded as CI artifacts when the workflow reaches artifact upload.

## Upstream Coverage

- `business-logic-model.md`: gate execution contract, dependency/allowlist workflow, coverage workflow, and U8 handoff define reliability requirements.
- `business-rules.md`: gate, security, drift, and reporting rules define deterministic behavior.
- `requirements.md`: FR-016, FR-017 boundary, NFR-003, NFR-004, and NFR-005 define reliability acceptance.
- `technology-stack.md`: existing GitHub Actions and Bun baseline define execution environment.

