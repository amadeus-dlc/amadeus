# Integration Test Instructions — 260814-t245-origin-fixture

上流入力: `code-generation-plan.md` / `code-summary.md`。

## 対象

- 患部は integration 層のテスト自身。修正後の受け入れは配送先実測で行う:
  1. repo 外 scratch に origin なしクローンを作る(`git clone --no-hardlinks <repo> <dst> && git -C <dst> remote remove origin`)
  2. `bun install` 後、`bun test tests/integration/t245-amadeus-leader-sync.integration.test.ts` → 24/24 pass(FR-3)
  3. テスト前後で本体 `.git` の `refs/remotes/origin/main` と `git worktree list` が不変(FR-4)

## フルスイート

- `bash tests/run-tests.sh --ci`(smoke + unit + integration)。テストファイル変更のため絞り込み実行では完了としない
