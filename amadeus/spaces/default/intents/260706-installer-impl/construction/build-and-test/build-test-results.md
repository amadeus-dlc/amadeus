# Build Test Results — インストーラ実装

## Environment

- **Timestamp**: 2026-07-07T15:00:47Z
- **Runtime**: Bun 1.3.13
- **Dependency setup**: `bun install --frozen-lockfile` — pass（110 packages、no changes）
- **Upstream inputs**: U1–U8 `code-generation/code-summary.md`

## Build Results

| Command | Status | Notes |
|---------|--------|-------|
| `bun install --frozen-lockfile` | pass | lockfile 整合 |
| `bun run typecheck` | pass | `tsconfig.json` + `tsconfig.tests.json` |
| `bun packages/setup/src/maintainer/package-check.ts` | pass | （build-and-test 実行時に unit t209 経由で検証済み） |
| `bun packages/setup/src/maintainer/package-dry-run.ts` | pass | （t209 経由） |

## Unit Test Results

| Command | Tests | Assertions | Status |
|---------|------:|-----------:|--------|
| `bun test t202–t210`（9 files） | 122 | 387 | **pass** |

内訳:

- t202: 9 pass
- t203: 9 pass
- t204: 7 pass
- t205: 13 pass
- t206: 21 pass
- t207: 21 pass
- t208: 13 pass
- t209: 17 pass
- t210: 12 pass

## Integration Test Results

| Runner | Cases | Status |
|--------|------:|--------|
| `run-installer-smoke.ts` | 2 | pass |
| `run-installer-integration.ts` | 6 | pass |

Integration coverage keys: `clean-install`, `manifest-first-upgrade-no-write`, `collision-no-write`, `archive-retry-failure`, `kiro-ambiguity`, `plan-report-snapshot`

## Performance Test Results

Not run — Standard test strategy。NFR performance は U4 planning benchmark を unit test で間接検証。

## Security Test Results

Dedicated SAST/DAST not run — Standard test strategy。U7 `security-gate.ts` audit/secret schema は t209 で unit 検証済み。

## Failure Details

None — 全コマンド初回 pass。

## Coverage Report

Formal coverage tool 未実行。要件 trace は以下で確認:

- `tests/.coverage-registry.json` + U7 coverage gate（t209 pass）
- 各 unit test の `covers:` ヘッダ
