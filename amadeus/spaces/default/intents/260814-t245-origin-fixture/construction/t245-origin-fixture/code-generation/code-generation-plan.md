# Code Generation Plan — unit t245-origin-fixture

**Depth**: Minimal / **Test strategy**: Comprehensive(self-fix 既定)/ **Unit**: t245-origin-fixture(単一 unit、units-generation は scope SKIP — intent + requirements から直接スコープ)

対象: `tests/integration/t245-amadeus-leader-sync.integration.test.ts` の 1 テスト(`:208-226`)のみ。プロダクトコード非変更(FR-7)。

## Traceability(step → FR)

- Step 1 → FR-5 / Step 2 → FR-1, FR-2, FR-6, NFR-1 / Step 3 → FR-3, FR-4 / Step 4 → FR-8

## Steps

- [ ] **Step 1: Red の確定(TDD)** — origin なしクローン(repo 外 scratch `noorigin-clone`)で対象テストが赤であることを実測済み(23 pass / 1 fail、失敗点 `gitStdout` t245:80 ← :213 fetch、2026-08-14 実測)。この赤を修正前ベースラインとして plan に固定する。
- [ ] **Step 2: fixture 化の実装** — 対象テスト(`sweeps every origin/main election file through real selfCheck and exclusions`)を書き換える:
  - `mkdtempSync` で bare origin と source repo を構築(`:106-133` の shallow-origin テストの様式: `git init --bare` / `git init -b main` / config user / commit / `remote add origin` / push、`roots.push` → afterEach 一括 rmSync)
  - source repo へ実 checkout の `amadeus/spaces/default/elections/` corpus を copy して commit(裁定 seed-real-checkout-corpus)。seed 元ファイル件数を数え、掃引結果 `owned.electionPaths.length` と一致する assert を追加(FR-2 — `> 0` へ弱めない)
  - fetch + `git worktree add --detach` は fixture repo(source clone)に対して実行し、`process.cwd()` と実 origin への参照を除去(FR-1)
  - skip 分岐・環境検知は導入しない(FR-6)。`scaleTestTime(120_000)` は維持しコメントを実態へ更新(NFR-1)
- [ ] **Step 3: Green + 副作用ゼロの実測** — noorigin-clone に修正を反映して対象ファイル単独 24/24 を実測(FR-3)。本体ツリーでも単独 24/24。テスト前後で本体 `.git` の `refs/remotes/origin/main` と `git worktree list` が不変であることを実測(FR-4)。単独実行時間を修正前後で比較(NFR-1)。
- [ ] **Step 4: 横断検証** — `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` フルスイート(FR-8。テストファイル変更のため絞り込みで完了としない)。

## 備考

- units-generation / functional-design 等は self-fix scope により SKIP — 本 plan は requirements.md(FR-1〜8, NFR-1〜2)と captured intent から直接スコープした(degraded input の明記)。
- 実装は本 intent 専用 worktree(branch `fix-2971-t245-origin`、origin/main 起点)で行う。
