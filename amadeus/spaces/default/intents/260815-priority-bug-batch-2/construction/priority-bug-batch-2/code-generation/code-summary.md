# Code Summary — unit: priority-bug-batch-2

> Depth Minimal(bullet のみ)。PR: https://github.com/amadeus-dlc/amadeus/pull/3101(branch `bolt-priority-bug-batch-2`、base `6ff5352ba`、6 commits = 実装 4 + 台帳 1 + record checkpoint 1)。数値は builder 報告と conductor 取込後の再実測からの転記。

## 変更ファイル(主要)

- `packages/framework/core/tools/amadeus-election.ts` — FR-1/#3077。`runPreservedDigest(directive, definition)` を :417 に新設し、全 question を覆う再 tally では null を返す。呼び出しは 3 箇所(`isCommittedRun` :436 / `tallyElection` :467 / **`matchesReportExpectation` :579**、conductor 実読で確認)(commit `14339c03c`)
- `packages/framework/core/tools/amadeus-lib.ts` / `amadeus-utility.ts` — FR-2/#3074。`assertRecomposeAllowed(autonomy, phase)`(lib :576-577)へ phase 軸、呼び出し側は `getField(content, "Lifecycle Phase")`(utility :5802)(commit `a54174470`)
- テスト 19 ファイル — FR-3/#3075。A/B 群 16 箇所是正(9 削除 + 7 を `scaleTestTime` 化)、C 群 8 箇所に契約コメント(commit `526035b1b`)
- `tests/integration/t224-upstream-v2-migration-cli.test.ts` — FR-4/#3079。`AMADEUS_AUDIT_LOCK_RETRIES: "5"` 注入 + `scaleTestTime(15_000)` 宣言(commit `65256d861`)
- `amadeus/spaces/default/specs/tla/model-map.json` — 台帳 resync(`40ea32060aa9` → `29a030d4d7a8`、SOURCE_DRIFT 5 件解消)(commit `cfd8c72f2`)
- 新規テスト: `tests/integration/t3077-election-full-retally.integration.test.ts`

## TDD 実測(builder 報告からの転記)

- FR-1: Red 2 fail(再 tally commit が `{"error":{"category":"store"},"ok":false}`、scratch probe で `history-mismatch` を直接確認)→ Green 2 pass。既存 election 49 テスト green(t553 部分 hold 含む)
- FR-2: Red 7 fail(非 Construction 4 phase + 判読不能 3 ケースが denied)→ Green 28 pass。integration 層で第2の Red(t246 fixture が `Lifecycle Phase` 欠落のままバグ挙動を固定)→ fixture 修正 + IDEATION/INCEPTION の behavioural equivalence 検証追加で 11 pass
- FR-3: 述語再実行 24 → 15(A/B の生予算 0)。削除 9 は例外送出で機能 assert が担保、緩和 7 は ReDoS ガード/相対 p95/0×0ms 判別など bound に意味がある箇所
- FR-4: Red `[5041.49ms] timed out after 5000ms`(SIGTERM)→ Green 1 pass(5 expects 全実行、失敗経路の意味不変)。ファイル全体 74 pass

## 計画外の追加(builder 申告、いずれも承認済み修正から強制されたもの)

1. `matchesReportExpectation`(第3の同期箇所)— 2 箇所のみの修正では tally 成功後に report が `stale-directive` で落ち、指令ループが terminal へ到達しない
2. t246 integration fixture の `Lifecycle Phase` 追加 — fixture がバグ契約を固定していたため

## 検証

- builder(worktree): build / typecheck / lint = exit 0(追跡不変)。触れた 21 テストファイル通し **571 pass / 4 skip / 0 fail**。変更本番行の lcov DA 実測で追加行の uncovered ゼロ
- conductor(取込後の配送先ツリー、build 済み): typecheck 0 / t3077 + t246 = **30 pass 0 fail**
- 台帳: model-map resync 済み。coverage-registry `--check` 0(前後同一)、allowlist セレクタ guard 124 tests green
- FR-3 網羅性の独立再実測(conductor、取込後ツリー): 述語再実行 = **15 行**。内訳は `scaleTestTime` 化 8 + 定数比較 2(PROBE_*_MS)+ C 群ハング検知 5(60s / 180s / 10s / 10s / 60s)。**A/B 群の生の短い固定予算は 0 hit** — code-summary の「24 → 15、A/B 生予算 0」の主張を独立に確認
- coverage 母集団(t226 クラス): 新規テストの本番 import は既存テストが in-process import 済みのファイルのみ — 膨張なし(reviewer FOLLOW-UP への実測記録)
- blocking はリモート CI(`ci-success`、PR #3101)を正とする

## 申し送り

- `tests/e2e/setup-install.test.ts:94` の `release asset not found for v9.9.9` は base `6ff5352ba` でも同一失敗の既存赤(stash 比較で帰属確認済み)
- `coverage-patch-quick` はローカル time budget 超過で verdict 未取得(advisory・exit 0 契約)。blocking Patch Coverage Gate は CI 側
- FR-2 の拒否メッセージは非変更 — 修正後は文言が実条件と一致するため(builder の判断申告、conductor 承認)
