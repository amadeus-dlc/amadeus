# Environment Validation Report — @amadeus-dlc/setup

## Upstream Inputs

- U8 `deployment-architecture.md`: environment 境界、state machine
- U8 `infrastructure-services.md`: input validation、publish identity boundary
- `cd-config.md`: job 構成、publish command contract

**Validation timestamp**: 2026-07-07T15:12:00Z  
**Validator**: workspace inspection（IaC apply なし — npm/GitHub モデル）

## Summary

| Environment | Validation | Status |
|-------------|------------|--------|
| E1 local-developer | Bun + tests + maintainer scripts | **Pass** |
| E2 gha-dry-run | workflow YAML + gate scripts exist | **Pass**（構造検証） |
| E3 gha-protected-publish | environment/secret | **Pending manual** |

**Overall**: コードベースと workflow 定義は整合。本番 publish には E3 の手動プロビジョニングが残る。

## E1 Local Validation

| Check | Command / evidence | Result |
|-------|-------------------|--------|
| Typecheck | `bun run typecheck` | pass |
| Unit suite | t202–t210 | 122 pass |
| Smoke | `run-installer-smoke.ts` | pass |
| Integration | `run-installer-integration.ts` | 6 pass |
| Package check | `package-check.ts` | pass |
| Release tag selector | script exists + t210 | pass |

## E2 Workflow Structure Validation

| Check | Evidence | Result |
|-------|----------|--------|
| Workflow file exists | `.github/workflows/release-setup.yml` | pass |
| Manual trigger only | `on: workflow_dispatch` | pass |
| dry_run default true | inputs.dry_run.default: true | pass |
| Preflight reuses U7 gates | release-preflight job steps | pass |
| Publish guarded | `if: dry_run == 'false'` + environment | pass |
| Single publish command | `npm publish --provenance` | pass |
| Artifact upload | release-summary job | pass |

## E3 Protected Environment Validation

| Check | Method | Result |
|-------|--------|--------|
| `npm-publish` environment exists | GitHub API / UI | **not verified**（手動） |
| `NPM_TOKEN` secret configured | GitHub API / UI | **not verified**（手動） |
| Required reviewers enabled | GitHub API / UI | **not verified**（手動） |
| npm package name ownership | npm registry | **not verified**（初回 publish 前） |

## Security Posture (devsecops review)

| Control | Status | Notes |
|---------|--------|-------|
| No auto-publish on push/tag | pass | U8 invariant |
| dry-run blocks secret access | pass | job graph |
| confirm_package guard | pass | publish job + publish-validate |
| Secret scan gate (U7) | pass | t209 unit |
| Dependency audit gate (U7) | pass | t209 unit |
| Credential logging | pass | scripts avoid printing tokens |

## Compliance Notes

- npm publish は public package（`--access public`）
- SBOM/provenance evidence 生成ステップあり（`release-evidence.ts`）
- vulnerability allowlist: `packages/setup/security/vulnerability-allowlist.json`

## Gaps and Follow-ups

1. **E3 manual provisioning** — `npm-publish` environment + `NPM_TOKEN` を repo admin が設定
2. **First dry-run dispatch** — GitHub Actions UI から実行し preflight artifact を確認
3. **npm trusted publishing** — token 以外の identity モードを使う場合は npm 側設定

## Health Check Commands (post-provision)

```bash
# Local
bun packages/setup/src/maintainer/package-check.ts
bun tests/setup/run-installer-smoke.ts

# After dry-run dispatch — download artifact and inspect:
# .amadeus-ci/setup/gate-summary.json → ok: true
# .amadeus-ci/setup/publish-validation.json → ready for publish
```
