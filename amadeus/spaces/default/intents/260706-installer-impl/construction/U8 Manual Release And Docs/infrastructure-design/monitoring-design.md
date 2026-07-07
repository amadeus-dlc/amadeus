# Monitoring Design — U8 Manual Release And Docs

> Stage: construction / infrastructure-design  
> Unit: U8 Manual Release And Docs

## Observability Scope

U8 observability is GitHub Actions release summary, release validation reports, SBOM/provenance artifacts, docs consistency report, npm publish result, and post-publish verification evidence. No secret values are logged.

## Release Signals

| Signal | Producer | Purpose |
|---|---|---|
| selected tag/version | ReleaseTagSelector | provenance and package-version validation |
| release-preflight report | ReleasePreflightRunner | prove U7 gates ran without changed-file skip |
| package dry-run report | PackageBuilder / U7 dry-run | inspect package contents |
| evidence report | ReleaseEvidenceGenerator | SBOM/provenance availability |
| docs consistency report | DocsConsistencyChecker | prevent stale install/upgrade/init docs |
| publish-validation report | PublishValidator | existing version, dist-tag, package eligibility |
| identity validation status | PublishIdentityValidator | prove exactly one publish identity |
| npm publish result | PublishExecutor | record publish attempt outcome |
| post-publish report | PostPublishVerifier | verify published package metadata and docs consistency |
| release summary | ReleaseReporter | state dry-run, blocked, failed, or published result |

## GitHub Actions Summary

Summary includes:

- selected tag, package version, and npm dist-tag;
- dry-run or publish mode;
- guard that blocked publish, if any;
- U7 preflight status;
- evidence and package artifact links;
- docs consistency status;
- publish status and post-publish status;
- clear statement when publish already happened but verification failed.

The summary must never print npm token values, secret contents, full environment dumps, or credential configuration details.

## Docs Diagnostics

Docs consistency failure names stale file paths and missing/forbidden strings. Forbidden examples include `amadeus-setup init` and an `init` alias. Required examples include `amadeus-setup install` and `amadeus-setup upgrade`.

## Failure Diagnostics

Each failure names the release state: `input-invalid`, `preflight-failed`, `validation-failed`, `dry-run-complete`, `publish-blocked`, `publish-failed`, `published-verification-failed`, or `published`. Post-publish failure explicitly states that publish already happened.

## Upstream Coverage

- `performance-design.md`: per-step timings and artifact links support release budget tracking.
- `security-design.md`: reporting controls keep credentials secret and publish guards visible.
- `scalability-design.md`: bounded artifacts and summary fields scale with tag/docs/package metadata growth.
- `reliability-design.md`: release state machine and failure diagnostics become observable signals.
- `logical-components.md`: every U8 component produces a release signal.
- `components.md`: Release Workflow Contract and Documentation Update Owner feed the summary.
- `services.md`: npm publication and GitHub Actions release workflow are observable service boundaries.
- `business-logic-model.md`: Release Validation Plan, Post-Publish Verification, and Documentation Workflow define signal points.
