# Build Test Results — Slop cleanup

上流入力: `code-generation-plan.md`、`code-summary.md`

## 実行環境

- 実行日: 2026-07-28
- Runtime: Bun 1.3.13
- Build system: Bun / TypeScript
- 対象: Journal codec、process observability、dist/self-install projection

## Build 結果

| Command | Status | Evidence |
| --- | --- | --- |
| `bun run typecheck` | PASS | `tsc --noEmit -p tsconfig.json` と `tsconfig.tests.json` が error 0 |
| `bunx @biomejs/biome check packages/framework/core/tools/amadeus-journal.ts packages/framework/core/tools/amadeus-observability.ts` | PASS | 2 files checked、fix なし |
| `bun run dist:check` | PASS | 7 harness が正本と同期 |
| `bun run promote:self:check` | PASS | 5 harness が正本と同期 |
| `git diff --check` | PASS | whitespace diagnostics 0 |

## Test 結果

```text
Test files: 4
Tests: 55 passed, 0 failed, 0 skipped
Assertions: 725
```

- Unit: `t352-journal-codec.pbt.test.ts`、`t351-audit-record-seams.test.ts`
- Integration: `t356-journal-convert.test.ts`、`t357-observability-seam.test.ts`
- Coverage report: 今回は既存回帰群を使用し、coverage instrumentation は実行していない。要件境界は `build-and-test-summary.md` の traceability table で確認した。

## Failure と残件

failure、stack trace、再試行、未解決事項はいずれもない。performance/security は適用判定により実行対象外であり、その根拠と再判定条件を各 instruction に記録した。
