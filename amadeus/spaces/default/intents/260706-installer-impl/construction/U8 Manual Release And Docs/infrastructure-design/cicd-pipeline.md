# CI/CD Pipeline — U8 Manual Release And Docs

> Stage: construction / infrastructure-design  
> Unit: U8 Manual Release And Docs

## Pipeline Position

U8 defines `.github/workflows/release-setup.yml`, a manual GitHub Actions release workflow. It is not triggered by ordinary push, pull request, merge, or tag push. It reuses U7 gates as release preflight and adds release-specific validation, evidence, docs, publish, and post-publish steps.

## Workflow Inputs

| Input | Default | Gate |
|---|---|---|
| `tag` | empty | empty selects latest stable SemVer tag; non-empty requires exact tag exists |
| `dry_run` | `true` | true validates without protected publish environment or `npm publish` |
| `npm_dist_tag` | `latest` | prerelease cannot use `latest` |
| `confirm_package` | empty | real publish requires exact `@amadeus-dlc/setup` |

## Jobs

| Job | Required behavior |
|---|---|
| input-and-tag | validate inputs, select exact/latest stable tag, write selected-tag report |
| release-preflight | run all U7 gates in release mode without changed-file skip |
| build-and-evidence | build package, run package dry-run, generate SBOM/provenance evidence |
| docs-consistency | check README and package docs for installer-first `install` / `upgrade` guidance and no `init` |
| publish-validation | check package version/tag/npm metadata/dist-tag and existing version before publish |
| publish | only when `dry_run:false`; protected environment approval; exactly one identity; one `npm publish` |
| post-publish | verify npm metadata/bin/tarball/docs consistency after publish |
| release-summary | upload artifacts and summarize dry-run/blocked/failed/published state |

## Publish Command Contract

Real publish runs at most once:

```text
cwd=packages/setup
npm publish --tag <npm_dist_tag> --access public --provenance
```

If provenance cannot be produced, evidence or publish validation fails before publish. Existing npm version also fails before publish.

## Dry-Run Contract

`dry_run:true` runs input/tag validation, U7 preflight, build/dry-run, evidence generation, docs consistency, and publish validation. It does not access protected publish secrets, validate secret presence, or run `npm publish`.

## Upstream Coverage

- `performance-design.md`: jobs map to release workflow budgets and artifact strategy.
- `security-design.md`: manual trigger, protected environment, publish identity, SBOM/provenance, publish guards, and docs safety are enforced.
- `scalability-design.md`: one selected tag/package and bounded artifacts define workflow scale.
- `reliability-design.md`: dry-run/publish shared validation path and state machine define job behavior.
- `logical-components.md`: jobs map to U8 release components.
- `components.md`: Release Workflow Contract and Documentation Update Owner are implemented.
- `services.md`: npm Registry Publication is guarded by GitHub Actions release workflow.
- `business-logic-model.md`: Workflow Inputs, Release Validation Plan, Publish Guard, and Documentation Workflow define CI/CD.
