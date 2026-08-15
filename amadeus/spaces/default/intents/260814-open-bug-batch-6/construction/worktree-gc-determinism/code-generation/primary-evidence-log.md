# U-4 一次証跡判定: PR #3056 の retry 条件は run 31772609914 attempt 1 の失敗を覆うか

## 判定

**覆う**(観測 stderr は retry の発火条件文字列を部分文字列として含み、失敗コマンドは `worktree add` である)。

## 一次証跡

### 1. 現行 retry 実装(HEAD = a49f9e9fd、`tests/integration/t-worktree-gc.test.ts:14-28` 逐語)

```ts
function git(cwd: string, ...args: string[]) {
  let result = Bun.spawnSync({ cmd: ["git", ...args], cwd, stderr: "pipe", stdout: "pipe" });
  const stderr = result.stderr.toString();
  if (
    result.exitCode !== 0 &&
    args[0] === "worktree" &&
    args[1] === "add" &&
    stderr.includes("/locked' for writing: No such file or directory")
  ) {
    // `git worktree add` removes its incomplete metadata on exit, so retry the
    // narrow prune race once without masking any other fixture setup failure.
    result = Bun.spawnSync({ cmd: ["git", ...args], cwd, stderr: "pipe", stdout: "pipe" });
  }
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return result.stdout.toString().trim();
}
```

発火条件は3つの AND: (a) exitCode !== 0 (b) `args[0]==="worktree" && args[1]==="add"` (c) stderr が `/locked' for writing: No such file or directory` を含む。

### 2. attempt 1 ログ取得

- `gh api repos/amadeus-dlc/amadeus/actions/runs/31772609914/attempts/1/jobs --jq '...'` → exit 0、失敗 job は `94681485455 Tests` と `94683926051 CI Success`。
- `gh api repos/amadeus-dlc/amadeus/actions/jobs/94681485455/logs` → **exit 1**(job 単位 API は最新 attempt へのリダイレクトで取得不能)。
- 代替経路 `gh run view 31772609914 --attempt 1 --log-failed` → **exit 0**、29,292 行。この attempt 1 ログ内の該当ブロック(`t-worktree-gc.test.ts`、2026-08-14T05:30:25Z)から逐語抽出。

### 3. 観測 stderr(逐語、attempt 1 ログより転記)

```
error: fatal: could not open '.git/worktrees/feature-copy/locked' for writing: No such file or directory

Expected: 0
Received: 128
      at git (/home/runner/work/amadeus/amadeus/tests/integration/t-worktree-gc.test.ts:16:53)
      at <anonymous> (/home/runner/work/amadeus/amadeus/tests/integration/t-worktree-gc.test.ts:169:5)
```

失敗テストは `(fail) worktree-gc > --base overrides the merge target`。当時の実装は retry なし(ログ内に埋め込まれたソース断片 `15 |   const result = Bun.spawnSync(...)` / `16 |   expect(result.exitCode, ...)`)。

### 4. 照合

- **条件 (c)**: 機械照合(python3 `cond in obs`)→ `contains= True`。
  - 観測: `fatal: could not open '.git/worktrees/feature-copy/locked' for writing: No such file or directory`
  - 条件文字列: `/locked' for writing: No such file or directory`
  - 一致箇所は `.git/worktrees/feature-copy` **/locked' for writing: No such file or directory**。`locked` は worktree 名ではなく git のロックメタデータファイル名であるため、条件は worktree 名に依存せず一般に成立する。
- **条件 (b)**: 失敗地点 `t-worktree-gc.test.ts:169`。run head `653a24aa148457f31efa88b877884bb3a1f72d7a` の同ファイル 169 行目は逐語で
  `git(fixture.repo, "worktree", "add", "-q", "--detach", featureCopy, "feature/current");`
  → `args[0]==="worktree"`, `args[1]==="add"` を満たす(取得: `git show 653a24aa1...:tests/integration/t-worktree-gc.test.ts | sed -n '160,175p'`)。
- **条件 (a)**: `Received: 128`(exit 128 ≠ 0)。

3条件すべて成立 → **覆う**。

## 対称面棚卸し(retry なしの `git worktree add` fixture 準備)

検索述語(2段構え、対象 tree = HEAD a49f9e9fd):
1. `git grep -ln "worktree" -- 'tests/'` → 142 ファイル(大小文字区別、除外条件なし)
2. `git grep -n -E "worktree\"?,? *\"?add|worktree add" -- 'tests/'` で `add` 隣接へ絞り、コメント行・被検 CLI 側(ツールが内部で worktree add する e2e。fixture 準備でない)を人手で除外

**同一リスク(実 `git worktree add` を fixture 準備に直接使い、retry を持たない)箇所:**

| ファイル:行 | 呼び出し |
|---|---|
| `tests/e2e/t01-helpers.test.ts:151` | `["-C", fixture, "worktree", "add", "-q", childWt, "-b", "foo-branch"]` |
| `tests/e2e/t04.test.ts:148` | `["-C", p, "worktree", "add", "-q", join(p, "non-bolt-wt"), "-b", "unrelated"]` |
| `tests/e2e/t06.test.ts:79` | `["-C", fixture, "worktree", "add", "-q", sibling, "-b", "dev-branch"]` |
| `tests/e2e/t06.test.ts:101` | `["-C", fixture, "worktree", "add", "-q", path, "-b", \`bolt-${slug}\`, "main"]` |
| `tests/integration/t225-upstream-v2-migration-preflight.test.ts:889` | `project.git(["worktree", "add", "--detach", worktreeRoot, "HEAD"])` |
| `tests/integration/t245-amadeus-leader-sync.integration.test.ts:251` | `gitStdout(["worktree", "add", "--detach", root, "origin/main"], source)` |
| `tests/unit/t209-worktree-read-anchor.test.ts:131` | `git(clone, ["worktree", "add", "-q", "-b", "dev-x", sibling, "main"])` |
| `tests/unit/t210-doctor-worktree-anchor.test.ts:82` | `git(clone, ["worktree", "add", "-q", "-b", "dev-x", sibling, "main"])` |

**除外(被検対象側 — 本番ツールが内部で worktree add を実行する経路。fixture 準備ではないため retry の対象外):** `tests/e2e/t02.test.ts`、`t05.test.ts`、`t07-audit-fork-merge.test.ts`、`t09-halt-and-ask-preservation.test.ts`、`t11-halt-and-ask-retry-correlation.test.ts`、`t12-bolt-runtime-graph-fork.test.ts`、`t134-swarm-referee.test.ts`、`tests/integration/t166-multi-repo-construction.test.ts`、`t78-bolt-worktree-lifecycle.test.ts`、`tests/harness/fixtures.ts:485`(コメント)、`tests/unit/t69.test.ts:74`(コメント)、`t245` の `worktree add -b` 判定行(fake git spawn のマッチャ)。
