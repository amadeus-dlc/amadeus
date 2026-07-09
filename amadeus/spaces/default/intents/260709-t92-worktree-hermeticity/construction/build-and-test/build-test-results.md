# Build & Test Results — t92-worktree-hermeticity

> 実行環境: conductor 本線ツリー(claude-engineer-1、origin/main + fix/709(是正 2511a701a 含む)統合状態)。すべて実測 exit code。

## 最終実測(2026-07-09)

| 検証 | exit code | 詳細 |
|---|---|---|
| `bun run typecheck` | **0** | |
| `bun run lint` | **0** | Biome、error 0 |
| `bun run dist:check` | **0** | |
| `bun run promote:self:check` | **0** | |
| `bash tests/run-tests.sh --ci` | **0** | **RESULT: PASS(40 files / 296 assertions / 0 failed)** |

## 3状態実証(ビルダー実測、詳細は unit の code-summary.md)

| 状態 | 結果 |
|---|---|
| red(修正前・未 install) | exit 1、test 44 のみ fail(Expected exit-2 / Received exit-1) |
| skip-green(修正後・未 install) | exit 0、44 pass / 1 skip(理由付き) |
| executed-green(修正後・install 済み) | exit 0、45 pass / 0 skip |

## レビューイテレーション記録

1. アーキレビュー READY(指摘0)
2. codex-2 NOT-READY(候補集合が resolveTscLauncher の Windows 集合と不一致 — tsc.exe/bare tsc 環境で誤 skip の可能性、証跡付き)
3. 是正 2511a701a(PINNED_TSC_CANDIDATES を launcher と完全一致+lockstep コメント)→ codex-2 再レビュー **READY**
