# Frontend Components — U8 Manual Release And Docs

> Stage: construction / functional-design  
> Unit: U8 Manual Release And Docs  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`, U7 functional design

## Scope

U8 の user-facing surface は 2 種類ある。Maintainer 向けには GitHub Actions の manual release UI と run summary がある。End user 向けには root `README.md` と `packages/setup/README.md` の install/upgrade docs がある。GUI frontend component は持たない。

## Maintainer Release Surface

| Component | Surface | Purpose |
|---|---|---|
| Workflow Dispatch Form | GitHub Actions | `tag`、`dry_run`、`npm_dist_tag`、`confirm_package` を受け取る |
| Release Validation Summary | GitHub Actions summary | selected tag、preflight、build、SBOM/provenance、publish validation を表示する |
| Publish Guard Summary | GitHub Actions summary | publish が実行されたか、dry-run か、どの guard で止まったかを表示する |
| Post-Publish Verification Summary | GitHub Actions summary | npm metadata、bin、tarball、docs consistency、bunx help の結果を表示する |
| Release Artifact Links | GitHub Actions artifacts | package dry-run report、SBOM/provenance、publish validation report、post-publish report へ導線を出す |

## Documentation Surface

| Component | File | Required Content |
|---|---|---|
| Quick Install | `README.md` | `bunx @amadeus-dlc/setup install --harness <harness> --target <path>` |
| Upgrade Existing Install | `README.md` / `packages/setup/README.md` | `bunx @amadeus-dlc/setup upgrade --target <path>` and manifest-first behavior |
| Runtime Requirement | both docs | Bun required; `npx` is best-effort only when Bun exists |
| Harness Selection | both docs | `claude`, `codex`, `kiro`, `kiro-ide`; one harness per invocation |
| Safety Notes | `packages/setup/README.md` | `--yes`, `--force`, backups, no-write failures, manifest path |
| Maintainer Release | `packages/setup/README.md` | GitHub Actions button release, dry-run, latest stable tag default |
| Manual Copy Fallback | `README.md` | fallback/troubleshooting only, not primary setup path |

## Display Rules

| Rule | Statement |
|---|---|
| UI-U8-001 | Release summary must show `dry_run` vs `published` clearly. |
| UI-U8-002 | Publish failure after validation must not hide whether any package was published. |
| UI-U8-003 | Docs must use `install` and `upgrade`; `init` must not appear as a setup command. |
| UI-U8-004 | Docs command examples must include Bun-first invocation before `npx`. |
| UI-U8-005 | `npx` examples must include Bun-required caveat nearby. |
| UI-U8-006 | Manual copy docs must not be positioned before installer docs. |

## Suggested Release Summary Shape

```text
Installer release: dry-run
Package: @amadeus-dlc/setup
Selected tag: v1.2.3
Package version: 1.2.3
npm dist-tag: latest

Validation:
- U7 preflight: passed
- package dry-run: passed
- smoke/integration: passed
- SBOM/provenance: passed
- publish validation: passed

Publish:
- skipped because dry_run=true

Post-publish:
- skipped because publish was not executed
```

## Suggested Docs Command Set

```bash
bunx @amadeus-dlc/setup install --harness codex --target .
bunx @amadeus-dlc/setup upgrade --target .
npx @amadeus-dlc/setup --help
```

The `npx` command is documented as best-effort only. If Bun is not installed, `npx @amadeus-dlc/setup` exits with a Bun-required message.

## Upstream Coverage

- `unit-of-work.md`: U8 release/docs surface is represented without introducing application UI.
- `unit-of-work-story-map.md`: US-009 maps to maintainer release surface; US-011 maps to docs surface; US-013 maps to release summary and post-publish verification.
- `requirements.md`: FR-015 and FR-017 acceptance criteria become visible docs/release summary requirements.
- `components.md`: Documentation Update Owner and Release Workflow Contract become contributor/end-user surfaces.
- `component-methods.md`: `DocumentationUpdateOwner.requiredTopics` and `ReleaseWorkflowContract.requiredGates` are rendered as docs and summary requirements.
- `services.md`: GitHub Actions and npm registry are the only external surfaces.
- U7 functional design: U7 gate results are displayed as release preflight status.
