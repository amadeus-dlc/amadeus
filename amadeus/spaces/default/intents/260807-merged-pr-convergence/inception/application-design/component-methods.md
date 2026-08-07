# Component Methods — 260807-merged-pr-convergence

上流入力(consumes 全数): `requirements`(AC-1a〜AC-4b をメソッド契約の検証面として消費)、`architecture` / `component-inventory`(codekb — 既存シグネチャの現況)。ADR 番号は `decisions.md` を参照。

## gh-runner(ADR-2)

- `PR_STATE_QUERY`(拡張): `pullRequest(number:$number){ state mergedAt mergeable mergeStateStatus mergeCommit { oid statusCheckRollup { state } } }`。
- `RawPrState`(拡張): `{ mergeable; mergeStateStatus; state: string; mergedAt: string | null; mergeCommitOid: string | null; checkRollupState: string | null }` — 全て raw のまま返し、parse は predicate の責務(既存コメント :201-205 の契約維持)。mergedAt/mergeCommit はマージ前 PR では null(GraphQL 仕様)を許容する。

## predicate(ADR-2/3)

- `PrLifecycleState`(新設 companion): `"OPEN" | "CLOSED" | "MERGED"` の閉集合。`parse(raw: string)` は未知値 throw(`Mergeable.parse` :124-138 と同形の fail-closed)。**AC-1b の患部**。
- `LandedFacts`(新設型): `{ mergedAt: string; mergeCommitOid: string; checkRollupState: string | null }` — parse 済みの landed 記録材料。mergedAt/oid の欠落(MERGED なのに null)は throw(機械導出必須 — AC-3a)。
- `ConvergenceVerdict`(拡張): `verdict: "converged" | "not-converged" | "landed"` を追加。既存 `converged: boolean` は維持(landed では false)。`evaluateConvergence` 本体(:180-192)は無変更で、landed verdict は評価を経ずに構成される(別コンストラクタ `landedVerdict(facts)`)。

## cli(ADR-1/2/3)

- status/report 共通の観測前段(新設 `resolvePrLifecycle`): fetchRawPrState → PrLifecycleState.parse → MERGED なら `LandedFacts` を構成して landed 経路へ(resolveMergeable 不呼出 — AC-2a)。OPEN/CLOSED は既存経路へ(AC-2c)。
- `ConvergenceReport`(拡張): `| { kind: "landed"; prRef; mergedAt; mergeCommitOid; checkRollupState; generatedAt }`。
- `renderReport`(拡張): landed 節 — `- kind: landed` / `- pull request: <repo>#<n>` / `- converged: false` / `- merged at:` / `- merge commit:` / `- check rollup:`(informational)/ `- generated at:`。`- label: value` 正書式維持(センサー field() 互換)。
- status 出力: JSON に `verdict` を含め、landed は exit 0(AC-2b)。
- report verb: MERGED → landed report を書く(HUMAN_TURN 不要 — AC-3b、latestHumanTurn 不呼出)。既存 refuse 分岐(:438-447 / :468-474)は無変更(AC-3c)。

## report-format sensor(ADR-4)

- kind 閉集合(:69): `converged | override | landed`。
- `checkLanded`(新設): `converged === "true"` → 矛盾 finding / `merged at` 欠落 → missing / `merge commit` 欠落 → missing。`check rollup` は検査しない(informational — AC-4a)。
- 既存 `checkOverride` / converged 整合(:122-130)は無変更。

## テスト対応表(NFR-1: TDD、t481 以降)

| AC | テスト(新規/追補) | seam |
|---|---|---|
| AC-1b | t481 unit(predicate: PrLifecycleState/LandedFacts の未知値 throw) | 純関数直呼び(t446 様式) |
| AC-1a | t482 integration(gh-runner 拡張クエリの応答フィールド) | runCli + scripted GhSpawn fixture(t448 様式) |
| AC-2a/2b/2c | t482 integration(cli: landed status/report) + t448 追補 | runCli + scripted GhSpawn(sleep seam カウント) |
| AC-3a/3b/3c | t482 に同居(landed report 書込・HUMAN_TURN 不呼出・refuse 無変更) | 同上 |
| AC-4a/4b | t450 追補(landed fixture PASS + 違反 FAILED 両側) | evaluateReportFormat + renderReport-fixture |
