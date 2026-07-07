# Deployment Log — @amadeus-dlc/setup

## Upstream Inputs

- `cd-config.md`: release preflight gate 順序
- `deployment-strategy.md`: dry-run 先行ポリシー
- `environment-inventory.md`: E1 local 実行環境
- `build-test-results.md`: Construction 検証ベースライン

**Execution ID**: DEP-260706-001  
**Timestamp**: 2026-07-07T15:15:00Z  
**Environment**: E1 local-developer  
**Deployment type**: dry-run validation（registry publish なし）

## Pre-Deployment Checks

| Step | Command | Result |
|------|---------|--------|
| 1 | `bun install --frozen-lockfile` | pass（先行 build-and-test） |
| 2 | `bun run typecheck` | pass（先行 build-and-test） |
| 3 | `bun packages/setup/src/maintainer/package-check.ts` | pass |
| 4 | `bun packages/setup/src/maintainer/package-dry-run.ts` | pass |

## Deployment Steps Executed

| # | Action | Outcome |
|---|--------|---------|
| 1 | Package metadata validation | `@amadeus-dlc/setup` metadata OK |
| 2 | Tarball dry-run | 58 entries、unexpected/missing なし |
| 3 | Smoke test runner | 2/2 pass |
| 4 | Integration test runner | 6/6 pass |

## Not Executed (deferred)

| Action | Reason |
|--------|--------|
| GitHub Actions `release-setup` dispatch | E2/E3 は maintainer 手動トリガー |
| `npm publish` | E3 `npm-publish` environment 未プロビジョニング |
| post-publish verification | publish 未実施 |

## State Transition

```
pre-deploy checks → local validation complete → awaiting GHA dry-run dispatch
```

`deployment-strategy.md` の promotion flow 段階 2（GHA dry-run）へ handoff。

## Rollback

本実行は registry 副作用なし。`rollback-runbook.md` の rollback 手順は不要。

## Sign-off

Local deployment validation **complete**。次: maintainer が `release-setup.yml` を `dry_run:true` で dispatch。
