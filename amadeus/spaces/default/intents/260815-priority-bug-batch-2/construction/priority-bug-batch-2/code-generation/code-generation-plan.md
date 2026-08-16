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

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T05:37:51Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-4はfile:lineで整合確認、計画外追加2件は正当な必然。FR-3は5箇所スポットチェックで妥当性確認、網羅性のみスコープ外で独立検証不可。

### Findings

- FOLLOW-UP | code-summary.md の FR-1 call-site 行番号表記(tallyElection/isCommittedRun)が実コードと入れ替わっている(amadeus-election.ts:436=isCommittedRun, :467=tallyElection)
- FOLLOW-UP | FR-3の24箇所→A/B群0 hitの網羅性主張はIssue #3075の検索述語(レビュースコープ外)なしに独立検証できない。build-and-test段での再実測記録を推奨
- FOLLOW-UP | t370-canonical-lock-target.integration.test.ts:171 の0×0ms判別アサーションが「機能テストに厳密時間アサーション禁止」裁定との境界線上。正当化コメントはあるがチーム確認を推奨
- NIT | code-summary.md のFR-2 Red件数(非Construction4+判読不能3=7)がt246-routing-and-autonomy-guards.test.ts:144のtest.each(4値)と不一致の可能性
