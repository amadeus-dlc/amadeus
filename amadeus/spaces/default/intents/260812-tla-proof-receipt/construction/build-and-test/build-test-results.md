# Build & Test Results — 260812-tla-proof-receipt

上流入力(consumes 全数): `construction/fix-2913-proof-receipt/code-generation/code-generation-plan.md`(Step 7 の回帰検証と Step 8 の配送手順が、本ステージで再実測する対象集合と PR 着地の判定面を定める)、`construction/fix-2913-proof-receipt/code-generation/code-summary.md`(FR 充足表・検証表・申告済み逸脱 — 本ステージの実測はこれに対する再測と突き合わせである)。

- 測定 ref: worktree `/Users/j5ik2o/orca/workspaces/amadeus/issue-2913-tla-authoring-proof-receipt`、branch `fix/2913-tla-authoring-proof-receipt`、HEAD `23efaab5e`(= PR #2920 head、`git branch --show-current` / `git log --oneline -3` 実測)
- 着地: PR [#2920](https://github.com/amadeus-dlc/amadeus/pull/2920) MERGED / merge commit `71523ecaf` / mergedAt `2026-08-12T04:16:56Z`(`gh pr view 2920 --json state,mergedAt,mergeCommit,headRefOid` 実測)

## ビルド結果

| コマンド | exit | 実測値 | 測定者 |
|---|---|---|---|
| `bun run typecheck` | 0 | 出力なし(`tsc --noEmit` ×2 profile) | 本ステージ |
| `bun run lint` | 0 | `Checked 1786 files in 461ms. / 459 warnings / 17 infos`(既存分) | 本ステージ |

ビルド失敗は発生していない。exit code はパイプを経由せず個別に捕捉した(`cid:code-generation:no-exit-capture-through-pipe`)。

## テスト結果

| 対象 | コマンド | exit | 実測値 | 測定者 |
|---|---|---|---|---|
| 日常 CI 層(t534+t535) | `bun test ./tests/unit/t534-... ./tests/integration/t535-...` | 0 | 27 pass / 0 fail / 48 expect(2 files、49ms) | 本ステージ(単独実行) |
| 実TLC 専用面 | `mise x java@temurin-26.0.1+8 -- bun test tests/formal-verif/tla-referee-real-toolchain.test.ts` | 0 | 7 pass / 0 fail / 13 expect(19.80s) | 本ステージ |
| 影響34ファイル | `bun test <述語による34ファイル>` | 0 | 359 pass / 3 skip / 0 fail / 1340 expect | builder(cg2913-builder-report.md) |
| 既存ピン(production 受理集合) | — | 0 | 90 pass 維持 | builder(同上、FR-4 行) |
| フルスイート | `bash tests/run-tests.sh --ci` | — | 下記「フルスイートの帰属」参照 | conductor / fix2921-builder |

影響34ファイルの述語(再実行可能): `grep -rl "tla-model-receipt\|fs-tlc-toolchain\|tlc-toolchain\|tla-referee\|run-model-check" tests/unit tests/integration tests/e2e tests/smoke`(33件)+ `tests/integration/t403-tla-loader-generalization.test.ts`。

t534+t535 の pass 件数は code-summary.md の 16 pass から 27 pass へ増えている。差分は PR #2920 の patch-coverage closure(commit `8d74b5638` および `23efaab5e`)で追加した受理拒否・auxiliary 経路のテストであり、退行ではない(cg2913-cov-report.md の per-line closure 表)。

### 負荷起因の flake(自己捕捉)

本ステージで t534+t535 を実TLC面と**並行**に走らせた1回目は exit 1・`27 pass / 1 fail`(`tests/integration/t535-...` の unnamed テストが `a beforeEach/afterEach hook timed out`、10102.15ms、全体 18.34s)。同一コマンドを単独で再実行すると exit 0・`27 pass / 0 fail`・49ms。負荷源は conductor 自身の並行実行である(`cid:build-and-test:c2-2814-conductor-is-a-load-source`)。

honest な限界: この帰属は「並行あり赤 / 単独緑」の2点対照であり、**変更前コミットを同一負荷条件で走らせる比較は行っていない**。したがって「本変更が持ち込んだ負荷退行ではない」ことを形式的には排除していない(`cid:build-and-test:bt-20260730-2`)。傍証として、同テスト集合は PR #2920 の CI(GitHub ランナー)で 17 checks green を通過しており、CI 側で同種の hook timeout は再現していない。

### フルスイートの帰属

- conductor 実行 1回目: 1 fail(`t05`)。単独実行では 0 fail、かつ本 unit の diff に含まれないファイルであるため負荷起因と帰属。
- conductor 実行 2回目: 1 fail(complexity-gate)。`sha256Field` 抽出(`5c73f2af6`)で是正し、ゲート再実行 exit 0。
- #2922 着地後の main フルスイート: 981 files / 13176 assertions / 0 fail(fix2921-builder が merged tree 上で実測)。本ステージの worktree(`23efaab5e`)とは別 tree の測定であり、本ステージでの再測は行っていない。

## CI 結果

`gh pr checks 2920 --json name,bucket` 実測(head `23efaab5e`): **pass 17 / skipping 2 / 計 19**、`gh pr view` の state = MERGED。pr-convergence-report.md(kind: landed、generated at `2026-08-12T04:33:19Z`)の check rollup も SUCCESS。

Patch Coverage Gate は closure 済み — 報告された UNCOVERED 行を in-process 駆動で全件閉じ、**新規 waiver は追加していない**(cg2913-cov-report.md「STOP lines: None. Every reported line closed; no waiver added.」)。既存の `runOnce` waiver は semantic selector(`function: runOnce` / fingerprint / `targetLines: "2-36"`)として `tests/.coverage-patch-allowlist.json` に再アンカーされており、本ステージで当該エントリを実読し、reason(実TLC面でのみ到達可能・pre-toolchain 行は t447/t535 が in-process 駆動)と expiry(hermetic TLC fixture jar の CI 着地で解除)が実在することを確認した。

## FR / NFR 別の受け入れ確認

| 要件 | 受け入れ確認(requirements.md 逐語の要旨) | 実測証拠 | 判定 |
|---|---|---|---|
| FR-1 | 未登録有限モデルの baseline/falling/vacuity 全 run が `MODEL_RECEIPT` にならず TLC 実行へ到達 | 実TLC面 7 pass(本ステージ再測 exit 0)、builder の対角実測で `MODEL_RECEIPT` 消滅 | ✅ |
| FR-2 | 同一バイト列で referee 形と loader 形の digest 一致(互換分岐なし) | t534(27 pass に含む)、code-summary.md「decoded string 形へ統一、互換分岐なし」 | ✅ |
| FR-3 | 登録済みモデルの referee 経路が preparation を通過(D1 単独修正では不合格の対照) | builder 実測: `MirrorLifecycle`(+`MirrorLifecycleCore`)で `MODEL_RECEIPT` / `SOURCE_IDENTITY` が出ない | ✅ |
| FR-4 | 未登録名 `VerifiedTlaModelReceipt` の拒否維持+構築子非公開の機械検査 | `validateVerifiedTlaModelReceipt` 無変更・既存ピン 90 pass、t535:333 の plugin tools 全走査(1件) | ✅ |
| FR-5 | 改変・差替・名前不一致の3系の落ちる実証(赤の実測→復元) | I1 → 3 fail / I2 → 1 fail / I3 → 1 fail、復元後 porcelain 空・diff 空・マーカー grep 0 | ✅ |
| FR-6 | 準備段・出力解析段の両消費者を通過(段移動なし。実TLC完走を含む) | t535 の両消費者テスト+実TLC面 7 pass | ✅ |
| FR-7 | 修正前 red / 修正後 green の対角実測を記録 | 修正前 `854692fd7` で exit 1・逐語 `PreparationError/MODEL_RECEIPT: verified model is unavailable: Counter`(3 run)→ 修正後 消滅、新規 formal-verif テスト exit 0 | ✅ |
| NFR-1 | referee 検証の決定性・TLC 実行環境の固定 | 実TLC面を `mise x java@temurin-26.0.1+8 --` で実行し 7 pass 再現(builder 実測と本ステージ再測の2点で同結果) | ✅ |
| NFR-2 | 既存の登録済みモデル check・receipt drift・output binding に回帰なし | 影響34ファイル 359 pass / 0 fail、既存ピン 90 pass、CI 17 checks green | ✅ |

## Verdict

**READY(無条件)**

FR-1〜7・NFR-1〜2 のすべての受け入れ基準に fresh evidence が存在し、赤は残っていない。下記「申し送り」は**いずれも受け入れ基準の外**にある事項であり、条件付き READY の根拠にしない(`cid:build-and-test:c2-unconditional-ready-boundary`)。AC 外の認定は requirements.md の FR/NFR 実文と照合して行った(「実装時実測」を規定した項目を AC 外へ分類していないことを確認済み — `cid:build-and-test:no-silent-scope-narrowing`)。

## 申し送り(AC 外)

1. **parseTrace の既存制約2件(#2918 相当、本 unit スコープ外)**: (a) 単一変数モデルは TLC 出力形(`ticks = 0`、先頭 `/\` なし)により `parseTrace`(`tlc-toolchain.ts:539`)が counterexample を必ず GRAMMAR にする (b) TLC はアルファベット順に印字するが referee の `traceStateVariablesOf` は VARIABLES 宣言順を返し、位置一致要求と衝突する。**FR-1 の AC は「TLC 実行へ到達する」であり充足済み**のため AC 外。author-new の実運用では「TLC は動くが counterexample 解析で落ちる」新規モデルが残る。
2. **既存 probe `tests/formal-verif/support/tla-referee-real-toolchain-probe.ts` は exit 1 のまま**(上記 1(a) に該当する単一変数モデル)。同経路は新規 `.test.ts` がカバーする。
3. **metrics/queue 面(#2925)**: PR 着地時のインフラ事象であり、本 unit の FR/NFR の外。
4. **waiver の解除条件**: `runOnce` の実TLC区間 waiver は hermetic TLC fixture jar の CI 着地(U4 registration-committer follow-up)で解除する — expiry 欄に記載済み。
5. **フルスイートの本 tree 再測は未実施**: #2922 後の green は別 tree(merged tree)での測定である。

## 証拠ギャップ(そのまま記録)

- **patch coverage の閉塞行数の表記揺れ**: 一次記録 cg2913-cov-report.md は本文で「All 11 reported UNCOVERED lines」と書きつつ、per-line 表は 12 行(うち `:163`/`:164`、`:172`-`:174`、`:217`/`:218` はテンプレートリテラル・同一テストで駆動される対の行)を列挙する。ディスパッチ時のブリーフでは「13 uncovered lines」と伝えられた。**本ステージは一次記録の表を正とし、11/12/13 のどれかを断定しない** — Codecov 側の報告実体を pulls API で再照会していないため(`cid:requirements-analysis:codecov-artifact-line-confirmation`)。closure 自体は「新規 waiver ゼロ」「patch gate PASS」「CI 17 checks green」の3点で成立しており、この揺れは判定に影響しない。
- **rollup SUCCESS と #2925 の前後関係**: pr-convergence-report.md の rollup SUCCESS は generated `2026-08-12T04:33:19Z` 時点の記録で、#2925 の remediation 適用との時系列は本ステージで独立に再構成していない。
- **負荷 flake のベース比較**: 上記「負荷起因の flake」に記載のとおり、変更前コミットを同一負荷条件で走らせる比較は未実施。
