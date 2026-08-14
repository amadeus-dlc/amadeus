# Code Generation Plan — unit t245-origin-fixture

**Depth**: Minimal / **Test strategy**: Comprehensive(self-fix 既定)/ **Unit**: t245-origin-fixture(単一 unit、units-generation は scope SKIP — intent + requirements から直接スコープ)

対象: `tests/integration/t245-amadeus-leader-sync.integration.test.ts` の 1 テスト(`:208-226`)のみ。プロダクトコード非変更(FR-7)。

## Traceability(step → FR)

- Step 1 → FR-5 / Step 2 → FR-1, FR-2, FR-6, NFR-1 / Step 3 → FR-3, FR-4 / Step 4 → FR-8

## Steps

- [x] **Step 1: Red の確定(TDD)** — origin なしクローン(repo 外 scratch `noorigin-clone`)で対象テストが赤であることを実測済み(23 pass / 1 fail、失敗点 `gitStdout` t245:80 ← :213 fetch、2026-08-14 実測)。この赤を修正前ベースラインとして plan に固定する。
- [x] **Step 2: fixture 化の実装** — 対象テスト(`sweeps every origin/main election file through real selfCheck and exclusions`)を書き換える:
  - `mkdtempSync` で bare origin と source repo を構築(`:106-133` の shallow-origin テストの様式: `git init --bare` / `git init -b main` / config user / commit / `remote add origin` / push、`roots.push` → afterEach 一括 rmSync)
  - source repo へ実 checkout の `amadeus/spaces/default/elections/` corpus を copy して commit(裁定 seed-real-checkout-corpus)。seed 元ファイル件数を数え、掃引結果 `owned.electionPaths.length` と一致する assert を追加(FR-2 — `> 0` へ弱めない)
  - fetch + `git worktree add --detach` は fixture repo(source clone)に対して実行し、`process.cwd()` と実 origin への参照を除去(FR-1)
  - skip 分岐・環境検知は導入しない(FR-6)。`scaleTestTime(120_000)` は維持しコメントを実態へ更新(NFR-1)
- [x] **Step 3: Green + 副作用ゼロの実測** — noorigin-clone に修正を反映して対象ファイル単独 24/24 を実測(FR-3)。本体ツリーでも単独 24/24。テスト前後で本体 `.git` の `refs/remotes/origin/main` と `git worktree list` が不変であることを実測(FR-4)。単独実行時間を修正前後で比較(NFR-1)。
- [x] **Step 4: 横断検証** — `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` フルスイート(FR-8。テストファイル変更のため絞り込みで完了としない)。

## 備考

- units-generation / functional-design 等は self-fix scope により SKIP — 本 plan は requirements.md(FR-1〜8, NFR-1〜2)と captured intent から直接スコープした(degraded input の明記)。
- 実装は本 intent 専用 worktree(branch `fix-2971-t245-origin`、origin/main 起点)で行う。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T01:28:51Z
- **Iteration:** 1
- **Scope decision:** none

TDD の Red→Green・FR-2/FR-3/FR-4・surgical・逸脱ゼロは実測エビデンスで裏付けられているが、FR-8 のフルスイート緑が成果物内で未確定のまま PR #3001 が作成済みで、明示的な受け入れ基準の実測が未完了。plan のチェックボックスも未同期。

### Findings

- BLOCKER | amadeus/spaces/default/intents/260814-t245-origin-fixture/construction/t245-origin-fixture/code-generation/code-summary.md: FR-8(bash tests/run-tests.sh --ci フルスイート緑)の実測結果(exit code・pass/fail 数)が code-summary の検証実測表に存在しない(「実行中(background)」のみ)
- FOLLOW-UP | amadeus/spaces/default/intents/260814-t245-origin-fixture/construction/t245-origin-fixture/code-generation/code-generation-plan.md: Step 1〜4 のチェックボックスが全て未チェックのままで summary と非同期
- FOLLOW-UP | amadeus/spaces/default/intents/260814-t245-origin-fixture/construction/t245-origin-fixture/code-generation/code-summary.md: FR-1/FR-6 の git grep 受け入れ基準に対応する実測行(コマンド・exit code・出力)がなく主張のまま
- NIT | amadeus/spaces/default/intents/260814-t245-origin-fixture/construction/t245-origin-fixture/code-generation/code-summary.md: corpus 比例コストの申し送りは妥当(参考記録)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T01:47:26Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 の全指摘は是正済み — plan チェックボックス同期、FR-1/FR-6 の grep 実測追記、FR-8 はローカル 2 run の flake を帰属実測した上でリモート CI(PR #3001 head e926f9140、run 31760527210)の必須ゲート全 green を正とする扱いで、再現可能な失敗や無帰属の主張は残っていない。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260814-t245-origin-fixture/construction/t245-origin-fixture/code-generation/code-summary.md: FR-8 逸脱の正当化に充てた cid が実体(project.md Testing Posture の無関係失敗の扱い)と一致していない — 次回更新時に差し替え推奨
- NIT | amadeus/spaces/default/intents/260814-t245-origin-fixture/construction/t245-origin-fixture/code-generation/code-summary.md: t528 の cwd 状態依存欠陥の Issue 起票は conductor 側フォローアップとして妥当
