# Tech Stack Decisions — U8 Manual Release And Docs

> Stage: construction / nfr-requirements  
> Unit: U8 Manual Release And Docs  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Release platform | GitHub Actions `workflow_dispatch` | Matches FR-017 and maintainer button requirement. |
| Release workflow path | `.github/workflows/release-setup.yml` | Concrete workflow owner from U8 functional design. |
| Runtime | Bun-first TypeScript release scripts | Matches `technology-stack.md` and U7 script contracts. |
| Release preflight | reuse U7 gates in release mode without changed-file skip | Prevents publishing without PR-equivalent evidence. |
| Publish command | `npm publish --tag <npm_dist_tag> --access public --provenance` with `cwd=packages/setup` | Matches BR-U8-026 and provenance requirement. |
| Evidence | SBOM/provenance artifacts before publish | Required by FR-017. |
| Protected release boundary | GitHub protected environment plus exactly one verified npm publish identity | Separates PR checks from publish authority while leaving token vs trusted publishing selection to CI/Deployment design. |
| Docs surfaces | root `README.md` and `packages/setup/README.md` as primary docs | Matches FR-015 and package-specific usage needs. |

## Dependency Policy

- Release scripts should use Bun/TypeScript and standard APIs where practical.
- npm registry queries may use `npm view` or a small fetch adapter, but must not become installer runtime dependency.
- SBOM/provenance tooling is release/publish tooling, not user-side installer runtime dependency.
- Documentation checks should be local text/metadata checks and not require network.
- U8 must not introduce automatic publish tooling on normal CI paths.

## Release Script Surface

| Script or step | Required role |
|---|---|
| `select-release-tag` equivalent | resolve omitted tag to highest stable SemVer tag |
| U7 preflight aggregate | run all publish-relevant U7 gates in release mode |
| `build-package.ts` | build `@amadeus-dlc/setup` package |
| U7 `package-dry-run` | verify publish contents before publish |
| `release-evidence.ts` | generate SBOM/provenance evidence |
| `publish-validate.ts` | check package/tag/version/dist-tag/npm metadata before publish |
| `npm publish` | publish package when all guards pass |
| `post-publish-verify.ts` | verify npm metadata and tarball after publish |
| docs consistency check | verify README/package docs mention package, commands, `bunx`, best-effort `npx` caveat, Bun required, backup/manifest behavior |

Final script names may be confirmed in code-generation, but each role must remain independently callable and map to release workflow reports.

## Publish Identity Contract

The credential mode is intentionally deferred to CI/Deployment design because `requirements.md` keeps npm credentials/environment protection open. U8 fixes the release contract that downstream design must satisfy:

| Mode | Required verification | Invalid when |
|---|---|---|
| token-based npm credential | protected release environment exposes the expected npm publish token only to the publish job; validation confirms the token path is configured without printing it | token missing, token visible outside protected environment, or token printed |
| npm trusted publishing | protected release environment is bound to a trusted publishing identity that can produce npm provenance for `@amadeus-dlc/setup` | identity missing, package binding mismatch, or provenance cannot be produced |

Exactly one publish identity mode must be selected for a real publish run. If neither mode is configured, both modes are simultaneously active without an explicit selection, or the selected mode cannot be verified before `npm publish`, `publish-validation` fails and publish is not invoked.

## Interfaces To Keep Stable

- workflow inputs: `tag`, `dry_run`, `npm_dist_tag`, `confirm_package`.
- `release-preflight.json` with `mode:"release"`, `selectedTag`, and U7 gate results.
- `publish-validation.json` with package name, package version, selected tag, npm dist-tag, existing-version status, selected publish identity mode, and publish eligibility.
- `evidence.json` with SBOM/provenance artifact paths and generation status.
- `post-publish.json` with npm metadata checks, tarball contents check, docs/metadata consistency including `bunx`/best-effort `npx`/Bun-required wording, optional `bunx --help` result, and failed check names.
- release summary fields: selected tag, package version, source repo, npm dist-tag, dry-run/published status, SBOM/provenance artifact, post-publish result.

## Alternatives Rejected

| Alternative | Reason |
|---|---|
| publish on ordinary `main` merge | violates FR-017 manual workflow requirement and removes human release gate. |
| publish on tag push | still bypasses explicit GitHub Actions button and confirm-package guard. |
| local manual npm publish as primary path | weakens repeatability, evidence, and protected environment controls. |
| skip U7 gates in release context based on changed files | release source must be validated regardless of PR path classification. |
| rely on npm version conflict as the primary guard | publish-validation must fail before invoking publish. |
| keep manual `cp -r dist/<harness>` as docs primary path | violates FR-015 installer-first documentation requirement. |

## Upstream Coverage

- `business-logic-model.md`: release workflow, inputs, tag selection, preflight, validation, publish guard, post-publish verification, and docs workflow define technology decisions.
- `business-rules.md`: trigger, tag/version, validation/publish, documentation, and release metadata rules drive stable interfaces.
- `requirements.md`: FR-015, FR-017, FR-001, FR-002, FR-016, NFR-003, NFR-005, and CON-002 define constraints.
- `technology-stack.md`: GitHub Actions, Bun, TypeScript, package layout, and existing CI posture are the baseline.
