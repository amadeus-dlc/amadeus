# Build and Test Results — 260722-teamup-prompt-race

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1384-watcher-arming/code-generation/)。

測定 ref: branch team/20260722-233519-0637/engineer-1(実装コミット 0b26230b5 以降、本ステージ時点の worktree HEAD)。全値は 2026-07-23T00:30-00:40Z 頃の本ステージ実行時のコマンド出力からの転記。

## 実測結果(全 green)

| コマンド | exit | 出力(要点) |
|---|---|---|
| `bash -n scripts/team-up.sh` | 0 | syntax OK |
| `bun run typecheck` | 0 | — |
| `bun run lint` | 0 | — |
| `bun run dist:check` | 0 | 全 harness tree in sync |
| `bun run promote:self:check` | 0 | self install in sync |
| `bun test`(team-up 系4ファイル) | 0 | 94 pass / 0 fail / 736 expect、`Ran 94 tests across 4 files`(パス全数実行を確認 — cid:test-path-set-completeness) |
| `bash tests/run-tests.sh --ci` | 0 | `RESULT: PASS`。size matrix: smoke 14 / unit 252 / integration 195 / e2e 75 / other 2(TOTAL 538 ファイル中 size-annotated 73) |

## 特記

- wall-clock drift 1件: `tests/integration/t-codex-hooks-migration.test.ts` declared=medium measured=large(32.6s)— 本 intent 未変更ファイルの負荷起因 advisory(CG 段の実行でも同一表示、既知の cid:fanout-load-settle 系ノイズ)。ゲート判定に影響なし
- 落ちる実証: `t-team-up-watcher-arming.test.ts` の「unarmed members that never arm exit non-zero and are named (falling proof, FR-5)」が非ゼロ exit+メンバー名列挙を assert し green(欠陥再導入時に赤くなることをテスト構造で固定)
- GitHub CI(PR #1391、bolt ブランチ): CI Success / Coverage Report head+base / typecheck-lint-drift-tests 全 pass(gh pr checks 実測、2026-07-22T23:46Z 頃)
