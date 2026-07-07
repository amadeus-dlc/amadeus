# Health Check Report — Deployment Execution

## Upstream Inputs

- `deployment-strategy.md`: post-release verification 手順
- `environment-inventory.md`: E1/E2/E3 health check コマンド
- `build-test-results.md`: integration baseline

**Timestamp**: 2026-07-07T15:15:00Z

## Health Check Matrix

| Check | Scope | Status | Evidence |
|-------|-------|--------|----------|
| Package metadata | `@amadeus-dlc/setup` | **healthy** | package-check 10/10 |
| Tarball contents | publish allowlist | **healthy** | dry-run unexpected=0, missing=0 |
| CLI entrypoint | help output | **healthy** | smoke help-bun-entrypoint |
| Node wrapper | bun-required path | **healthy** | smoke bun-required-wrapper |
| Install path | clean install | **healthy** | integration:clean-install |
| Upgrade path | manifest-first no-write | **healthy** | integration:manifest-first-upgrade-no-write |
| Safety path | collision no-write | **healthy** | integration:collision-no-write |
| Error path | archive retry failure | **healthy** | integration:archive-retry-failure |
| Harness path | kiro ambiguity | **healthy** | integration:kiro-ambiguity |
| UX path | plan/report snapshot | **healthy** | integration:plan-report-snapshot |

## Integration Summary

**Runner**: `bun tests/setup/run-installer-integration.ts`  
**Result**: 6/6 pass，`ok: true`

Coverage keys stable:

- `integration:clean-install`
- `integration:manifest-first-upgrade-no-write`
- `integration:collision-no-write`
- `integration:archive-retry-failure`
- `integration:kiro-ambiguity`
- `integration:plan-report-snapshot`

## Environment Health

| Environment | Health | Notes |
|-------------|--------|-------|
| E1 local | **healthy** | 全チェック pass |
| E2 gha-dry-run | **not executed** | workflow dispatch 待ち |
| E3 gha-protected-publish | **not provisioned** | `npm-publish` + `NPM_TOKEN` 要設定 |

## Overall Verdict

**E1 deployment health: PASS**

Registry 上の package health（post-publish）は E3 publish 後に `post-publish-verify.ts` で検証予定。
