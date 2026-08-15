# Code Generation Plan — unit: priority-bug-batch-2

> Depth: Minimal / Test Strategy: Comprehensive(self-fix)/ TDD 既定。
> Traceability: 全 step → requirements.md FR-n → Issue(FR-1→#3077、FR-2→#3074、FR-3→#3075、FR-4→#3079、FR-5→横断)。user stories SKIP のため FR 起点(degraded input 明記)。
> worktree 分離・base = origin/main(実装開始時の最新先端を取得)・単一 Bolt・単一 PR。患部行は base..9ba8170bb 間の drift を考慮し実装時に再取得(RE 申し送り)。

## Steps

- [ ] Step 1: worktree セットアップ(`amadeus-worktree.ts create --base origin/main` + `bun install` + `bun run build`)
- [ ] Step 2 (FR-1/#3077): Red — 単一 question 選挙の hold → 再配布 → 再 tally が `history-mismatch` で commit 不能になる失敗テストを固定 → Green — `tallyElection`(amadeus-election.ts:451 付近)の `preservedResultDigest` 生産条件へ「target が全 question を覆う」を追加し null を書く。`isCommittedRun` の期待述語も同一条件へ。**述語は1箇所へ括り出して両者から呼ぶ形を検討**(reviewer FOLLOW-UP — 採否と根拠を code-summary に記録)。t553/t549 系の部分 hold 既存挙動 green 維持(裁定 E-AD-01F8F090)
- [ ] Step 3 (FR-2/#3074): Red — Inception + `Construction Autonomy Mode: autonomous` で recompose ガードが denied を返す現行挙動を失敗テストで固定 → Green — `assertRecomposeAllowed(autonomy, phase)` へ phase 入力を追加し `autonomous && phase === CONSTRUCTION` のみ denied。呼び出し側は `getField(content, "Lifecycle Phase")`。autonomous Construction で denied 維持のテストも同時に固定。拒否メッセージを実条件へ更新(裁定 E-AD-088EDDEC)
- [ ] Step 4 (FR-3/#3075): 現存 24 箇所(A 6 / B 10 / C 8 — Issue の起票者訂正コメント2件が正)を是正 — A/B 群 16 箇所は削除または `scaleTestTime` 経由の余裕ハング検知化(機能 assert 担保を確認、なければ置換)、C 群 8 箇所へ「ハング検知・性能主張でない」契約コメント。`tests/perf/` 非接触。各箇所の処置(削除/緩和/コメント)を一覧で code-summary に記録
- [ ] Step 5 (FR-4/#3079): t224:1553 ケースの migrate env へ `AMADEUS_AUDIT_LOCK_RETRIES: "5"` を注入し、`}, scaleTestTime(15_000));` 形の timeout を宣言。ラッパー非経由 `bun test` で当該ケース green を実測(裁定 E-AD-5ADD4AB4)
- [ ] Step 6 (FR-5): 台帳同期 — 新規テストファイルは coverage-registry regen。amadeus-lib/utility/election* の allowlist セレクタ・model-map implPath を照合し必要なら resync。**coverage 母集団の実測**: 変更で新たに in-process import されるファイルの有無を確認し結果を code-summary へ記録(reviewer FOLLOW-UP)
- [ ] Step 7: ローカル検証 — typecheck / lint / targeted(election v2 系、recompose 系、t224、FR-3 の変更ファイル群)/ coverage-patch-quick advisory
- [ ] Step 8: commit(英語・Conventional・意味単位)→ push → PR 作成(push-first)
