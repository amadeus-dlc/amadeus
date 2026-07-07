# Reliability Design — U7 CI And Package Gates

> Stage: construction / nfr-design  
> Unit: U7 CI And Package Gates

## Reliability Objectives

U7はinstaller-related PRにrequired gatesをdeterministically適用し、non-installer PRではpackage-specific gatesだけを明示skipする。`reliability-requirements.md` の通り、U7 successはrelease publicationを意味せず、U8 handoff readyを意味するだけである。

## GatePlan Determinism

`InstallerChangeDetector` はPR changed filesまたは同等のdeterministic sourceだけを使う。Path matchingはGit pathの `/` を前提にし、local OS separatorsに依存しない。

Every GateName maps to stable GitHub Actions check name. Command、cwd、output artifact、pass/fail mapping、timeout、dependency、path conditionは `business-logic-model.md` のConcrete Gate Execution Contractに一致する。

## Failure Handling

| Failure | Handling |
|---|---|
| installer-related path changed | GatePlan `required`; all required gates listed |
| non-installer path changed | package-specific gates `skipped` with reason; global gates unchanged |
| missing scanner findings file | schema/input failure; CI failed |
| invalid normalized schema | exit 2; CI failed |
| package metadata invalid | report artifact; CI failed |
| stale coverage registry | missing/stale key names; CI failed |
| ratchet decreased | baseline comparison report; CI failed |
| valid vulnerability allowlist | `passed-with-exception`, visible owner/expiry/reason |
| dist/promote drift | fail without auto-fix |

Independent gates continue when dependencies allow. Fail-fast is limited to dependency setup failures that make downstream gates non-executable.

## Report Contract

Each gate report has status `passed`、`failed`、`skipped`、or `passed-with-exception`。Failed reports include gate、command、cwd、timeout、failure reason、diagnostics path or artifact path。Gate summary includes installer-related decision、matched path reasons、gate matrix、blocking failures、U8 handoff status。

U7 report must say `U8 handoff ready` or `not ready`; it must not say release-ready, published, or released.

## Portability Reliability

Commands use Bun/root scripts rather than shell-specific pipelines where practical. Report paths are repo-relative under `.amadeus-ci/setup/`. Bun version is pinned to the baseline from `technology-stack.md`. Scanner adapters isolate tool-specific output differences through normalized schemas.

## Test Strategy

U6/U7 fixtures cover:

- classifier installer-related and non-installer paths;
- every GateName contract;
- missing scanner output;
- invalid dependency/secret schema;
- valid/expired/malformed allowlist;
- verified secret redaction;
- package metadata failure;
- dry-run unexpected file;
- coverage stale and ratchet decreased;
- dist/promote drift;
- U7 success report showing U8 handoff ready only.

## Upstream Coverage

- `performance-requirements.md`: reliability behavior preserves independent gate reporting within budget.
- `security-requirements.md`: scanner/allowlist/package/secret failures are classified deterministically.
- `scalability-requirements.md`: report artifacts and gate registry remain stable as counts grow.
- `reliability-requirements.md`: GatePlan determinism、failure handling、portability、observability を直接設計した。
- `tech-stack-decisions.md`: stable interfaces、status values、normalized schemas、release boundary に従う。
- `business-logic-model.md`: Gate Selection、Concrete Gate Execution Contract、coverage/security/drift workflows、CI Handoff To U8 に沿う。
