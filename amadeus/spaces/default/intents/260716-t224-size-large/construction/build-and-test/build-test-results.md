# Build & Test Results — 260716-t224-size-large

## 実行環境

bolt worktree(bolt/260716-t224-size-large @ f05373e89)、2026-07-16T09:05〜09:08Z の fresh 実行(build-and-test ステージ時点の再実測 — evidence-discipline)。検証対象は `code-generation-plan.md` の変更目録と `code-summary.md` の AC 表。

## 実測結果

| コマンド | 結果 | exit |
|---------|------|------|
| `bun run typecheck` | PASS | 0 |
| `bun run lint` | PASS | 0 |
| `bun run dist:check` | PASS(不変確認) | 0 |
| `bun run promote:self:check` | PASS(不変確認) | 0 |
| `bun test t-test-size-drift + t-test-size-dynamic` | 42 tests / 0 fail | 0 |
| `bash tests/run-tests.sh --integration --filter t224` | 58 pass / 0 fail / **drift 0** / RESULT: PASS | 0 |
| `bash tests/run-tests.sh --smoke` | RESULT: PASS | 0 |

## 落ちる実証

宣言行削除で drift 1 再現(37.52s、独立 reviewer 実測)→ 復元済み。修正前ベースライン: drift 1(39.15s、conductor 実測)。

## CI

PR #1077 の head で GitHub Actions(typecheck/lint/drift/tests+Coverage)走行 — マージ前 green 必須(leader のマージ執行前実測に委ねる)。
