# Build & Test Results — 260814-copytree-guard-boundary

上流入力: `code-generation-plan.md` / `code-summary.md`。測定 ref: 本 worktree(branch fix-3014-copytree-guard、code commit 9a90a71c1、base origin/main f60b3f4c8)。

## Build

| 項目 | 結果 |
|---|---|
| bun install / bun run build | 成功(追跡ファイル不変) |

## Tests(実測転記)

| 実行 | 結果 |
|---|---|
| TDD Red(実装前) | 0 pass / 4 fail(経路 assert) |
| Green(実装後) | 経路 4/4、患部直接 12/12、消費回帰 12/12、unit 回帰 12/12 |
| FR-1 pred-a2 | 残 3 ヒット = 除外 3 面のみ(適用可能面 0) |
| FR-3 exists | `git grep "ops\.exists"` → :600(RemoveTreeOps)のみ |
| typecheck / lint | exit 0 / exit 0(複雑度 41→41 不変) |
| フルスイート | **RESULT: PASS**(13,412 assertions / 0 fail、coverage・patch coverage gate 込み、単独所有) |
| リモート CI | PR #3030 全 green(head = code-summary 訂正 commit) |

## 失敗と対処

- なし
