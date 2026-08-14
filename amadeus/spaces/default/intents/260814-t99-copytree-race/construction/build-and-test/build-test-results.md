# Build & Test Results — 260814-t99-copytree-race

上流入力: `code-generation-plan.md` / `code-summary.md`。測定 ref: 本 worktree head `dc6d5fed6`(branch fix-3003-t99-copytree、base origin/main 5b12d96e9)。

## Build

| 項目 | 結果 |
|---|---|
| bun install / bun run build | 成功(追跡ファイル不変 — packages/ 非変更) |

## Tests(実測転記)

| 実行 | 結果 | ref |
|---|---|---|
| TDD Red(実装前) | 9 pass / 2 fail(新規2本のみ赤 — 収束・診断) | code-summary.md 転記 |
| 対象ファイル(実装後) | 12 pass / 0 fail | `bun test tests/integration/t-fixtures-copy-tree-retry...` |
| t99 単独 | 17 pass / 0 fail | `bun test tests/integration/t99-learnings-gate-flow.test.ts` |
| real 呼出サイト | t27 63/0、t80 7/0 | `bun test tests/unit/t27.test.ts` / `t80.test.ts` |
| 落ちる実証(診断分岐×2) | 注入→赤→revert、md5 残渣ゼロ(59005cee...) | code-summary.md 転記 |
| typecheck / lint | exit 0 / exit 0 | `bun run typecheck` / `bun run lint` |
| フルスイート | **RESULT: PASS**(Total assertions 13373 / Failed 0、coverage・patch coverage gate 込み) | `bash tests/run-tests.sh --ci` @ 本 worktree(単独所有) |
| NFR-1 直接実測(reviewer FOLLOW-UP 対応) | code commit の fixtures.ts diff(65 行)中、`isRetryableCopyError` / `RETRYABLE_COPY_CODES` / エラーメッセージ文言に触れる行 **0**(`git diff dc194481f..dc6d5fed6 -- tests/harness/fixtures.ts \| grep -cE` 転記)。メッセージ文言の既存 assert は対象テスト内 3 箇所で緑 | 本 worktree |
| リモート CI | PR #3015 で実行中 — 収束確認は pr-convergence ステージで実測 | `gh pr checks 3015` |

## 失敗と対処

- なし(ローカル全ゲート緑)。リモート CI green の確定は pr-convergence で行う
