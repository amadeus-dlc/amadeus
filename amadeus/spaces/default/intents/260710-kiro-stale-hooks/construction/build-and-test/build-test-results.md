# Build & Test Results — 260710-kiro-stale-hooks

> 実行環境: conductor worktree(record ブランチに origin/main = merge commit 6f1d7ab2a を取り込み済み)。実行日: 2026-07-10。すべて実測 exit code。

## Build(生成同期)

| command | exit |
|---|---|
| `bun install --frozen-lockfile` | 0 |
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |

## Tests

| run | 結果 |
|---|---|
| `bun test ./tests/smoke/t148-kiro-file-structure.test.ts` | 11 pass / 0 fail(リグレッションガード含む) |
| `bash tests/run-tests.sh --ci`(1回目) | **FAIL**(t90 の 1 件のみ fail — 下記) |
| `bun test ./tests/integration/t90.test.ts`(単独) | 16 pass / 0 fail |
| `bash tests/run-tests.sh --ci`(2回目) | **PASS**(RESULT: PASS、exit 0) |

## 失敗詳細と処置(t90)

- 1回目の `--ci` で `t90 > 13: re-approve still-empty -> fresh MEMORY_EMPTY (total 2), then suppressed` が fail(4056ms)。
- 単独再実行 16 pass、スイート再実行 PASS — **並列負荷下のフレーク**と判定。本 intent の変更(kiro hooks/manifest/t148)とは無関係(t90 は runtime-compile の CLI 契約)。
- ベースライン: PR #737 の GitHub CI および実装者・レビュアーの `--ci` 実行(277 files / 0 failed)では green。
- 処置: チームノルム(赤の無視禁止 / 実測起票)に従い、フレークとして GitHub Issue に起票(#741)。修正は本 intent のスコープ外。

## カバレッジ

- codecov/patch(PR #737): SUCCESS(変更行カバレッジゲート通過)
