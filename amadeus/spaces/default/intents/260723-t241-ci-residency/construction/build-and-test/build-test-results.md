# Build and Test Results — 260723-t241-ci-residency

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1294-t241-residency/code-generation/)。

測定 ref: branch team/20260722-233519-0637/engineer-1(実装コミット 49277d492 以降の worktree HEAD)。全値は 2026-07-23T03:17-03:22Z 頃の本ステージ実行コマンド出力からの転記。

## 実測結果(全 green)

| コマンド | exit | 出力(要点) |
|---|---|---|
| `bun run typecheck` | 0 | — |
| `bun run lint` | 0 | — |
| `bun run dist:check` | 0 | 全 harness tree in sync |
| `bun run promote:self:check` | 0 | self install in sync |
| `bun test`(t241+t257+registry+size-drift 4ファイル) | 0 | 62 pass / 0 fail / 1128 expect、`Ran 62 tests across 4 files`(全数実行確認 — cid:test-path-set-completeness) |
| `bash tests/run-tests.sh --ci` | 0 | `RESULT: PASS`(size matrix: 539 ファイル中 size-annotated 73) |

## t241 実行痕跡(FR-3 閉包 — --ci ログ verbatim)

```
=== START t241-election-machine-executor.integration.test.ts ===
--- PASS: t241-election-machine-executor.integration.test.ts ---
=== DONE t241-election-machine-executor.integration.test.ts (PASS) ===
```

## 特記

- wall-clock drift 1件(t-codex-hooks-migration、32.9s)— 本 intent 未変更ファイルの負荷起因 advisory(既知)。ゲート判定に影響なし
- GitHub CI(PR #1401): typecheck-lint-drift-tests pass 4m37s(NFR-4: 基準 4m25s 比 +12s < 申告閾値 +60s)、Coverage head+base pass、CI Success — マージ済み(main 着地)
