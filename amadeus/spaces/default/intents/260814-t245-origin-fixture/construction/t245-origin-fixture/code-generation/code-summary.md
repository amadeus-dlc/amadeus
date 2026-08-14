# Code Summary — unit t245-origin-fixture

**Depth**: Minimal(bullet のみ)/ 変更ファイル 1 本、プロダクトコード非変更(FR-7 充足)。

## 変更ファイル

- `tests/integration/t245-amadeus-leader-sync.integration.test.ts`(+55/-13、`git diff --stat`)
  - 患部テスト(`sweeps every origin/main election file through real selfCheck and exclusions`)を自己完結 fixture 化(FR-1、方針1)
  - fixture 構築は同ファイル shallow-origin テスト(:106-133)の様式: mkdtempSync × 3(bare remote / source / scratch)→ roots.push → afterEach 一括 rmSync
  - 実 checkout の `amadeus/spaces/default/elections/` corpus を `cpSync(recursive)` で seed し `git add -f` → commit → push(FR-2、裁定 seed-real-checkout-corpus)
  - fetch / worktree add / worktree remove はすべて fixture の source repo に対して実行。`process.cwd()` と実 origin への参照を除去(FR-1、FR-4)
  - 追加 assert: `expect(owned.electionPaths.length).toBe(seededFiles)`(seed 元件数との厳密一致 — `> 0` へ弱めない)。ヘルパ `countRegularFiles` は production `walkFiles` と同じ意味論(file のみ計数、symlink 非計数)
  - skip 分岐・環境検知・互換分岐なし(FR-6)。`scaleTestTime(120_000)` 維持、コメントのみ実態へ更新(NFR-1)

## 検証実測(数値は実行出力からの転記)

| 検証 | 結果 | 測定 ref / コマンド |
|---|---|---|
| TDD Red(修正前) | 23 pass / 1 fail(失敗点 gitStdout t245:80 ← :213 fetch) | repo 外 scratch の origin なしクローン(remote 0 件、HEAD 5f6b5bf97)、`bun test tests/integration/t245-...` |
| Green(修正後・本体ツリー) | 24 pass / 0 fail / 112 expect、7.06s(再実行 6.86s) | 本 worktree(HEAD 5f6b5bf97 + 本変更)、同コマンド |
| Green(修正後・origin なしクローン)FR-3 | 24 pass / 0 fail / 112 expect、6.90s | 同 scratch クローンへ修正ファイル反映後、`git remote -v` 0 行を確認して実行 |
| FR-4 副作用ゼロ | `git rev-parse refs/remotes/origin/main` = 5f6b5bf97(前後一致)、`git worktree list \| wc -l` = 136(前後一致)、tmpdir 残渣 0 | 本体ツリー、テスト実行前後 |
| 対象テスト単独時間 | 5.93s(< scaleTestTime(120_000))(NFR-1) | `bun test ... -t "sweeps every origin/main election file"` |
| typecheck | exit 0 | `bun run typecheck` |
| lint | exit 0(警告は既存分のみ、対象ファイルへの診断 0) | `bun run lint` |
| FR-1 機械検証 | `git grep -n "process.cwd()" -- tests/integration/t245-amadeus-leader-sync.integration.test.ts` → exit 1(0 hit)。実 origin 参照(fetch/worktree の cwd 対象)は diff で除去済み | 本 worktree(head e926f9140) |
| FR-6 機械検証 | `grep -cE "test\.skip\|describe\.skip\|\.skipIf" <対象ファイル>` → 0。環境検知分岐(`process.env` 参照)は対象テスト内 0 hit | 同上 |
| フルスイート(リモート CI = 正) | PR #3001 head e926f9140 の必須 CI 全 green(Tests / Coverage Report / CI Success 含む、`gh pr checks 3001` 転記、run 31760527210) | クリーン checkout(GitHub Actions) |
| フルスイート(ローカル run 1、本 worktree) | RESULT: FAIL — 実失敗 1 件 = t528-report-ack-kind。帰属実測: 本セッションの active-intent cursor + 進行中 Bolt 状態を test が cwd 経由で読む汚染(同一変更を含む cursor なしクローンで 6/6 緑)。本変更(t245)非起因 | `bash tests/run-tests.sh --ci`(並行セッション負荷あり) |
| フルスイート(ローカル run 2、origin なしクリーンクローン) | RESULT: FAIL — 実失敗 1 件 = t99-learnings-gate-flow(dist コピー中のファイル数レース、copyTreeWithRetry の transient)。単独再実行 17/17 緑、run 1 では緑 = flake。t528 は本 run で 6/6 緑、t245 は 24/24 緑 | 同コマンド @ noorigin-clone |

ローカル 2 run の失敗はいずれも環境起因(セッション状態汚染 / transient copy race)で、失敗集合が run 間で交差せず、単独再実行で全て緑。クリーン checkout の CI(必須ゲート)は green — FR-8 の合否判定はこの CI green を正とする(project.md Testing Posture「既存の無関係な失敗は Issue に記録してスコープを膨張させない」および帰属切り分け規律 `cid:build-and-test:c1-ablation-before-artifact-repro` による)。t528 の cwd 状態依存は Amadeus 所有の潜在欠陥として §14 経路の起票候補に記録。

## Key decisions / 逸脱

- plan からの逸脱なし。テスト名は据え置き(fixture origin を指す旨を冒頭コメントで明示)。
- FOLLOW-UP: 実行コストは corpus 比例(seed 4168 ファイル / 18M で単独 5.93s)。将来のサンプリング縮退は FR-2 の全件一致 assert と衝突するため要件裁定が必要。
