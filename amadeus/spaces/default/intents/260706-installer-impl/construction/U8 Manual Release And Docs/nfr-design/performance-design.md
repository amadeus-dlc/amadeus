# Performance Design — U8 Manual Release And Docs

> Stage: construction / nfr-design  
> Unit: U8 Manual Release And Docs

## Design Goals

U8の性能設計は、maintainerがGitHub Actionsのbuttonでrelease dry-runまたはguarded publishを実行できる範囲に限定する。`performance-requirements.md` の通り、ordinary PR gate executionはU7の責務であり、U8ではrelease preflightとして再利用する。

## Release Workflow Budget

| Step | Budget | Design |
|---|---:|---|
| workflow input validation | p95 <= 30s | `tag`、`dry_run`、`npm_dist_tag`、`confirm_package` を先にvalidateし、credential use前にfailする。 |
| latest stable SemVer tag selection over 1,000 tags | p95 <= 30s | tag listをSemVer正規化し、v-prefixed duplicateを優先する。 |
| U7 preflight aggregate | p95 <= 20 min | release modeでchanged-file skipなしに11 gatesを再利用する。 |
| package build + dry-run | p95 <= 5 min | `packages/setup`だけを対象にbounded artifactを生成する。 |
| SBOM/provenance evidence | p95 <= 5 min | publish前にevidence artifactを生成し、失敗時はpublishしない。 |
| publish validation | p95 <= 2 min | npm metadataを事前確認し、existing versionをpublish前に止める。 |
| dry-run workflow | p95 <= 30 min | validation pathをpublish runと共有し、`npm publish`を呼ばない。 |
| publish workflow | p95 <= 35 min excluding approval | protected approval waitを除外して測る。 |
| post-publish verification | p95 <= 5 min | npm metadata、bin、tarball、docs consistencyを確認する。 |
| docs consistency | p95 <= 2 min | root READMEとpackages/setup README中心にlocal text checksを行う。 |

## Tag Selection Performance

Omitted `tag` はlatest stable SemVer tagを選ぶ。GitHub Release orderingは使わず、tag namesをSemVerとしてparseする。`v1.2.3` と `1.2.3` が重複したら `v` prefixed tagをcanonicalにする。Prereleaseはdefault selectionから除外する。

## Artifact Strategy

Release reports are written under `.amadeus-ci/setup/`:

- `release-preflight.json`;
- `build.json`;
- `package-dry-run.json`;
- `evidence.json`;
- `publish-validation.json`;
- `post-publish.json`;
- docs consistency report.

Large SBOM/provenance and dry-run details are downloadable artifacts; GitHub Actions summary includes bounded counts and links.

## Non-Goals

- Push、merge、tag pushでのpublishは行わない。
- Multi-registry/multiple package releaseは行わない。
- Release queueやautomated release trainは導入しない。
- U8はU7 PR gate scopeを広げない。

## Upstream Coverage

- `performance-requirements.md`: step budgets、measurement protocol、resource constraints を設計に反映した。
- `security-requirements.md`: protected approval wait除外、dry-run no publish、publish validation before publish を維持する。
- `scalability-requirements.md`: tag/package/docs/artifact/npm metadata capacityを含めた。
- `reliability-requirements.md`: correct non-publish behaviorとguard classificationを性能より優先する。
- `tech-stack-decisions.md`: workflow_dispatch、Bun scripts、release-setup.yml、evidence artifacts に従う。
- `business-logic-model.md`: Release Workflow、Tag Selection、Release Validation Plan、Docs Workflow に沿う。
