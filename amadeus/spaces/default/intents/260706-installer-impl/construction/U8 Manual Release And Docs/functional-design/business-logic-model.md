# Business Logic Model — U8 Manual Release And Docs

> Stage: construction / functional-design  
> Unit: U8 Manual Release And Docs  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`, U7 functional design

## Scope

U8 は `@amadeus-dlc/setup` の手動 release workflow と user-facing docs を所有する。release は GitHub Actions の `workflow_dispatch` だけで起動し、通常の push、merge、tag push では npm publish しない。docs は root `README.md` と `packages/setup/README.md` を中心に、manual copy ではなく `amadeus-setup install` / `upgrade` を主導線にする。

## Release Workflow

1. Maintainer が GitHub Actions で `.github/workflows/release-setup.yml` を手動実行する。
2. Workflow inputs を検証する。
3. `tag` が未指定なら latest stable SemVer tag を canonical repo から解決する。
4. selected tag の repository archive または checkout ref を検証する。
5. U7 preflight gates を release context では change-set 判定なしで無条件実行する。
6. package build と package dry-run を実行する。
7. SBOM/provenance を生成する。
8. npm publish validation を実行する。
9. `dry_run:true` なら publish せず、release validation summary を出して終了する。
10. `dry_run:false` かつ protected environment approval と npm publish credentials が利用可能なら publish する。
11. post-publish verification と docs/metadata consistency check を実行する。
12. Release summary を GitHub Actions summary に出す。

## Workflow Inputs

| Input | Type | Required | Default | Rule |
|---|---|---:|---|---|
| `tag` | string | no | empty | empty の場合 latest stable SemVer tag を選ぶ。値がある場合は exact tag として扱う。 |
| `dry_run` | boolean | yes | `true` | `true` では publish しない。first run は dry run を推奨する。 |
| `npm_dist_tag` | string | no | `latest` | prerelease tag の publish 時は `next` など explicit dist-tag を要求する。 |
| `confirm_package` | string | yes | empty | publish 実行時は `@amadeus-dlc/setup` と完全一致しなければ fail する。 |

`dry_run:false` は `confirm_package`、protected environment、npm credential、selected tag validation、U7 preflight success がすべて揃った場合だけ publish に進む。

## Tag Selection Workflow

```text
selectReleaseTag(inputTag, tagSource):
  if inputTag is present:
    require exact tag exists
    if tag is prerelease:
      require npm_dist_tag != "latest"
    return selected explicit tag

  tags = tagSource.listTags(canonicalRepo)
  stable = tags matching vMAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH without prerelease
  if stable is empty:
    fail no-stable-version
  group duplicate v/non-v tags by SemVer version
  prefer v-prefixed tag when duplicate exists
  return highest SemVer version
