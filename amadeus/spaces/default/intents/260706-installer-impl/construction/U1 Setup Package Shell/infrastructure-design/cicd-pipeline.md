# CI/CD Pipeline — U1 Setup Package Shell

> Stage: construction / infrastructure-design  
> Unit: U1 Setup Package Shell

## Pipeline Summary

U1 CI/CD is validation-only for PRs and dry-run/publish-gated for releases. U1 itself does not deploy a service. Package publication is owned by U8 and must be manually triggered through GitHub Actions.

## PR Gates

| Gate | U1 relevance |
|---|---|
| typecheck | parser/entrypoint/package checker TypeScript contracts |
| lint | static/style checks |
| installer smoke | `amadeus-setup --help`, `init` rejection, Bun-required behavior |
| package metadata | `name`, `bin`, `license`, `repository`, `files`, root dev-only boundary |
| package dry-run | publish contents allowlist |
| coverage registry | U1 parser/help/runtime coverage keys |

These gates are required for installer-related changes by U7. U1 does not weaken global repository gates.

## Release Path

U8 release workflow reuses U7 preflight in release mode and then runs package build/dry-run/evidence/publish validation. `dry_run:true` must not publish. `dry_run:false` requires confirm package、protected environment、exactly one publish identity mode、and publish validation before `npm publish`.

## Secrets Management

U1 PR gates require no npm token. Release credentials are not available to U1 scripts and are only considered in U8 publish path. The npm bin wrapper must never inspect release credentials.

## Rollback Strategy

There is no service rollback. For package release, rollback is a maintainer release-management concern after npm publish and outside U1. U1 contributes by ensuring package dry-run and release dry-run evidence exist before publish.

## Upstream Coverage

- `performance-design.md`: CI smoke timing guards startup budget.
- `security-design.md`: package metadata/dry-run gates enforce publish boundary and secret safety.
- `scalability-design.md`: package size and command growth are controlled by tests/docs/gates.
- `reliability-design.md`: no-write parser/runtime failures are validated by smoke/unit tests.
- `logical-components.md`: package metadata checker and renderers map to CI gates.
- `components.md`: Package Check and Release Workflow Contract define CI/CD ownership.
- `services.md`: GitHub Actions PR Gates and npm Registry Publication boundaries are preserved.
- `business-logic-model.md`: startup/help/parser/delegation workflows define CI scenarios.
