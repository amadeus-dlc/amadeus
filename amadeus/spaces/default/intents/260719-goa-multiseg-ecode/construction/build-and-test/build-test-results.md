# Build & Test Results — 260719-goa-multiseg-ecode

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

> 測定 ref: bolt head `bd3f6cf74`(`bolt/fix-1226-goa-multiseg-ecode`、PR #1256)。ローカル実測は builder(worktree 隔離)+conductor 裏取り(scratch worktree)、CI は PR head の GitHub Actions。

## 結果一覧(全て実行結果由来)

| 検査 | 実行環境 | 結果 |
|---|---|---|
| bun run typecheck | bolt worktree | exit 0 |
| bun run lint | bolt worktree | exit 0(警告は既存 :787 複雑度のみ、本変更と無関係 — code-summary.md) |
| bun run dist:check | bolt worktree | exit 0(6ツリー OK) |
| bun run promote:self:check | bolt worktree | exit 0 |
| bash tests/run-tests.sh --ci | bolt worktree | exit 0、RESULT: PASS(387ファイル / Failed 0 / 5493 assertions / Failed 0) |
| 対象2テストファイル再実行 | conductor scratch worktree(origin/bolt head) | 54 pass / 0 fail(exit 0) |
| CI(typecheck - lint - drift - tests) | GitHub Actions run 29702593786(PR #1256 head) | pass(gh pr checks 実測) |
| 落ちる実証 | bolt worktree(正本のみ pre-fix 切替) | 新テスト 4 fail(exit 1)→ 復元 54 pass(exit 0) |
| 閉包(起票時再現 verbatim) | in-process | `parseGoaLine("GoA[E-TPR-RE]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0")` → ok:true / ecode "E-TPR-RE" |
| lcov(diff 追加行) | bolt worktree | 変更実行行 :162 hits=68 / :166 hits=114、未カバー 0 |
| ReDoS 線形性 | conductor scratch | 100KB 敵対入力で 3.4ms / 5.3ms |

## 判定分離(deployment-execution:c3 の語彙)

- PASS: 上表の全項目(実行証跡あり)
- N/A: 専用性能テスト(承認 NFR 不在 — performance-test-instructions.md)、追加サニタイズ検査(新規入力境界なし — security-test-instructions.md)
- PENDING: PR #1256 の main マージ(ユーザー承認待ち — 閉包条件: leader 執行のスカッシュマージ+state=MERGED 実測)