```

The selected tag is the source of truth for release provenance and package version validation. GitHub Release metadata may be displayed but must not determine ordering.

## Release Preflight Policy

Release workflow is not a pull request, so it must not use U7's `changedFiles` path detector to decide whether installer gates are required. In release context every U7 gate that can affect published package correctness is required unconditionally for the selected tag checkout.

| U7 GateName | Release execution | Command source |
|---|---|---|
| package-metadata | required | U7 `package-metadata` command |
| package-dry-run | required | U7 `package-dry-run` command |
| installer-smoke | required | U7 `installer-smoke` command |
| installer-integration | required | U7 `installer-integration` command |
| coverage-registry | required | U7 `coverage-registry` command |
| typecheck | required | U7 `typecheck` command |
| lint | required | U7 `lint` command |
| dist-check | required | U7 `dist-check` command |
| promote-self-check | required | U7 `promote-self-check` command |
| dependency-audit | required | U7 `dependency-audit` command |
| secret-scan | required | U7 `secret-scan` command |

`release-preflight.json` therefore records `mode:"release"`, `selectedTag`, and the result of each U7 gate. It never records `installerRelated:false`.

## Release Validation Plan

| Step | Command contract | Output | Failure behavior |
|---|---|---|---|
| release-preflight | aggregate all required U7 gate results for selected tag checkout | `.amadeus-ci/setup/release-preflight.json` | fail before build |
| package-metadata | U7 `package-metadata` command | `.amadeus-ci/setup/package-metadata.json` | fail before build |
| package-dry-run | U7 `package-dry-run` command | `.amadeus-ci/setup/package-dry-run.json` | fail before publish |
| installer-smoke | U7 `installer-smoke` command | `.amadeus-ci/setup/smoke.json` | fail before publish |
| installer-integration | U7 `installer-integration` command | `.amadeus-ci/setup/integration.json` | fail before publish |
| coverage-registry | U7 `coverage-registry` command | `.amadeus-ci/setup/coverage.json` | fail before publish |
| typecheck | U7 `typecheck` command | CI log | fail before publish |
| lint | U7 `lint` command | CI log | fail before publish |
| dist-check | U7 `dist-check` command | CI log | fail before publish |
| promote-self-check | U7 `promote-self-check` command | CI log | fail before publish |
| dependency-audit | U7 `dependency-audit` command | `.amadeus-ci/setup/dependency-audit.json` | fail before publish |
| secret-scan | U7 `secret-scan` command | `.amadeus-ci/setup/secret-scan.json` | fail before publish |
| build | `bun packages/setup/src/maintainer/build-package.ts --report .amadeus-ci/setup/build.json` | `.amadeus-ci/setup/build.json` | fail before publish |
| sbom-provenance | `bun packages/setup/src/maintainer/release-evidence.ts --sbom --provenance --report .amadeus-ci/setup/evidence.json` | SBOM/provenance evidence artifact | fail before publish |
| publish-validation | `bun packages/setup/src/maintainer/publish-validate.ts --tag <tag> --dist-tag <dist-tag> --package-dir packages/setup --report .amadeus-ci/setup/publish-validation.json` | `.amadeus-ci/setup/publish-validation.json` | fail before publish, including existing npm version conflict |
| publish | `npm publish --tag <npm_dist_tag> --access public --provenance` | npm publish result and provenance statement | fail with no retry loop |
| post-publish | `bun packages/setup/src/maintainer/post-publish-verify.ts --package @amadeus-dlc/setup --tag <tag> --report .amadeus-ci/setup/post-publish.json` | `.amadeus-ci/setup/post-publish.json` | fail workflow after publish, requiring maintainer follow-up |

The publish command runs with `cwd=packages/setup` and publishes the package directory content validated by `package-dry-run`. `--access public` is mandatory for the first scoped public publish and harmless for later public publishes. `--provenance` is mandatory when the runner/npm version supports trusted publishing; if provenance cannot be produced, `sbom-provenance` or `publish-validation` must fail before `publish`.

`publish-validate.ts` checks npm registry metadata before publish. If the package version already exists, validation fails before invoking `npm publish`; the workflow must not rely on registry conflict errors as the primary guard.

## Publish Guard Workflow

Publish is allowed only when all of these are true:

- Workflow event is `workflow_dispatch`.
- `dry_run` is `false`.
- `confirm_package` equals `@amadeus-dlc/setup`.
- Selected tag exists and maps to the package version being published.
- U7 preflight gates pass.
- SBOM/provenance evidence is generated.
- `publish-validation` confirms the package version does not already exist on npm.
- Protected environment approval is granted.
- npm publish credential is present in the release environment.

Any missing condition produces a non-publish failure or dry-run completion. U8 does not define credential storage details beyond requiring the release environment boundary and a credential/trusted-publishing setup that supports `npm publish --provenance`.

## Post-Publish Verification

1. Query npm metadata for `@amadeus-dlc/setup`.
2. Verify the published version equals the selected tag's package version.
3. Verify bin `amadeus-setup` is present in package metadata.
4. Verify tarball contents match package dry-run allowlist.
5. Verify docs reference the same package name and command names.
6. Optionally run `bunx @amadeus-dlc/setup --help` when network/cache conditions allow; failure is reported as post-publish verification failure.

## Documentation Workflow

1. Root `README.md` install section becomes installer-first.
2. `packages/setup/README.md` documents package-specific usage.
3. Any legacy manual `cp -r dist/<harness>` content is moved to a fallback/troubleshooting section, not the primary path.
4. Docs include Bun requirement, best-effort `npx` caveat, supported harnesses, `install`, `upgrade`, `--target`, `--version`, `--yes`, `--force`, backup safety, and manifest behavior.
5. Docs do not mention `init` as a command or alias.
6. Release docs explain that maintainers publish through GitHub Actions button and that normal `main` merge does not publish.

## Upstream Coverage

- `unit-of-work.md`: U8 release/docs support and non-automatic publish boundary are modeled.
- `unit-of-work-story-map.md`: US-009 maps to workflow dispatch, US-011 maps to installer-first docs, US-013 maps to release metadata verification.
- `requirements.md`: FR-015 and FR-017 drive the workflows; FR-001/FR-002/FR-007/FR-016/NFR-005 provide validation details.
- `components.md`: Release Workflow Contract and Documentation Update Owner become concrete workflows.
- `component-methods.md`: `buildReleaseValidationPlan` is expanded into release validation plan and publish guard.
- `services.md`: npm Registry Publication is the external side effect; GitHub Actions PR Gates are reused as preflight.
- U7 functional design: gate command contracts are reused rather than redefined differently.
