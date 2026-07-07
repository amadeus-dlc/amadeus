# User Stories Assessment

## Decision

Execute user stories.

## Rationale

This intent delivers a user-facing installer with multiple distinct users: new OSS users installing Amadeus for the first time, existing users upgrading safely, maintainers publishing the installer, and contributors validating changes in CI. Requirements already define the product contract, but stories add value by turning `install`, `upgrade`, release, and validation flows into independently testable user outcomes.

## Factors Considered

| Factor | Assessment |
|---|---|
| Project type | Brownfield feature in an existing TypeScript/Bun framework |
| User-facing scope | High: `amadeus-setup` is the primary onboarding entrypoint |
| Personas | New user, existing user, maintainer, contributor/CI owner |
| Business logic | Moderate: version resolution, manifest state, backup policy, CI/release gates |
| Cross-team coordination | Present: product, developer, QA, DevSecOps, release ownership |

## Key Story Areas

- First-time install with harness selection and verification
- Safe upgrade with manifest, backup, and file-level report
- Version resolution from stable SemVer tags
- CI and release validation for the npm package
- Documentation and onboarding from README

## Story Plan

| Planning choice | Decision |
|---|---|
| Breakdown approach | By user workflow: `install`, `upgrade`, release/publish, CI validation, docs/onboarding |
| Primary persona | New OSS user |
| Granularity | Thin vertical slices that are independently end-to-end testable |

The generated story set prioritizes the new-user install path first, then expands to safe upgrade, release/publish, CI validation, and documentation. Technical implementation modules are intentionally not used as the primary story breakdown axis.

## Review Resolution

Product Lead reviewer iteration 1 returned NOT-READY because several Must requirements were not traceable to stories. The story set was updated to include package entrypoint/runtime/layout, full upgrade branch coverage, tag resolver detail, report/manifest schema traceability, and portability/dependency discipline.

Product Lead reviewer iteration 2 returned NOT-READY with three remaining gaps. Builder resolution applied the requested fixes:

- Network failure handling moved from Should Have to Must Have because FR-012 is Must.
- Upgrade version-state branches were added: already-up-to-date, downgrade-unsupported, installed-newer-than-latest, and explicit newer version.
- Multiple harness rejection was added as a non-interactive safety acceptance criterion.
