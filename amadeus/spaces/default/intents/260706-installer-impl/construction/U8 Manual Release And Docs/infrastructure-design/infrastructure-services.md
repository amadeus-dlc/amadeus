# Infrastructure Services — U8 Manual Release And Docs

> Stage: construction / infrastructure-design  
> Unit: U8 Manual Release And Docs

## Service Inventory

U8 uses GitHub Actions, npm registry access, and repository scripts as infrastructure services:

| Boundary | Role | Publish side effect |
|---|---|---|
| GitHub Actions `workflow_dispatch` | manual release entry | none by itself |
| Tag Source | list/select exact or latest stable SemVer tag | none |
| U7 Release Preflight | rerun PR gates in release mode | none |
| Package Build/Dry-Run | build and inspect package artifact | none |
| Evidence Service | generate SBOM/provenance evidence | none |
| Docs Consistency Service | validate README/package docs | none |
| npm Metadata Service | check existing version and package metadata | read-only |
| Protected Publish Environment | approval and credential/identity boundary | permits publish job only |
| Publish Identity Service | verify exactly one publish mode | none by itself |
| npm Publish Service | `npm publish --tag <npm_dist_tag> --access public --provenance` | publishes package |
| Post-Publish Verification Service | npm metadata/tarball/bin/docs checks | read-only after publish |

## Input Validation Boundary

The workflow validates `tag`, `dry_run`, `npm_dist_tag`, and `confirm_package` before expensive validation and before credential access. `confirm_package` must equal `@amadeus-dlc/setup` for real publish. Prerelease tags cannot publish with `npm_dist_tag: latest`.

## Tag Selection Boundary

When `tag` is omitted, U8 reads canonical repo tags and selects the highest stable SemVer tag. GitHub Release metadata does not determine ordering. If `v1.2.3` and `1.2.3` both exist, the v-prefixed tag is canonical for release provenance.

## Publish Identity Boundary

Real publish requires exactly one verified publish identity mode:

- token-based npm credential in protected release environment; or
- npm trusted publishing identity/provenance capability.

No identity, both identities, or unverifiable selected identity blocks publish before `npm publish`. Credential values are never printed.

## Documentation Boundary

Docs checks cover root `README.md` and `packages/setup/README.md` first. They require package name `@amadeus-dlc/setup`, bin `amadeus-setup`, `install` and `upgrade` examples, no `init`, Bun requirement, best-effort `npx` caveat, `--yes` vs `--force`, backup/manifest safety, and GitHub Actions button release guidance.

## Upstream Coverage

- `performance-design.md`: services map to validation/tag/preflight/evidence/docs/publish budgets.
- `security-design.md`: publish guards, protected environment, identity validation, and docs safety define service behavior.
- `scalability-design.md`: services remain bounded to one package, one tag, and limited docs/artifact surfaces.
- `reliability-design.md`: release states and deterministic guards define service outcomes.
- `logical-components.md`: ReleaseWorkflow, validators, preflight, evidence, publish, post-publish, docs, and reporter are represented.
- `components.md`: Release Workflow Contract and Documentation Update Owner stay explicit.
- `services.md`: npm Registry Publication and GitHub Actions PR Gates are connected by release preflight.
- `business-logic-model.md`: Release Validation Plan and Publish Guard Workflow define service contracts.
