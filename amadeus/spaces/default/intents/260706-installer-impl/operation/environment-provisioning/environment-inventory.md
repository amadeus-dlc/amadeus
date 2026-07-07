# Environment Inventory — @amadeus-dlc/setup

## Upstream Inputs

- U8 `deployment-architecture.md`: environment 定義、release state boundaries
- U8 `infrastructure-services.md`: service inventory、publish identity boundary
- `cd-config.md`: workflow file、protected environment 名

## Environment Matrix

| ID | Name | Platform | Purpose | Provisioned by |
|----|------|----------|---------|----------------|
| E1 | local-developer | maintainer workstation | script dry-run、unit/integration test | developer |
| E2 | gha-dry-run | GitHub Actions `ubuntu-latest` | release validation without publish | `release-setup.yml` |
| E3 | gha-protected-publish | GitHub Actions + `npm-publish` env | guarded npm publish | repo admin（手動） |

## E1: Local Developer

| Resource | Detail |
|----------|--------|
| Runtime | Bun 1.3.13+ |
| Dependencies | `bun install --frozen-lockfile` |
| Credentials | 不要（publish しない限り） |
| Scripts | `packages/setup/src/maintainer/*` |

## E2: GitHub Actions Dry-Run

| Resource | Detail |
|----------|--------|
| Workflow | `.github/workflows/release-setup.yml` |
| Runner | `ubuntu-latest` |
| Bun | 1.3.13（`oven-sh/setup-bun@v2`） |
| Secrets access | **なし**（`dry_run:true`） |
| Artifacts | `.amadeus-ci/setup/*.json` |

## E3: GitHub Actions Protected Publish

| Resource | Detail |
|----------|--------|
| Environment | `npm-publish` |
| Required reviewers | 1+（推奨: maintainer） |
| Secret | `NPM_TOKEN`（npm automation token または granular token） |
| Permissions | `id-token: write`（provenance） |
| Publish surface | `packages/setup` → `registry.npmjs.org` |

## External Services

| Service | Role | Account / endpoint |
|---------|------|-------------------|
| GitHub Actions | CI + CD orchestration | `j5ik2o.github.com/amadeus-dlc/amadeus` repo |
| npm registry | package distribution | `https://registry.npmjs.org` |
| GitHub API | tag/archive source（runtime installer） | `api.github.com` |

## Not In Scope

- AWS VPC / ECS / Lambda / RDS
- ECR / CodeArtifact / S3 artifact store（CI artifact は GHA upload のみ）
- CloudWatch Evidently / AppConfig（feature flags N/A）

## Provisioning Checklist (E3 — manual)

- [ ] GitHub Environment `npm-publish` 作成
- [ ] Required reviewers 設定
- [ ] `NPM_TOKEN` を environment secret に登録
- [ ] npm trusted publishing / provenance 設定（token モードの場合は token scope 確認）
- [ ] 初回 `dry_run:true` dispatch で preflight green 確認
