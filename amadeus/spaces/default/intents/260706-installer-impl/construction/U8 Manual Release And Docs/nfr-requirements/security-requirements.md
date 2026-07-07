# Security Requirements — U8 Manual Release And Docs

> Stage: construction / nfr-requirements  
> Unit: U8 Manual Release And Docs  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U8 security covers manual release authorization, protected environment approval, npm credential/trusted publishing boundary, SBOM/provenance evidence, publish guard enforcement, package/version confirmation, release preflight gates, and secret-safe release reporting. U8 documentation security covers preventing unsafe or stale install instructions from becoming the primary path.

## Threat Considerations

| Threat | Requirement | Verification |
|---|---|---|
| automatic publish on merge/tag | workflow triggers only `workflow_dispatch` for publish path | workflow trigger test |
| wrong package published | `confirm_package` must equal `@amadeus-dlc/setup` for `dry_run:false` | input validation fixture |
| prerelease published as `latest` | explicit prerelease requires non-`latest` npm dist-tag | tag fixture |
| publish from unvalidated source | selected tag validation and unconditional U7 preflight must pass | release fixture |
| vulnerable/secret-bearing package released | dependency-audit and secret-scan are required in release context | U7 preflight report |
| missing provenance/SBOM | publish blocked before npm publish | evidence fixture |
| npm token exposed in PR logs | token-based credential, if selected, is only used in protected release environment | workflow review |
| existing npm version conflict hidden | publish-validation blocks before `npm publish` | npm metadata fixture |
| docs route users to manual destructive copy | installer-first docs, `bunx`, best-effort `npx` caveat, Bun requirement, and backup/manifest safety text are required | docs consistency fixture |

## Data Classification

| Data | Classification | Handling |
|---|---|---|
| release inputs | maintainer-controlled release metadata | validated and recorded in summary |
| selected tag | provenance source | recorded in release reports |
| npm publish identity | release authority | exactly one configured token-based credential or trusted publishing identity must be verifiable in protected release environment |
| SBOM/provenance artifacts | supply-chain evidence | uploaded as release CI artifacts |
| package dry-run contents | publish evidence | stored as CI artifact |
| npm metadata query result | public registry metadata | used for publish validation and post-publish verification |
| docs references | user-facing safety guidance | checked for package/bin/command consistency |

## Controls

- Publish path is reachable only on `workflow_dispatch`.
- `dry_run:true` cannot invoke `npm publish`.
- `dry_run:false` requires exact `confirm_package`, selected tag validation, U7 preflight success, SBOM/provenance evidence, publish-validation success, protected environment approval, and exactly one verified npm publish identity.
- The concrete publish identity mode is deferred to CI/Deployment design, but the release workflow contract must support one of two modes: token-based npm credential in the protected environment, or npm trusted publishing identity bound to the protected environment. If neither mode is configured, both are configured ambiguously, or the selected mode cannot be verified before publish, publish is blocked.
- Release context cannot skip U7 gates through changed-file classification.
- Publish command is fixed to `cwd=packages/setup` and `npm publish --tag <npm_dist_tag> --access public --provenance`.
- Secret values, tokens, and npm credentials must not be printed in summaries or artifacts.
- Post-publish verification failure must not hide that publish already happened.
- Docs must not describe local manual npm publish as the primary maintainer path.
- Docs consistency must fail when installer docs omit `bunx`, best-effort `npx` behavior, or the statement that Bun is required for this release.

## Compliance Mapping

U8 does not process regulated personal data. Compliance relevance is supply-chain evidence and release governance: manual approval, protected environment, SBOM/provenance, U7 preflight, and post-publish verification provide auditable controls for public package publication.

## Upstream Coverage

- `business-logic-model.md`: publish guard, validation plan, preflight policy, post-publish verification, and docs workflow define security controls.
- `business-rules.md`: BR-U8-001 through BR-U8-042 define trigger, credential, evidence, publish, and docs safety rules.
- `requirements.md`: FR-015, FR-017, NFR-003, and NFR-005 define security-relevant acceptance.
- `technology-stack.md`: GitHub Actions and Bun/TypeScript release scripts define implementation mechanics.
