# Unit Test Instructions — t92-worktree-hermeticity

> #709 の修正はテストガードのため、検証は t92 自身の3状態実測(red / skip-green / executed-green)で行う。

| 状態 | 条件 | 実行 | 期待 |
|---|---|---|---|
| red(修正前) | 未 install detached worktree、bunx 解決可 | `bun test tests/integration/t92.test.ts` | exit 1、test 44 のみ fail(exit-2/1 不一致) |
| skip-green(修正後) | 同上 | 同上 | exit 0、44 pass / 1 skip(理由付き) |
| executed-green(修正後) | install 済み | 同上 | exit 0、45 pass / 0 skip(test 44 実行) |

skip ガードの候補集合は本番 resolveTscLauncher と lockstep(win: tsc.cmd/tsc.exe/tsc、POSIX: tsc)— 是正 2511a701a で codex-2 指摘を反映。
