# Security Design — U8 Manual Release And Docs

> Stage: construction / nfr-design  
> Unit: U8 Manual Release And Docs

## Security Boundary

U8はpublic npm publish authorityを扱う境界である。`security-requirements.md` の通り、publish pathはGitHub Actions `workflow_dispatch` だけで到達でき、ordinary push、merge、tag pushでは `npm publish` を実行しない。

## Publish Guards

`dry_run:false` のpublishは次の条件がすべて成立した時だけ許可する。

- workflow event is `workflow_dispatch`;
- `confirm_package` equals `@amadeus-dlc/setup`;
- selected tag exists and maps to the package version;
- explicit prerelease uses non-`latest` npm dist-tag;
- U7 preflight passes in release mode without changed-file skip;
- SBOM/provenance evidence exists;
- publish-validation confirms npm version is not already published;
- protected environment approval is granted;
- exactly one npm publish identity mode is verified;
- publish command runs once with `cwd=packages/setup`.

Missing condition produces non-publish failure or dry-run completion. U8 does not hide publish failure behind retry loops.

## Publish Identity Contract

The concrete credential mode is deferred to CI/Deployment design, but U8 fixes the contract.

| Mode | Required verification |
|---|---|
| token-based npm credential | protected release environment exposes expected token only to publish job; validation confirms configuration without printing token |
| npm trusted publishing | protected release environment is bound to trusted publishing identity and can produce provenance for `@amadeus-dlc/setup` |

Exactly one mode must be selected for real publish. Neither configured、both ambiguously configured、or selected mode unverifiable means publish-validation fails before `npm publish`.

## Evidence And Reporting Controls

SBOM/provenance evidence is generated before publish and uploaded as release artifacts. Secret values, tokens, and npm credentials are never printed. Publish validation reports package name、version、selected tag、dist-tag、existing-version status、selected publish identity mode、eligibility, but not credential values.

Post-publish verification failure must state that publish already happened and name failed checks. It must not imply rollback or hide published package/version.

## Documentation Safety

Docs must be installer-first and must not route maintainers to local manual npm publish as primary path. End-user docs must use `install` and `upgrade`; `init` command or alias is forbidden. Docs must include Bun requirement、best-effort `npx` caveat、backup/manifest safety、`--yes` vs `--force` behavior。

## Upstream Coverage

- `performance-requirements.md`: publish guards run within release workflow budgets.
- `security-requirements.md`: manual authorization、protected environment、identity contract、SBOM/provenance、publish validation、docs safety を直接設計した。
- `scalability-requirements.md`: release artifacts and docs checks remain bounded under growth.
- `reliability-requirements.md`: missing identity、existing version、publish failure、post-publish failure are classified.
- `tech-stack-decisions.md`: `npm publish --tag <npm_dist_tag> --access public --provenance` with `cwd=packages/setup` に従う。
- `business-logic-model.md`: Publish Guard Workflow、Release Validation Plan、Documentation Workflow に沿う。
