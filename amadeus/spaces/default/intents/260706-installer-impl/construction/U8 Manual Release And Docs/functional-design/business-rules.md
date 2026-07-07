# Business Rules — U8 Manual Release And Docs

> Stage: construction / functional-design  
> Unit: U8 Manual Release And Docs  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`, U7 functional design

## Release Trigger Rules

| Rule | Statement |
|---|---|
| BR-U8-001 | Installer release workflow は `.github/workflows/release-setup.yml` の `workflow_dispatch` だけで実行する。 |
| BR-U8-002 | push to `main`、pull request、tag push は npm publish を実行してはならない。 |
| BR-U8-003 | `dry_run:true` は publish を実行せず、release validation summary だけを生成する。 |
| BR-U8-004 | `dry_run:false` では `confirm_package` が `@amadeus-dlc/setup` と完全一致しなければ publish してはならない。 |
| BR-U8-005 | release workflow は protected environment approval と npm publish credential がない場合 publish してはならない。 |

## Tag And Version Rules

| Rule | Statement |
|---|---|
| BR-U8-010 | `tag` input が空の場合、latest stable SemVer tag を選ぶ。 |
| BR-U8-011 | Stable tag は `vMAJOR.MINOR.PATCH` または `MAJOR.MINOR.PATCH` であり、prerelease segment を含まない。 |
| BR-U8-012 | `v1.2.3` と `1.2.3` が重複する場合は `v1.2.3` を canonical source tag とする。 |
| BR-U8-013 | explicit prerelease tag を publish する場合、`npm_dist_tag` は `latest` 以外でなければならない。 |
| BR-U8-014 | selected tag の package version と publish version が一致しない場合、publish してはならない。 |

## Validation And Publish Rules

| Rule | Statement |
|---|---|
| BR-U8-020 | U7 preflight gates が失敗した場合、release workflow は build/publish に進んではならない。 |
| BR-U8-021 | Release context では U7 の changed-files 判定を使わず、package metadata、package dry-run、installer smoke/integration、coverage registry、typecheck、lint、dist-check、promote-self-check、dependency-audit、secret-scan を無条件に blocking とする。 |
| BR-U8-022 | SBOM/provenance evidence が生成できない場合、publish してはならない。 |
| BR-U8-023 | npm publish は credential failure、registry failure、version conflict を retry loop で隠してはならない。失敗したら workflow は failed とし、maintainer follow-up を要求する。 |
| BR-U8-024 | post-publish verification failure は publish 済み状態を隠さず、published package/version と failed check を summary に表示する。 |
| BR-U8-025 | `publish-validation` が npm registry に同一 package version を検出した場合、`npm publish` を実行してはならない。 |
| BR-U8-026 | Publish command は `cwd=packages/setup` で `npm publish --tag <npm_dist_tag> --access public --provenance` を実行する。 |

## Documentation Rules

| Rule | Statement |
|---|---|
| BR-U8-030 | root `README.md` の導入主導線は `amadeus-setup install` でなければならない。 |
| BR-U8-031 | Docs は `amadeus-setup upgrade` を既存導入の更新手段として説明する。 |
| BR-U8-032 | Docs は `init` command または `init` alias を記載してはならない。 |
| BR-U8-033 | Docs は Bun required と best-effort `npx` caveat を明記する。 |
| BR-U8-034 | Docs は supported harnesses `claude`、`codex`、`kiro`、`kiro-ide` と one-harness-per-invocation を説明する。 |
| BR-U8-035 | Manual `cp -r dist/<harness>` は primary path ではなく fallback/troubleshooting 扱いにする。 |
| BR-U8-036 | Docs は `--yes` と `--force` の違い、shared file backup、manifest path を説明する。 |

## Release Metadata Rules

| Rule | Statement |
|---|---|
| BR-U8-040 | Release summary は selected tag、package version、source repo、npm dist-tag、dry-run/published status、SBOM/provenance artifact、post-publish result を表示する。 |
| BR-U8-041 | Docs と release metadata の package name は `@amadeus-dlc/setup`、bin は `amadeus-setup` で一致しなければならない。 |
| BR-U8-042 | Release docs は local manual npm publish を primary procedure として説明してはならない。 |

## Upstream Coverage

- `unit-of-work.md`: U8 の manual release と docs boundary を rule 化する。
- `unit-of-work-story-map.md`: US-009、US-011、US-013 を release/docs rules に展開する。
- `requirements.md`: FR-015 / FR-017 acceptance criteria と CLI contract を rules に反映する。
- `components.md`: Release Workflow Contract と Documentation Update Owner を trigger/docs rules に反映する。
- `component-methods.md`: `ReleaseValidationPlan` と `DocumentationUpdateOwner` の必須項目を rule 化する。
- `services.md`: npm Registry Publication の manual lifecycle と credential boundary を採用する。
- U7 functional design: U7 preflight gates を release validation rules に取り込む。
