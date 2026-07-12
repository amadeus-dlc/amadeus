# Build Test Results

## 実行環境

- Date: 2026-07-12
- Runtime: Bun 1.3.13
- Strategy: Standard
- Upstream: 3 unitの `code-generation-plan.md` と `code-summary.md`

## Build結果

| Command | Result | Notes |
|---|---|---|
| `bun run dist:check` | PASS | 全harness tree同期 |
| `bun run promote:self:check` | PASS | project-local self install同期 |
| `bun run typecheck` | PASS | 本体・test TS構成ともexit 0 |
| `bun run lint:check` | PASS | exit 0、既存warningのみ |
| `bun tests/complexity-gate.ts --check` | PASS | 新規違反0、回帰0 |

## 対象テスト結果

| Suite | Files | Assertions | Passed | Failed |
|---|---:|---:|---:|---:|
| U1/U2/U3 unit | 6 | 34 | 34 | 0 |
| U1/U2/U3 integration | 3 | 11 | 11 | 0 |
| Size purity | 1 | 16 tests | 16 | 0 |

## 正準Full CI

`bash tests/run-tests.sh --ci` はexit 0で完了した。337 files、4,597 assertionsがpassし、failed file/assertionは0だった。Claude substrateを必要とする23 filesは既存runner規定どおりskipされた。size matrixは55 Small / 349 Medium / 3 Large、wall-clock driftは0だった。

## Failure・Coverage

- 対象test failure: なし。
- Coverage percentageは本stageで新規閾値を導入しない。coverage collectorを含む実CLI happy pathはintegrationで検証したが、malformed/non-finite JSONの個別注入は今回のfocused test範囲外である。
