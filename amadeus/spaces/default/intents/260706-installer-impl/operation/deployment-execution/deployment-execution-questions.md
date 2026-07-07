# Deployment Execution — Clarifying Questions

## Q1: 事前デプロイチェックはすべて pass か？

**Answer**: はい（E1 local 環境、2026-07-07 実行）。

- `package-check.ts` — 10 checks pass
- `package-dry-run.ts` — tarball allowlist pass
- `build-test-results.md` 整合: typecheck + 122 unit pass

## Q2: データベースマイグレーションは必要か？

**Answer**: 不要。`@amadeus-dlc/setup` は stateless CLI。DB / migration は存在しない。

## Q3: 依存サービスは利用可能で healthy か？

**Answer**:

| 依存 | 本実行での状態 |
|------|---------------|
| Bun runtime | available |
| npm registry | read-only 検証のみ（publish 未実行） |
| GitHub API | fake ports 使用（integration test） |
| GitHub Actions E3 | pending manual（`environment-inventory.md`） |

## Q4: デプロイウィンドウは？

**Answer**: npm publish は **manual `workflow_dispatch`** のため、maintainer が任意タイミングで実施。本ステージでは **dry-run 相当の local validation** のみ実行し、registry publish は未実施（`deployment-strategy.md` の promotion flow 段階 1–2）。

## Upstream References

- `cd-config.md`: 実行対象 workflow / preflight gates
- `deployment-strategy.md`: manual gated release、dry-run 先行
- `environment-inventory.md`: E1/E2/E3 環境マトリクス
- `build-test-results.md`: 122 unit + 8 integration/smoke pass
