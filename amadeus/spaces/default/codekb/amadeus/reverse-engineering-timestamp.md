# リバースエンジニアリング実施記録

## 実行メタデータ（最新: 260818-issue-3029-sensor-gate）

- Date: `2026-08-18`（UTC）
- Intent: `260818-issue-3029-sensor-gate`
- Repository: `amadeus`（単一 repo、root `/Users/j5ik2o/orca/workspaces/amadeus/intent-3029`）
- Scope / depth / project type: `self-fix` / Minimal / Brownfield
- Base commit: `23d4ae767956cd56fc28fa78abe28096712eff8`（既存 `re-scans/260817-inception-cost-batch.md` の最新 observed。HEAD の祖先、距離 6）
- Observed commit: `c8c393bba927e4c00a8c6de9ef2da76068d04bfa`（本 worktree HEAD。対象実装面は origin/main 起点から不変）
- 差分規模: base..observed は 155 files / +7,316 −3,968。workflow exhaust 除外後は +2,551 −53（`amadeus/spaces/*/intents/**`, `elections/**`, `codekb/**`, `memory/**`, `metrics/**` を除外）
- Focus: Issue #3029 の blocking sensor gate。`amadeus-sensor.ts:772-778` branch b、`amadeus-state.ts:2008-2014`、plugin sensor manifest `:5`、t511/t92 の exit 127 回帰と audit-format を確認した。
- 中核知見: exit 127 は `SENSOR_PASSED` + `Note: tool-unavailable` になり、guard は `script-error:` のみ拒否するため blocking completion を通す。Bun 不在の `script-error: spawn-failed` は branch 0 の別分岐。
- 設計保留: fail-closed 化か pass 維持かは requirements の裁定。前者は t511 integration `:369-374` / unit `:512-527` の期待値反転、後者は `audit-format.md:267-272` との整合明文化を要する。
- Verification: `mise trust`、`bun install`、`bun run build` は成功。RE 本体ではコード・テスト・文書を変更せず、既存 codekb へ観測結果のみ追記した。
- Per-intent record: `re-scans/260818-issue-3029-sensor-gate.md`

## 実行メタデータ（履歴: 260818-priority-bug-batch-4。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260820-fmc-drift-batch の差分リフレッシュ時。本節の本文と当時の値は保存する））

- Date: `2026-08-18`（UTC）
- Intent: `260818-priority-bug-batch-4`
- Repository: `amadeus`（単一 repo、root `/Users/j5ik2o/orca/workspaces/amadeus/fix-0818-2`）
- Scope / depth / project type: `self-fix` / Minimal / Brownfield
- Base commit: `23d4ae767956cd56fc28fa78abe28096712eff8a`（前回 observed = 260817-inception-cost-batch。祖先性 `git merge-base --is-ancestor 23d4ae767956cd56fc28fa78abe28096712eff8a HEAD` → **exit 0**、本 synthesis の再実行）
- Observed commit: `127be70c5d7a584016f88a5d44e8715904020721`（`git rev-parse HEAD` = `git rev-parse origin/main`、drift 0。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Distance: **5** コミット（`git rev-list --count 23d4ae767..127be70c5`、本 synthesis の再実行）
- Scope of scan: **差分リフレッシュ 23d4ae767..127be70c5（5 コミット）、focus は #2837 / #3106 の機構面の現在形確認**
- 差分規模: `git diff --shortstat 23d4ae767..127be70c5` → **99 files changed, 7314 insertions(+), 61 deletions(-)**。`--name-status` の分類は **A 71 / M 28 / D 0**（いずれも本 synthesis の再実行）
- **除外削減の実測**（#2415 の RE stage 契約が義務づける記録）: 区間 `23d4ae767..127be70c5` に `RE_SCAN_EXCLUDED_PATHSPECS`（`amadeus-lib.ts:1540` の 5 pathspec）を適用し、除外なし **7,314 insertions / 99 files** → 除外あり **2,551 insertions / 26 files**。削減 **4,763 insertions / 73 files = 65.12%**（派生値、算出式 `4763/7314`）。クラス別内訳: `intents` 3,369 / `elections` **0** / `codekb` 1,207 / `memory` 5 / `metrics` 182（合計 4,763 = 突合一致）
- Focus: [#2837](https://github.com/amadeus-dlc/amadeus/issues/2837)（`invoke-swarm` directive が batch 番号と convergence check コンテキストを欠く）/ [#3106](https://github.com/amadeus-dlc/amadeus/issues/3106)（per-unit 経路の cancelled unit が settle されず `producer-outcome-pending` が残る）。両 Issue は独立クロスレビュー 2 名成立済みで、確立事実は `<record>/ideation/intent-capture/issue-evidence.md` を経由して所与消費し、本スキャンは名指す機構の**現在形**のみを observed 断面で確認した
- 区間内容の帰属: **前 intent `260817-inception-cost-batch` の 2 unit 着地**（#3181 → PR #3190 / #2415 → PR #3191）と、各 PR 直後の metrics snapshot 2 件、record checkpoint 1 件。**前スキャンの仮説 H1 / H2 はどちらも予測どおりの形で着地した**
- 構造変化: **なし**。`git diff --name-status 23d4ae767..127be70c5 -- packages/ plugins/ docs/ .github/` は **10 行すべて `M`**（新規 0 / 削除 0）。`packages/framework/harness/` / `.github/` / `package.json`・`bun.lock`・`**/package.json` / `plugins/` はいずれも**空 diff・exit 0**（本 synthesis の再実行）
- 公開契約の変化: **新 CLI verb 1 件**（`amadeus-utility.ts issue-evidence fetch` — dispatch `:6981`、verb は `fetch` のみ `:6834`、read-only で state / audit 遷移なし、usage `:7045`）。**artifact 語彙 122 → 123**（`tests/integration/t66.test.ts:1032` / `:1042`）。**gateway export 23 → 28**（`commentsArgv` `:189` / `RemoteGitHubIssueComment` `:478` / `parseIssueComments` `:550` / `EvidenceGitHubGateway` `:1077` / `createEvidenceGitHubGatewayAdapter` `:1089`）。**`amadeus-lib.ts` export +3**（`RE_SCAN_EXCLUDED_PATHSPECS` `:1540` / `issueEvidencePath` `:5043` / `relativeIssueEvidencePath` `:5051`）。audit イベント基数 pin は **98 で不変**、config leaf / harness / CI / 外部依存も不変
- stage 契約の変化: `stages/ideation/intent-capture.md:14-15` に **`optional_produces: [issue-evidence]` を新設**（`optional_produces` 実運用が 2 → **3 stage**、census 正本は `tests/integration/t212-optional-produces.test.ts:275`）。`stages/inception/requirements-analysis.md:30-31` の `consumes:` に `issue-evidence`（`required: false`）を追加（6 → 7 件）、`:191` の `upstream-coverage` 括弧書きを 3 件 → **7 件全列挙**へ同期。`stages/inception/reverse-engineering.md` は frontmatter 不変で本文のみ +73（Scan input exclusions 節の新設と、`issue-evidence` の**本文レベル読取**の明文化 — 逐語 `deliberately body-level and NOT a consumes: entry`）
- 中核知見（区間の 2 機構）: **1 artifact・3 消費モード** — `issue-evidence` は produce（`optional_produces`）/ 宣言 consume（引用義務あり）/ 本文レベル読取（引用義務なし）の 3 通りで結線され、**入力の有用性と upstream-coverage の引用義務が分離できる**ことが初めて明示された。副作用として `tests/integration/t65.test.ts:175-182` の孤児 consume モデルが `produces ∪ optional_produces` へ是正された（engine の `producersOf` との parity 回復）。**散文とコードの二重定義 + drift guard** — `#2415` の除外規則は契約散文（pathspec を逐語で保持）とコード定数（`RE_SCAN_EXCLUDED_PATHSPECS`）の対で表現され、`tests/integration/t2415-re-scan-exclusion-contract.integration.test.ts` が **source + 全 delivered tree** で一致を固定する。`:(glob)` は load-bearing（裸形は無音の fail-open）、`amadeus/spaces/*/specs/` は build 台帳のため**意図的に非除外**、base-point 解決は除外の外、加えて「codekb がまだ引いていない workflow process record を新規に引かない」規範が同時に入った
- Focus の中核知見: **#2837** — `InvokeSwarmDirective`（`amadeus-directive.ts:312-331`）は 6 面のみで閉語彙 `:555` `INVOKE_SWARM_FIELDS` に `batch` / `check_cmd` / `test_file` が不在。engine は `firstUncoveredBatch`（`amadeus-orchestrate.ts:3906`、戻り値 `{units, batchNumber}`）で 1-origin 番号を保持しながら、`:4294` が `pick.units` だけを `emitConfiguredSwarm`（`:4074`）へ渡して**破棄する**。対称面では同じ engine が `execute-failure-election`（`amadeus-directive.ts:644-649`）で `batch` を必須搬送し、retry arm（`:4092-4106`）で `prepared_batch` を搬送し、gate（`:3889`）で 1-origin 番号を人へ開示している。batch 値は durable な pool identity（`amadeus-swarm.ts:638` 逐語 `unit-pool:${flags.batch}:initial-enqueue`）で、`prepare` の既定 base はブランチ名（`:581`）。読取経路は不在（`:1419` の 14 verb に `context` / `status` 相当なし）。conductor 面 census は **8 面中 7 面**が `--batch <n>` の手動指定を要求（`git grep -c -- "--batch <n>"`: claude/codex/kimi/kiro/kiro-ide **6**、cursor/opencode **5**、pi **0**）。**#3106** — settle emitter `settlePerUnitOutcomes`（`amadeus-orchestrate.ts:4686`）の `:4706` 逐語 `if (batch === undefined || cancelledUnits.has(unit)) continue;` が cancelled を除外し、値の閉語彙 `:2475` `SETTLED_UNIT_OUTCOME = "succeeded"` と読み側の拒否 `:2508` が対で `succeeded` に閉じる。母集団 `readPerUnitConsumePopulation`（`:2513`）は pool 行と settle 行のみを読み、canonical projection を通る検出側 `cancelledConstructionUnits`（`:3934`）が見る solo cancelled terminal を**見ない**。下流 `amadeus-per-unit-consume-fanout.ts:199` の `KNOWN_OUTCOMES` は `cancelled` を**既に受理**し、pending 述語 `:224-228` は「行が無い」ことだけを見るため、行さえ届けば fail-closed は解ける。solo skip arm（`:6767-6781`）は `BOLT_COMPLETED(Outcome: cancelled)` のみを書き pool を経由しない（pool arm は `:6783-6785`）。**両 focus とも是正は未着地**（`git grep -n "3106" 127be70c5 -- packages/ plugins/ tests/ docs/` → **exit 1**、`"2837"` は `tests/.coverage-patch-allowlist.json:183` / `:566` の sha256 値の内部文字列 2 hit のみ）
- 品質指標: coverage **93.39886 → 93.41203**（**+0.0132pp**、2 区間連続の上昇）、hits/lines **95788/102558 → 96064/102839**（+276/+281 = 新規行の被覆率 約 98.2%、派生値）、test files 1047 → **1055**（+8 = 新規テスト 8 件と一致）、assertions 13939 → 14030、unit_small 270 → 273 / integration_medium 583 → 588、loc core 149387 → 150065、loc tests 386333 → 388125、複雑度 関数 7320 → 7340 / 閾値超過 **32 → 32**（横ばい）/ max 38（不変）、bugs total 400 → 405 / **open 13 → 13**（横ばい）/ closed 387 → 392。測定元は `metrics/2026-08-17T12-24-08-673Z-0b652d2cd1a6.json`（base 側）と `metrics/2026-08-18T04-53-24-170Z-43a2e2978678.json`（observed 側）の `collectors.<name>.values` 直読（本 synthesis の実行）
- 台帳: **5 面が同一区間内で resync 済み** — `tests/.coverage-registry.json` **+48 −5** / `tests/.coverage-patch-allowlist.json` **+36 −0** / `tests/.coverage-ratchet.json` +2 −2（`function` **189 → 191** / `subcommand` **86 → 87**）/ `tests/integration/t-coverage-mechanism-ratchet.test.ts` +2 −0（mechanism honesty 台帳へ integration 2 件追加）/ `tests/fixtures/designer-export/export.json` +8 −0。**TLA の `model-map.json` は本区間で不変**（`amadeus/spaces/default/specs/` は変更ファイル一覧に不在）— ただし #3106 の是正は `amadeus-orchestrate.ts` を触るため発火見込み
- 新規テスト: **8 ファイル / 1,694 行**（t2415 系 2 本 415 行 = `t2415-re-scan-exclusion.integration` 248 + `t2415-re-scan-exclusion-contract.integration` 167、t3181 系 6 本 1,279 行 = integration 3 本 453+191+131 / unit 3 本 273+175+56）。既存テストの是正 3 件（`t65.test.ts` `:175-182`、`t212-optional-produces.test.ts` `:275`、`t66.test.ts` `:1032`/`:1042`）
- 上流入力（Developer scan）からの訂正 2 件: (1) `tests/.coverage-registry.json` の規模は **+48 −5**（Developer scan §品質指標の「+50/−7」ではない。`git diff --numstat 23d4ae767..127be70c5 -- tests/.coverage-registry.json` の再実行）。(2) `t211-swarm-batch-progress.test.ts` の所在は `tests/unit/` であり Developer scan §テスト空隙の記述が正しい（本 synthesis の初回転記が誤っていたため是正済み。`git ls-tree -r --name-only 127be70c5 tests/` の実測）
- 上流入力への追補 1 件: conductor 面 census の述語を **2 通りに書き分けた** — `--batch <n>`（手動指定要求）と `--batch`（全出現）。前者は claude/codex/kimi/kiro/kiro-ide 6・cursor/opencode 5・pi **0**、後者は同 7・5・**1**。pi の唯一の hit（`:90`）は `acquire --batch <directive.prepared_batch>` で directive の値を渡す形であり手動指定ではない。**「8 面中 7 面が手動指定を要求」は前者の述語で成立する**
- 未検証面: focus 2 件の是正方式は**本スキャンでは一切決めていない**（後続の裁定事項、`memory/team.md` P1）。`docs/guide/15-troubleshooting.ja.md` の対訳文言は**未判定**（英語版 `:143` の逐語文字列は ja 側で 0 hit だが、対訳が別の語で同旨を述べている可能性を排除していない）。`dist/` parity は**未測定**（`bun run build` は読取専用制約により未実行）。実行時の再現はクロスレビュー済み事実として所与消費しており、本スキャンでは再現していない。テスト実行・coverage・TLC はいずれも未実行
- Verification: git 状態変更（commit / branch / checkout / stash / merge / fetch）・GitHub 読書き・engine/state ツール実行（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）・`bun run build`・テスト実行は**すべてゼロ**。書き込みは `amadeus/spaces/default/codekb/amadeus/` 配下のみ
- Updated artifacts: 本体 **7 面**に本 intent の節を追記（`architecture.md` / `component-inventory.md` / `api-documentation.md` / `code-structure.md` / `code-quality-assessment.md` / `business-overview.md` / `dependencies.md`）+ `reverse-engineering-timestamp.md`（本節）+ `re-scans/260818-priority-bug-batch-4.md`（新規）
- **無変更のまま残した artifact 1 面**: `technology-stack.md`。区間で外部依存・ランタイム・リンター・型検査・テストランナーのいずれも変化しておらず（`git diff --stat 23d4ae767..127be70c5 -- package.json bun.lock '**/package.json'` → 空出力・exit 0、`.github/` → 空 diff・exit 0）、新規モジュールもゼロであるため、書き足す実測が存在しない。同ファイルの現在時制マーカーは 260816-priority-bug-batch-3 節に残る（`cid:reverse-engineering:c1` の降格義務は追記時に発火するため、追記しない面では発火しない）
- 構造補修: 直前 intent `260817-inception-cost-batch` の現在時制マーカー **7 件**を履歴へ降格（追記した 7 面。本文と行番号は保持、`cid:reverse-engineering:c1`）。降格対象の列挙述語は `grep -n "^## .*、現在、" *.md`（対象 = 本 codekb ディレクトリの 9 面、追記前）→ **8 行**、うち追記した 7 面を降格し `technology-stack.md` の 1 行は上記理由により保持
- Per-intent record: `re-scans/260818-priority-bug-batch-4.md`

## 実行メタデータ（履歴: 260817-inception-cost-batch）

- Date: `2026-08-17`（UTC）
- Intent: `260817-inception-cost-batch`
- Repository: `amadeus`（単一 repo、root `/Users/j5ik2o/orca/workspaces/amadeus/fix-0818-2`）
- Scope / depth / project type: `self-feature` / Standard / Brownfield
- Base commit: `89053172ed8b5bb270e254aea029a13291d10b6b`（前回 observed = 260816-priority-bug-batch-3。祖先性 `git merge-base --is-ancestor 89053172ed8b5bb270e254aea029a13291d10b6b HEAD` → **exit 0**、本 synthesis の再実行）
- Observed commit: `23d4ae767956cd56fc28fa78abe28096712eff8a`（`git rev-parse HEAD` = `git rev-parse origin/main`、drift 0。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Distance: **12** コミット（`git rev-list --count 89053172e..23d4ae767`、本 synthesis の再実行）
- Scope of scan: **差分リフレッシュ 89053172e..23d4ae767（12 コミット）、focus は #3181 / #2415 の機構面**
- 差分規模: `git diff --shortstat 89053172e..23d4ae767` → **123 files changed, 8023 insertions(+), 351 deletions(-)**。コード面（`-- ':(exclude)amadeus/spaces/**' ':(exclude)metrics/**'`）は **32 files / +3,062 −339**。`--name-status` の分類は **A 82 / M 41 / D 0**（いずれも本 synthesis の再実行）
- Focus: [#3181](https://github.com/amadeus-dlc/amadeus/issues/3181)（Issue 証跡を requirements-analysis の一級上流入力にする）/ [#2415](https://github.com/amadeus-dlc/amadeus/issues/2415)（reverse-engineering のスキャン入力から workflow exhaust を除外する）
- 区間内容の帰属: **前 intent `260816-priority-bug-batch-3` の 5 unit 全着地**（#3152 → PR #3173 / #3153 → #3175 / #3149 → #3172 / #3156 → #3174 / #3046 → #3171）と、各 PR 直後の metrics snapshot 5 件、record checkpoint 2 件。**前スキャンが記した 5 欠陥はすべて是正済み**
- 構造変化: **なし**。`git diff --name-status 89053172e..23d4ae767 -- packages/ plugins/ docs/ .github/` は **14 行すべて `M`**（新規 0 / 削除 0）。`packages/framework/harness/` / `.github/` / `package.json`・`bun.lock`・`**/package.json` はいずれも**空 diff・exit 0**（本 synthesis の再実行）
- 公開契約の変化: audit イベント基数 pin は **98 で不変**（`git grep -n "EXPECTED_CANONICAL_COUNT).toBe" 23d4ae767 -- tests/integration/event-registry-drift.test.ts` → `:51 toBe(98)`）。**属性は 2 イベントで変化** — `INTENT_AUTONOMY_HUMAN_REQUIRED` の `requiredAttributes` に `"Idempotency Key"`、`GATE_APPROVED` の `optionalAttributes` に `"Approval Provenance"`（`packages/framework/core/otel/event-registry.ts`、正本 `knowledge/amadeus-shared/audit-format.md` と `docs/reference/12-state-machine{,.ja}.md` を同一区間で同期）。CLI verb / config leaf / harness / CI は不変
- 内部 export の増加: **7 シンボル** — `ProductionStageAutonomyInput`（`amadeus-intent-autonomy-production.ts:293`）/ `GateOpenRefusalInput`（同 `:419`）/ `recordAutonomyRefusalAtGateOpen`（同 `:432`）/ `isMilestoneInteraction`（`amadeus-intent-autonomy.ts:762`）/ `GateApprovalProvenance`（`amadeus-lib.ts:3912`）/ `GateResolutionPresence`（同 `:3958-3960`）/ `resolveGateResolutionPresence`（同 `:3967-3981`）
- 中核知見（区間の 4 機構）: **gate 解決 presence** — presence 判定が bool から判別ユニオンへ（`amadeus-lib.ts:3967-3981`）、autonomy の `humanRequired` × interaction kind が窓幅の入力になり（`amadeus-state.ts:3896-3897`）、通した分岐が `GATE_APPROVED` の `Approval Provenance` へ刻まれる。**autonomy 拒否の記録** — 発行点が読み取り時から gate 提示時へ移動（`amadeus-state.ts:3811` → `amadeus-intent-autonomy-production.ts:432-450`）、冪等鍵は `(occurrence, mode, presentationEpoch)`（`:442-446`）。**pr-convergence** — 束縛環境は receipt が決め kind は決めない（sensor `amadeus-sensor-pr-convergence-report-format.ts:322-338`）、final verdict は payload 不変のまま在所最終化（CLI `:1110` / `:1126`）。**election store** — D-09 改訂で `arrivalSequence` は voter 単位一意、全順序は読み時の `(arrivalSequence, voter)` 比較（`amadeus-election-store.ts:17-31` / `:550-556` / `:582` / `:1104`）。**source-work probe** — 4 番目の probe が trunk fork point 起点で birth より前を見る（`amadeus-state.ts:2660` / `:2625`）
- Focus の中核知見: **#2415** — RE 契約（`packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md`、237 行）は `:20` 逐語 `consumes: []` で何も consume せず、入力面を定義するのは `:104-112` のスキャン対象列挙のみ（`:81-95` の Preflight は base 更新方針であって入力面ではない）。**除外規則は不在**（`git grep -n -iE "exclude|excluded|exclusion|workflow exhaust|process record"` → **exit 1**）。区間実測では挿入 8,023 行中 **4,955 行（61.76%）/ 88 ファイル**が workflow exhaust。**`amadeus/spaces/**` の前方一致で除外すると TLA ビルド台帳 2 ファイル（`specs/tla/model-map.json` +3 −3 / `specs/tla-evidence/fb1029e4….json` +1）を巻き添えにする**。**#3181** — RA 契約（同 `requirements-analysis.md`、217 行）の `consumes:` は `:14-29` の 6 件で Issue 由来ゼロ、issue 的入力は `:71` が読む audit shard の散文のみ。artifact のレジストリファイルは存在せず規約で解決される（`amadeus-orchestrate.ts:2378-2400`）が、**producer 不在の consume は graph の hard error**（`amadeus-graph.ts:1192-1198`）。GitHub の read path は既存（`amadeus-github-gateway.ts:175-180` `viewArgv` / `:418-446` `parseIssueObject` / `:799-830` `readiness`）
- 品質指標: coverage **93.39685 → 93.39886**（**+0.0020pp**、前区間の −0.0225pp から反転）、hits/lines **95474/102224 → 95788/102558**（+314/+334 = 新規行の被覆率 約 94.0%、派生値）、test files 1045 → 1047、assertions 13891 → 13939、loc core 148956 → 149387、loc tests 384400 → 386333、複雑度 関数 7295 → 7320 / 閾値超過 **32 → 32**（横ばい）、**open bugs 11 → 13**（closed は 387 で不変 = 区間 5 件のクローズは snapshot より後）。測定元は区間境界の metrics snapshot JSON（`metrics/2026-08-16T20-57-24-618Z-2555e5b42914.json` / `metrics/2026-08-17T12-24-08-673Z-0b652d2cd1a6.json`）の `collectors.<name>.values` 直読（本 synthesis の再実行）
- 台帳: **5 クラスすべてが同一区間内で resync 済み** — `tests/.coverage-registry.json` +23 −6 / `tests/.coverage-patch-allowlist.json` +34 −1 / `tests/.coverage-ratchet.json` +2 −2 / `tests/no-silent-drop/approval.json` +9 −1（新規 ULID event `01M06XDWGXGY27WD0XSET1R3Q0.json` +13）/ `amadeus/spaces/default/specs/tla/model-map.json` +3 −3（impl ハッシュピン **3 箇所**）+ `specs/tla-evidence/…` +1
- 上流入力の訂正 1 件: Developer scan §3 は `tests/unit/t206-source-work-intent-span.test.ts` を「1 new unit suite」と記すが、**新規ではなく既存ファイルの拡張**である（`git diff --name-status` → **`M`**、base に 402 行で実在 → observed 569 行、+167 −0）。unit 層の総数が base / observed とも **432** で不変であることが裏づける。**区間の新規テストスイートは integration 2 本のみ**（t3149 +739 / t3046 +348、ヘルパ `tests/helpers/election-append-race-child.ts` +72）
- 上流入力への追補 1 件: Developer scan §3 は台帳を「4 クラス」と数えているが、**TLA の `model-map.json` / `tla-evidence` を含めると 5 クラス**である。この 2 面は `amadeus/spaces/` 配下にあるため #2415 の除外述語で誤除外されやすい
- 未検証面: focus 2 件の是正方式は**本スキャンでは一切決めていない**（後続の裁定事項、`memory/team.md` P1）。テスト実行・`bun run build`・coverage・TLC はいずれも未実行（本スキャンは読取専用）。仮説として明示した 2 点（#2415 の除外規則の挿入点が Preflight ではなく Step 2 入力列挙付近であること、#3181 が 3 つ目の read-only gateway adapter として実装されること）はいずれも未検証
- Verification: git 状態変更（commit / branch / checkout / stash / merge / fetch）・GitHub 読書き・engine/state ツール実行（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）・`bun run build`・テスト実行は**すべてゼロ**。書き込みは `amadeus/spaces/default/codekb/amadeus/` 配下のみ
- Updated artifacts: 本体 **7 面**に本 intent の節を追記（`architecture.md` / `component-inventory.md` / `api-documentation.md` / `code-structure.md` / `code-quality-assessment.md` / `business-overview.md` / `dependencies.md`）+ `reverse-engineering-timestamp.md`（本節）+ `re-scans/260817-inception-cost-batch.md`（新規）
- **無変更のまま残した artifact 1 面**: `technology-stack.md`。区間で外部依存・ランタイム・リンター・型検査・テストランナーのいずれも変化しておらず（`git diff --stat 89053172e..23d4ae767 -- package.json bun.lock '**/package.json'` → 空出力・exit 0、`.github/` → 空 diff・exit 0）、新規モジュールもゼロであるため、書き足す実測が存在しない。同ファイルの現在時制マーカーは 260816-priority-bug-batch-3 節に残る（`cid:reverse-engineering:c1` の降格義務は追記時に発火するため、追記しない面では発火しない）
- 構造補修: 直前 intent `260816-priority-bug-batch-3` の現在時制マーカー **7 件**を履歴へ降格（追記した 7 面。本文と行番号は保持、`cid:reverse-engineering:c1`）。降格対象の列挙述語は `grep -n "^## .*、現在、" *.md`（対象 = 本 codekb ディレクトリの 9 面、追記前）→ **8 行**、うち追記した 7 面を降格し `technology-stack.md` の 1 行は上記理由により保持
- Per-intent record: `re-scans/260817-inception-cost-batch.md`

## 実行メタデータ（履歴: 260816-priority-bug-batch-3）

- Date: `2026-08-17`
- Intent: `260816-priority-bug-batch-3`
- Repository: `amadeus`（単一 repo、root `/Users/j5ik2o/orca/workspaces/amadeus/bugfix-0817-1`）
- Scope / depth / project type: `self-fix` / Minimal / Brownfield
- Base commit: `5c5911ee3f107152c3173701caf178a746b6e3aa`（前回 observed = 260816-open-bug-batch-7。祖先性 `git merge-base --is-ancestor 5c5911ee3f107152c3173701caf178a746b6e3aa HEAD` → **exit 0**、本 synthesis の再実行）
- Observed commit: `89053172ed8b5bb270e254aea029a13291d10b6b`（`git rev-parse HEAD`。`origin/main` と**同一コミット**で drift 0 — Developer scan §0.1 が `git rev-list --count` の双方向 0 を実測。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Distance: **15** コミット（`git rev-list --count 5c5911ee3..89053172e`、本 synthesis の再実行）
- 差分規模: `git diff --shortstat 5c5911ee3 89053172e` → **229 files changed, 6597 insertions(+), 17613 deletions(-)**。非 record 面（`-- ':!amadeus/' ':!metrics/'`）は **65 files / +689 −17509**。`--name-status` の分類は **A 118 / D 11 / M 100**（いずれも本 synthesis の再実行）
- 削除が挿入を大きく上回る区間: 削除 17,509 行の大半は #3155（no-silent-drop bootstrap provenance の退役）による fixture 削除（`tests/no-silent-drop/bootstrap/*.json` 群と `bootstrap-provenance.json`。Developer scan §1.3 の `--numstat` 上位表からの転記）
- Scope of scan: **差分リフレッシュ**（base..observed 全域の棚卸し + 対象 5 バグ領域の深掘り）
- Focus: オープンバグ 5 件 — [#3153](https://github.com/amadeus-dlc/amadeus/issues/3153)（autonomy の `human-required` 宣言が承認可否に効かない）/ [#3152](https://github.com/amadeus-dlc/amadeus/issues/3152)（`INTENT_AUTONOMY_HUMAN_REQUIRED` が読み取りごとに 1 行 append）/ [#3149](https://github.com/amadeus-dlc/amadeus/issues/3149)（pr-convergence の `converged` 閉路と祖先孤児化）/ [#3156](https://github.com/amadeus-dlc/amadeus/issues/3156)（`workspace_requires` ガードの 3 プローブが record 後追い形状を取りこぼす）/ [#3046](https://github.com/amadeus-dlc/amadeus/issues/3046)（election store の read-then-write TOCTOU）
- 区間内容の帰属: 主体は intent `260816-open-bug-batch-7` の 3 unit 着地（#3155 / #2363 / #3097 = PR #3157 / #3161 / #3158）と `260815-rfc-autonomy-modes` の R-22 修正（#3146）。**本 intent の #3149 は区間内の `03fcd00ec`（`chore(record): checkpoint intent 260815-rfc-autonomy-modes — code-generation park at #3149`）で明示的に park された当の欠陥**であり、未修正のまま持ち越されている
- 構造変化: **なし**。`git diff --name-status 5c5911ee3 89053172e -- packages/framework/core/tools/` は新規 0 / 削除 0 / **変更 4**（`amadeus-intent-autonomy.ts` / `amadeus-sensor-self-scope-consistency.ts` / `amadeus-state.ts` / `data/self-install-allowlist.ts`）。`plugins/` と `packages/framework/harness/` はいずれも**空 diff・exit 0**（本 synthesis の再実行）
- 公開契約の変化: **実質なし**。audit イベント基数 pin は **98 で不変**（`git grep -n "EXPECTED_CANONICAL_COUNT).toBe" 89053172e -- tests/integration/event-registry-drift.test.ts` → `:51 toBe(98)`、本 synthesis の再実行）。CLI verb / config leaf / plugin / harness は不変。`.github/workflows/ci.yml` の +1 行（self-install 面リストへの `.pi` 追加）のみ
- 中核知見（5 バグ）: **#3153** — `assertHumanPresentForGateResolution`（`amadeus-state.ts:3721-3772`）で autonomy が返す `authorizationReason` が制御フロー上どこにも読まれず、承認可否は `humanActedSinceGate`（`amadeus-lib.ts:3926-3941`）1 本が単独で決める。接合部の所在は `:3755-3756` と `:3761` の間。**#3152** — `emitAuthorizationRefusal`（`amadeus-intent-autonomy-production.ts:354-370`）の唯一のガードは `REFUSAL_REASONS`（`:333`）の閉語彙照合だけで occurrence 冪等鍵が無く、監査コーパスで **372 行 / distinct idempotencyKey 372**（本 synthesis の再実行、述語は re-scan §2.2）。**#3149** — CLI の `transitionAllowed`（`pr-convergence-cli.ts:610-617`）が `converged` を final と定義する一方、sensor（`amadeus-sensor-pr-convergence-report-format.ts:294` / `:331-334`）は non-landed kind へ live-head 一致を要求する正面衝突。**#3156** — 3 プローブ（`amadeus-state.ts:2511` / `:2556` / `:2595`）がすべて `intentBirthCommit`（`:2498`）起点で、record 初コミットがコードコミットより後の形状を原理的に取りこぼす。**#3046** — `appendPending`（`amadeus-election-store.ts:1032-1092`）が全体読み（`:1042`）→ max+1 採番（`:1063`）→ 自 voter ファイルのみ書き（`:1088`）で、`readAllPending` の一意性検査（`:545-547`）が衝突永続化後に恒久 `err("corrupt")` を返す
- 品質指標: coverage **93.41934 → 93.39685**（**−0.0225pp**）、test files 1044 → 1045、assertions 13879 → 13891、loc core 148942 → 148956、loc tests **401163 → 384400**（−16763、#3155 の fixture 削除）、複雑度閾値超過 **32 → 32**（横ばい）、**open bugs 4 → 11**（+7）。測定元は区間境界の metrics snapshot JSON（`metrics/2026-08-16T11-04-41-875Z-3e1c6a19ed5b.json` / `metrics/2026-08-16T20-57-24-618Z-2555e5b42914.json`）の `collectors.<name>.values` 直読（本 synthesis の再実行）
- 台帳: 区間内で `model-map.json` **+2 −2**（`amadeus-state.ts` 変更への impl ハッシュピン resync）/ `coverage-patch-allowlist.json` **+0 −11**（削除のみ）。`coverage-registry.json` と `complexity-baseline.json` は**無変更**
- 上流の未決事項を 1 件解消: Developer scan §1.7 / §5 が「新規テスト 1 件（t2363）が入ったのに registry が regen されていない」を要確認としていたが、**regen 不要が正しい**。registry の `unitClasses` は `["function","audit","scope","stage","hook","subcommand","render-surface"]` の 7 クラスで `contract` を含まず（`bun -e` による JSON 直読、exit 0）、t2363 の `covers:` は `contract:pi-self-install-delivery` 1 件のみ（`sed -n '1,6p'`）。`grep -c '"contract:' tests/.coverage-registry.json` → **0**（exit 1 = エラーなく不一致）。すなわち enumeration universe に寄与しない
- 未検証面: 5 件の是正方式は**本スキャンでは一切決めていない**（後続の裁定事項、`memory/team.md` P1）。テスト実行・`bun run build`・coverage・#3149 の閉路の実再現はいずれも未実行（本スキャンは読取専用）
- 申し送り（重要）: `cid:code-generation:oq-singleton` により degrade スコープ（`self-fix`）は construction 配下の unit ディレクトリを**ちょうど 1 つ**であることを要求するため、**5 バグを 1 intent に載せる本構成では units-generation / delivery-planning を EXECUTE するか `cid:code-generation:multiunit-pr-procedure` の per-unit PR 定型に従う必要がある**。あわせて #3153 と #3152 は同一の呼び出し鎖（`amadeus-state.ts:3744` → `productionStageAutonomy:295` → `emitAuthorizationRefusal:314`）を共有し、#3156 も同一ファイル `amadeus-state.ts` を触るため、この 3 件は write scope の直列化が要る
- Verification: git 状態変更（commit / branch / checkout / stash / merge / fetch）・GitHub 読書き・engine/state ツール実行（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）・`bun run build`・テスト実行は**すべてゼロ**。書き込みは `amadeus/spaces/default/codekb/amadeus/` 配下のみ
- Updated artifacts: 本体 8 面すべてに本 intent の節を追記 + `reverse-engineering-timestamp.md`（本節）+ `re-scans/260816-priority-bug-batch-3.md`（新規）
- 構造補修: 直前 intent `260816-open-bug-batch-7` の現在時制マーカー **8 件**を履歴へ降格（`api-documentation.md` / `architecture.md` / `business-overview.md` / `code-quality-assessment.md` / `code-structure.md` / `component-inventory.md` / `dependencies.md` / `technology-stack.md`。本文と行番号は保持、`cid:reverse-engineering:c1`）。降格対象の列挙述語は `grep -n "^## .*、現在、" *.md`（対象 = 本 codekb ディレクトリの 9 面、追記前）→ **8 行**
- Per-intent record: `re-scans/260816-priority-bug-batch-3.md`

## 実行メタデータ（履歴: 260816-open-bug-batch-7）

- Date: `2026-08-16`
- Intent: `260816-open-bug-batch-7`
- Repository: `amadeus`（単一 repo、root `/Users/j5ik2o/orca/workspaces/amadeus/gh-issue`）
- Scope / depth / project type: `self-fix` / Minimal / Brownfield
- Base commit: `83e1dbeefb3278a00e86f69d3c79071a35ccf043`（前回 observed = 260815-stale-epoch-landed。祖先性 `git merge-base --is-ancestor 83e1dbee HEAD` → **exit 0**）
- Observed commit: `5c5911ee3f107152c3173701caf178a746b6e3aa`（`git rev-parse HEAD`、`origin/main` 一致断面。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Distance: **28** コミット（`git rev-list --count 83e1dbee..HEAD`）
- 差分規模: `git diff --shortstat 83e1dbee HEAD` → **399 files changed, 22808 insertions(+), 1198 deletions(-)**。非 record 面（`-- ':!amadeus/' ':!metrics/'`）は **165 files / +11114 −1126**。テストは `tests/**` 全域で **90** ファイル = 新規 **30** / 変更 **59** / 削除 **1**（`--diff-filter=A|M|D -- 'tests/**'`。削除は `tests/integration/t456-question-carveout-predicate.test.ts`、commit `7516194519`（interactive-carveout unit / PR #3137）由来）
- Scope of scan: **差分リフレッシュ**（base..observed 全域の棚卸し + 対象 3 バグ領域の深掘り）
- Focus: オープンバグ 3 件 — [#2363](https://github.com/amadeus-dlc/amadeus/issues/2363)（pi persona charter が dogfood self-install へ配布されない）/ [#2162](https://github.com/amadeus-dlc/amadeus/issues/2162)（no-silent-drop bootstrap provenance の到達不能 revision）/ [#3097](https://github.com/amadeus-dlc/amadeus/issues/3097)（`docs/reference/07-sensor-system.md` のセンサー列挙 drift）
- 区間内容の帰属: 主体は intent `260815-rfc-autonomy-modes`（RFC-0001 intent autonomy modes、Issue #3116）の**全 unit 着地**。unit 数は **13**（`ls amadeus/spaces/default/intents/260815-rfc-autonomy-modes/construction/ | grep -v -x -e code-generation -e functional-design -e nfr-design | wc -l`）。あわせて #3110 の是正 PR #3113（`8ceeb2dc18`）、RFC 0002 ドラフト（#3126）、metrics snapshot 12 件が区間に含まれる
- 構造変化: 新規 core tool **5 本**（`amadeus-autonomy-status-facet.ts` / `amadeus-completion-report.ts` / `amadeus-merge-provenance.ts` / `amadeus-recommendation.ts` / `amadeus-waiting.ts`）、既存 core tool 21 本が変更（`git diff --name-status 83e1dbee..HEAD -- packages/framework/core/tools/` の `^A` / `^M`）。**パッケージ追加・ディレクトリ移動はゼロ**、`packages/framework/core/` と `packages/framework/harness/<name>/` の境界は不変。`.github/` は **0 件**変更
- 公開契約の変化: audit イベント **5 件**追加（`DELEGATED_MERGE_RECORDED` / `LEARNING_CANDIDATE_ADDED` / `LEARNING_ZERO_CONFIRMED` / `WORKFLOW_WAITING_ENTERED` / `WORKFLOW_WAITING_RESUMED`）で基数 pin は **93 → 98**（`tests/integration/event-registry-drift.test.ts:51`）。`solo-election.trigger.mode` は config leaf として廃止され Intent Autonomy Mode からの派生になった（`amadeus-config.ts:658` / `:685`）。新規 CLI `amadeus-merge-provenance record`（record-only、git / GitHub に触れない）
- 中核知見（3 バグ）: **#2363** — self-install 配布経路の集合定義が **3 重**（`plugin-projection.ts:59` の `SELF_INSTALL_HARNESSES` / `promote-self.ts:64-71` の `managedDirs` / `self-install-allowlist.ts:12-19` の `GENERATED_SELF_INSTALL_ROOTS`）で、pi はいずれにも不在。ガード（`t531:143-148`）は「self-install ⊆ package」の**片方向のみ**。実害は `frontmatterAdditions` の read-only allowlist 1 点に絞られ（charter 本体と model ピンは driver の `PERSONA_CHARTER_DIRS` fallback で解決）、外部導入経路は無傷。**#2162** — `baseline.json` は ULID event 台帳へ移行済み（`events/` **222** 件、`baseline.json` は不在）。残る実体は (i) `postRevision` に git 到達性検査が無い（消費点は `bootstrap.ts:358` → `:283` の文字列等値のみ）(ii) `ledger.ts:226-227` / `:301-302` が不在ファイルを指す死んだ経路（negative test `no-silent-drop-gate.test.ts:839` が固定）。Issue 本文の 3 不整合のうち 2 つは移行で消滅済み。**#3097** — 07 の `matches` 表（`:200-208`、9 行）に対し `matches` 宣言を持つ manifest は **13** 件で、欠落 4 件・値の陳腐化 2 行。同期先は Issue が書く 14 ではなく **13**（`amadeus-git-drift.md` は `matches` 非宣言、07 自身の `:210-212` と矛盾するため）
- codekb からの引用可能性: `07-sensor-system` は本 intent 以前の 9 面すべてで **0 hit**（`grep -c "07-sensor-system" *.md` → 全 0、exit 1）だった。本 intent で `component-inventory.md` §D と `code-structure.md` に収載し、後続ステージが引ける状態にした。`promote-self` / `no-silent-drop` は既存収載あり
- 品質指標: coverage **93.3805 → 93.4193**（+0.0388pp）、test files **1017 → 1044**、assertions **13600 → 13879**、loc core **146600 → 148942**、複雑度閾値超過 **32 → 32**（横ばい）、open bugs **4 → 4**。測定元は区間最初と最後の metrics snapshot JSON（`8ceeb2dc1823` / `3e1c6a19ed5b`）の `collectors.<name>.values` 直読
- 台帳: 区間内で allowlist **+187 行** / registry **+128 行** / model-map **12 行** / complexity-baseline **4 行** / coverage-ratchet **4 行** が resync 済み。是正時の係りは A=allowlist 1 hit（`tests/deletion-gate.ts` の reason 文中）/ B=allowlist 5・registry 3 / C=なし。**いずれの領域も新規テストファイル追加時は registry regen が必須**
- 未検証面: 3 件の是正方式（#2363 の pi 追加と逆向きガードの形、#2162 の修理対象の再定義、#3097 の同期方式）は**本スキャンでは決めていない** — 後続の裁定事項（`memory/team.md` P1）。フルスイート・coverage・`bun run build` はいずれも未実行（本スキャンは読取専用）
- 申し送り（重要）: `cid:code-generation:oq-singleton` により、degrade スコープでは construction 配下の unit ディレクトリが**ちょうど 1 つ**であることを pr-convergence の Delivery Bolt authority が要求する。**3 Issue を 1 intent に載せると 2 つ目の unit を作った時点で report mint が構造的に不成立**になるため、intent 分割か非 degrade スコープの選択が要る
- Verification: git 状態変更（commit / branch / checkout / stash / merge）・GitHub 書込・engine/state ツール実行（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）・`bun run build` は**すべてゼロ**。書き込みは `amadeus/spaces/default/codekb/amadeus/` 配下のみ
- Updated artifacts: 本体 8 面すべてに本 intent の節を追記 + `reverse-engineering-timestamp.md`（本節）+ `re-scans/260816-open-bug-batch-7.md`（新規）
- 構造補修: 直前 intent `260815-stale-epoch-landed` の現在時制マーカー **8 件**を履歴へ降格（`api-documentation.md` / `architecture.md` / `business-overview.md` / `code-quality-assessment.md` / `code-structure.md` / `component-inventory.md` / `dependencies.md` / `technology-stack.md`。本文と行番号は保持、`cid:reverse-engineering:c1`）。あわせて本ファイル下部に残っていた `## 実行メタデータ（最新: 260813-bolt-pr-attestation）` の陳腐化した現在時制マーカー（`最新`）を履歴ラベルへ更新
- Per-intent record: `re-scans/260816-open-bug-batch-7.md`

## 実行メタデータ（履歴: 260815-stale-epoch-landed）

- Date: `2026-08-15`
- Intent: `260815-stale-epoch-landed`
- Repository: `amadeus`（単一 repo）
- Scope / depth / project type: `self-fix` / Minimal / Brownfield
- Base commit: `78146f435a66680055a24144937b5aa03d48bfb4`（前回 observed = 260815-per-unit-outcome。祖先性 `git merge-base --is-ancestor 78146f435a 83e1dbeef` → **exit 0**）
- Observed commit: `83e1dbeefb3278a00e86f69d3c79071a35ccf043`（`origin/main` tip。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Distance: **4** コミット（`git rev-list --count 78146f435a..83e1dbeef`）
- 差分規模: `git diff --shortstat 78146f435a 83e1dbeef` → **110 files changed, 4856 insertions(+), 59 deletions(-)**。非 record 面は `-- ':!amadeus/' ':!metrics/'` で **17 files / +565 −37**（内訳: 非テスト 8 + テスト 9。テストは新規 **0** / 変更 9）
- Scope of scan: **差分リフレッシュ**（#3110 の患部面に焦点、加えて base..observed 全域の棚卸し）
- Focus: [Issue #3110](https://github.com/amadeus-dlc/amadeus/issues/3110)（P2 / S3-MAJOR、格上げは FOLLOW-UP）— stale created attestation × MERGED PR に最終化経路がない（report は stale 拒否 / create は新規 PR 誤作成 / override は valid attestation 要求の閉路）
- 区間内容の帰属: 4 コミットは**全量が intent 260815-per-unit-outcome へ帰属**する — PR #3105（`fix(#3099)` settle 経路 + `UNIT_OUTCOME_SETTLED` + テスト t533/t81/t28/t403/t449/t212 + docs + event-registry 92→93 + coverage 台帳）、record checkpoint #3107 / #3111、metrics #3102 / #3108
- 構造変化: **なし**。新規パッケージ・新規モジュール・ディレクトリ移動はゼロ。新規テストファイルもゼロ（`--diff-filter=A -- 'tests/**'` → 0）
- 患部の可動性: `git diff --quiet 78146f435a 83e1dbeef -- plugins/github-pr-convergence/` → **exit 0**（ディレクトリ全域が区間内で無変更）。個別 8 パス（cli / gh-runner / sensor 実装 / stage 文書 / attestation / predicate / t3062 / t448）へも同述語を適用し**全件 exit 0**
- 引用の currency 再検証: #3110 のクロスレビューが引く 5 件を observed 断面で逐語再照合し **5/5 一致** — `pr-convergence-cli.ts:746-748`（stale 文言）/ `:597-604`（`transitionAllowed` の `created → landed`、許可 arm は `:602`）/ `pr-convergence-gh-runner.ts:322`（`"--state", "open"`）/ `amadeus-sensor-pr-convergence-report-format.ts:391-393`（`created proves PR delivery only; …`）/ `stages/pr-convergence.md:344-346`（`A merged pull request needs no ruling — report records it as landed.`）
- 中核知見: **拒否順序が `created → landed` を構造的な dead code にしている**。`runCli` は `selfContextFor`（`:1370`）を verb 分岐（`:1398`）より先に評価し、その先の `currentSelfContext`（`:627`）→ `attestationBindsIdentity`（`:714`）が `receipt.prHead === heads.prHead` を要求する。#3062 が `:597-604` に追加した `created → landed` は verb 分岐の下流にあるため、create 後に head が前進した self record では到達しない。拒否は verb 非依存のため 4 verb すべてがデッドエンドになる。加えて `fetchOpenPrForHead`（gh-runner `:322`）が `--state open` のみを引くため、エラー文言（`:747`）が指示する「create 再実行」は MERGED PR を reuse せず新規 PR を開く
- 機序の一次記録: **Issue #3110 の 2 件のクロスレビューコメント**（reviewer-1 CONFIRMED / reviewer-2 CONFIRMED_WITH_REFINEMENTS、`review-run-id: xrev-3110-20260815T114717Z`、`target-sha: 920790ba7fbaea5f58b5637268782df89e496cc2`）。本スキャンは再導出せず、observed 断面での再照合と codekb への写像に留めた
- 根と規範衝突: 根は PR #3081 の実装逸脱ではなく、**#3062 の選挙（E-260815-3062-LANDED-FINALIZATION）の設問スコープが head-integrity ゲートとの交差を含まなかった**こと（reviewer-2 帰属）。あわせて `team.md` の「record checkpoint 同梱可」（E-260813-RECORD-BUNDLING-NORM 2-0）と CLI の「create 後 head 不動」要求が構造的に両立しない規範衝突を reviewer-1 が FOLLOW-UP として提起（是正設計はどちらの側で解消するかを明示する必要がある = 選挙事項）。原因は同梱に限らず **create 後の任意の追加 push（理由不問）**
- テスト空白（実測）: `grep -rn "attestation is stale" tests/` → **0 行・exit 1**。pr-convergence 系 4 テストの `grep -c "stale"` は t447=0 / t448=0 / t449=**3**（ただし `:254` / `:273` / `:490` はいずれも **bolt-plan** の staleness で無関係）/ t3062=0。t3062 が landed 最終化を覆いながら本件を捕らえない理由は、`:123-124` の単一 seed commit と `:134` の gh スタブ（`"rev-parse HEAD"` が `f.head` を全呼び出しで同一値返却）により **head が構造的に前進しない**ため（同ファイル 285 行、冒頭コメント `:6-11` も想定を auto-merge 先行に限定）
- 台帳の係り: `specs/tla/model-map.json` は `grep -c "github-pr-convergence"` → **0**（resync 不要）/ `tests/.coverage-patch-allowlist.json` は `pr-convergence-cli.ts` に **3 セレクタ**（`nodeDecisionEmitter` / `selfReportLifecycle` / `<module>`）— うち **`selfReportLifecycle` は expiry が逐語 `remove if the lifecycle is ever callable without the currentSelfContext head binding` であり、head 束縛を緩める是正なら削除対象になる** / `tests/.coverage-registry.json` は pr-convergence 2 hit（いずれも t2996）で、新規テストファイル追加時のみ regen（`cid:build-and-test:c1`）
- 同一クラスの残余: `260814-plugins-rename-drift` の 3 unit（#3051 / #3052 / #3055）が record 上 `kind: created` のまま恒久残置（workflow は completed 済みのため停止はしていないが record drift）。`260813-remove-team-up`（#2975）/ `260814-autonomy-stop-fixes`（#3037）は候補（record 内で確定不能）
- 未検証面: 是正方式（report が merged 事実で stale を免除して landed を書く / create が MERGED PR を read-back して landed epoch を mint する / 折衷）の選択は**本スキャンでは決めていない** — 後続の裁定事項（`memory/team.md` P1）。重大度 S3→S1/S2 の格上げも人間裁定事項として未決。フルスイート・coverage・build はいずれも未実行（本スキャンは読取専用）
- Verification: git 状態変更（commit / branch / checkout / stash / merge）・GitHub 書込・engine/state ツール実行・`bun run build` は**すべてゼロ**。GitHub は `gh issue view 3110`（読取のみ）を実行。書き込みは `codekb/amadeus/` 配下のみ
- Updated artifacts: `re-scans/260815-stale-epoch-landed.md`（新規）/ `reverse-engineering-timestamp.md`（本節）/ 本体 8 面すべてに本 intent の節を追記（`architecture.md` / `code-structure.md` / `code-quality-assessment.md` は実質内容、`component-inventory.md` / `dependencies.md` / `api-documentation.md` / `business-overview.md` / `technology-stack.md` は差分デルタの短節）
- 構造補修: 直前 intent `260815-per-unit-outcome` の現在時制マーカー **8 件**を履歴へ降格（`api-documentation.md:2139` / `architecture.md:5399` / `business-overview.md:142` / `code-quality-assessment.md:3782` / `code-structure.md:385` / `component-inventory.md:2806` / `dependencies.md:204` / `technology-stack.md:87`。本文と行番号は保持、`cid:reverse-engineering:c1`）
- Per-intent record: `re-scans/260815-stale-epoch-landed.md`

## 実行メタデータ（履歴: 260815-per-unit-outcome）

- Date: `2026-08-15`
- Intent: `260815-per-unit-outcome`
- Repository: `amadeus`（単一 repo）
- Scope / depth / project type: `self-fix` / Minimal / Brownfield
- Base commit: `9ba8170bb03996fb98b497cfcbac3d207795018d`（前回 observed = 260815-priority-bug-batch-2。祖先性 `git merge-base --is-ancestor 9ba8170bb 78146f435` → **exit 0**）
- Observed commit: `78146f435a66680055a24144937b5aa03d48bfb4`（`origin/main` tip。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Distance: **12** コミット（`git rev-list --count 9ba8170bb..78146f435`）
- 差分規模: `git diff --shortstat 9ba8170bb 78146f435` → **103 files changed, 3091 insertions(+), 182 deletions(-)**。非 record 面は `-- ':!amadeus/' ':!metrics/'` で **40 files / +874 −97**（内訳: 非テスト 12 + テスト 28。テストは新規 4 / 変更 24）
- Scope of scan: **差分リフレッシュ**（#3099 の患部面に焦点、加えて base..observed 全域の棚卸し）
- Focus: [Issue #3099](https://github.com/amadeus-dlc/amadeus/issues/3099)（P1）— per-unit run-stage で完走した Construction が `producer-outcome-pending` で build-and-test へ到達不能
- 構造変化: **なし**。新規パッケージ・新規モジュール・ディレクトリ移動はゼロ。コア実装の変更は PR #3101 の 4 ファイル（`amadeus-election.ts` +21/−5、`amadeus-graph.ts` +30/−6、`amadeus-lib.ts` +16/−4、`amadeus-utility.ts` +1/−1）のみ
- 患部の可動性: 患部 5 ファイル（`amadeus-orchestrate.ts` / `amadeus-construction-outcome-projection.ts` / `amadeus-unit-pool-runtime.ts` / `amadeus-per-unit-consume-fanout.ts` / `amadeus-swarm.ts`）へ `git diff --quiet 9ba8170bb 78146f435 -- <path>` を個別適用し、**全 5 件 exit 0**（区間内で無変更）
- 中核知見: **Construction 成果の読み口が 2 系統に割れている**。正準射影 `amadeus-construction-outcome-projection.ts:222-228` は 5 イベント（`UNIT_POOL_EVENT_SET_COMMITTED` / `BOLT_STARTED` / `BOLT_COMPLETED` / `BOLT_FAILED` / `SWARM_BATON_RETURNED`）を読み、`amadeus-orchestrate.ts` の 4 消費点が使う。対して per-unit fanout の母集団取得 `readPerUnitConsumePopulation`（`:2447-2473`）は `UNIT_POOL_EVENT_SET_COMMITTED` **1 種のみ**を読む。pool の単一 writer は `amadeus-unit-pool-runtime.ts:152-161` で、変異源は `amadeus-swarm.ts` の 9 call site と `amadeus-orchestrate.ts:6586` のみ。**per-unit dispatch 経路（`emitPerUnitRunStage` `:4574-4725`）は pool へ一切書かない**（同範囲 `grep -n "UnitPool\|unitPool\|UNIT_POOL"` → exit 1 / 0 hit）ため、母集団が空のまま `amadeus-per-unit-consume-fanout.ts:224-228` が `producer-outcome-pending` で fail-closed する
- 新規に確定した再現条件: `amadeus-lib.ts:8416` 逐語 `if (pendingBatch === null || pendingBatch.units.length < 2) return { kind: "ok" };` — **幅 1 のバッチは autonomy に関わらず plan-integrity redirect を素通り**するため、直列な Unit 計画は必ず per-unit dispatch へ落ちる。受け入れ基準はこの条件を符号化する必要がある
- 保存すべき不変量: `amadeus-orchestrate.ts:2461-2463` 逐語 `if (!currentUnits.has(terminal.unitId)) continue;`（バッチ所属フィルタ）
- テスト空白: `grep -rln "readPerUnitConsumePopulation" tests/` → **1 ファイルのみ**で、その中の seeding 4 箇所（`:150` / `:326` / `:363` / `:411`）は**すべて pool 経路**。非 pool 由来の母集団を張るテストはゼロ件であり、#3099 のシナリオに対応する再現テストは存在しない
- 上流報告からの訂正（申し送り）: (a) t533 のケース数は unit **8** / integration **14**（`grep -c 'test("\|it("'`）であり、上流報告の「9 / 15」と一致しない (b) 区間の変更テストは 23 ではなく **24**（`git diff --name-only --diff-filter=M -- 'tests/**' | wc -l`） (c) `planIntegrityVerdict` の定義行は `:8412`（幅判定は `:8416`）
- 未検証面: 是正方式（(a) fanout 側で正準射影を読む / (b) per-unit 経路から pool イベントを発行する / (c) 折衷）の選択は**本スキャンでは決めていない** — 後続の裁定事項（`memory/team.md` P1）。フルスイート・coverage・build はいずれも未実行（本スキャンは読取専用）
- Verification: git 状態変更（commit / branch / checkout / stash / merge）・GitHub 書込・engine/state ツール実行・`bun run build` は**すべてゼロ**。書き込みは `codekb/amadeus/` 配下のみ
- Updated artifacts: `re-scans/260815-per-unit-outcome.md`（新規）/ `reverse-engineering-timestamp.md`（本節）/ 本体 8 面すべてに本 intent の節を追記（`architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` は実質内容、`api-documentation.md` / `dependencies.md` / `technology-stack.md` / `business-overview.md` は差分デルタの短節）
- 構造補修: 直前 intent `260815-priority-bug-batch-2` の現在時制マーカー **4 件**を履歴へ降格（`architecture.md:5353` / `code-structure.md:343` / `component-inventory.md:2776` / `code-quality-assessment.md:3726`。本文と行番号は保持、`cid:reverse-engineering:c1` / `c3-relabel`）
- Per-intent record: `re-scans/260815-per-unit-outcome.md`

## 実行メタデータ（履歴: 260815-priority-bug-batch-2）

- Date: `2026-08-15`
- Base commit: `a49f9e9fdbd19fd40e9374feba77e9360771d173`（observed の祖先で距離**最小**。`git merge-base --is-ancestor a49f9e9fd HEAD` → **exit 0**、`git rev-list --count a49f9e9fd..HEAD` → **9**。対抗候補 `d64fd7cac`（直前 intent の observed）は距離 **10** で劣る。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `9ba8170bb03996fb98b497cfcbac3d207795018d`（本 worktree HEAD = `git rev-parse HEAD` → 同一値。`origin/main` 系譜のコミット。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`
- Focus: 優先バグ 4 件 — [#3077](https://github.com/amadeus-dlc/amadeus/issues/3077)（単一 question 選挙の hold 再 tally が構造的に commit 不能）/ [#3074](https://github.com/amadeus-dlc/amadeus/issues/3074)（`assertRecomposeAllowed` が phase・swarm を見ない）/ [#3075](https://github.com/amadeus-dlc/amadeus/issues/3075)（時間予算アサーションの全数棚卸し）/ [#3079](https://github.com/amadeus-dlc/amadeus/issues/3079)（t224 symlink ケースの timeout 未宣言）+ base..observed の差分全域
- Scan mode: **通常の差分リフレッシュ**（xrev differential 不採用。理由は `re-scans/260815-priority-bug-batch-2.md` §1）
- 差分規模: `git rev-list --count a49f9e9fd..HEAD` → **9** コミット。`git diff --stat a49f9e9fd HEAD -- ':!amadeus/' ':!metrics/'` → **10 files changed, 332 insertions(+), 67 deletions(-)**
- 構造変化: **なし**。非 `amadeus/` の実体変化は PR [#3076](https://github.com/amadeus-dlc/amadeus/pull/3076)（test-signal バグ 4 件の修正）と PR #3072（autonomy 修正）の 2 本のみで、残る 7 コミットは record / RFC / metrics / ノルム文書である。パッケージ境界・エンジン・state 機械はいずれも無変更。唯一の新規コンポーネントは `packages/framework/core/tools/amadeus-migrate-git.ts`（**32 行**、`wc -l` および `git log --numstat --diff-filter=A` がともに 32）
- 中核知見: **#3077** — 生産側 `amadeus-election.ts:451` と検証側 `amadeus-election-store.ts:728-729` が `preservedResultDigest` に**逆の真理値を要求**する。全 question を再 tally する run では store が `null` を要求し、生産側は `currentTally !== null` の枝で必ず非 null を書くため commit が決定的に `history-mismatch` で落ちる。単一 question 選挙は「hold → 再 tally」が必然的にこの条件へ入るため恒常的に不能。**#3074** — `amadeus-lib.ts:564-573` は autonomy 一値のみの純射影で、拒否文言が Construction を名指すのに phase を判定材料に持たない。phase は呼び出し側（`amadeus-utility.ts:5793` が state 全文 `content` を保持）から渡せるが、swarm in-flight は **state に一切フィールドが無い**（`git grep -nE "[Ss]warm" -- amadeus-state.ts` → 5 hit がすべてコメント）ため監査シャード走査という新しい読取面を要する。**#3075** — 現存 **24 行**（述語は `re-scans` §3）。ただし Issue が「単位要確認」と留保した `t487-stage-stats.integration.test.ts:426` は **ミリ秒ではなく秒**である（`:424` で `/1000` 済み = 60 秒の上限）。**#3079** — 主因は migrate CLI の spawn 回数ではなく**監査ロック取得予算**（`amadeus-audit.ts:1011-1014` の既定 200×100ms = 20 秒）で、既存の `AMADEUS_AUDIT_LOCK_RETRIES` env がそのまま短縮シームになる
- 上流報告からの訂正（申し送り）: (a) `amadeus-migrate-git.ts` は 31 行ではなく **32 行** (b) t487:426 の 60 は ms ではなく**秒**であり、A 群（最短 250ms）への再分類は成立しない — 実際には最も余裕のある C 群側の値である (c) 患部の行ピン 2 件がずれている — `amadeus-election.ts` の digest 生産は `:450` ではなく **`:451`**、`amadeus-election-store.ts` の全 question 分岐は `:727-729` ではなく **`:728-729`**（いずれも `grep -n` で再取得） (d) observed は本スキャン時点で `origin/main`（`0901182c7`）と**同一ではない**（祖先、距離 3。非 `amadeus/` の差分 7 ファイル）。詳細と帰属は `re-scans/260815-priority-bug-batch-2.md` §2 / §4
- 未検証面: #3075 の A/B/C 再分類のうち「負荷下実測の倍率」は未測定（本スキャンは現存箇所の列挙と件数、および t487 の単位のみを実測）/ #3074 の swarm in-flight を監査シャードから導出できるかは、イベント名を持つファイルの特定までで実際の可読性は未確認 / 既存テストスイートのベースライン（本スキャンは読取専用でフルスイート未実行）
- Verification: git 状態変更（commit / branch / checkout / stash / merge）・GitHub 書込・engine/state ツール実行（`amadeus-orchestrate` / `-state` / `-log` / `-bolt`）・`bun run build` は**すべてゼロ**。書き込みは `codekb/amadeus/` 配下のみで、`amadeus/spaces/default/intents/` へは一切書き込んでいない
- Updated artifacts: `re-scans/260815-priority-bug-batch-2.md`（新規）/ `reverse-engineering-timestamp.md`（本節）/ `code-structure.md` / `code-quality-assessment.md` / `architecture.md` / `component-inventory.md`（各 1 節を追記）
- Reviewed-and-unchanged artifacts: `api-documentation.md` / `business-overview.md` / `dependencies.md` / `technology-stack.md`（区間に公開契約・業務境界・依存エッジ・技術スタックの変化がないため本文無変更。見出し行のみ後述の降格・重複削除の対象。実測は `re-scans` §6）。**これら 4 面は本 intent の節を持たないため、後続ステージが本 intent の事実の出典として引くことはできない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）
- 構造補修: 旧 intent 節の現在時制マーカー **18 件**を履歴へ降格（`cid:reverse-engineering:c1`）。あわせて直前リフレッシュが残した**重複 H2 見出し 15 件**を削除した（詳細は `re-scans/260815-priority-bug-batch-2.md` §5）
- Per-intent record: `re-scans/260815-priority-bug-batch-2.md`

## 実行メタデータ（履歴: 260814-open-bug-batch-6）

- Date: `2026-08-15`
- Base commit: `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780`（本 intent に先行スキャンが無いため、`re-scans/` 中で**最も新しい observed commit** を採る規則に従い `260814-park-provenance.md` の observed を base とした。祖先性の実測: `git merge-base --is-ancestor 1d08374cd7e4ef89637b4a8000bab3fcf1a0f780 a49f9e9fdbd19fd40e9374feba77e9360771d173` → **exit 0**。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `a49f9e9fdbd19fd40e9374feba77e9360771d173`（`origin/main` 系譜、PR #3069 の着地コミット。本 worktree HEAD = `git rev-parse HEAD` → 同一値。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`
- Focus: オープンバグ5件 — [#3062](https://github.com/amadeus-dlc/amadeus/issues/3062)（merge queue 着地後に self record の収束 report を最終化できない）/ [#3026](https://github.com/amadeus-dlc/amadeus/issues/3026)（`amadeus-model-completeness.md` が plugin.json 未宣言で投影欠落）/ [#3028](https://github.com/amadeus-dlc/amadeus/issues/3028)（06-sensors のセンサー表が実在集合から drift）/ [#3031](https://github.com/amadeus-dlc/amadeus/issues/3031)（t-worktree-gc の transient 赤）/ [#3032](https://github.com/amadeus-dlc/amadeus/issues/3032)（t214-seam 由来 ERROR_LOGGED の実 record 着地）
- Scan mode: **通常の差分リフレッシュ**（xrev differential 不採用 — 対象 5 Issue の**いずれにもクロスレビュー verdict コメントが存在しない**。述語 `gh issue view <n> --json comments -q '.comments[]...'` を 5 番号へ適用しいずれも**出力 0 行**。凍結された review 断面が無いため currency 判定以前に適用対象外。加えて `cid:reverse-engineering:c5-xrev-currency-schema-migration` が扱う「患部の表現形式を変える移行」が本区間で実在する — 後述の plugin rename）
- 差分規模: `git rev-list --count 1d08374cd..a49f9e9fd` → **24** コミット。`git diff --stat 1d08374cd..a49f9e9fd` 末尾 → **570 files changed, 34878 insertions(+), 7339 deletions(-)**
- 構造変化 4 点: (a) **プラグイン rename** `pr-convergence` → `github-pr-convergence`（PR #3051。ツール 9 件は `R100` = 内容バイト一致で**行番号不変**、stage slug は `pr-convergence` のまま）(b) **新規プラグイン `git-drift`**（PR #3055。センサー 1 件を宣言・投影し、実在集合を 13→14 / 投影を 12→13 へ動かした）(c) `plugin.settings` 機構の新設（PR #3052、`amadeus-plugin-settings.ts` +274 行）(d) 選挙 v2 移行（PR #3036。`amadeus-election-codec/question-tally/transport.ts` 新設、`scripts/amadeus-election-migrate.ts` 削除。**本 Focus は非接触**）
- Focus 患部の差分: `pr-convergence-cli.ts` / センサー実装は**内容不変**（rename のみ）、`plugins/formal-model-check/plugin.json` は**無変更**、`otel/bootstrap.ts` と `otel/audit-emit.ts` と t214 テスト 2 件も**無変更**。変化したのは `docs/harness-engineering/06-sensors(.ja).md`（各 1 行 = rename 追随のみ）、`tests/integration/t-worktree-gc.test.ts`（**+13/-1** = #3031 の部分緩和が着地）、`amadeus-lib.ts`（+19/-6 だが park の presence 分類のみで **emit 経路に非接触**）
- 中核知見: **#3062** — 拒否は `plugins/github-pr-convergence/tools/pr-convergence-cli.ts` の **3 層**（`:823` `writeSelfReport` / `:1260` `reportOutcome` / `:1364` `runConvergence`）に分散し、Issue が引く `:1364` のみの是正では残り 2 層で落ちる。センサー側の `landed` 拒否（`amadeus-sensor-pr-convergence-report-format.ts:368-372`）は Issue の記述と異なり **stage 非依存**で、`created` の拒否のみが `stage === "pr-convergence"` 条件付き（`:378-380`）。非 self record では `:1392-1393` が landed を exit 0 とするため、**self / 非 self で同一事実の扱いが反転**している。**#3026** — `plugin.json` を全文実読し `sensors` キー不在を確定（トップレベルは `name` / `stages` / `seams` / `fragments` / `tools` / `advisories` の 6 キー）。無音化の機構は `amadeus-plugin-compose.ts` の `?? []` フォールバック **4 箇所**（`:554` / `:956` / `:992` / `:1023`）。**#3028** — 表 10 行に対し実在 14 件、欠落は起票時 3 件 → **4 件**（`git-drift` が加わった）。本区間の 06-sensors への唯一の変更が rename 追随 1 行のみで、同一区間に追加された `git-drift` に追随していないことが**固定表 fail-open の再発の実例**。**#3031** — PR #3056 が git ヘルパへ narrow retry を追加済み（発火条件は stderr が `/locked' for writing: No such file or directory` を含むこと）だが、Issue が観測した失敗の stderr は未特定のため**覆うか不明**。受け入れ条件 1（再発時の stderr 捕捉）はむしろ後退した可能性（retry 後のアサーションは 2 回目の stderr を載せる）。**#3032** — 着地 2 行は `amadeus/spaces/default/intents/260807-projectdir-worktree-fix/audit/j5ik2o-mac-studio-lan-d13e4f0ca2c0.jsonl:155-156` に**現存**、リテラルは `tests/unit/t214-engine-error-logged-seam.test.ts:131` / `:158` へ一意帰属。ただし現行バイトでは `assertSameProject` の throw を `emitError` の catch（`amadeus-lib.ts:8102-8105`）が握り潰すため「不一致なら書かれない」が帰結で、**仮説どおりの無音着地は成立しにくい**。当時断面（2026-08-07）での再現が機序特定の必須条件
- 実装時の分母訂正（申し送り）: #3026 の期待投影件数は Issue 本文の「12 → 13」ではなく **13 → 14**、#3028 の docs 表欠落は「3 件」ではなく **4 件**（`amadeus-nfr-budget` / `amadeus-question-budget` / `amadeus-scope-sizing` / `amadeus-git-drift`、各 `grep -c` → 0）。#3031 の行ピンは `:160-175` → **`:172-188`**、失敗点 `:169` → **`:180`**
- 未検証面: integration tier の並列度（`tests/run-tests.ts` への述語 `grep -n "\-P 4\|concurrency\|maxParallel"` → **0 hit**、Issue #3031 の「4 並列」仮説は未確定）/ #3062 の波及範囲（`pr-convergence-attestation.ts` / `-ledger.ts` / `-provenance.ts`）/ `.github/workflows/ci.yml` `pbt.yml` の差分詳細 / 既存テストスイートのベースライン（本スキャンは読取専用でフルスイート未実行）
- Verification: git 状態変更・GitHub 書込・engine/state ツール実行（`amadeus-orchestrate` / `-state` / `-log` / `-bolt`）・`bun run build` は**すべてゼロ**（`gh` は `issue view` の読取のみ）。書き込みは `codekb/amadeus/` 配下のみで、`amadeus/spaces/default/intents/` へは一切書き込んでいない
- Updated artifacts: `re-scans/260814-open-bug-batch-6.md`（新規）/ `reverse-engineering-timestamp.md`（本節）/ 本体 8 点すべてに本 intent の現在節を追記（`business-overview.md` / `architecture.md` / `code-structure.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md` / `code-quality-assessment.md`）。旧 intent 節の現在時制マーカー **15 件**を履歴へ降格（本文は保持、`cid:reverse-engineering:c1` / `c3-relabel`。降格後の残存を `grep -c '、現在、observed\|（現在、observed\|（現在、Issue'` で **全 8 ファイル 0 件**と実測）
- Reviewed-and-unchanged artifacts: なし（本 intent は 8 本体すべてに節を持つ）
- Per-intent record: `re-scans/260814-open-bug-batch-6.md`
## 実行メタデータ（履歴: 260814-priority-bug-batch）

- Date: `2026-08-15`
- Base commit: `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780`（`reverse-engineering-timestamp.md` + `re-scans/*.md` の全 40-hex トークン **168 件**のうち、**observed の祖先で距離最小**。`git merge-base --is-ancestor 1d08374cd d64fd7cac` = **exit 0**、`git rev-list --count 1d08374cd..d64fd7cac` = **23**。対抗は `cd64486a6` で距離 **29**。トークン集合は追記前の committed tree（`git show HEAD:<path>`）から採取したため、本節の追記による自己参照はない。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7`（= 本 worktree HEAD。`origin/main` = `a49f9e9fd` の**祖先で距離 1** であり、その 1 コミット `a49f9e9fd`（PR #3069、ノルム変更）が触るのは `amadeus/spaces/default/memory/project.md` のみ — `git diff --name-only d64fd7cac origin/main -- ':!amadeus/' ':!metrics/'` = **0 件**。したがって非 `amadeus/` ツリーは observed と `origin/main` でバイト等価。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`
- Focus: 優先バグ 4 件 — [#3065](https://github.com/amadeus-dlc/amadeus/issues/3065)（subprocess stdout の 8192B 読み取り境界、P2/S3）/ [#3034](https://github.com/amadeus-dlc/amadeus/issues/3034)（t2851 の clean doctor が live repo を検査、P2/S3）/ [#3040](https://github.com/amadeus-dlc/amadeus/issues/3040)（t-pi-child-driver の settled one-shot RPC close、P3/S4）/ [#3035](https://github.com/amadeus-dlc/amadeus/issues/3035)（t07 skip-path の 300ms 予算、P3/S4）。加えて base..observed の差分全域
- Scan mode: **通常の差分リフレッシュ**（xrev differential 不採用 — 対象 4 Issue はいずれもクロスレビュー凍結 SHA を持たず、xrev の形式要件を満たさない）
- 区間規模: 23 コミット / 185 files / +14769 −6942（`git rev-list --count 1d08374cd..HEAD`、`git diff --stat 1d08374cd HEAD -- ':!amadeus/'`）
- 患部の現行成立: **4 件すべて成立**（既修正のものはない）。患部ファイルは base..observed で無変更。ただし #3035 の行参照だけ Issue 本文の `:395-400` から `:401-406` へ 6 行ずれている（`05da1758c` が `tests/unit/t07-hook-audit-logger.serial.test.ts` へ fixture コピー 6 行を追加、`git show --numstat 05da1758c -- <file>` → `6 0`）
- 区間の主な構造変化: 選挙 CLI の多問化（PR #3036、新規 `amadeus-election-codec.ts` 908 行 / `amadeus-election-question-tally.ts` 386 行、`amadeus-election-model.ts` は 32 行へ縮小、`scripts/amadeus-election-migrate.ts` 削除）/ プラグイン rename `plugins/pr-convergence/` → `plugins/github-pr-convergence/`（PR #3051）/ 新規プラグイン `git-drift`（PR #3055）/ `plugin.settings` 機構（PR #3052、`amadeus-plugin-settings.ts` 274 行）/ blocking sensor の script-error fail-closed 化（PR #3045）
- 更新 artifact: 9 面すべて（`business-overview` / `technology-stack` / `dependencies` / `code-structure` / `api-documentation` / `architecture` / `component-inventory` / `code-quality-assessment` / 本ファイル）。詳細は `re-scans/260814-priority-bug-batch.md`
- 現在時制マーカーの降格: 本追記に先立ち、observed が `d64fd7cac` でない `## …（現在…）` 節 **17 件**を `履歴` へ降格した（本ファイルの 2 件を含む）。`cid:reverse-engineering:c1`

## 実行メタデータ（履歴: 260814-park-provenance）

- Date: `2026-08-14`
- Base commit: `cd64486a68c6a1144db50fbe3fde8273f5e18455`（`reverse-engineering-timestamp.md` + `re-scans/*.md` の全 40-hex トークン **162 件**のうち、**observed の祖先で距離最小**。`git merge-base --is-ancestor cd64486a6 1d08374cd` = **exit 0**、`git rev-list --count cd64486a6..1d08374cd` = **6**。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780`（`origin/main`、PR #3037 の着地コミット。本 worktree HEAD = `c2aaf88631b7a620079a0e4547dbe87b16ac5861` は observed を merge した conductor tree で、`git diff --stat 1d08374cd HEAD -- ':!amadeus/'` が**空 / exit 0** = 非 `amadeus/` ツリーは observed とバイト等価。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`
- Focus: [Issue #3016](https://github.com/amadeus-dlc/amadeus/issues/3016)（`Construction Autonomy Mode: autonomous` 下で実ユーザーの明示的な park 指示が一律拒否される）。クロスレビュー2名 `CONFIRMED_WITH_REFINEMENTS` / 収束 `ESTABLISHED_WITH_REFINEMENTS`
- Scan mode: **通常の差分リフレッシュ**（xrev differential 不採用 — 凍結 SHA `cd64486a6` は本スキャンの base そのものだが、`review..observed` の 6 コミット・24 ファイルに患部隣接面 `amadeus-orchestrate.ts`（#3011、+57/-8）が含まれ currency 免除条件が不成立。verdict の R1〜R5 / A1〜A5 は背景としてのみ用い、全主張を observed 断面で再実測した）
- Focus 領域の差分: `amadeus-state.ts` / `amadeus-stop.ts` / `amadeus-bolt.ts` / `amadeus-intent-autonomy-production.ts` / `tests/unit/t17.test.ts` / `tests/e2e/t122-stop-hook-e2e.test.ts` は base..observed で**無変更**（患部の行番号は前 intent の記録から不変）。変化したのは `amadeus-orchestrate.ts`（#3011 の ambient projectDir fail-closed 化、行 drift あり）、`stage-protocol.md`（#3037 §11b/§11c 新設）、`docs/reference/24-intent-autonomy(.ja).md`、8 ハーネス表層、`tests/.coverage-patch-allowlist.json`（`handlePark` の fingerprint 2 件）
- 中核知見: 患部は `amadeus-state.ts:1579` `handlePark` のガード `:1583-1587`（全域 1 hit、8 dist 投影はすべて同一正本）。コメント `:1573` の「Stop hook との二層防御」は observed でも**虚偽**（hooks に `Construction Autonomy Mode` 0 hit / exit 1、`amadeus-stop.ts:947` は `parked` を全モード allow）。`amadeus-stop.ts:823` の continuation 文言はモード非依存で park を案内しており（唯一のブロック経路 `:1047`）、**hook が案内する操作を tool が拒否する**内部矛盾が実在。**PR #3037 §11b（`stage-protocol.md:1041,1047`、8 ハーネス同期済み = 全域 9 hit）が「`error` は逐語出力して停止、回復・新規質問の発明は禁止」を正典化したため、park 拒否の回避操作を conductor が自動適用することも禁じられ、#3016 の劣化は固定された**。一方 §11c の承認境界は remote write 限定であり park には直接適用されない。fresh HUMAN_TURN の既成部品は fail-open/closed で性質が割れる — `humanActedSinceGate`（`amadeus-lib.ts:3858`）は active record で **fail OPEN** のため単独使用は完了条件1を破る。適合するのは `outstandingHumanTurns`（`:3904`、fail closed）/ `selectLifecycleHumanTurn`（`:2954`、**consume-once 付きの最適先例**）/ `humanTurnGroundsTakeover`（`amadeus-state.ts:5067`）/ `latestHumanTurnAfter`（`amadeus-goal.ts:100`）。修正候補 A（provenance 引数）/ B（state 側の暗黙判定のみ）/ C（判定入力を Intent 監査へ付替）と、基準時刻・grant 保持/失効・presence off-switch・directive park の非対称の 4 裁定を requirements-analysis へ申し送り
- 訂正（クロスレビューに対する）: reviewer-1 の「拒否契約は docs に一切書かれていない」は**不正確**。文字列 `Refusing to park` は `docs/` に 0 hit / exit 1 だが、契約自体は `docs/reference/12-state-machine.md:139` / `.ja.md:139`（逐語「Outside an unattended `full` run」/「無人の`full`実行以外では」）と `docs/reference/06-hooks-and-tools.md:260` / `.ja.md:258` の **4 面**に明文化されており、修正は英日 4 ファイルの同期を伴う。また A3 の `parkedDirective` 発行点は全数 **7 hit**（定義 1 + park verb 自身 1 + 他経路 5）で、verdict の 5 件は park verb 自身を除いた集合
- 実装時 resync 申し送り: `amadeus/spaces/default/specs/tla/model-map.json` の実装ハッシュピン **4 エントリ**（`:17` `:21` `:179` `:183`、現行 `shasum -a 256` と一致を実測）— `updateModelMap --impl-only` 経路のみ、手編集禁止。`WORKFLOW_PARKED` に項目を足す場合は `otel/event-registry.ts:118-125` と `knowledge/amadeus-shared/audit-format.md:40` と docs 英日が同一変更で必須（未宣言キーは `redaction.ts:66-72` で無音に落ち t385 が赤化）。`tests/.coverage-patch-allowlist.json` の `handlePark` 免除 **4 件**（全 430 エントリ中）はすべて orchestrate 側で、state 側には免除なし
- Verification: git 状態変更・GitHub 書込・engine/state ツール実行・`bun run build` は**すべてゼロ**（`gh` は読取のみ）。書き込みは `codekb/amadeus/` 配下のみ。並行 intent `260814-failopen-error-paths` の面には一切触れていない
- Updated artifacts: `re-scans/260814-park-provenance.md`（新規）/ `reverse-engineering-timestamp.md`（本節）/ `architecture.md`（新現在節）。直前の現在節（`260814-autonomy-stop-fixes`）は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。`260814-failopen-error-paths` 節は**並行実行中の別 intent の現在節**のため意図的に現在ラベルのまま残置
- Reviewed-and-unchanged artifacts: `business-overview.md` / `code-structure.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md` / `code-quality-assessment.md` の **7 点** — いずれも本 intent の節を持たない。後続ステージはこれらから**本 intent の事実を引かない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）
- Per-intent record: `re-scans/260814-park-provenance.md`

## 実行メタデータ（履歴: 260814-autonomy-stop-fixes）

- Date: `2026-08-14`
- Base commit: `d7ffaa5442266508d8e67babc3e0b947fb4c1637`（`reverse-engineering-timestamp.md` + `re-scans/*.md` の全 40-hex トークン **159 件**のうち、**HEAD の祖先で距離最小**。`git merge-base --is-ancestor d7ffaa544 HEAD` = **exit 0**、`git rev-list --count d7ffaa544..HEAD` = **4**。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `cd64486a68c6a1144db50fbe3fde8273f5e18455`（= 本 worktree HEAD = `origin/main`、`git rev-parse HEAD`。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`
- Focus: [Issue #3016](https://github.com/amadeus-dlc/amadeus/issues/3016)（`Construction Autonomy Mode: autonomous` 下で実ユーザーの明示 park も一律拒否）/ [Issue #2974](https://github.com/amadeus-dlc/amadeus/issues/2974)（full grant 下で `error` directive 受領時に message を逐語出力せず新規質問を発明して停止）
- Scan mode: **通常の差分リフレッシュ**（xrev 不採用 — #3016 はクロスレビュー未了で xrev の前提が不成立、#2974 は収束 REFRAME_REQUIRED かつ凍結 SHA `52f1f1b2` が observed から距離 15。#2974 の verdict は背景としてのみ用い、全主張を observed 断面で取り直した。実際 verdict が引く `pr-convergence.md:78-79, 354-357` は observed では `:80` / `:363` `:381` へ移動しており行ピンが写らない）
- Focus 領域の差分: `git diff --name-only d7ffaa544 HEAD` の非 `amadeus/` 出力は **4 件のみ**（`metrics/*.json` 2 / `tests/harness/fixtures.ts` / `tests/integration/t-fixtures-copy-tree-retry.integration.test.ts`）で、焦点 10 面（state / orchestrate / stop hook / bolt / autonomy-production / harness 全表層 / pr-convergence / 24-intent-autonomy / t17 / t122）は**いずれも含まれない**。全 file:line を observed 断面の実読で採取
- 中核知見: **#3016** — 拒否は `amadeus-state.ts:1583-1587` の 1 点のみで、コメントが主張する「Stop hook の同一ガード」は**実在しない**（hooks に `Construction Autonomy Mode` 0 hit / exit 1。hook は `amadeus-stop.ts:947-949` で `parked` を全モード終端 allow）。判定入力は `stage-protocol.md:126` が「認可の正本ではない」と明文化した派生投影フィールド単独。Abort park（`orchestrate:4050-4052`）と REPAIR_STALLED park（`:5944-5969`）は `handlePark` を通らず autonomous 下でも成立しており、拒否は経路依存の非対称。`--resume` 再開機構は Branch 2.6（`:3261-3277`）に既存。fresh HUMAN_TURN 判定は `freshHumanRetryTurn`（`amadeus-intent-autonomy-production.ts:1163-1185`）が先例。**#2974** — 停止自体は契約準拠だが、「message を逐語出力して停止」の条項は **core に正本がなく 8 ハーネス表層に手書き散在**（完全形 5 / 短縮形 2 = cursor・opencode / 逐語出力指示なし 1 = pi）。破られた条項は `cid:scope-definition:c1-semi-ladder-routing`。未文書点は「approval boundary の定義」（全域述語 5 hit・**定義 0 件**）と「Intent grant との優先順位」の 2 点で確定。`stage-protocol.md:139-141` の無条件 halt は Bolt code-generation 失敗のみが対象で remote write は非該当。**両 Issue とも修正方式は複数候補があり、裁定は requirements-analysis へ申し送り**
- Verification: git 状態変更・GitHub 書込・engine/state ツール実行・`bun run build` は**すべてゼロ**。書き込みは `codekb/amadeus/` 配下のみ
- Updated artifacts: `architecture.md`（新現在節 A-1〜A-6）/ `reverse-engineering-timestamp.md`（本節）/ `re-scans/260814-autonomy-stop-fixes.md`（新規）。直前の現在節（`260814-coverage-quick-norm`）は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）
- Reviewed-and-unchanged artifacts: `business-overview.md` / `code-structure.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md` / `code-quality-assessment.md` の **7 点** — いずれも本 intent の節を持たない。後続ステージはこれらから**本 intent の事実を引かない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）
- Per-intent record: `re-scans/260814-autonomy-stop-fixes.md`

## 実行メタデータ（履歴: 260814-unit-failure-autoelectio）

- Date: `2026-08-14`
- Base commit: `d7ffaa5442266508d8e67babc3e0b947fb4c1637`（`reverse-engineering-timestamp.md` + `re-scans/*.md` の全 observed のうち **HEAD の祖先で距離最小**。`git rev-list --count d7ffaa544..HEAD` = **4**、対抗候補 `5b12d96e9` は **5**。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `cd64486a68c6a1144db50fbe3fde8273f5e18455`（= 本 worktree HEAD = `origin/main`、`git rev-parse HEAD`。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`
- Focus: [Issue #2976](https://github.com/amadeus-dlc/amadeus/issues/2976) の患部（failure-ruling seam、election CLI 受け口、config スキーマ、stage-protocol の halt-and-ask 契約）に集中した差分リフレッシュ + `base..observed` 差分全域
- Scan mode: 通常の差分リフレッシュ（xrev 不採用。クロスレビュー target-sha `52f1f1b25` 以後に患部 4 ファイルへ触れたのは `d7ffaa544` の attestation 変更 1 件のみで、患部の表現形式を変える移行は不在。分岐構造は不変、行番号のみ移動）
- 中核知見: `emitConstructionFailureIfPresent`（`amadeus-orchestrate.ts:4027`、分岐 `:4069-4075`）は config を読まず無条件に `askDirective` を emit する。engine は `election` の語を持たない（`git grep` A2/B ともに 0 行 / **exit 1**）。stage-protocol `:151` の branch 1「prompt 非提示」は engine 側に対応する抑止がなく実現不能。裁定 commit 経路（`:6161-6169` → `handleFailureRuling:6507`）は answer の出所を問わないため変更不要。テスト述語 P2（`--trigger`）∩ P3（unit failure ruling）は **空集合**
- Verification: git 状態変更・GitHub 書込・engine/state ツール実行・コード変更はすべてゼロ。書込は `codekb/amadeus/` 配下のみ
- Updated artifacts: `architecture.md` / `code-structure.md` / `api-documentation.md` / `component-inventory.md`（本 intent 節を追記）、`business-overview.md`（新現在節。直前の `260814-fmc-macos-provider` 節は履歴へ降格）、`code-quality-assessment.md`（現在節）
- Reviewed-and-unchanged artifacts: `technology-stack.md` / `dependencies.md` — `base..observed` に `packages/` 変更 0 件でスタック・依存ともに不変。本 intent の節を持たないため後続はここから本 intent の事実を引かない
- Per-intent record: `re-scans/260814-unit-failure-autoelectio.md`

## 実行メタデータ（履歴: 260814-failopen-error-paths）

- Date: `2026-08-14`
- Base commit: `d7ffaa5442266508d8e67babc3e0b947fb4c1637`（`reverse-engineering-timestamp.md` + `re-scans/*.md` の全 observed のうち **HEAD の祖先で距離最小**。`git merge-base --is-ancestor d7ffaa5442266508d8e67babc3e0b947fb4c1637 HEAD` = **exit 0**、`git rev-list --count d7ffaa544..HEAD` = **4**。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `cd64486a68c6a1144db50fbe3fde8273f5e18455`（= 本 worktree HEAD = `origin/main`、`git rev-parse HEAD` と `git rev-parse origin/main` が一致。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`
- Focus: [Issue #2988](https://github.com/amadeus-dlc/amadeus/issues/2988) — sensor 真理値表がスクリプト異常を `PASSED` へ倒す fail-open。**[Issue #3004](https://github.com/amadeus-dlc/amadeus/issues/3004) は明示的にスコープ外**（PR #3011 で別途処理中）
- Scan mode: **xrev differential scan**（run `xrev-260814-2988`、target-sha `52f1f1b25`、クロスレビュー 2 名とも **CONFIRMED_WITH_REFINEMENTS**）。**currency 根拠（Developer scan がサブエージェントとして独立再測定した実測の転記）**: (1) `git log --oneline d7ffaa544..HEAD -- packages/framework/core/tools/amadeus-sensor.ts packages/framework/core/tools/amadeus-state.ts tests/integration/t2771-lifecycle-guard-regression.integration.test.ts` → **0 commits / exit 0**。(2) `git diff --stat 52f1f1b25 HEAD -- <同 3 面 + tests/unit/t511-blocking-sensor-severity.test.ts>` → **空出力 / exit 0**。すなわち xrev 断面（`52f1f1b25`）と observed 断面（`cd64486a6`）は患部について同一であり、差分ベース `d7ffaa544` は患部に寄与しない → **患部については実質フルスキャン**として実読で採取した
- 中核知見: `decideOutcome`（`amadeus-sensor.ts:612-735`）の 11 return site のうち **9 本が `passed`**（1 本は確定した `failed` を `passed` へ降格、`:588-593`）。機械的根本は **`Note` フィールドを判定のために読む消費者がゼロ**であること（判定に届くのは監査イベント名 `SENSOR_PASSED` そのもの）。加えて **dispatcher は severity-blind**（`amadeus-sensor-fire.ts:208` は severity を見ず全件発火）であり、真理値表側の是正は新配管なしでは blocking 限定にできない — Issue 本文に無い最重要制約。回帰ピン `t2771:151-163` はコメント逐語テキストのみの drift-detector で挙動を守らない
- Verification: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは `codekb/amadeus/` 配下のみ
- Updated artifacts: `code-quality-assessment.md`（新現在節 — Q-1 fail-open 全数マップ / Q-2 Note 非読の機械的根本 / Q-3 severity-blind 制約 / Q-4 t2771 ピンの性格 / Q-5 コメント実装 drift / Q-6 修正形状 A〜D / Q-7 テストインフラ）/ `reverse-engineering-timestamp.md`（本節）/ `re-scans/260814-failopen-error-paths.md`（新規）。直前の現在節（`260814-coverage-quick-norm`）は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。あわせて `code-quality-assessment.md` に**現在マーカーを併存させていた** `260814-t99-copytree-race` と `260814-t528-ambient-isolation` の 2 節も同時に履歴へ降格した
- 履歴節の引用訂正（`cid:reverse-engineering:c1`）: stale となっていた `verifyBlockingSensors` / `amadeus-state.ts:1835` 引用 3 面（`api-documentation.md` の 260813-lifecycle-guard-runtime 節 / `component-inventory.md` の同 C2 表 / `code-quality-assessment.md` の同 Q-1 表）に、本文を書き換えず**日付入りの括弧付き訂正注記**を追加した。現行対応: `evaluateBlockingSensorGuard`（`:2023-2068`、registry 結線 `:347`）/ `evaluateBlockingSensors`（`:1932-1995`）/ `blockingSensorIdsForStage`（`:2004-2013`）/ `blockingSensorGuardDisabled`（`:1997-1999`）/ 宣言文字列 `:2052`。**`git grep -n "verifyBlockingSensors" -- packages/` は exit 0 / 1 hit で、それは `amadeus-sensor-schema.ts:21` の散文コメント内の stale な言及**（定義・呼出は 0 件）。この散文 1 件は未是正であり、#2988 の是正が `amadeus-sensor-schema.ts` に触れる場合は同一変更で更新するのが自然（FOLLOW-UP）
- Reviewed-and-unchanged artifacts（**沈黙のスキップではなく、レビュー済みで無変更**）: `business-overview.md` / `architecture.md` / `code-structure.md` / `technology-stack.md` / `dependencies.md`。**この 5 面は本 intent の節を持たないため、後続ステージがここから本 intent の事実を引いてはならない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）。`api-documentation.md` と `component-inventory.md` は**stale 引用の訂正注記のみ**を受けており、本 intent の新規節は持たない — 同様に本 intent の事実の引用元にしてはならない
- Per-intent record: `re-scans/260814-failopen-error-paths.md`
- 適用範囲外（明示）: 修正形状 A〜D の選定、advisory への波及を許容するか否か、新 terminal イベントの導入可否、`amadeus-state.ts:2018-2022` の政策分界コメントの去就、落ちる実証の置き場 — **裁定はすべて requirements-analysis / application-design / build-and-test の所掌**

## 実行メタデータ（履歴: 260814-coverage-quick-norm）

- Date: `2026-08-14`
- Base commit: `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`（直前 timestamp の observed。`git merge-base --is-ancestor 5f6b5bf97 HEAD` = **exit 0**、`git rev-list --count 5f6b5bf97..HEAD` = **10**）
- Observed commit: `d7ffaa5442266508d8e67babc3e0b947fb4c1637`（= 本 worktree HEAD = `origin/main`、`git rev-parse HEAD`）
- Scope: `self-document`、Brownfield、単一 repo `amadeus`、depth `Standard`、build `bun`
- Focus: coverage-patch-quick を pre-push 内側ループの標準とする運用ノルム（Inbox 追記）。ツーリングは PR #2965 / Issue #2933 で着地済み
- Scan mode: 通常の差分リフレッシュ（xrev 不採用 — 再実装 Issue ではない）
- 中核知見: quick は `EXIT_ADVISORY=0` の近似。CI 正本は `coverage:ci -- -P 4`。job 94095568607 で入力生成 11 分 03 秒 / 判定 3 秒。single-owner と数値転記規律との矛盾なし。Inbox に当該ノルムは未存在（`git grep` 0 行 / exit 1）
- Verification: git 状態変更・GitHub 書込・engine 操作・coverage 実行はすべてゼロ
- Updated artifacts: `architecture.md`（新現在節）。直前の現在節は履歴へ降格
- Reviewed-and-unchanged artifacts: `business-overview.md` / `code-structure.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md` / `code-quality-assessment.md` — 本 intent の節を持たないため後続はここから本 intent の事実を引かない
- Per-intent record: `re-scans/260814-coverage-quick-norm.md`

## 実行メタデータ（履歴: 260814-t99-copytree-race）

- Date: `2026-08-14`
- Base commit: `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`（`reverse-engineering-timestamp.md` + `re-scans/*.md` の全 observed のうち **HEAD の祖先で距離最小**。`git merge-base --is-ancestor 5f6b5bf97 HEAD` = **exit 0**、`git rev-list --count 5f6b5bf97..HEAD` = **9 commits**。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `5b12d96e99cbf46711acd3dc2b8c103be1b0f801`（= 本 worktree HEAD = `origin/main`、`git rev-parse HEAD`。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`
- Focus: [Issue #3003](https://github.com/amadeus-dlc/amadeus/issues/3003) — `tests/harness/fixtures.ts` の `copyTreeWithRetry` が dest 汚染時に 3/3 必ず count mismatch で失敗し、リトライ構造が構造的に無効化される（t99 経路）
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— run `xrev-260814-3003`、クロスレビュー 2 名とも **CONFIRMED_WITH_REFINEMENTS**、収束 `ESTABLISHED_WITH_REFINEMENTS`。**currency 根拠(実測)**: 患部 2 面（`tests/harness/fixtures.ts` / `tests/integration/t99-learnings-gate-flow.test.ts`）は `git diff --name-only 5f6b5bf97..HEAD` の出力 151 件に**含まれない**（`| grep -E "fixtures.ts|t99-learnings"` が rc=1 の空出力）ため、xrev 断面と observed 断面は患部について同一。表現形式の移行検査（`cid:reverse-engineering:c5-xrev-currency-schema-migration`）: 区間の `tests/` 変更 7 件は formal-verif 系・t245・t528・allowlist のみで、`CopyTreeOps` の型・診断書式・免除セレクタ様式を変える移行を含まない → c5 の構造的不成立条件に該当しない
- Focus 領域の差分: `git diff --name-only 5f6b5bf97..HEAD -- tests/harness/fixtures.ts tests/integration/t-fixtures-copy-tree-retry.integration.test.ts tests/integration/t99-learnings-gate-flow.test.ts` が**空出力**。患部は base..observed で無変更であり、全主張を observed 断面の実読で採取した
- 中核知見: 症状（稀な count mismatch）とは別に、**リトライ機構が失敗様式に対して構造的に無力**である点が本質。`copyTreeWithRetry`（`:633-661`）は attempt 間で dest を変えないため、dest が src の真の上位集合になると 3 回とも同一の不一致を再生産する。姉妹関数 `removeTreeWithRetry`（`:574-590`）は `rm` が冪等収束するためリトライが機能するが、`copy` は dest に対し累積的（非冪等）であり、その差を吸収していない。`CopyTreeOps`（`:617-623`）に remove 面が無く、`exists` は本体未消費（`ops.exists` は `:580` の `RemoveTreeOps` 1 hit のみ）。count mismatch は `isRetryableCopyError`（`:663-666`）を経由せず常に retryable 扱い。診断（`:677-701`）は src 側のみで dest 件数を出さないため、機序が観測面に現れない。**ガード面の非対称**: `copyTreeWithRetry` 呼出は本番 6 件に対し、同じ dist 系ツリーを素 `cpSync` で読む未ガード面が `tests/` 配下に 19 件 / 15 ファイル(狭い述語 P-A。広い述語では更に増える)。`fixtures.ts:784`（`AMADEUS_MEMORY_SRC`）は `:769` のガード呼出と同一関数内の直後にありながら未ガード。**修正方式は 4 候補（A dest クリア / B src スナップショット / C 診断強化 / D post-condition を包含へ）あり、D と A は `:614-616` / `:716-718` が明言する設計意図の書き換えを伴うため、裁定は requirements-analysis へ申し送り**
- Verification: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは `codekb/amadeus/` 配下のみ
- Updated artifacts: `code-quality-assessment.md`（新現在節 — Q-A〜Q-F）/ `reverse-engineering-timestamp.md`（本節）/ `re-scans/260814-t99-copytree-race.md`（新規）。直前の現在節（`260814-fmc-macos-provider`）は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）
- 差分リージョンの非交差判定: `base..observed` の主要変更（formal-verif 系 = `plugins/formal-model-check` / `tests/*formal-verif*` / `mise.toml`）は、本 intent の焦点（テストハーネスの tree コピー機構）と**呼出・型・データのいずれでも交差しない**（`git grep -n "copyTreeWithRetry\|CopyTreeOps" -- plugins/ mise.toml` = 0 hit）。既存 codekb の formal-verif 記述は `260814-fmc-macos-provider` の節が正本であり、本スキャンでは触れない

## 実行メタデータ（履歴: 260814-fmc-macos-provider）

- Date: `2026-08-14`
- Base commit: `89532174c30ef9cc7ff29496cd6916586fdda00a`（`reverse-engineering-timestamp.md` + `re-scans/*.md` の全 observed のうち **HEAD の祖先で距離最小**。`git merge-base --is-ancestor 89532174c HEAD` = **exit 0**、`git rev-list --count 89532174c..HEAD` = **9 commits**。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`（= 本 worktree HEAD = `origin/main`、`git rev-parse HEAD`。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`
- Focus: [Issue #2361](https://github.com/amadeus-dlc/amadeus/issues/2361)（ミラー [#2995](https://github.com/amadeus-dlc/amadeus/issues/2995)）— formal-model-check の macOS 既定 provider（`auto` → `sandbox-exec` 固定）が不通になり、JDK ピンが patch 完全一致で脆い
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— run `xrev-260814-2361`、target-sha `52f1f1b2575ea35bd23b761697b2d17a5e9a7ac3`、クロスレビュー 2 名とも **CONFIRMED_WITH_REFINEMENTS**。currency 成立（`52f1f1b25..HEAD` の変更は `amadeus/spaces/default/elections/` 配下 1 件のみで、被引用パス集合との交差ゼロ）。表現形式の移行検査（`cid:reverse-engineering:c5-xrev-currency-schema-migration`）も該当なし
- Focus 領域の差分: `git diff --name-only 89532174c..HEAD -- plugins/formal-model-check tests/unit/t-formal-verif-tlc-spawn-planner.test.ts mise.toml` が**空出力**。患部は base..observed で無変更であり、全主張を observed 断面の実読で採取した
- 中核知見: **xrev 6 事実のうち 2 件を訂正**した。(1) 事実5「実装が文書契約に違反」は誤り — 矛盾は文書内部（`README:60-62` の「major 26」対 `:74-79` の patch 完全一致宣言）にあり、後者と `mise.toml:3-5` が **patch 固定を deliberate な再現性契約(NFR-1)として明示宣言**している。したがって JDK ピン緩和は bug fix ではなく仕様変更の可能性が高い。(2) 事実6「修正時にテスト更新必須」も誤り — `t-formal-verif-tlc-spawn-planner.test.ts:186-187` は `.ok` しか検査せず、**auto/darwin が Docker planner を返すよう変えても緑のまま通る**（退行を検出しない）。加えて **JDK ピンは二重ではなく 6 面**（A データ正本 `tlc-toolchain.ts:90-92` / B manifest 一致要求 `:754-756` / **C 型リテラル `:709-710`** / D planner probe `tlc-spawn-planner.ts:152` / E snapshot 経路 `fs-tlc-toolchain.ts:1331` / F receipt expected `tlc-spawn-planner.ts:50`）。構造面では **`selectTlcSpawnPlanner`（`:520-539`）が同期かつ可用性検査ゼロ**であり、Darwin/Docker いずれの可用性も `snapshotEnvironment`（`fs-tlc-toolchain.ts:1831`）まで判明しない — フォールバックの自然な合流点は選択時ではなく snapshot 失敗直後。`provider === "auto"` は repo 全体で **2 箇所のみ**（`:526` 選択 / `:68` receipt plan）で同期必須。**未把握制約の発見**: coverage 免除の意味的セレクタ（`tests/.coverage-patch-allowlist.json:1469-1477`）の指紋が患部そのもの（`tlc-spawn-planner.ts:128-185`、JDK regex と診断文言を含む）を覆っており、1 行でも編集すると指紋不一致でゲートが throw する
- Verification: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは `codekb/amadeus/` 配下のみ
- Updated artifacts: `architecture.md`（新現在節 — Lifecycle Guard Runtime の着地、registry 5 本、team-up 撤去、患部の provider 選択構造）/ `component-inventory.md`（新現在節 — core/tools の増減 1 追加 3 削除、adapter registry、患部 9 コンポーネント）/ `code-structure.md`（新現在節 — ファイル増減と e2e −869）/ `api-documentation.md`（新現在節 — `docs/reference/26-lifecycle-guard-runtime{,.ja}.md` 新設、Runtime 公開型、census 述語、患部の公開契約）/ `business-overview.md`（新現在節 — 運用形態のソロ一本化、#2361 の 2 主張の性格差）/ `code-quality-assessment.md`（新現在節 — 免除台帳 −22 / test-time-factor −12 / e2e −869、指紋制約、テストの弱さ、落ちる実証の所在）。直前の現在節 4 面は本文保持のまま履歴へ降格し、**#2986 着地前の断面である旨を見出しに明記**した（`cid:reverse-engineering:c3-relabel`）
- 履歴節の訂正（`cid:reverse-engineering:c1`）: `code-structure.md` の `260813-remove-team-up` 節（team-up 4 パスを現在時制で列挙）と、`architecture.md` / `component-inventory.md` / `code-quality-assessment.md` / `api-documentation.md` の `260813-lifecycle-guard-runtime` 節（「Guard Runtime は存在しない」を現在時制で宣言）に履歴ラベルを付与し、observed `5f6b5bf97` での解決状況を見出しに併記した
- Reviewed-and-unchanged artifacts（**沈黙のスキップではなく、レビュー済みで無変更**）: `dependencies.md`（`package.json` / `bun.lock` / `mise.toml` いずれも base..observed で無変更。依存エッジの追加削除なし）/ `technology-stack.md`（bun / TypeScript / Biome / fast-check・TLC / JDK のピンいずれも不変）。**この 2 面は本 intent の節を持たないため、後続ステージがここから本 intent の事実を引いてはならない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）
- Per-intent record: `re-scans/260814-fmc-macos-provider.md`（述語 A〜P、患部機構の 6 面 JDK ピン・auto 分岐 2 箇所・可用性判定の段構造、xrev 事実5・6 の訂正、指紋制約、requirements-analysis への申し送りの正本）
- 適用範囲外（明示）: フォールバックの挿入方式（async 化 / `preparePlanned` 内再試行 / 同期 probe）、JDK ピン緩和の可否とその面（A〜F のどこまで）、落ちる実証の取得先 — **裁定はすべて requirements-analysis / application-design / build-and-test の所掌**

## 実行メタデータ（履歴: 260813-lifecycle-guard-runtime）

- Date: `2026-08-14`
- Base commit: `854692fd7a11b124236b0427fe3d59e2fe6bf785`（`reverse-engineering-timestamp.md` + `re-scans/*.md` の全 observed のうち **HEAD の祖先で距離最小**。`git merge-base --is-ancestor 854692fd7 HEAD` = **exit 0**、`git rev-list --count 854692fd7..HEAD` = **35 commits / 233 files**（`+24099 / −9421`）。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `89532174c30ef9cc7ff29496cd6916586fdda00a`（= 本 worktree HEAD、`git rev-parse HEAD` と `git rev-parse origin/main` が一致。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`
- Focus: [Issue #2771](https://github.com/amadeus-dlc/amadeus/issues/2771)（enhancement / lifecycle）— 全ライフサイクル共通の Guard Runtime を導入する。本 RE の主題は**ライフサイクル進行ガードの全数棚卸し**（移行対象集合の確定）であり、**ライフサイクルガード重点の差分リフレッシュ**として実施した
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— run `xrev-2771-20260813131430`、target-sha `10dbac5954d554c4370379b084e879f8c721829f`。クロスレビュー verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化
- 行番号引用の currency（**実測の記録であり免除の主張ではない**）: `review..observed` は 6 commits / 19 files。verdict の引用パス 30 件との交差は **2 件**（空でない）。個別処理 — (1) `packages/framework/core/tools/amadeus-utility.ts` は `+40 -0`（`97581b3e3` / #2968 が `:1575` 付近へ `selfInstallProjectionDoctorChecks` を挿入）で**意味論もガード面も不変だが以降の全行が +40 シフト**するため、当該ファイルの引用は +40 で再解決した（`handleIntentBirth` review-sha `:4347` → HEAD **`:4387`**）。(2) `amadeus/spaces/default/memory/team.md` は `+3 -1`（ノルム 1 行追加 + TDD 追記）で、verdict は適用ノルムとしてのみ引用しており判断は不変。**表現形式の移行検査**（`cid:reverse-engineering:c5-xrev-currency-schema-migration`）: 6 commits のいずれも患部のスキーマ・セレクタ形式を変える移行を含まず、`amadeus-state.ts` は `review..observed` で無変更（`git diff --name-only` 空出力、rc=0）→ **c5 の構造的不成立条件には該当しない**。**訂正 1 件**: reviewer-1 の述語 `setCheckbox\([^)]*"completed"` は入れ子括弧により rc=1 / 0 hit となり再実行不能（`cid:reverse-engineering:c6-absence-predicate-exit-code` の同族）。正しい述語 `git grep -nI "setCheckbox" -- packages/framework/core/tools` で結論（4 箇所 `:2780` `:2882` `:3066` `:4021`）は一致
- 中核知見: **Guard Runtime は不在**（`GuardRuntime` / `lifecycle-guard` ほか 10 パターンが rc=1 / hits=0、1 パターン 1 実行で rc 個別採取）。ライフサイクル進行ガードは **G1〜G40** で、4 checkpoint の集約度は一様でない — **Stage 完了だけが集約済み**（`verifyStageCompletionGuards` `amadeus-state.ts:2539`、呼出 `:2763` / `:2877` / `:3054` / `:3998`。宣言コメント `:2520-2526` が「五つ目のガードもここへ置く」と明記）、Phase 境界は単一関数の個別配線（`verifyPhaseCheckArtifact` `:392`、呼出 `:2775` / `:2926` / `:3059` / `:4009` + `amadeus-jump.ts:581`）、**Intent 生成前と Workflow 完了は未集約**。**判定語彙は 5 系統に分裂**（`error()` exit 157 箇所 / 判別ユニオン+`recovery` / boolean / typed error class / `{ok, reason}` Result。`export type ...(Guard|Verdict|Outcome)... =` は 38 件）。**fail 方向が同一経路で衝突** — sensor 実行（`amadeus-sensor.ts:19-31` 分岐 e/f は異常を PASSED へ倒す fail-open）と verdict 消費（`verifyBlockingSensors` `:1835` は fail-closed）。**迂回路 3 系統** — off-switch 4 種 / 日付 cutoff `260809`（`:667` / `:1841`）/ hook 層の別配線（park の二重実装、`amadeus-subagent-model-guard.ts:89`）。**base 以後に G22 が増えた**（`admitProductionStageFailure` `amadeus-intent-autonomy-production.ts:1102` + `stageFailureDirective` `amadeus-orchestrate.ts:5779`、`16d94927d` / #2945）— Issue の premise の追加実例かつ移行対象の増加。**checkpoint 4 点は部分集合**（state.ts の verb dispatch は 15 verb `:1034`〜`:1108`、外側に jump / Bolt batch gate / swarm retry）
- Verification: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは `codekb/amadeus/` 配下のみ
- Updated artifacts: `architecture.md`（新現在節「ライフサイクル進行ガードの集約構造と分散」— 不在の実測、4 checkpoint の集約度表、2 層構造、G22）/ `component-inventory.md`（新現在節 — C1〜C7 のガード component 群と reuse 候補 2 点）/ `code-quality-assessment.md`（新現在節 — Q-1 fail 方向衝突、Q-2 語彙 5 系統、Q-3 迂回路 3 系統、Q-4 免除の埋込、Q-5 型重複、および強み）/ `api-documentation.md`（新現在節 — checkpoint ガードのシグネチャ表、G22 の新規契約、off-switch 4 種の契約。`Internal Contracts` 表の `verifyStageCompletionGuards` 行を observed 行ピンで再解決）。直前の現在節は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）
- 履歴節の訂正（`cid:reverse-engineering:c1`）: #886「phase-check ゲート完全不在」を現在時制で述べていた 3 節（`architecture.md` docs-repair-batch9 / `code-quality-assessment.md` 同名節 / `component-inventory.md` docs/harness 修理コンポーネント）に**履歴ラベルと observed `13598b752` を付与し、observed `89532174c` では解決済みである旨を明記**した。`260804-phase-boundary-approval` 系の 3 節は既に履歴ラベル + observed `b938898f3` を宣言しているため行ピンは保存し、**observed 断面への対応表を注記として追加**した（`:379-396`→`:392` / `:3472`→`:4009` / `:3484`→`:4021` / `:2263` `:2413` `:2539`→`:2775` `:2926` `:3059` / `amadeus-jump.ts:545`→`:581`）
- Reviewed-and-unchanged artifacts（**沈黙のスキップではなく、レビュー済みで無変更**）: `code-structure.md`（変更ファイル 9 件への行ピン引用 0。モジュール構成に変化なし）/ `technology-stack.md`（`base..observed` で bun / TS / Biome / fast-check 不変、新規 runtime dependency なし）/ `dependencies.md`（依存エッジの追加削除なし）/ `business-overview.md`（ガードの集約は内部構造の問題で、業務面の記述に変化なし）。**この 4 面は本 intent の節を持たないため、後続ステージがここから本 intent の事実を引いてはならない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）
- Per-intent record: `re-scans/260813-lifecycle-guard-runtime.md`（currency 判定と交差 2 件の扱い、述語 P1〜P13、`base..observed` 差分要約、**G1〜G40 の全数棚卸し**、構造的所見 5 点、requirements/design への訂正引継 6 点の正本）
- 適用範囲外（明示）: Guard Runtime の採否、共通 Interface の形、hook 層を Runtime に含めるか、G9 の fail-open を維持するか反転するか、off-switch と日付 cutoff の去就 — **裁定はすべて requirements-analysis / application-design の所掌**

## 実行メタデータ（履歴: 260812-tla-proof-receipt）

- Date: `2026-08-12`
- Base commit: `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`（`reverse-engineering-timestamp.md` + `re-scans/*.md` の全 observed のうち **HEAD の祖先で距離最小**。`git merge-base --is-ancestor ce3c3ccfd HEAD` = exit 0、`git rev-list --count ce3c3ccfd..HEAD` = **34 commits / 734 files**。次に近い祖先は 50 / 53 / 55 / 63。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `854692fd7a11b124236b0427fe3d59e2fe6bf785`（= 本 worktree HEAD、`origin/main` 系譜。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、build `bun`
- Focus: [Issue #2913](https://github.com/amadeus-dlc/amadeus/issues/2913)（ミラー #2917、bug / P1 / S2-CRITICAL）— TLA+ の author-new した proof と model-map 登録が循環し、実 TLC を実行できない
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー 2 名（run `xrev-2913-20260812`、reviewer-1 / reviewer-2 とも **CONFIRMED_WITH_REFINEMENTS**、target-sha `3fc024e44`）の verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化
- 行番号引用の currency（**実測の記録であり免除の主張ではない**）: レビュー target SHA `3fc024e44` ≠ observed のため SHA 一致による免除は不成立。測定区間を **`review..observed` に固定**した `git diff --name-only 3fc024e44 854692fd7 -- <被引用 15 パス>` は**空出力**（区間全体は 87 files）→ 行番号再解決は構造的 no-op（`cid:reverse-engineering:E-XBB-RE-S13-c2`）。加えて `base..observed` でも患部は無変更（plugin 内変更 9 files はいずれも被引用外、`tests/formal-verif/**` は変更 0）。起票・レビューの行番号には **off-by-one 4 件**（`fs-tlc-toolchain.ts` 検証呼び出し `:1640`→`:1641` / 中断 `:1642`→`:1643`、`tla-model-receipt.ts` 検証器宣言 `:143`→`:142` / identity 比較 `:159`→`:161-169`、`tla-model-loader-internal.ts` seam コメント `:460-463`→`:461-462`）があり、いずれも採番誤りで行シフト起因ではない。訂正後が正本
- 中核知見: 欠陥は**独立した 2 つ**である。**D1** = 検証器 `validateVerifiedTlaModelReceipt`（`tla-model-receipt.ts:142`）が登録済み model-map へ直接結合（`:154` / `:156`）し、未登録モデルの receipt を `:157` で拒否する。**D2** = identity のエンコーディング分裂 — referee は object `{bytes: base64}`（`tla-referee-toolchain.ts:47`）、loader とバイト照合は文字列（`tla-model-loader-internal.ts:279` / `fs-tlc-toolchain.ts:731`）。`createVerifiedTlaModelReceipt` が identity を再計算せずコピーする（`:104-112`）ため分裂が無検出で共存する。**D2 は D1 修正の前提条件**（D1 のみ直すと失敗が `MODEL_RECEIPT` から `SOURCE_IDENTITY` へ 1 層下がるだけ）。さらに `validateModelCheckReceipt` の消費者は **2 つ**あり（準備段 `fs-tlc-toolchain.ts:1641`、出力解析段 `tlc-toolchain.ts:647`）、片方だけの修正は失敗を移動させる。loader 消費者 4 件中 3 件は DI seam を持ち、検証器だけが持たない（S1）。loader 内部 seam の禁止（`:461-462`）は**方針であって能力の制約ではない**（root 選択能力は実在、`t403:94-100` が使用）。`tests/formal-verif/**` は `run-tests.ts:750-759` のスコープ固定と `.test.ts` フィルタにより**構造的に CI 除外**で、修正すべき除外リストは存在しない。`t447:568-651` は TLC 到達前の失敗経路とバージョン行のみを覆い、整形式モデルを `preparePlanned` へ通すテストは 0 件
- Verification: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは codekb 配下のみ
- Updated artifacts: `architecture.md`（新現在節「receipt 信頼境界の二重欠陥」— 照合器と自己完結検証器の契約不一致、D1 / D2、消費者 2 系統、policy-vs-capability）/ `component-inventory.md`（新現在節 — receipt 生成器・検証器・消費者の棚卸しと loader 消費者の seam 有無表）/ `code-quality-assessment.md`（新現在節 — seam 非対称 S1、型で守られないエンコーディング契約、t447 の成功経路欠落、`tests/formal-verif/**` の構造的 CI 除外）/ `api-documentation.md`（新現在節 — `createVerifiedTlaModelReceipt` / `validateVerifiedTlaModelReceipt` / `canonicalIdentity` / 内部 seam の入力ドメイン）。直前の現在節は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）
- Reviewed-and-unchanged artifacts（**沈黙のスキップではなく、レビュー済みで無変更**）: `code-structure.md`（モジュールの移動も新規ファイルもなく、欠陥は既存モジュール間の関係にのみ存在）/ `dependencies.md`（依存エッジの追加削除なし。referee は既に receipt モジュールを import している）/ `technology-stack.md`（TLC / JDK のピンは本欠陥と無関係）/ `business-overview.md`（ワークフロー停止の業務影響は Issue と record に既述で、ここへ書くと informing でなく duplicating になる — Developer scan が judgement call として提起した件を Architect が非更新で裁定）
- Per-intent record: `re-scans/260812-tla-proof-receipt.md`（述語 P0〜P5、引用 currency 表、D1 / D2、修正面の全数列挙 (a)〜(d)、同根スイープ S1〜S3、テストピン 5 files、CI 配線、仮説 H1〜H3 と未測定 3 件の正本）
- 適用範囲外（明示）: 修正の設計・選定（D1 の解の形、D2 のエンコーディング統一方向、probe の CI 配線可否、`tests/formal-verif/**` 全体の扱い）は requirements-analysis / application-design の所掌

## 実行メタデータ（履歴: 260811-allowlist-semantic-audit）

- Date: `2026-08-11`
- Base commit: `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`（直前 intent `260810-test-time-factor` の observed。`git merge-base --is-ancestor ce3c3ccfdb3f93e619a081386a70c8185b84f1db 854692fd7a11b124236b0427fe3d59e2fe6bf785` = **exit 0**、`git rev-list --count ce3c3ccfd..854692fd7` = **34 commits**。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `854692fd7a11b124236b0427fe3d59e2fe6bf785`（= 本 worktree HEAD、`git rev-parse HEAD` の実出力。`cid:reverse-engineering:measurement-ref-in-artifacts`）
- Scope: Brownfield、単一 repo `amadeus`、build `bun`
- Focus: [Issue #1622](https://github.com/amadeus-dlc/amadeus/issues/1622)（`enhancement` / `P1` / `in-progress`）— `tests/.coverage-patch-allowlist.json` の全エントリを `reason` と現行行内容で直読照合し、無音転位を棚卸しする
- Scan mode: **台帳の全数機械解決を一次証拠とする差分リフレッシュ**。xrev differential scan（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）は**採らなかった** — #1622 のクロスレビュー verdict 2 件（2026-07-28、いずれも CONFIRMED）は `tests/coverage-patch-gate.ts:125-151` / `:154-170` / `:266-277` と「300件」を引くが、PR #2127 の意味的セレクタ移行により台帳スキーマも実装座標も置換済みで、verdict の file:line と件数がいずれも observed に対応しない（現行の同機構は `parseAllowlist` `:360` / `findStaleAllowlistEntries` `:407-419`、件数 **623**）。`cid:reverse-engineering:E-XBB-RE-S13-c2` の免除条件は成立せず、verdict を一次入力にできない
- 行番号引用の currency: 本 RE の全 file:line は observed 断面で実読・機械解決して採取している（`cid:reverse-engineering:upstream-cite-reresolve-on-shift`）。区間 `ce3c3ccfd..854692fd7` の患部交差は `git diff --name-only` の実測で `amadeus-graph.ts` と `amadeus-orchestrate.ts` の 2 件のみ（被引用 11 ソースパスで絞った結果）。ゲート実装 `tests/coverage-patch-gate.ts` と t229 両テストは**区間内無変更**、台帳のみ `+109/−10`（614 → 623）
- 中核知見: **解決は fail-closed、意味は fail-open という非対称が構造の本体**。`resolveSemanticSelector`（`:288-313`）はスコープ名・指紋の非一意を throw し `runCheck`（`:552`）が exit 1 へ落とすが、`findStaleAllowlistEntries`（`:407-419`）は引数が `entries` / `lcov` のみで `reason` を受け取らず、判定は DA レコードの**存在**のみ。免除の適用も `allowlisted`（`:421-426`）の行番号包含だけ。PR #2127 の意味的セレクタ移行は「行シフト起因の stale」を消した一方、**誤った行から採取された指紋を固定**し、以後シフトを跨いで正確に追従させる（`amadeus-election.ts` の実測: Issue 報告時 `:317` → observed `:417`、指紋は同一）。**確定転位 18 件**（下限、全数照合は未実施）。腐敗はエントリ単位で混在し、同一 `reason` 文字列の群でも一致と転位が並存する。さらに**反証不能な選言型 `reason` が 45 件**存在する（「defensive, type-only, or spawned-boundary path」20 件 + 「Residual defensive, invalid-input, replay, or process-boundary」25 件）
- コーパス実測（測定 ref = observed）: エントリ **623** / 対象ファイル **106** / distinct `reason` **310** / `expiry` 保持 **597** / `<module>` スコープ **90** / 単一行アンカー **233**（37%）/ 旧行ピン **0** / セレクタ解決失敗 **0**（`entries=623 resolveFailures=0`）
- 手法メモ: 全数解決は repo 外 scratch の bun スクリプトから `resolveSemanticSelector` を直 import して実行し、出力の md5 が Developer scan の dump と**バイト一致**することで決定性を確認した。ガード不在の確認に選択肢を `|` で長く連ねた 1 本の `grep -rniE` を使わない — ローカルの `grep`（ugrep ラッパ）が複雑度上限で exit 1 になり、その空出力が「0 hit」と誤読される（本 intent で Developer scan の述語1がこれに該当し、`git grep` の分割述語で再実測して訂正した）
- Verification: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは codekb 配下のみ
- Updated artifacts: `code-quality-assessment.md`（新現在節「coverage 免除台帳の意味論が無検査 — 解決 fail-closed / 意味 fail-open の非対称」）/ `architecture.md`（新現在節「patch coverage ゲートの判定パイプラインと免除の適用段」）/ `component-inventory.md`（新現在節「coverage patch gate の構成要素棚卸し」）/ `api-documentation.md`（新現在節「coverage 免除台帳のデータ契約」）。各成果物の直前の現在節は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel` — 降格対象は `260810-test-time-factor` と `260810-plugin-manifest-resoluti` の 2 節で、両者が現在マーカーを併存させていた状態も同時に解消した）
- Reviewed-and-unchanged artifacts（**沈黙のスキップではなく、レビュー済みで無変更**）: `code-structure.md` / `dependencies.md` / `technology-stack.md` / `business-overview.md` の 4 面。理由 — 本 scan の新規事実は既存の単一ファイル `tests/coverage-patch-gate.ts` と単一データファイルの**意味論**に関するもので、(a) モジュール配置・新規ファイル・ディレクトリ構造の変化はゼロ（区間内でゲート実装は無変更、追加されたのは台帳エントリのみ）、(b) 依存エッジの追加削除はゼロ（`ts` は既に import 済み）、(c) 技術スタック（Bun / TypeScript / Biome / LCOV）に変更なし、(d) 業務価値面の所見（免除の正当性が検証不能であることの統制上の意味）は品質評価節へ集約した
- Per-intent record: `re-scans/260811-allowlist-semantic-audit.md`（述語 P0〜P7、scan mode 選定根拠、確定転位 18 件の一覧、候補 51 件と未判定 43 件の扱い、Developer scan への訂正 5 件、UNMEASURED-1〜6 の正本）
- 適用範囲外（明示）: 転位 18 件の是正方法の選定、全数照合の進め方と工数見積り、機械ガードの設置先と CI 配線位置、選言型 `reason` 45 件の可否方針、#1622 と #2162 / #2135 / #2134 / #2216 / #2112 / #2133 の統合・分離の裁定はいずれも requirements-analysis / application-design の所掌

## 実行メタデータ（履歴、2026-08-11: 260811-pr-convergence-gate）

- Date: `2026-08-11`
- Observed commit: `854692fd7`
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Depth: `Minimal`
- Focus: [Issue #2838](https://github.com/amadeus-dlc/amadeus/issues/2838) — 4 self-* scope の mandatory PR convergence と手書き report bypass の fail-closed 化
- Result: scope/stage wiring、per-unit engine coverage、PR content provenance は実装済み。report attestation、blocking sensor wiring、local delivery prerequisites、direct completion all-required guard、要求 matrix 回帰は未実装であり、Issue は未解決。
- Scan record: `re-scans/260811-pr-convergence-gate.md`

### Freshness

このファイルは repo 単位の共有 freshness pointer であり、intent 固有の差分 base は scan record に記録する。共有9成果物は last-writer-wins derived cache として本 scan の current snapshot に更新した。

## 260810-test-time-factor

- Date: `2026-08-10T14:26:50Z`
- Base commit: `7b9391be2db4fad791d637293ea442d5a1462bac`
- Observed commit: `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Focus: `TEST_TIME_FACTOR` によるテスト timeout/wait の CI 能力係数化
- Scan record: `re-scans/260810-test-time-factor.md`

## 実行メタデータ（履歴: 260810-plugin-manifest-resoluti）

- Date: `2026-08-10`
- Base commit: `df1c874cfb397fafe877a72f00a82664a59689ae`（`re-scans/` 中で最新の observed = 直前 intent `260810-plugin-harness-dir-token` の測定 ref。HEAD の祖先であることを実測確認。`git rev-list --count df1c874cf..HEAD` = **13 commits**、**302 files changed**。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `7b9391be2db4fad791d637293ea442d5a1462bac`（= 本 worktree HEAD。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、build `bun`、Depth: **Minimal**
- Focus: [Issue #2823](https://github.com/amadeus-dlc/amadeus/issues/2823)（ミラー #2829）— plugin manifest 所在非対称（composed ツリーに `plugin.json` が配送されないのに宣言の読み手は `<projectRoot>/plugins/<name>/plugin.json` のみ）+ evaluator argv の repo ルート相対（`plugins/formal-model-check/plugin.json:61`）。クロスレビュー 2/2 CONFIRMED_WITH_REFINEMENTS → ESTABLISHED_WITH_REFINEMENTS（run `xrev-2823-20260810T094918Z`）
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— レビュー verdict を Developer scan の一次入力とし、observed 断面の verbatim 実読で二重化
- 行番号引用の currency（**実測の記録であり免除の主張ではない**）: `git diff --name-only c51afbd0a..HEAD`（cross-review target SHA）を引用パスで絞った結果は**空** → 行番号再解決は構造的 no-op（`cid:reverse-engineering:E-XBB-RE-S13-c2`）。base..observed は **PR #2811**（staging seed での `{{HARNESS_DIR}}` 解決、`amadeus-plugin.ts` / `plugin-projection.ts` / `amadeus-harness.ts` / t531 新設）を含むため、`amadeus-plugin.ts` 系の行番号は observed で取り直した（`copyPluginSource`/`copyRealFiles` `:702-741`、`collectPluginSources`/`seedStaging` `:874-906`）
- 中核知見: 欠陥は**契約の継ぎ目**にある — 配送側（compose は stages/tools のみ、`amadeus-plugin-compose.ts:895`/`:1390-1408`）も消費側（`pluginManifestPath` = `<projectRoot>/plugins/<name>/plugin.json` のみ、`amadeus-advisory-declaration.ts:295-297`、読み手は `:312`/`:392` の 2 箇所）も個々には設計どおり。**新規発見**: `install <path>` verb の persistent 腕（`amadeus-plugin.ts:1117-1118`/`:1160`）は FULL bundle を `<projectRoot>/plugins/<name>/` へ永続化し、両レビュアの共有前提「repo ルート `plugins/` を作らせる文書化経路は無い」を falsify する。folder-drop（installDoc primary 腕、`plugin-projection.ts:634`）では advisory は無音で全滅（(a)）、self-install では常に動く（dogfood masking、(c)）。t445:155-160 が無音 fail-open を**契約として pin**
- Verification: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは codekb 配下のみ
- Updated artifacts: `architecture.md`（新現在節「plugin manifest 解決の所在非対称と advisory 消費者グラフ」— #2811 差分 + 消費者グラフ + install 経路 settlement）/ `component-inventory.md`（新現在節、行番号を observed で取り直し + advisory 宣言コンポーネント追加）/ `code-quality-assessment.md`（新現在節 — t531 着地済みのガード現況、無音 degradation、doc 矛盾、installDoc 2 腕）/ `api-documentation.md`（新現在節 — manifest 解決契約と evaluator spawn 契約）/ `business-overview.md`（新現在節 — 文書化経路で advisory 価値が届かない業務影響）。直前の現在節は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）
- Reviewed-and-unchanged artifacts（**沈黙のスキップではなく、レビュー済みで無変更**）: `code-structure.md` / `dependencies.md` / `technology-stack.md` の 3 面。理由 — 本 scan の新規事実は既存モジュール間の**読み点と解決規則**に関するもので、モジュールの配置・依存エッジの追加削除・技術スタックのいずれも変えない（消費者グラフの構造面は `component-inventory.md` と `architecture.md` に集約した）
- Per-intent record: `re-scans/260810-plugin-manifest-resoluti.md`（述語 P0〜P11、N-1〜N-9、install 経路 4 分類の settlement、#2267 との関係、テスト/ガード面、UNMEASURED 3 項目の正本）
- 適用範囲外（明示）: 修正案の設計・選定、および Issue #2267 との統合/分離の裁定は requirements-analysis / application-design の所掌

## 実行メタデータ（履歴: 260810-plugin-prose-seed-guard）

- Date: `2026-08-10`
- Base commit: `df1c874cfb397fafe877a72f00a82664a59689ae`（直前 intent `260810-plugin-harness-dir-token` の observed。`git merge-base --is-ancestor df1c874cf HEAD` で祖先性を実測確認。区間 `git rev-list --count df1c874cf..c51afbd0a` = **8 commits**、非 record の実質変更は PR #2811 の squash 1 本。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `c51afbd0a99b2eb3f0b9c1ee4e2cef2772378131`（= PR #2811 squash 着地後の `origin/main`。worktree HEAD `ff06d945b` は record-only merge のため observed に採らない。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、build `bun`、Depth: **Minimal**
- Focus: [Issue #2810](https://github.com/amadeus-dlc/amadeus/issues/2810)（bug/P2/S3-MAJOR — plugin stage prose の root-relative ツール参照 11 行）+ [Issue #2812](https://github.com/amadeus-dlc/amadeus/issues/2812)（bug/P2/S3-MAJOR — reframe 済み: rename 規則は `KNOWN_RULES_SUBDIR` 2 キー欠落により `.cursor`/`.opencode` で既に乖離。`KNOWN_RULES_SUBDIR` 修正 in scope）。兄弟 [#2823](https://github.com/amadeus-dlc/amadeus/issues/2823)（plugin.json:61 evaluator argv、S2-CRITICAL）は分離済みで射程外
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode`）— 収束: #2810 = ESTABLISHED_WITH_REFINEMENTS / #2812 = REFRAME_REQUIRED → ユーザー裁定で reframe 適用。run `xrev-2810-20260810T080817Z` / `xrev-2812-20260810T080817Z`。レビュー verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化（scan 訂正 2 件を検出）
- 行番号引用の currency: #2810 の 11 行は observed で全数逐語一致・シフトゼロ。#2812 の患部（`amadeus-harness.ts` / `amadeus-plugin.ts`）は区間内 M のため免除不成立 — レビュアー2名+scan+Architect が observed で再解決済み（`cid:reverse-engineering:E-XBB-RE-S13-c2`）
- 中核知見: (1) 直前 intent の中核前提「経路B に置換器なし」は #2811 の `seedBytesForHarness` 新設で解消済み。(2) 新たな非対称は rename 規則の**データ源二重化** — packager = manifest `rulesRename` / core = `KNOWN_RULES_SUBDIR`（5 キー、`.cursor`/`.opencode` 欠落 → `?? "rules"` fail-open）で、両実装を突き合わせるテストは 0 件（P6∩P7=∅）。(3) `KNOWN_RULES_SUBDIR` の消費経路は `rulesSubdirFor` 経由に加え `rulesSubdir()` の env 分岐 `:194`・descriptor 欠落 fallback `:196` の計 3 面（第 4 の面 = env 分岐は descriptor を見ない、はレビュー未指摘で scan が検出）。(4) 11 行のトークン化は両経路の実測済み通過面に乗り、compose-time seeding の新設不要。(5) 既存テストで明示改訂が必要なものは 0 件
- Verification: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作はすべてゼロ（クロスレビューのコメント投稿・Issue 訂正・#2823 起票は RE 外の conductor 工程として実施済み）。書き込みは codekb 配下のみ
- Updated artifacts: `architecture.md`（rename データ源二重化と 3 消費経路の節を追加）/ `code-structure.md`（#2811 新規ファイル: harness-dir-fixture / t2790 / t531 / boundary-guard predicate 3）/ `component-inventory.md`（seedBytesForHarness / stagingHarnessDirOf / stagingEntryState / rulesSubdirFor）/ `code-quality-assessment.md`(ガード不在: 両実装を import するテスト 0 件、t2790 は一致キーのみサンプル、corpus 遮蔽)。直前の現在節は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。`technology-stack.md` / `dependencies.md` / `api-documentation.md` / `business-overview.md` は**変更なし**(区間が患部と非交差で既存記述を無効化する事実なし)
- Per-intent record: `re-scans/260810-plugin-prose-seed-guard.md`（述語 P1〜P13、manifest 8 面実測表、patch-surface inventory、テストピン棚卸し、仮説 4 項目の正本）
- 適用範囲外（明示）: 修正案の設計・選定(#2810 のトークン化範囲、ガード述語の設置先 t146 vs t531、#2812 の等価性テストの層と形)は requirements-analysis 以降の所掌

## 実行メタデータ（履歴、2026-08-10: 260810-control-byte-gate）

- Date: `2026-08-10`
- Base commit: `df1c874cfb397fafe877a72f00a82664a59689ae`（直前 intent `260810-plugin-harness-dir-token` の observed。`git merge-base --is-ancestor df1c874cf HEAD` = 真、`git rev-list --count df1c874cf..HEAD` = **10 commits**。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `f1270d710193d102b6fe8a728873a1c3e27dc094`（= 本 worktree HEAD。`git branch -r --contains f1270d710` が `origin/main` にヒットするため **origin/main 系譜上**であることを実測確認。`origin/main` は 1 コミット先行し `40056d0ecf140daa5636ddd2916734047098108b`。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、build `bun`、Depth: **Standard**
- Focus: [Issue #2814](https://github.com/amadeus-dlc/amadeus/issues/2814)（ミラー #2821）— tracked source への制御バイト（NUL 等）混入を CI で決定的にブロックするゲートが存在しない。既知の機序は `cid:requirements-analysis:control-byte-guard`（PM1-8 2026-07-10、#786 実測）— 制御バイトは git diff（8KB 以降不可視）にも grep（binary 化で偽陰性）にもレビューにも構造的に見えない
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー verdict を Developer scan の一次入力とし、observed 断面の verbatim 実読で二重化
- 行番号引用の currency（**実測の記録であり免除の主張ではない**）: 述語は逐語 `git diff --name-only c909b61300e0a5b770e39a96fe38280879bb8bbd f1270d710193d102b6fe8a728873a1c3e27dc094`（exit 0、36 files）。被引用 13 パス（`amadeus-migrate.ts` / `amadeus-lib.ts` / `amadeus-stage-stats.ts` / `amadeus-subagent-stats.ts` / `t-learnings-persist-seam.test.ts` / `t55-test-suite-drift.test.ts` / `detect-ci-changes.sh` / `ci.yml` / `no-silent-drop/engine.ts` / `unchecked-cast-guard.ts` / `.gitignore` / `assets/AI-DLC-Workflows-2.0-Specification.pdf`）との**交差は空**。よって全 file:line は observed で有効（`cid:reverse-engineering:E-XBB-RE-S13-c2` — 測定区間は `review..observed` に固定）
- 中核知見: **全域制御バイトゲートは 0 件**。既存の検出面は 4 つだけで、いずれも射程外 — `isUtf8`（`amadeus-migrate.ts:477` + 呼び出し 5 箇所）は**入力面限定**、`CONTROL_CHARS`（`amadeus-lib.ts:4298`/`:4304`）は**表示層の除去**、#786 guard（`t-learnings-persist-seam.test.ts:246-262`）は**単一ファイル**、t55 の NUL-skip（`t55-test-suite-drift.test.ts:664-678`）は**同じ fail-open 側**。CI 配線では sensors が **ci.yml に 0 hit** のため sensor 形態単独では CI ブロック不成立。Issue 宣言スコープは先例 SCAN_ROOTS 2 本の**上位集合**（`tests/` は両先例が明示除外、`docs/` はどちらも未走査）。`docs/` を含める場合は `detect-ci-changes.sh` が docs を 2 ファイル名指しでしか `full=true` にしないため分岐追加が必須
- コーパス実測（測定 ref = observed）: tracked **16124** files 中、制御バイト含有は **1 件**（`assets/AI-DLC-Workflows-2.0-Specification.pdf`、first NUL offset 248）のみ。Issue 宣言スコープ 5 ルート **2576** files は NUL/C0（TAB/LF/CR 除く）**0 hit**。`.github/` 15 files も 0 hit。`dist/` は tracked **0**（`.gitignore:19`）のため投影増幅は不成立
- 手法メモ: バイト検査に grep 系ラッパを使わない（NUL 含有ファイルを binary 扱いで無音脱落させ偽陰性を作る = 欠陥機序そのもの）。走査は `git ls-files -z` を起点に Python/perl の binary モード直走査で行い read error 数も報告する
- Verification: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは codekb 配下のみ
- Updated artifacts: `code-quality-assessment.md`（「制御バイト混入クラスの防御在庫」節を新設）/ `re-scans/260810-control-byte-gate.md`（新規・正本）
- Reviewed-and-unchanged artifacts（**沈黙のスキップではなく、レビュー済みで無変更**）: `architecture.md` / `code-structure.md` / `technology-stack.md` / `dependencies.md` / `api-documentation.md` / `component-inventory.md` / `business-overview.md` — 本 intent は新規ゲートの追加であり、既存のアーキテクチャ・依存・API 記述を変更する所見は出ていない
- Per-intent record: `re-scans/260810-control-byte-gate.md`（述語 P0〜P11、N-1〜N-6、検証面ピン、UNMEASURED 6 項目の正本）
- 適用範囲外（明示）: ゲートの実装形態（standalone script / sensor / 併設）、走査スコープの最終確定、allowlist 機構の有無、CI 配線位置の選定は requirements-analysis / application-design の所掌。本 RE は裁定を証拠から下せる状態にすることのみを行った

## 実行メタデータ（履歴、2026-08-10: 260810-plugin-harness-dir-token）

- Date: `2026-08-10`
- Base commit: `91f37ec8589cdf468599b4787e27e5125d4d16e8`（`re-scans/` 中で最新の observed。HEAD の祖先であることを実測確認。`git rev-list --count 91f37ec85..HEAD` = **20 commits**、**117 files changed**。`cid:reverse-engineering:rescan-base-ancestry`）
- Observed commit: `df1c874cfb397fafe877a72f00a82664a59689ae`（= 本 worktree HEAD = `origin/main`。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、build `bun`、Depth: **Minimal**
- Focus: [Issue #2790](https://github.com/amadeus-dlc/amadeus/issues/2790)（ミラー #2799）— `plugins/pr-convergence/stages/pr-convergence.md:180` がハーネス中立であるべき plugin stage doc に Claude 固有リテラル `.claude/tools/amadeus-sensor.ts` を焼き込んでいる。クロスレビュー 2/2 CONFIRMED（run `xrev-2790-20260810T033737Z`）
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— レビュー verdict を Developer scan の一次入力とし、observed 断面の verbatim 実読で二重化
- 行番号引用の currency（**実測の記録であり免除の主張ではない**）: `git diff --name-only 91f37ec85..HEAD` を患部 7 パス（`plugins/pr-convergence/**`、`scripts/harness-transform.ts`、`scripts/plugin-projection.ts`、`packages/framework/core/tools/amadeus-plugin.ts`、`tests/unit/t146-core-hygiene.test.ts`）へ絞った結果は**空**。クロスレビュー target SHA `5564dccd1` / `d95d719ce` についても同パスに変更なし。よって全 file:line は observed で有効（`cid:reverse-engineering:E-XBB-RE-S13-c2`）
- 中核知見: plugin 配布には**二経路**があり、`{{HARNESS_DIR}}` 置換器は経路A（build-time packager）にしか存在しない。N-3 により **self-install 5 面は build script（`promote-self.ts:382` → `projectInTemporaryWorkspace`）の中から経路B（runtime compose）に乗り、`transform()` を一度も通らない**。「build-time = 置換済み / runtime = 逐語」という二分法は偽。加えて同根の兄弟欠陥が **計 12 行**あり、必要な機構は 1 つ（`{{HARNESS_DIR}}` 置換）
- Verification: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは codekb 配下のみ
- Updated artifacts: `architecture.md`（「plugin 配布の二経路と非対称なトークン置換器」節を新設。Mermaid 経路図 + テキスト代替つき）/ `code-quality-assessment.md`（「ハーネス中立性ガードの穴」節を新設 — N-5 / N-6 / t377 の述語・corpus ミスマッチ）/ `component-inventory.md`（「plugin 配布経路の構成要素棚卸し」節を新設）。直前の現在節はいずれも本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）
- Reviewed-and-unchanged artifacts（**沈黙のスキップではなく、レビュー済みで無変更**）: `code-structure.md` / `technology-stack.md` / `dependencies.md` / `api-documentation.md` / `business-overview.md` の 5 面。理由 — 本 focus は既存コンポーネントの**配置・技術スタック・外部依存・公開 API 契約・業務価値**のいずれも変更しておらず（患部は散文 1 行と、その散文を運ぶ配布経路の非対称性）、既存記述を無効化する事実が区間 `91f37ec85..HEAD` に存在しない（患部 7 パス非交差）。テスト層の棚卸しは `code-quality-assessment.md` の検証面小節に集約した
- Per-intent record: `re-scans/260810-plugin-harness-dir-token.md`（述語 P0〜P11、N-1〜N-9、12 行の全数列挙、harnessDir 実測表、検証面ピン、UNMEASURED 5 項目の正本）
- 適用範囲外（明示）: 修正案の設計・選定（(a) compose 側置換 / (b) パス規約変更 / (c) packager 経由 seed）は requirements-analysis / application-design の所掌。本 RE は裁定を証拠から下せる状態にすることのみを行った

## 実行メタデータ（履歴、2026-08-10: 260810-grilling-frontier-resync）

- Date: `2026-08-10`
- Base commit: `91f37ec8589cdf468599b4787e27e5125d4d16e8`（直前 intent `260810-tla-applicability-wiring` の observed。`git merge-base --is-ancestor 91f37ec8589cdf468599b4787e27e5125d4d16e8 HEAD` で**祖先性を実測確認**（exit 0）。距離 `git rev-list --count 91f37ec85..HEAD` = **14 commits**。祖先であるため merge-base fallback は不要）
- Observed commit: `5564dccd14acf1f47218ff255b5a0e63d53541bf`（= 本 worktree HEAD = `origin/main` 系譜。`git rev-parse HEAD` で実測。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard
- Focus: [Issue #2785](https://github.com/amadeus-dlc/amadeus/issues/2785)（grilling の depth を質問数予算から枝刈り閾値へ再定義し、上流 `mattpocock/skills` の frontier 駆動 grilling — ピン SHA `1495d014303e041c51c29f9e442485ba06f5878d` — を骨格として `grilling-protocol.md` を再同期する）
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー2名成立済みの単発 Issue（target SHA `28e1f40c`）。レビュー verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化
- 行番号引用の currency（**二段判定**、`cid:reverse-engineering:E-XBB-RE-S13-c2`）: レビュー target SHA `28e1f40c` ≠ observed `5564dccd1` のため SHA 一致による免除は不成立。判定は `review..observed` の実 diff で行う — `git diff --name-only 28e1f40c..HEAD`（exit 0）が touch した 60 ファイルのうち患部2ファイル(`stage-protocol.md` / `amadeus-directive.ts`)が含まれるが、両ファイルの diff は**いずれも #2766 advisory `handoff_stage` 追加1ハンクのみ**(`stage-protocol.md` は旧行 ~994 付近に段落追加、`amadeus-directive.ts` は `AdvisoryChoiceDirectiveAdvisory` への `handoff_stage?: string` フィールドと `checkAwaitAdvisoryChoice` のバリデーション追加の2ハンク)で、grilling/depth 節(§3 depth 表・Step 3d・§8・semi 経路・`VALID_DEPTH_VALUES`)より後方に位置し先行行番号を一切シフトしない。したがって全患部引用は**行番号・verbatim とも review 断面と HEAD で一致**することを個別に再解決確認した(下記所見参照)。`grilling-protocol.md` / `amadeus-sensor-question-budget.ts` / `conductor.md` / `SKILL.md` / test pin 群は `git diff --name-only 28e1f40c..HEAD | grep -iE "grilling|conductor|question-budget"` が**空**(0 hit)で非交差確定
- Verification: git 状態変更・GitHub 書込・engine 操作は**すべてゼロ**。coverage / test 実行もゼロ(dist ビルドも未実施 — 下記 t199 の注意参照)。検証は observed 断面の verbatim 直読(`sed -n` / `git grep -n` / `git diff --name-only`)による。exit code はパイプ非経由で個別取得(`cid:code-generation:no-exit-capture-through-pipe`)
- **⭐ 主要所見 — 用語ドリフト1点、機構ゼロ変更**: `grilling-protocol.md`(137行)の D6 は現行で `**Bounded termination.**` と改名済みだが、参照元 `stage-protocol.md:349` の Step 3d には旧称 `hybrid termination` が verbatim 残存する。同じ旧称が `docs/reference/04-stage-protocol.md:320`(英)と同 `.ja.md:264`(和訳 `ハイブリッド終了`)にも残る — **計3ファイル3箇所**が resync 対象。canonical 側(`grilling-protocol.md`)自体には `hybrid` 語彙は0 hit(全文確認済み)
- **所見2 — depth ceiling は現行「質問数予算」のまま、frontier 駆動への再定義は未着手**: `stage-protocol.md` §3(:300-311)の depth 表は `Minimal 4 / Standard 8 / Comprehensive 12`(質問**数**上限)、`grilling-protocol.md` D6(:34)も同じ数値を「rendered questions」の総数上限として踏襲。`amadeus-directive.ts:62` の `VALID_DEPTH_VALUES`(`["Minimal","Standard","Comprehensive"]`)と `amadeus-sensor-question-budget.ts` の `QUESTION_BUDGETS`(:39-43、同じ 4/8/12)・`DEPTH_LEVELS`(:47、directive.ts からの mirror とコメント明記)が機械契約として同じ枠組みを閉語彙で強制する。上流 `mattpocock/skills` の frontier 駆動 grilling(枝刈り閾値ベース)への再定義は、この閉語彙・数値契約を置き換える設計判断であり、本 RE 断面ではまだ着手されていない(要件段の論点として持ち上がる)
- **所見3 — 機械ゲートの二重固定**: `tests/integration/t415-interaction-budget-contract.test.ts:26-54` が `stage-protocol.md` の3段階数値文言と `grilling-protocol.md` の D6 文言・§3(C-3 ceiling transition)文言を verbatim `toContain`/`not.toContain` で29個ピンしている。`tests/unit/t199-grilling-distribution.test.ts` は **`dist/` 配下**(4ハーネスの投影コピー)の存在・frontmatter・MIT 表示のみを検査し、`hybrid`/`bounded` の用語は一切ピンしていない — ただし `dist/` は `bun run build` で再生成されるため、`grilling-protocol.md` / `stage-protocol.md` の正本編集後は**リビルドしないと t199 の dist 面検査が古い内容のまま緑を返す**(検査対象外の用語だが、他の resync 変更が dist 側検査に反映されない一般的注意として記録)
- **所見4 — "one question at a time" の prose 消費者は7箇所、和訳は別語彙**: `docs/guide/02-your-first-workflow.{md,ja.md}:89`、`docs/guide/07-interaction-modes.{md:22/37, ja.md:18}`、`conductor.md:51`、`stage-protocol.md:349`、`skills/amadeus-grilling/SKILL.md:5` の7箇所が英語で同一フレーズを踏襲。日本語は「1問ずつ」ではなく「一度に1質問」(`docs/reference/04-stage-protocol.ja.md:264`)が使われており、和訳語彙は英語 prose 消費者側の grep パターンでは捕捉できない(検索キー面の注意)
- **所見5 — question-budget センサーは29ステージ宣言、専用 manifest ファイルなし**: `git grep -l "question-budget" -- packages/framework/core/amadeus-common/stages/` が **29 ファイル**(ideation 7 / inception 8 / construction 7 / operation 7)。`packages/framework/core/tools/` にセンサーを名前で列挙する専用 manifest ファイルは存在しない(`amadeus-baseline-manifest.ts` に `question-budget` 0 hit、他に `*manifest*` ファイルなし) — depth 契約の再定義は少なくともこの29ステージ全数のセンサー適用面に影響しうる
- tNNN 予約: 使用済み最大 **`t529`**(`find tests -type f -iname "t[0-9]*" | grep -oE '/t[0-9]+' | grep -oE '[0-9]+' | sort -n | tail -3` で機械再計算、上位3件は `528, 528, 529`)。本 intent は **`t530`** 以降を予約。⚠ `t528` を共有する2ファイルの存在(単体/統合バリアントか真の重複採番かは未調査)を loose thread として記録 — `cid:code-generation:swarm-test-number-reservation` に従い、PR 発行前・マージ直前に固定 base SHA の `tests/` で再確認すること(`cid:code-generation:c1-tnnn-collision-on-regrounding`)
- Updated artifacts: `component-inventory.md` に「grilling 対話契約の棚卸し(260810-grilling-frontier-resync)」節を追加。`code-structure.md` / `architecture.md` / `business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` / `code-quality-assessment.md` は**変更なし**(区間 `review..observed` が患部と非交差・grilling 関連ファイルの構造自体は不変で、既存記述を無効化する変更が無いため)。直前の現在断面(`260810-tla-applicability-wiring`)は本文保持のまま履歴へ降格(`cid:reverse-engineering:c3-relabel`)。履歴節の file:line は当時の observed 時点を指すため変更していない(`cid:requirements-analysis:historical-section-cite-check-at-observed`)
- Per-intent record: `re-scans/260810-grilling-frontier-resync.md`(患部インベントリ全数・xrev 判定根拠・test pin 棚卸し・用語ドリフト3箇所・機械契約の閉語彙構造の正本)

## 実行メタデータ（履歴、2026-08-10: 260810-tla-applicability-wiring）

- Date: `2026-08-10`
- Base commit: `778567dd03b00f22cb887eec06f025557eeaaaf4`（直前 intent `260809-sensor-parseflags-failop` の observed。`cid:reverse-engineering:rescan-base-ancestry` に従い `git merge-base --is-ancestor 778567dd03b00f22cb887eec06f025557eeaaaf4 HEAD` で**祖先性を実測確認**（exit 0）。距離 `git rev-list --count 778567dd0..HEAD` = **17 commits**。祖先であるため merge-base fallback は不要）
- Observed commit: `91f37ec8589cdf468599b4787e27e5125d4d16e8`（= 本 worktree HEAD = `origin/main` 系譜。`git rev-parse HEAD` で実測。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal
- Focus: [Issue #2766](https://github.com/amadeus-dlc/amadeus/issues/2766)（TLA+ applicability 判定が常に no-hold — `authoring-subjects.json` に**書き手が存在しない**ため供給が空のまま）+ ユーザー裁定 **案A**（接続完成 + FR-005 receipt 閉包。BR-U2-05 / ADR-6 の契約衝突は設計段で明示裁定）
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー2名 ESTABLISHED_WITH_REFINEMENTS 済みの単発 Issue。レビュー verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化
- 行番号引用の currency（**二重根拠**）: (1) レビュー target SHA ≡ observed（**完全一致**）→ `review..observed` の実 diff は空で再解決は構造的 no-op（`cid:reverse-engineering:E-XBB-RE-S13-c2`。測定区間は `review..observed` に固定、`..HEAD` ではない）。(2) 加えて `base..observed` の **68 ファイル**に患部 7 パス（`plugins/formal-model-check/**` 4面 / `amadeus-advisory-choice.ts` / `amadeus-advisory-declaration.ts` / `tests/integration/t445-*`）が**1件も含まれない**（`git diff --name-only 778567dd0..HEAD` を患部語彙で絞って **0 hit**）。**免除の主張ではなく実測の記録**である
- Verification: git 状態変更・GitHub 書込・engine 操作は**すべてゼロ**。coverage 実行もゼロ（`cid:code-generation:c1-coverage-single-owner`）。検証は observed 断面の verbatim 直読（`sed` / `grep` / `git diff` / `git merge-base`）と全数列挙による。exit code はパイプ非経由で個別取得（`cid:code-generation:no-exit-capture-through-pipe`）
- **⭐ 主要所見 — 鎖は両端が完成していて中央だけが空**: advisory 供給チェーン（宣言 parse → checkpoint 発火 → guard → run-now ルート → 評価 → 解除）のうち、engine 側の宣言 parse・発火・ルート供給は**すべて実装済みでテスト固定済み**（`t445-advisory-declaration-supply:297-322` の `RUNNABLE_DECLARATION` がトークン解決込みで PASS）。欠けているのは **subjects 宣言の書き手ただ1点**（`git grep -n "authoring-subjects"` = **7 hit** の内訳が record 3 / docs 2 / 読み手 1 / テスト 1 = **書き手 0 件**）。実 manifest の `formalCheck` を非 null にすれば engine 変更なしでルートが立つ
- **🔴 R1 新規発見（Issue にも両レビューにも無い）— 要件見出しの文法が実コーパスとほぼ一致しない**: `tla-evidence.ts:45` 逐語 `const REQUIREMENTS_HEADING_RE = /^###\s+((?:FR|NFR|AC)-\d{3})\b/;` は3桁ゼロ埋めを要求するが、`amadeus/spaces/default/intents/*/inception/requirements-analysis/requirements.md` **134 ファイル中一致は 3 ファイルのみ**（Architect 独立再実測）。対照として decisions 側（:46 `/^##\s+(ADR-\d+)\b/`）は **56 中 54** で健全。intent 要件を直接読む供給設計は現行文法では大半で `unresolvable-id` fail-closed（= 全 checkpoint が赤）になる。**requirements-analysis へ持ち上げるべき第一級の論点**
- **🔴 R2 subjects の置き場が advisory 監視 glob の内側（演繹、未実測）**: `amadeus-plugin-activation.ts:51` 逐語 `export const ACTIVATION_WATCH_GLOBS: readonly string[] = ["tla/**"];`。直前の :49-50 が「the evidence store (`<specsRoot>/tla-evidence`) sits outside the glob by construction」と設計意図を明言する一方、`defaultSubjectsPath`（`tla-authoring.ts:453-455`）の解決先 `specs/tla/authoring-subjects.json` は **glob の内側**。subjects 更新のたび spec-hash が変わり兄弟 advisory が発火する見込み — **ハッシュ再計算の実測は未実施**。書き手を作る前に置き場の裁定が要る
- **stage ハードコード（案A 項目2 の核心）**: `amadeus-advisory-choice.ts:948` 逐語 `stage: "formal-model-check",` — ADR-6 が一般化したのは argv（`declaredFormalCheckArgv` :334-348）だけで**遷移先 stage は一般化されていない**ため、`tla-authoring` を指す手段が現行の一般化点に存在しない
- **FR-005 receipt の owner が不在**: 永続化する書き手は `bundle build`（`tla-authoring.ts:201-228`）のみで、`applicability receipt`（:373-397）は stdout に返すだけ。加えて `stages/tla-authoring.md:40-44` が終端経路（`impl-only` / `non-target`）を明示拒否 → **非対象 receipt を発行する owner がワークフロー上どこにも無い**（reviewer-2 の FR-005 空文化指摘の機構レベル裏付け）。`t450-tla-authoring-stage-e2e:163` が「owner は stage 外」を固定するピンで衝突しうる
- **evidence store が実在しない**: `amadeus/spaces/default/specs/tla-evidence` は**未作成**（`ls -d` 実測）。案A で hold を実発火させると全 intent の RA/FD/B&T で `no-applicability-receipt` hold が立つため、**段階導入（governed subjects を最小集合から開始）を設計に織り込まないと着地直後に全 intent が止まる**
- **BR-U2-05 衝突の純化**: 実 `plugins/formal-model-check/plugin.json` の `advisories` を assert するテストは **0 件**（述語 `git grep -n "advisories" -- tests/ | grep -i formal-model-check`）。t445 はすべて架空 `demo` fixture 駆動 → **実 manifest の `formalCheck` を埋めても既存テストは1件も壊れない**。衝突は「テスト破壊」ではなく「BR-U2-05 の意味論（解除権は評価器のみ）を run-now ルート追加が侵さないか」という**設計裁定に純化される**
- Same-root: **#2267（OPEN）と交差**。`pluginManifestPath` は `<projectRoot>/plugins/<plugin>/plugin.json` を読むため、案A の効果は `plugins/` を持つ本 repo 限定で、ユーザーワークスペースには #2267 解消まで届かない。**受け入れ基準を「本 repo で効く」で書くか「配布面でも効く」で書くかが分岐点**。#2018 は CLOSED で交差なし
- tNNN 予約: 使用済み最大 **`t523`**（`find tests -name 't[0-9]*' -type f | grep -oE '/t[0-9]+' | grep -oE '[0-9]+' | sort -n | tail -1` で機械再計算）、本 intent は **`t524`** 以降を予約。⚠ 直近区間に **`t521` の二重採番**が実在（`t521-census-exitcode-drain` / `t521-sensor-flag-value-arms`）— `cid:code-generation:swarm-test-number-reservation` の実例が本区間内にあるため事前予約を明示し、PR 発行前・マージ直前に固定 base SHA の `tests/` で再確認すること（`cid:code-generation:c1-tnnn-collision-on-regrounding`）
- Updated artifacts: `component-inventory.md` に「formal-model-check advisory 供給チェーンの棚卸し」節を追加。`code-structure.md` / `architecture.md` / `business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` / `code-quality-assessment.md` は**変更なし**（区間が患部と非交差・構造不変で、既存記述を無効化する変更が無いため）。直前の現在断面（`260809-sensor-parseflags-failop`）は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）
- ⚠ **codekb 整合の申し送り（マージ衝突予告）**: 本線チェックアウト側で intent `260809-report-done-kind-split` の RE が**未コミットで並行進行中**（本セッション開始時点の `git status`: `M component-inventory.md` / `M reverse-engineering-timestamp.md` / `?? re-scans/260809-report-done-kind-split.md`）。同 RE も現在マーカーを主張するため、本 intent の節と**同一アンカー行で衝突する**見込み。`cid:code-generation:shared-ledger-insert-collision` に従い、解消は「和集合 + 実施時刻の新しい側を現在」で行うこと（`cid:reverse-engineering:re-timestamp-merge-resolution`）
- Per-intent record: `re-scans/260810-tla-applicability-wiring.md`（検索述語 P0〜P6・患部非交差の証明・供給チェーン全数・テストピン棚卸し・未検証4項目の正本）

## 実行メタデータ（履歴、2026-08-09: 260809-report-done-kind-split）

- Date: `2026-08-09`
- Base commit: `778567dd03b00f22cb887eec06f025557eeaaaf4`（直前 intent `260809-sensor-parseflags-failop` の observed。`cid:reverse-engineering:rescan-base-ancestry` に従い `git merge-base --is-ancestor 778567dd03b00f22cb887eec06f025557eeaaaf4 HEAD` で**祖先性を実測確認**（exit 0）。祖先であるため merge-base fallback は不要）
- Observed commit: `91f37ec8589cdf468599b4787e27e5125d4d16e8`（= 本 worktree HEAD = `origin/main` 系譜。`git rev-parse HEAD` で実測。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #2762](https://github.com/amadeus-dlc/amadeus/issues/2762)（`kind:"done"` の2義衝突 — 非終端の commit ack が終端 directive と同じ kind で返り、conductor がループを誤停止する）
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー2名 ESTABLISHED_WITH_REFINEMENTS 済みの単発 Issue。レビュー verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化
- 行番号引用の currency: レビュー検証 SHA ≡ observed（**完全一致**）→ 行番号の再解決は構造的に no-op（`cid:reverse-engineering:E-XBB-RE-S13-c2`。測定区間は `review..observed` に固定、`..HEAD` ではない）。加えて `base..observed` の変更 68 ファイルに患部（`amadeus-orchestrate.ts` / `amadeus-directive.ts` / harness SKILL.md / `docs/reference/`）は**含まれない**
- Verification: git 状態変更・GitHub 書込・engine 操作は**すべてゼロ**。coverage 実行もゼロ（`cid:code-generation:c1-coverage-single-owner`）。検証は observed 断面の verbatim 直読（`git show "<SHA>:<path>"` — `cid:requirements-analysis:zsh-revpath-brace-quoting` に従いブレース明示）と `grep` / `find` による全数列挙
- **⭐ 主要所見 — 患部は「非終端 ack 3箇所」ではなく「多義 emit 点2箇所」**: 両レビュアーは `:5382` / `:5765` / `:5849` を一律「非終端 ack」と分類したが、Architect 実測では **`:5382` と `:5849` は terminal と non-terminal の両方を単一 emit 点から出す多義サイト**である（`:5790-5796` の3分岐が `:5848` へ合流 / `:5352`・`:5377` の defer 経路のみ先に return）。「3箇所を別 kind へ替える」という素朴な修正は**終端ケースを非終端として出す新たな欠陥を作る**。純・非終端は `:5765` の1箇所のみ
- 判別子は既存: `isFinal` が両多義サイトのスコープ内に実在（`:5298-5299` / `:5674`）→ 新規の状態読取なしで分岐可能。`committed` 配列は判別子として**不十分**（gated 最終は `approve` が `complete-workflow` へ自己委譲するため）
- 設計先例が既に存在: `deferWorkflowCompletion` 経路は両サイトとも先に return し `await-completion` / mirror boundary directive を出す = 「終端だが未コミット」を別 kind へ切り出した設計が既に実装済み
- 契約面（同期対象）: harness SKILL.md **6面**（claude:60 / codex:58 / kimi:60 / kiro:56 / kiro-ide:56 が逐語同一、pi:121 のみ別文言）+ `amadeus-directive.ts` 8箇所 + **`docs/reference` 6ファイル**（`17-skill-system` / `06-hooks-and-tools` / `14-claude-features` の英日対）。`packages/framework/core/amadeus-common/`（stage-protocol）は **0 hit**
- Architect 独立再実測による scan 訂正1件: `interface DoneDirective` は **`:332-335`**（scan 記載の `:333-336` は off-by-one）。他の directive.ts 座標（`:52` / `:407` / `:474` / `:495` / `:548` / `:1201`）はすべて一致
- **reviewer-1「訂正4」の反証**（Architect が独立確認）: 逐語「stage-protocol.md と docs/reference には `done` kind の契約はありません」のうち **docs/reference 側は誤り** — `docs/reference/17-skill-system.md:38` に SKILL.md と同一の契約行が実在（`.ja.md:38` も同じ）。stage-protocol に無いという半分は正
- 既存の件数語ドリフト（**本 issue の患部外**、`cid:code-generation:same-root-inventory` の同根棚卸し候補）: `VALID_KINDS` 実数 = **13**（`git show` + `awk` で機械再計算）に対し、SKILL.md 5面が「ten kinds today」、`docs/reference/17-skill-system.md:32` が「**nine** directive kinds」「emits **seven** kinds today」、`.ja.md:32` が「**9つ**」「今日**7つ**の種別」。**4値がすでに乖離**しており、別 kind 新設方式を採る場合はこの群に触れざるを得ない
- tNNN 予約: 使用済み最大 **`t523`**（`find tests -name 't[0-9]*' | grep -oE '/t([0-9]+)' | grep -oE '[0-9]+' | sort -n | tail -1` で機械再計算）、本 intent は **`t524`** を予約（`cid:code-generation:swarm-test-number-reservation` / `c1-tnnn-collision-on-regrounding` — PR 発行前・マージ直前に固定 base SHA の `tests/` で再確認すること）
- Updated artifacts: `component-inventory.md` に「directive kind の terminal/非terminal 分類」節を追加。`code-structure.md` / `architecture.md` は構造不変・患部が既存コンポーネント内のため**変更なし**。直前の現在断面（`260809-sensor-parseflags-failop`）は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）
- Per-intent record: `re-scans/260809-report-done-kind-split.md`（7サイト全数分類・多義2サイトの合流構造・契約面棚卸し・修正方式2案の surgical 比較の正本）

## 実行メタデータ（履歴、2026-08-09: 260809-sensor-parseflags-failop）

- Date: `2026-08-09`
- Base commit: `a5621236c6c69f1c54f3d496bdf91792d4ef12fc`（直前 intent `260807-intent-2328-tests-e2e-au` の observed。`cid:reverse-engineering:rescan-base-ancestry` に従い `git merge-base --is-ancestor a5621236c HEAD` で**祖先性を実測確認**（exit 0）。距離 `git rev-list --count a5621236c..HEAD` = **232 commits**。祖先であるため merge-base fallback は不要）
- Observed commit: `778567dd03b00f22cb887eec06f025557eeaaaf4`（= 本 worktree HEAD = `origin/main` 系譜。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #2741](https://github.com/amadeus-dlc/amadeus/issues/2741)（per-sensor `parseFlags` の fail-open — 値なしフラグが無言で握り潰される）
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー2名成立済みの単発 Issue。レビュー verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読と scratch 再現で二重化
- 行番号引用の currency: レビュー target SHA ≡ observed（**完全一致**）。`review..observed` の実 diff が空のため行番号の再解決は構造的に no-op（`cid:reverse-engineering:E-XBB-RE-S13-c2`。測定区間は `review..observed` に固定、`..HEAD` ではない）
- Verification: git 状態変更・GitHub 書込・engine 操作は**すべてゼロ**。coverage 実行もゼロ（`cid:code-generation:c1-coverage-single-owner`）。センサーの決定的再現はすべて **repo 外 scratch** で実施（`cid:requirements-analysis:scratch-script-discipline`）、exit code は非パイプで取得（`cid:code-generation:no-exit-capture-through-pipe`）
- 患部の要旨: **3センサー**（depth-budget:294-302 / question-budget:340-348 / nfr-budget:1031-1040）の `parseFlags` が値なしフラグを両アームとも silent に受理し **exit 0** を返す。`--output-path F --depth`（値なし）は over-budget の finding 1件を**警告も非0 exit もなく消す**（scratch で決定的再現）。nfr-budget は `--kind --depth Minimal` で `unit_kind:"--depth"` として測定値そのものが変わる。**dispatcher（`amadeus-sensor.ts:886-926`）は値なしフラグを構造的に生まないため現発現はなく、潜在欠陥**
- **⭐ 主要所見 — canonical 化の障害と目された self-contained 制約は障害ではない**: `amadeus-sensor-depth-budget.ts:23-24` の逐語コメントは「no amadeus-lib import」であって「no import」ではない。同一制約下の `amadeus-sensor-nfr-budget.ts:76` が既に兄弟センサーから `canonicalDepth` を import しており、配布面も manifest の `coreDirs` walk で自動投影される。裁定 (b) は「できるか」ではなく「どこに置くか」の選択問題
- 既存テストピンとの関係: `t488:688-693` / `t514:645-651` がピンするのは **`--depth` の完全省略**であり値なしフラグではない → 値なしの loud 化は既存ピンと**非衝突**（`cid:reverse-engineering:c1-pinned-behavior-ruling` の適用外）。**明示改訂が要るのは `t488:695-703`「a missing flag is the only exit-1 path」の1本のみ**
- Architect 独立再実測による scan 訂正2件: **(a)** amadeus-lib を import する per-sensor スクリプトは 4本ではなく **6本**（`sensor-invocation.ts:8` / `sensor-schema.ts:33` を追加。結論は不変で強化される）**(b)** 同一欠陥形の**名指しフラグ変種（T7b）を4箇所追加検出**（`jump.ts:192-194` / `state.ts:732-739` / `:4653-4656` / `:4788-4795`）— 汎用 `parseFlags`（T7、4箇所）とは誤消費の射程が異なるため重大度は別評価が要る
- 未確定として引き継ぐ3点: (a) required-sections の同型が bootstrap commit `5cfb16165` に遡及するか（reviewer-2 主張、本 RE 未検証）(b) T7 / T7b（state/learnings/jump）の**実発現有無** — 呼出し元の argv 構成が値なしフラグを生みうるか未実測 (c) `?? ""` 変種のうち upstream-coverage 以外に意図宣言があるか（逐語コメント確認は `upstream-coverage:29-30` の1件のみ）
- tNNN 予約: 使用済み最大 **`t519`**、新規は **`t520`** から（Architect 独立実測。直前節の「次は `t484`」は**陳腐化**）
- Updated artifacts: `component-inventory.md` に「per-sensor argv parse の所在と現況」節を追加。`code-structure.md` / `architecture.md` は構造不変・患部が既存コンポーネント内のため**変更なし**。直前の現在断面（`260807-intent-2328-tests-e2e-au`）は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）
- Per-intent record: `re-scans/260809-sensor-parseflags-failop.md`（検索述語 P1〜P4・全数列挙・verbatim・exit code・裁定候補6件の正本）

## 実行メタデータ（履歴、2026-08-09: 260809-cg-attribution-stats）

- Date: `2026-08-09T13:37:08Z`
- Base commit: `a5621236c6c69f1c54f3d496bdf91792d4ef12fc`（直前の共有 CodeKB 現在断面 `260807-intent-2328-tests-e2e-au` の observed。`git merge-base --is-ancestor a5621236c HEAD` = exit 0、距離220 commitsを実測）
- Observed commit: `82e2f30c0c6d1bbebeb3d6201584a314306d00ac`（本 worktree HEAD。self-feature intent のScope Definitionまでをparkしたrecord commit）
- Reachable upstream tip: `origin/main` = `fefbbcf0158b47a76cf8873c518fdd6e295e2dbd`（HEADより10 commits先、branchは1 commit ahead。`HEAD..origin/main` で CodeKB と `amadeus-stage-stats.ts` は無変更。関連差分はNFR sensor面のみ）
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth `Standard`、Test Strategy `Comprehensive`（`amadeus-state.md:4-23`）
- Focus: [Issue #2695](https://github.com/amadeus-dlc/amadeus/issues/2695) — CG window 内の既存 audit から、決定的に閉じた観測可能 lifecycle 区間、全category union、coverage、帰属不能残余、overlap、outliers、候補×不採用理由を遡及集計する。CAP-01〜CAP-10は全Mustで縮小なし（`scope-document.md:25-34,122`; `intent-backlog.md:9-20,119`）
- Scan mode: differential refresh + Issue本文の全契約照合 + Developer real-corpus probe。現 worktree と到達可能 `origin/main` の差分を確認し、患部が同じことを検証した
- Corpus probe: 229 shards / 136,011 rows、constructed 1,603、measured 1,154、CG measured 109、attribution eligible 102（zero-net 4、ambiguous 3を除外）。sensor-only coverage 0.446%、eligible 102/102がunattributable rate 50%超
- Focused verification: `t486` + `t487` = 80 pass / 0 fail / 221 expect（Developer scan）。現出力 bytesはMD 53,121 / CSV 48,619 / JSON 107,248で、既存#2700 oversized pipe proofはJSONのみ
- Updated artifacts: 8 body artifacts、本 freshness pointer、per-intent `re-scans/260809-cg-attribution-stats.md`、stage memory。`architecture.md` には正準データフローとInteraction Diagramを含む
- Main decisions: 既存measured statsを保存しattribution populationを分離、raw normalized journalを正本としruntime containmentを不使用、explicit stage/start/terminal/identityだけを採用、category/global unionとresidualを単一semantic modelから3形式へ描画、全candidate familyを理由付きinventory、#2700既修正後も3形式>65,536 bytes証明を本intentに残す

## 差分スキャン結果

現行 `amadeus-stage-stats.ts` はwindow/idle/既存stats/3 rendererを持つが、attribution model、`--stage`、`--outliers`、event-set inner展開、interval union、candidate×reasonを持たない。execution/unit-pool等の契約は部分的に素材を提供する一方、現corpusではterminalまたはstage identityが不足する。したがって観測できない残余を推定配分せず、採用可能なsensor lifecycle等だけを明示区間化し、残りを帰属不能として会計する設計断面へ更新した。

## 実行メタデータ（履歴、2026-08-08: 260807-intent-2328-tests-e2e-au）

- Date: `2026-08-08`
- Base commit: `5f2ad9195d9ce3ea55d6bf3d34509f2c5ca2c12b`（直前 intent 260807-subagent-start-pair の observed。`cid:reverse-engineering:rescan-base-ancestry` に従い `git merge-base --is-ancestor 5f2ad9195 HEAD` で**祖先性を実測確認**（exit 0）。距離 `git rev-list --count 5f2ad9195..HEAD` = **13 commits**。祖先であるため merge-base fallback は不要）
- Observed commit: `a5621236c6c69f1c54f3d496bdf91792d4ef12fc`（= 本 worktree HEAD = `origin/main` 系譜。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #2328](https://github.com/amadeus-dlc/amadeus/issues/2328)（監査 journal の schema drift — テストが v1 形を決め打ちで読み、v2 行を読めない）
- Scan mode: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー2名成立済みの単発 Issue。レビュー verdict（検証 SHA `75a1c198d`）を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化
- 行番号引用の currency: `git diff --name-only 75a1c198d HEAD -- tests/e2e/` = **空**（Architect 独立実測）。`review..observed` の実 diff と被引用パス集合の交わりが空のため行番号の再解決は構造的に no-op（`cid:reverse-engineering:E-XBB-RE-S13-c2`。測定区間は `review..observed` に固定、`..HEAD` ではない）
- Verification: テスト実行・coverage 実行・git 状態変更・engine 操作は**すべてゼロ**。検証は observed 断面の verbatim 実読（`sed` / `grep` / `git merge-base` / `git rev-list` / `git diff`、exit code を記録）
- 患部の要旨: 監査 journal は **v1/v2 が現役共存**（`amadeus-journal.ts:30` / `:34`、v1 writer 3箇所が現役）。患部はリーダー側の1スキーマ pin であり、書き手に欠陥はない。e2e **17ファイル**が自前パーサ（`cid:requirements-analysis:ledger-count-mechanical-recalc` に従い列挙から機械再計算、Developer scan 報告値と一致）
- 未確定として引き継ぐ2点: (a) 非 e2e 側の患部件数 — Developer scan 報告 **14** vs Architect 述語出力 **29** で**不一致**、述語差が原因で本 RE では未確定 (b) e2e 17 の赤/緑内訳 — scan brief が「17 全て fail」と「`t-formal-verif` のみ green」を併記して内部矛盾。Architect は実読から「16 fail + 1 green」と再構成したが**再実測ではない**。いずれも修正着手前に実測で確定すること
- tNNN 予約: 使用済み最大 `t483`、次は **`t484`** から
- 詳細記録: `re-scans/260807-intent-2328-tests-e2e-au.md`（全数列挙・verbatim・実装上の注意6点・裁定候補5件の正本）

## 実行メタデータ（履歴、2026-08-07: 260807-stage-perf-report）

- Date: `2026-08-07`
- Base commit: `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（前回 RE の observed。`cid:reverse-engineering:rescan-base-ancestry` に従い HEAD 祖先かつ距離最小のものを選定。`git merge-base --is-ancestor b8e3e664f HEAD` exit 0 を実測。距離 **12 commits**）
- Observed commit: `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`（= 本 worktree HEAD、`git rev-parse HEAD` で実測。`cid:reverse-engineering:c2-observed-mainline-commit` により mainline 系譜のコミットを記録）
- 区間規模: **12 commits / 108 files changed（+5711 / −200）**。`amadeus/` record を除く実質変更は **29 files**
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- Focus: [Issue #2405](https://github.com/amadeus-dlc/amadeus/issues/2405) v2 — 監査シャード（全 intent 横断）と record から**ステージ別性能実測レポート**を決定的に生成する read-only CLI。集計軸は (a) ステージ所要時間（`STAGE_STARTED`→`STAGE_COMPLETED`、**idle/承認待ち減算後の実作業時間**）、(b) §12a レビューイテレーション数（record の `## Review — Iteration N`）、(c) センサー FAILED 率（`SENSOR_*` × stage slug）、(d) モデル帰属（#2279 の `Model` / `Model Source`、forward-looking）
- Scan mode: **DIFFERENTIAL refresh + xrev scan mode**（`cid:reverse-engineering:c1-xrev-scan-mode` / 単発 Issue への拡張 `c1-xrev-single-issue`）。#2405 のクロスレビュー2名（reviewer-1 / reviewer-2、いずれも CONFIRMED_WITH_REFINEMENTS）の verdict を Developer scan の一次入力とし、Architect が患部座標を observed 断面の verbatim 実読で二重化した
- **行番号引用の currency（実測による確定、免除の適用ではない）**: クロスレビューの対象 SHA は `75a1c198d` であり observed と一致しないため、`E-OBB5-RES13` の免除条件は文字どおりには満たさない。代わりに患部6ファイル（`amadeus-runtime.ts` / `amadeus-subagent-stats.ts` / `amadeus-reviewer-runtime.ts` / `otel/event-registry.ts` / `amadeus-observability.ts` / `.claude/skills/amadeus-session-cost/SKILL.md`）について `git diff --name-only` を `{b8e3e664f..HEAD}` と `{75a1c198d..HEAD}` の**両区間**で取り、いずれも空出力であることを実測した。**したがって両 verdict の全 file:line 引用は observed 断面で同一に解決する。** `audit-format.md` は区間内で変更されたが advisory-choice 節に限られ、stage / sensor / session イベントの記述は移動していない
- Verification: 本 RE では新規テストを実行していない（RE ステージ）。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。検証は observed 断面での `git rev-parse` / `git merge-base --is-ancestor` / `git diff --name-only` / `grep` / `find` / `sed` の実測と、患部の verbatim 直読による
- Current decision: **動いたのはコードではなくデータである。** 区間の4件のフレームワーク修正（#2387 / #2389 no-silent-drop、#2392 advisory recovery、#2393 degrade gate）は #2405 が消費する面のいずれにも触れず、**#2405 v2 のどの完了条件も区間によって無効化されていない**。実質的影響は監査シャードの増加に由来する数値2件のみ（下記「陳腐化した数値」）
- **⭐ 主要所見 D1 — 「clean window の中央値 0 秒」という反論は減算では成立しない。** 両クロスレビュアーは idle 混入を**フィルタ**（idle マーカーを含む窓を捨てる）で測り「clean な窓は median 0 秒 = trivial なステージしか clean でない」と結論したが、observed で**減算**（#2405 が規定するアルゴリズム）により再計測すると: `windows=1532` / raw median=674s p95=12188s / **net median=458s p95=7486s** / 減算で 0 になった窓 30 / 元から raw 0 の窓 394 / 減算率 **33.2%**（raw 1323.4h → net 883.8h）。ステージ別 net 中央値は `code-generation` 5,183s（n=123）から `delivery-planning` 297s（n=58）まで**一桁の判別力**を持つ。**減算は 1,532 窓をすべて保持する**のに対しフィルタは 74% を捨て、残差は `workspace-scaffold` / `workspace-detection` / `state-init` に支配される。すなわち #2405 の中心的完了条件は単に充足可能であるだけでなく、**指標を機能させている当のもの**である。⚠️ ただし「これらの net 値が実作業時間を近似する」ことは**未検証の仮説**であり、要件段が明示的に受容するかテストすべき（`cid:requirements-analysis:c7-upstream-universal-claim-unverified`）
- **陳腐化した数値2件（要件へ伝播させる前に訂正すること）**: **(a)** `Model` 属性を持つ監査行は **2 → 10**（両レビュアーは `75a1c198d` で 2 行を実測。増分 8 行は record-sync コミット `4a3da7d62` が `260807-failclosed-recovery-path/audit/` を取り込んだことによる）。`opus` + `sonnet` の**多様性が生じた**が「遡及的にはほぼ空」という結論は不変。`SUBAGENT_COMPLETED` 総数は**移動値**（Developer scan 時点 7,273 / Architect 再計測時点 7,274 — 本 RE セッション自身が追記する）で、Issue 本文の 7,151 はさらに古い。**転記せず再計測すること**。**(b)** 使用済み最大テスト番号は **t465 → t480**（区間で t466 / t470 / t480 が着地）
- tNNN 予約: 使用済み最大は **t480**、**新規は t481 以降**（`cid:code-generation:swarm-test-number-reservation`）。前回 RE の記録（`re-scans/260807-failclosed-recovery-path.md:111,300` の「使用済み最大 = t465 … 新規は t466 以降」）は**陳腐化している**
- **記述の currency に関する注記**: #2385 期に記録された主張のうち本 RE が再計測した項目（`Model` 行数、`SUBAGENT_COMPLETED` 総数、最大 tNNN）は**本節の値が優先する**。再計測していない項目は前回断面の記述がそのまま有効である
- 主要所見（続き）: **①未使用の正規化層** — `amadeus-journal.ts` に export 済みのスキーマ非依存リーダー（`journalRecordField:130` / `readJournalRecords:534` ほか）が実在し、doc コメント `:113-129` が逐語で "so they never branch on the schema version" と述べるが、`amadeus-subagent-stats.ts` はこれを迂回している。#2405 の「共通化する正規化層」条件は core に既に答えを持つ可能性がある。**反対圧力**: subagent-stats `:21-23` は "deliberately does NOT import amadeus-lib.ts" と依存方向の裁定を記録しており、共有層の採用は設計判断であって機械的な勝ちではない。**②遡及不能な既存読み手** — `amadeus-runtime.ts summary` は `:982-984` が "never re-walks audit" と宣言し `:1067-1070` が runtime-graph.json のみを読む。`.gitignore:71` によりグラフは untracked（`git ls-files | grep -c` → 0）で、過去 intent のグラフは存在しない。`/amadeus-session-cost` はその薄いラッパで単一ワークフロー限定。**③命名の衝突** — `amadeus-observability.ts`（384行）はサブコマンド 0 の opt-in **fail-open** 書き手であり、提案されている読み手は fail-closed。名前空間は使用不可
- 監査面の構造事実3件: **(i)** `Harness` を宣言するイベントは存在せず、`Model` / `Model Source` は subagent イベント（`event-registry.ts:616` / `:629`）にのみ現れる。**(ii)** `WORKFLOW_UNPARKED`（`:128`）と `HUMAN_TURN`（`:418`）は requiredAttributes が `[]` で `Stage` を運ばない — idle 減算は stage キーではなく intent 内の時刻順序で帰属させる必要がある。**(iii)** `SENSOR_*` は `Stage slug`、stage ライフサイクル系は `Stage` の別キーであり混同不可。加えて `GATE_APPROVED`（`amadeus-state.ts:3420`）と `STAGE_COMPLETED`（`:3431`）は**同一 try ブロック**で emit されるため、idle 区間 `AWAITING → GATE_APPROVED` は窓の**末尾**に位置する。`isoTimestamp`（`amadeus-lib.ts:7740-7742`）はミリ秒を書き込み時点で捨てるため秒未満は構造的に解像不能
- 除外バケット（#2405 の無音スキップ禁止条件により全件が報告対象）: 未対応 `STAGE_STARTED` **35** / 孤児 `STAGE_COMPLETED` **5** / 未クローズ `STAGE_AWAITING_APPROVAL` **7** / 秒粒度で 0 に潰れた窓 **394** / サフィックス付きレビュー見出し **3**（`## Review — Iteration 2（rebase後・裁定A反映）`）/ `{unit-name}` リテラルパス **2 ファイル 2 intent**（`260725-mirror-review-fixes` / `260802-registry-drift-guard`）
- レビューブロックのコーパス（observed で Architect 再計測）: **1,010 ブロック / 691 ファイル**（クロスレビューの 1,003 / 129 対 687 を訂正。ファイル数は reviewer-2 側が正しい）。書き手は `amadeus-reviewer-runtime.ts:96-97`、parse 契約は `reviewField:672-677` の「ちょうど1件一致」、読み手が写すべきは `:660` の二段マッチ（寛容な `/^## Review(?:[ \t].*)?$/gm` 走査 → 厳格なマーカー完全一致）
- Requirements Analysis へ送る裁定候補: **(1)** 正規化層の所在 — `amadeus-journal.ts` の共有層を採るか、subagent-stats の依存方向裁定（`:21-23`）を尊重して独立実装するか。**(2)** 未クローズ `STAGE_AWAITING_APPROVAL` 7 件の扱い（窓終端まで idle / parse 不能として報告）。**(3)** D1 の net 値が実作業時間を近似するという仮説を明示受容するかテストするか。**(4)** `{unit-name}` バケットの表示形（そのまま出す / 既知欠陥として注記）。**(5)** 新ツールの命名（`amadeus-observability` は使用不可で確定）。**(6)** 秒粒度で潰れた 394 窓の報告形。詳細は `re-scans/260807-stage-perf-report.md` § 9 を正本とする
- Updated artifacts: `architecture.md` / `api-documentation.md` / `code-structure.md` / `code-quality-assessment.md` / `component-inventory.md` に本 intent の現在断面を追加。`business-overview.md` / `technology-stack.md` / `dependencies.md` は区間に該当変更がないため 1 行の観測記録のみ（根拠は per-intent record § 10）。直前の現在断面 `260807-failclosed-recovery-path` は全成果物で本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）
- Per-intent record: `re-scans/260807-stage-perf-report.md`


## 実行メタデータ（履歴、2026-08-08: 260807-subagent-start-pair）

- Date: `2026-08-07`
- Base commit: `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`（`cid:reverse-engineering:rescan-base-ancestry` に従い、`re-scans/*.md` の observed 候補から HEAD 祖先かつ距離最小のものを選定。距離 **2 commits** = 波1 #2352 修正 #2413 + record sync #2416）
- Observed commit: `5f2ad9195d9ce3ea55d6bf3d34509f2c5ca2c12b`（= 本 worktree HEAD = `origin/main` 系譜。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #2297](https://github.com/amadeus-dlc/amadeus/issues/2297)（live `.claude/settings.json` に `PreToolUse` 配線が無い）+ [Issue #2303](https://github.com/amadeus-dlc/amadeus/issues/2303)（dispatch tool 語彙が実 payload と不一致）の**ペア**。どちらか一方の修正では `SUBAGENT_STARTED` は 0 件のままであり、両者は同一観測結果に対する**直列な2つの必要条件**
- Scan mode: **xrev scan mode**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— #2297 / #2303 とも起票者以外2名の独立エビデンス付き verdict（計 **4 verdict**、いずれも検証 SHA `75a1c198d5101c1df2bee21f960f01ae1d7973d3` 明記）でクロスレビュー成立済み。Developer scan の一次入力とし、Architect の observed 断面 verbatim 実読で二重化した
- 行番号引用の currency: review SHA `75a1c198d` → observed で `packages/framework/core/tools/amadeus-lib.ts` の hunk は `@@ -227,17 +227,31 @@`（`resolveProjectDir`、**+14行**）と `@@ -6670,7 +6684,7 @@` の**2つのみ**。総行数 8793 → 8807。SUBAGENT 領域は hunk 間（`:243` で閉じ次は `:6684`）にあり、**機械シフト +14** で `SUBAGENT_DISPATCH_TOOL` `:4114`→**`:4128`**、ガード比較行 `:4147`→**`:4161`**、`subagentStartFields` シグネチャ `:4146`→**`:4160`**。**述語・文字列は無変更**（base 断面の grep でも `4114`/`4147` を返し、シフト量は機械確認済み）
- Verification: coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い**一切行っていない**。テスト実行・ファイル書込・git 状態変更・engine 操作もゼロ。検証は observed 断面の verbatim 実読（`sed` / `awk` / `grep` / `jq` / `git ls-files` / `git diff`、exit code を記録）による
- Current decision: **患部は「単一の emit 鎖に、独立な2つの遮断点が同時に存在する」構造である。** 判定は `amadeus-log-subagent-start.ts:64-65` の1箇所、emit は同 `:98` の1箇所、判定関数の消費者も1箇所で**迂回路が存在しない**。したがって (a) seam 未配線（#2297）と (b) 判定が実 payload を拒否（#2303）のどちらか一方でも成立すれば emit は構造的にゼロになる
- 主要所見: **①live 配線の欠落は 2 件** — `grep -c 'PreToolUse' .claude/settings.json` → **0 / exit=1**。加えて SessionStart の `plugin-compose` も欠落しており、**#2297 本文（PreToolUse のみ）より1件広い**。両者は「dispatcher スロット不在」という同一の構造原因から出て、包含述語1本で同時に閉じる。**②3面の tracked 非対称** — 正本 example（tracked、13 hook、直接パス形）/ 投影 example（**untracked**、byte 一致）/ live（tracked、11 hook、**100% dispatcher 形**）。⇒ drift ガードの ground truth は**正本側でなければならず**、投影面基準は build 依存の偽赤/未検出を生む。テキスト等価比較も成立せず、正規化キーは `(event, matcher, hook script 名)` の三つ組。**③live を検査する面が存在しない** — settings を読む既存ガード6面はすべて example 側を読む（`t416`/`t418` のみ live をパス membership として参照、hook 集合は不検査）。**④dispatcher の部分欠 throw** — `ensureCompleteHookTree`（`amadeus-dispatch.ts:50-57`）は全スロット実在を要求し、全欠なら exit 0 だが**部分欠は throw で exit 1**（全フックを巻き込む）。スロット追加は build 生成とセットでなければならない。追加候補2件（`amadeus-log-subagent-start.ts` / `amadeus-plugin-compose.ts`）は正本・自己インストール面の両方に**実在済み**。**⑤語彙患部の消費者は1箇所** — `SUBAGENT_DISPATCH_TOOL`（`:4128`）を読むのは `:4161` のガードのみ。**⑥`undefined` 短絡は kimi の存在条件** — kimi payload（`amadeus-kimi-lib.ts:732-741`）は3キー固定形で `tool_name` を含まず、`payload.tool_name !== undefined &&` の短絡だけが通している。**⑦テストピン 15 箇所 / 3ファイル**（`grep -rn 'tool_name: *"Task"' tests/` 実測、レビュー時点と件数・所在とも不変）、駆動形は正本直 import / 生成物 import / フック spawn の**3種**。**⑧doc 面はレビューの4面より広い** — `06-hooks-and-tools.md`（+ja）と `23-telemetry-schema.md`（+ja）が未列挙で追加。ただし matcher `^Task$` の記述（`06:46/:215`、ja `:44/:213`、`settings.json.example:62`）は**表示名の名前空間であり修正対象外**
- 新規発見（両 reviewer 未検出）: **23-telemetry-schema の cite が完全に stale** — `docs/reference/23-telemetry-schema.md:194` と `.ja.md:189` が引く `tools/amadeus-lib.ts:4430` / `:4456-4457` は、observed では `:4430` = `// The recorded repo set for an intent …`、`:4456` = `}`、`:4457` = 空行という**無関係な行**。正しい引用先は `:4128`（定数）/ `:4160-4161`（ガード）。#2303 の doc 同期はこの2面の cite 訂正も射程に入る。あわせて **両語彙受理の既存前例**が `tests/integration/t189-compose-dispatch.sdk.test.ts:78-81` に実在する（`(t) => t.toolName === "Task" || t.toolName === "Agent"`、両 reviewer 未言及）
- Unit A / Unit B の関係: ファイル単位で**非交差**（Unit A = live 設定・dispatcher・新規ガード / Unit B = `amadeus-lib.ts`・テスト3ファイル・core フック・doc 群）。⇒ worktree 隔離の並行実装が可能。ただし**論理的には直列**で、どちらか一方だけでは `SUBAGENT_STARTED` は 0 件のまま。交差候補は2件（`06-hooks-and-tools.md` の hook インベントリ節が `t132` の照合対象、Unit A が方式 (b) を採る場合の `settings.json.example`）で、いずれも設計段の確認事項
- 閉包の非対称: **Unit B は既存 API 形で決定的に実証可能** — `t-log-subagent-start.integration.test.ts` の `taskDispatch`（`:104-108`）+ `runHook` + `fieldsFor(proj,"SUBAGENT_STARTED")` の形をそのまま転用できる。**Unit A の閉包はテスト内で構造的に不能** — 既存テストは `CLAUDE_PROJECT_DIR` を fixture へ向けフックを直接 spawn するため `.claude/settings.json` を読まない。live 配線の閉包は drift ガード（正本 ⊆ live の正規化包含）が代替的に担う設計になり、真の end-to-end 実証は live dispatch の監査観測を要する（`cid:build-and-test:verdict-names-unverified-facets` の適用対象）
- 事実と仮説の分離: **事実（実測）** = live の hook 11件と `PreToolUse` 不在 / 3面の tracked 状態 / `HOOK_PATHS` 10スロットと4つの fail-closed 契約 / example distinct hook script 12 と差集合2件の一致 / emit 鎖の単一性 / 定数消費者1箇所 / kimi payload の3キー固定形 / テストピン 15箇所 / doc 面の全数と stale cite / 既存ガード6面が live 不検査 / 交差判定。**仮説（断定不可）** = (a) live に `plugin-compose` が無いことでこのリポジトリ自身の plugin 自動 compose が発火していない可能性（未実測）/ (b) dispatcher スロット追加が `t132` の3面照合に影響しないこと（推定、設計段で要確認）/ (c) 旧版ハーネスが旧語彙を送っていた場合の後方非互換（未実測）
- 未解決の引き継ぎ: **①例外5件の機序が未確定** — 両 Issue の reviewer が独立に検出し、いずれも「確定できず」。`260805-subagent-type-guard` の 2026-08-06T02:31:14Z〜03:40:38Z に `SUBAGENT_STARTED` が5件のみ存在（`Agent Type` は Claude Code ペルソナ名 — `amadeus-developer-agent` ×4 / `amadeus-architecture-reviewer-agent` ×1）。本スキャンでも新たな説明材料は得られず（当該 worktree 不在、`git log --all` に該当コミットなし、observed でも `:4128` は旧語彙、live に `PreToolUse` なし）。**配線も語彙も壊れているのに5件だけ通った**という事実は現在のガード理解が不完全である可能性を示し、修正形の妥当性判断に直接効く。**②`plugin-compose` 同梱の可否**は #2297 本文のスコープを超えるため要裁定（`cid:requirements-analysis:implementation-deviation-election`）。**③live 配線の end-to-end 閉包**はテスト内で構造的に実証不能
- Requirements Analysis へ送る裁定候補: **(1)** Unit A の配線方式 — (a) dispatcher スロット2件追加 + live を dispatcher 形で配線（既存11件と形式一致、ガードは単一述語で閉じる、`ensureCompleteHookTree` の部分欠 throw の母集団が広がる）か (b) live に直接パス形で配線（example と形式一致、混在が発生、ガードは2項述語）。**(2)** `plugin-compose` を同梱するか（ガードを入れるなら構造的に要求される一方、#2297 本文のスコープ拡大）。**(3)** Unit B の修正形 — C1 単一語彙置換 / C2 両語彙受理 / C3 拒否リスト化。**C2 は既存15ピンが全件緑のまま通るため偽 green リスクが最大**で、両側実測が必須。C3 は phantom emit リスクが最大。**(4)** 例外5件の機序解明を受け入れの前提に含めるか。**(5)** doc 同期の範囲 — レビュー4面か、実測の全面（`06-hooks-and-tools` +ja、`23-telemetry-schema` +ja の stale cite 訂正、`audit-format.md:181`）か。matcher 記述は対象外である旨を要件に明記するか。**(6)** 新設 drift ガードの ground truth と正規化キーの確定
- Updated artifacts: 共有8成果物の現在断面を更新し、直前の現在断面（`260807-projectdir-worktree-fix`）を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。per-intent record `re-scans/260807-subagent-start-pair.md` を新設
- Per-intent record: `re-scans/260807-subagent-start-pair.md`

## 実行メタデータ（履歴: 260807-merged-pr-convergence）

- Date: `2026-08-07`
- Base commit: `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（= 直前の現在断面 `260807-failclosed-recovery-path` の observed。`cid:reverse-engineering:rescan-base-ancestry` に従い `git merge-base --is-ancestor b8e3e664f HEAD` exit 0 を実測 — HEAD 祖先かつ距離最小）
- Observed commit: `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`（= 本 worktree HEAD。`git rev-parse HEAD` で一致を実測。base が origin/main 系譜であり HEAD はそこから 12 commits の mainline 直系 — `cid:reverse-engineering:c2-observed-mainline-commit`）
- 区間規模: **12 commits / 108 files changed（+5711 / −200）**。`amadeus/spaces` record を除く実質変更は **30 files**（`git diff --name-only b8e3e664f..HEAD | grep -v '^amadeus/spaces'` = 30。Developer scan 申告の 29 とは集計フィルタ差 — ファイル列挙を正とする）。内訳: engine fix #2393（declare-units-done）、advisory fix #2392、no-silent-drop fix #2387/#2389、plugin opt-in #2388（`amadeus/config.json:41` に `"pr-convergence"` 追加）、docs/metrics/coverage 台帳
- Scope: `self-feature` 系（Issue #2401 — merged PR に対する収束レポートの扱い）、Brownfield、単一 repo `amadeus`
- Focus: [Issue #2401](https://github.com/amadeus-dlc/amadeus/issues/2401) — **マージ済み PR（MERGED）に対して pr-convergence CLI が landed を表現できない**。**患部 `plugins/pr-convergence/` 配下の区間内変更は 0 件**（`git diff --name-only b8e3e664f..HEAD -- plugins/pr-convergence/` = 0 — 患部は observed から不変）
- Scan mode: DIFFERENTIAL refresh。**xrev mode は主張しない** — #2401 のクロスレビューコメント2件は独立実測 verdict の体裁を持つが、GitHub 上の著者は起票者本人アカウント（j5ik2o）であり `cid:reverse-engineering:c1-xrev-single-issue` の「起票者以外2名」が成立しない（直前 intent 260807-failclosed-recovery-path と同一の判定）。代替の接地: verdict を一次入力とし、conductor / Developer の HEAD 断面 verbatim 直読で二重化した（本節の全 file:line は Architect が `4a3da7d62` 断面で独立再確認済み）
- Current decision: **landed（マージ着地）は converged / override のどちらの refuse 分岐にも乗らない第3状態として新設する方針**。根拠: (a) `evaluateConvergence`（`pr-convergence-predicate.ts:180-192`）の CLEAN 必要条件は MERGED PR で恒久不成立、(b) `MergeStateStatus` union（`:90-98`）に MERGED は無く未知値は throw（`:117-121`）、(c) report verb の非収束 refuse（`pr-convergence-cli.ts:438-447`）と override の already-converged refuse（`:468-474`）はいずれも landed を表現できない。語彙追加は **3面同時**（`ConvergenceReport` kind union `cli.ts:61-76` + `renderReport` `:89-129` + sensor `amadeus-sensor-pr-convergence-report-format.ts` の kind 閉集合 `:69`・整合分岐 `:122-130`）が必須
- 主要所見: ① GraphQL `PR_STATE_QUERY`（`pr-convergence-gh-runner.ts:191-195`）は `mergeable mergeStateStatus` のみで state/merged/mergeCommit 未取得 — landed 判定には fail-closed parse（`RawPrState :76-79`）を弱めないフィールド追加が要る。② CLI verb は `status|report|override` の閉集合（`cli.ts:320`）。③ sensor は core→plugin import 禁止（ヘッダ `:16-20`）で drift 防止は t450 の renderReport 由来 fixture。④ stage 文書の「Convergence is not merge」（`plugins/pr-convergence/stages/pr-convergence.md:34-37` / `:200-202`）との表面矛盾回避が文書面の制約。⑤ canonical は repo root `plugins/`（`scripts/package.ts:86-87`、`.claude/plugins` は未追跡生成物）。⑥ core 側に `"pr-convergence-report"` ハードコード 0 件。⑦ coverage allowlist の pr-convergence 行ピンは `tests/.coverage-patch-allowlist.json:6365-6398` — 行挿入時は機械 remap 規律（`cid:code-generation:c1-allowlist-mechanical-remap`）該当
- テスト現況: t444〜t450 の pr-convergence 系はすべて in-process（`t444-stage-frontmatter-seams` / `t445-stage-frontmatter-compose` / `t446-pr-convergence-predicate` / `t447-pr-convergence-ledger` / `t448-pr-convergence-cli` / `t449-pr-convergence-packaging-e2e` / `t450-pr-convergence-report-format-sensor`）。landed 新分岐は既存 refuse テストと両立する（既存 assert は converged/override の2状態を pin しており第3状態の追加は非破壊）
- tNNN 予約: 区間内で t466 / t470 / t480 が着地し、使用済み最大は **t480**。**新規は t481 以降**（`ls tests/unit tests/integration tests/smoke tests/e2e | grep -oE '^t[0-9]+'` の最大値実測）
- Updated artifacts: 本ファイルの現在断面を更新し、直前の現在断面 `260807-failclosed-recovery-path` を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。`architecture.md` / `component-inventory.md` には本 intent の観点を最小追記（既存の pr-convergence 記述が実在するため）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）
- Per-intent record: `re-scans/260807-merged-pr-convergence.md`

## 実行メタデータ（履歴: 260807-projectdir-worktree-fix）

- Date: `2026-08-07`
- Base commit: `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（`cid:reverse-engineering:rescan-base-ancestry` に従い、`re-scans/*.md` の observed 候補 109 件超から HEAD 祖先かつ距離最小のものを選定。距離 12 commits）
- Observed commit: `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`（= 本 worktree HEAD = `origin/main` 系譜。`cid:reverse-engineering:c2-observed-mainline-commit` により mainline 系譜のコミットを記録）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #2352](https://github.com/amadeus-dlc/amadeus/issues/2352) — **`resolveProjectDir` の worktree marker 段欠落による本線 record の無音汚染**。worktree セッションが CLI ツールを本線の絶対パスで起動すると、record の書き先が本線へ倒れ、警告も例外も出ない
- Scan mode: **xrev scan mode**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— #2352 は起票者以外2名の独立エビデンス付き verdict（reviewer-1 / reviewer-2、検証 SHA `75a1c198d` 明記）でクロスレビュー成立済み。conductor / Architect の observed 断面 verbatim 実読で二重化した
- 行番号引用の currency: review SHA `75a1c198d` → observed で `amadeus-lib.ts` は **`+143/-0`**（hunk header `@@ -4982,0 +4983,143 @@`、全行が `:4983` 着地）。患部区間 210-360 は `cmp` **IDENTICAL / exit=0**。したがって**患部引用のシフト量はゼロ**であり、`resolveProjectDir` = `:226-250` / `resolveProjectDirFromHook` = `:310-347` は observed でそのまま有効。**これは免除の適用ではなく、区間実測による currency の確定**である（唯一シフトしたのは射程外の stale comment 指摘 `:6530` → observed `:6673`）
- Verification: coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。検証は observed 断面の verbatim 実読（`sed` / `grep` / `git show` / `git log -L` / `git ls-files` / `gh pr list`、いずれも exit code 記録）と、repo 外 scratch での **5ケース決定的再現**（fixture の lib は正本と `cmp` byte 一致、env は `env -u CLAUDE_PROJECT_DIR` で明示除去、全 exit=0）による
- Current decision: **患部は「同一責務の2実装が非対称に進化した」構造債務であり、区間内の退行ではない。** `resolveProjectDir`（CLI 側、4段）には hook 側の marker 段2つ（`:317` payload cwd / `:329-330` cwd 祖先探索）が無く、さらに段2 の相対順位も異なる（hook 側は marker 付き payload cwd が env に勝つが、CLI 側は env が無条件に勝つ）。marker 段は hook 側にのみ導入された（`392a2d781` = #641 / `e12259ba7` = #1482）
- 主要所見: **①loud path ゼロ** — `resolveProjectDir` に警告・例外は1つも無い（`grep "console\|warn\|throw"` → exit=1）。誤った書き先が誤りとして観測されない「偽の隔離」。**②marker 述語の構造的盲点** — `.claude/tools/` は完全に未追跡（`git ls-files .claude/tools` → **0件**、`.gitignore:24`）。したがって `bun run build` 前の fresh worktree は `hasWorkspaceMarker`（`:283-286`、`amadeus/` と `<harness>/tools/` の両方がディレクトリ）を構造的に満たさず、**marker ベースのガードは build 前 worktree を検出できない**。**③テストの非対称** — CLI 側を pin する `t144` は `covers:` に `function:resolveProjectDir` を含む（`:4`）がケース B の被覆が無く、hook 側は `t202` / `t296` / `t230` の3本が pin する。**ケース B を固定するテストは repo 全域で不在**。**④allowlist が許可する形を誰も発行していない** — 正本 `packages/` の起動行は相対形 **31** / 絶対形 **1**（唯一の絶対形は allowlist エントリ自身）。**⑤文書の逆向き指示** — `stage-protocol.md:511` は絶対形を推奨するが、その形がケース B を生む（同文中にサブシェル代替が既に明記）
- 5ケース再現（repo 外 scratch、全 exit=0）: A（cwd=main / lib=main / env UNSET）→ 両者 main。**B（cwd=worktree / lib=本線絶対 / env UNSET）→ CLI=main ← 欠陥 / hook=worktree**。C（cwd=worktree / lib=worktree / env UNSET）→ 両者 worktree。**C+env（cwd=worktree / lib=worktree / env=main）→ 両者 main**。B+payloadCwd → CLI=main / hook=worktree。**欠陥は observed HEAD で現存**し、両レビュアーの表と完全一致
- 棚卸し（observed 再計数）: `core/tools` の `resolveProjectDir(` 出現 = **97**、うち非 caller 2件（`:226` 定義行 / `:6673` stale comment）→ 実 call site **95 / 15 ファイル**。`core/otel/relay.ts:777` に1件を加えて**合計 96**。`"--project-dir"` を parse するツール = **18ファイル**。名前シャドウ `packages/framework/core/hooks/amadeus-statusline.ts:31` は lib 関数の caller ではない（grep 棚卸しの誤カウント源）
- 測定面の精密化（Developer scan からの refinement）: 相対形 `bun .claude/tools/` の「113」はセルフインストール面 `.claude/skills/`（未追跡の投影物）での計数であり、正本 `packages/framework/harness/claude/skills/` は **31**。修正の対象面を決めるときに両者を混同しない
- 同期面: allowlist は**2ファイル同時変更**を要する — 正本 `packages/framework/harness/claude/settings.json.example:10` とセルフインストール面 `.claude/settings.json:39`（後者は **tracked**、`git ls-files --error-unmatch` exit=0。`.claude/**` は gitignore 対象だが tracked ファイルは ignore を上書きする）。`dist/` 配下は未追跡生成物のため同期対象外
- 遡及性: 同根の先例は **#796**（CLOSED、`7e6a7c33e` = `fire` への `--project-dir` 配線 = 段1 での点回避）/ **#1450**（CLOSED、`04efcd42c` = 呼び出し側の点修正）/ **#1287**（OPEN、解決順の再設計 = ADR 前提）。**2件の先例はいずれも呼び出し側の点修正で梯子に触れておらず、#2352 は同じ根の4件目**である
- 交差: `gh pr list --state open` → **0件**（exit=0）。base→observed の 12 commits も resolver 領域を触っていない（§行番号 currency の `cmp` で証明済み）
- 事実と仮説の分離: **事実（実測）** = 梯子の非対称と loud path 不在 / 実 call site 96 / marker 段の導入コミット2件と `392a2d781` が CLI を触っていないこと / `.claude/tools` 未追跡 / テスト非対称 / `stage-protocol.md:511` の逆向き指示 / 同期面2ファイル / 先例2件が点修正 / 交差ゼロ / 5ケース再現。**仮説（断定不可）** = (a) #641 時に CLI 側が「検討されず」か「検討して見送られた」か（コミット記録は前者を示唆するが証拠の不在）/ (b) 実運用でケース B が発生した監査証跡は未探索（頻度未測定）/ (c) clone 内 worktree の marker 成立/不成立の全数再census は worktree 隔離ガードにより実行不能（構造的根拠のみ確定）
- Requirements Analysis へ送る裁定候補: **(1)** 是正の主軸をどこに置くか — `resolveProjectDir` への marker 段追加 / 段順の再設計（env の降格）/ 段1（明示 `--project-dir`）の正規形化。**marker 段の追加だけではケース C+env が閉じない**ことが実測で確定している。**(2)** 段順再設計を採る場合の #1287 との射程境界（#1287 は ADR 前提の enhancement として OPEN）。**(3)** loud path の形 — 警告か例外か、返り値型の変更（確信度の表現）か。96 call site すべてへ伝播する点の扱い。**(4)** ケース B の回帰テストの置き所 — `t144`（`dist/` を読むため `bun run build` 依存、`:37-38`）か `t202` 系譜（正本を直 import）か。**(5)** allowlist と `stage-protocol.md:511` の是正範囲（完了条件1/2）を本 intent に含めるか、主軸（完了条件3）の裁定後に決めるか。**(6)** `t144` test 5 のタイトル（`"CWD-marker rung"` が実体の段4を指す）と `:6673` の stale comment の是正を同 intent に含めるか
- Updated artifacts: 共有8成果物の現在断面を更新し、直前の現在断面（`260807-failclosed-recovery-path`）を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。per-intent record `re-scans/260807-projectdir-worktree-fix.md` を新設
- Per-intent record: `re-scans/260807-projectdir-worktree-fix.md`


## 実行メタデータ（履歴: 260807-autonomy-reachability）

- Date: `2026-08-07`
- Base commit: `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（`cid:reverse-engineering:rescan-base-ancestry` に従い、HEAD 祖先かつ距離最小の observed を選定。`git merge-base --is-ancestor b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d 4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0` = exit 0 を実測。直前の現在断面 `260807-failclosed-recovery-path` の observed）
- Observed commit: `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`（= `origin/main` tip = 本 worktree のベース。`git rev-parse HEAD` で一致を実測。`cid:reverse-engineering:c2-observed-mainline-commit` により mainline 系譜のコミットを記録）
- 区間規模: **12 commits / 108 files changed（+5711 / −200）**（`git log --oneline` / `git diff --name-only` / `git diff --shortstat` の実出力からの転記）
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- Focus: **Intent autonomy の到達性** — [#2378](https://github.com/amadeus-dlc/amadeus/issues/2378)。宣言できない（`--autonomy` が birth 時に使えない）／宣言しても効かない（state 投影の非対称）／宣言が誰にも見えない（導線ゼロ）の3層
- Scan mode: DIFFERENTIAL refresh **+ xrev mode**。#2378 はクロスレビュー2名が成立している（run `xrev-2378-20260807T110535Z`）ため `cid:reverse-engineering:c1-xrev-single-issue` が発動する。**行番号再解決は不要** — xrev の検証 SHA `4a3da7d62` が observed と完全一致し（免除条件の充足）、かつ差分区間が autonomy 系ファイルを一切触っていないことも独立に実測した（区間実測による currency の確定）
- Verification: 本 RE では新規テストを実行していない。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。接地手段は observed 断面での `git log` / `git diff` / `grep` の実測と患部の verbatim 直読、および本 intent 実行中の**ライブ実測4件**
- Current decision: **到達性の欠落は3層に分かれ、いずれも「機構は実装済み・接続が欠けている」形である。** ①宣言できない — `amadeus-orchestrate.ts:1290-1294` の judgment 0（`stateContent === null`）が発火し、Branch 4ab（`:2952-2958`）が birth 分岐の手前に置かれているため、birth と `--autonomy` の同時宣言は必ず失敗する。②効かない — `Intent Autonomy Mode` を state へ書くコードは repo 全体で `amadeus-bolt.ts:1075` の1箇所のみで `applyProductionAutonomyMode` の外側にあり、C13（`amadeus-orchestrate.ts:1354`）経由の宣言では state 3フィールドが更新されない。③見えない — `--autonomy` の導線は `stage-protocol.md:125` の1件のみで、conductor が読む8面（SKILL.md 6 + commands 2）すべてで0件
- **最も影響範囲が広い所見**: state 投影の非対称（②）の読み手は**6系統**ある（`amadeus-lib.ts:4942` statusline / `amadeus-orchestrate.ts:1894-1899` swarm スケジューリング / `amadeus-stop.ts:150-154` 継続キャップ / `:160-162` budget mode / `:196-198` question carve-out / `amadeus-log.ts:180` guard 免除）。とくに `amadeus-stop.ts:196-198` は state を**先に**読み `semi` でなければ projection を読まずに `false` を返すため、**`--autonomy semi` は、それが開くために作られた当の question carve-out を構造的に開けない**
- **xrev verdict の訂正2件**: **(1)** 第3の理由コード `AUTHORITY_BOUNDARY` は production に存在しない（全域 grep で intent record 4件のみ。`260805-semi-redefine-autonomy-f/.../component-methods.md:111` が削除理由を、同 `business-rules.md:17` の R5 が2値固定を明記）。**(2)** advisory 起点の起動判断は「`InteractionKind` 4値のどれにも該当しない」という G2 の主張は誤り — `amadeus-advisory-choice.ts:521` が `kind: "question"` として構成済みで、`:576-586` が `run-now` の無人解決を許す。**完了条件6の後半は実装済みであり、残るのは `plugins/*/stages/*.md:27` の docs drift のみ**（要件を縮小できる）
- **計測述語の訂正**: 完了条件4の回帰計測は `INTENT_AUTONOMY_TRANSACTION_COMMITTED`（`amadeus-intent-autonomy-replay.ts:24`）を使う。`AUTONOMY_MODE_SET` は legacy で**発行点ゼロ**（`amadeus-bolt.ts:7` 逐語「AUTONOMY_MODE_SET remains replay/doctor-only legacy data.」、`amadeus-intent-autonomy-production.ts:116` は読むだけ）。Issue 本文と xrev の母集団選定が legacy 語彙に依存しており、ベースライン自体の再定義が要る（C2 = 231件 / 63 intents は xrev 2名が再現不能と判定済み）
- **ライブ実測4件（本セッション内）**: (a) birth と `--autonomy` の同時宣言が拒否された。(b) `--autonomy semi` 宣言後も `amadeus-state.md` の `Intent Autonomy Mode` が `none` のまま残存し `--status` のみ `semi` を表示した。(c) 発行イベントは `INTENT_AUTONOMY_TRANSACTION_COMMITTED` であり `AUTONOMY_MODE_SET` ではなかった。(d) `review-auto-decision` で3件キューの2件目が `PROVENANCE_REQUIRED` で失敗した（`amadeus-autonomy-review-production.ts:376` の `latestTurnIndex <= consumedTurnIndex`、batch 経路は存在しない）
- テスト現況: `--autonomy` の現行挙動は `tests/integration/t450-autonomy-flag-branch.test.ts:83` と `tests/unit/t450-autonomy-flag-apply.test.ts:95` で**逆向きにピン留め済み**のため、birth-time 宣言は実装段で着手せず要件段の仕様裁定とテスト契約の明示改訂をセットで確定する（`cid:reverse-engineering:c1-pinned-behavior-ruling`）。`--autonomy` を含む grep は `tests/` 配下に0件で、CLI flag と help / SKILL の導線 parity を検査するテスト自体が repo に存在しない。`SCOPE_OUT` は戻り値の assert のみで audit 出現の検査は0件
- Requirements Analysis へ送る裁定候補: **(1)** birth-time 宣言の実現形（Branch 4ab を birth 後段へ移すか、judgment 0 に latch を持たせるか）と t450 系2テストの明示改訂。**(2)** `authorizationReason` の可視化形（audit emit か preview 列挙か）と、判断が実効を持つのは semi 側のみである点の明記（full は `ALL_INTERACTIONS` で4値全許可）。**(3)** engine 迂回質問の観測手段（`QUESTION_ANSWERED` への属性追加か sensor か）。**(4)** 完了条件4のベースライン再定義。**(5)** 導線是正の8面（SKILL.md 6 + commands 2）と `claude SKILL.md:248`「AUTONOMY IS NEVER INFERRED」との整合、`stage-protocol.md:135` の semi 版 `decide-question` 手順の新設。**(6)** 完了条件6の要件縮小（docs drift のみ）。**(7)** 完了条件1と5の着地順序（導線だけ先行させると「書いてあるのに動かない」導線を作る）。**(8)** finding 4 の契約変更3点セット（`:376` 単調性 / `:392-397` digest / `:405` `commandOccurrenceId`）
- Updated artifacts: 本ファイルの現在断面を更新し、直前の現在断面 `260807-failclosed-recovery-path` を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。共有8テーマ成果物（`architecture.md` ほか）は本文を書き換えていない — 既存の autonomy 関連記述はすべて observed SHA 付きの履歴節であり、当時の断面として正しいため（詳細は per-intent record）。per-intent record `re-scans/260807-autonomy-reachability.md` を新設
- Per-intent record: `re-scans/260807-autonomy-reachability.md`


## 実行メタデータ（履歴: 260807-failclosed-recovery-path）

- Date: `2026-08-07`
- Base commit: `7060956c5617125dd2f4e284957aa180cb306484`（`cid:reverse-engineering:rescan-base-ancestry` に従い、`re-scans/*.md` の observed 候補 109 件から HEAD 祖先かつ距離最小のものを選定。距離 76 commits）
- Observed commit: `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（= 本 worktree HEAD = `origin/main`。`git rev-list --left-right --count origin/main...HEAD` = `0 0`。`cid:reverse-engineering:c2-observed-mainline-commit` により mainline 系譜のコミットを記録）
- 区間規模: **76 commits / 1223 files**（`+63856 / −3121`）。`amadeus/` record を除く実質変更は **483 files**
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal、Test Strategy: Comprehensive
- Focus: **fail-closed ガードの回復経路不在3件** — [#2313](https://github.com/amadeus-dlc/amadeus/issues/2313)（no-silent-drop evidence reconcile の `REBIND_NON_IDENTITY_DRIFT` 恒久赤）/ [#2330](https://github.com/amadeus-dlc/amadeus/issues/2330)（advisory choice store の schema 1→2 回復経路）/ [#2358](https://github.com/amadeus-dlc/amadeus/issues/2358)（degrade 経路で全 unit 被覆後にゲートが発行されない）。実装引き継ぎの正本は [#2385](https://github.com/amadeus-dlc/amadeus/issues/2385)
- Scan mode: DIFFERENTIAL refresh。**xrev mode は主張しない** — `cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue` が要求する「起票者以外2名の独立エビデンス付き verdict」が対象3件の GitHub コメント上で成立していない（全コメントの著者は起票者本人 j5ik2o）。代替の接地は (a) #2385（別ハーネス Kimi Code による独立再調査で突合検証済みと本文が記載）を一次入力とし、(b) conductor 自身の observed 断面での verbatim 実読で二重化、(c) 実 CI run ログを一次証拠として取得、の3点
- 行番号引用の currency: #2385 の測定 ref は `b8e3e664f` であり observed と**完全一致**する。したがって全 file:line 引用は observed 断面で同一に解決する。**これは免除の適用ではなく、区間実測による currency の確定**である（実読で見つかった ±2 行の範囲指定差は per-intent record を正本とする）
- Verification: 本 RE では新規テストを実行していない（Depth Minimal）。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。検証は observed 断面での `git merge-base --is-ancestor` / `git diff --name-only` / `gh run list` / `gh run view --log-failed` / `gh issue list` / `find` / `jq` の実測と、患部の verbatim 直読による
- Current decision: **3件はいずれも「検出は結線済み・回復が未結線」という同一形の欠落である。** #2313 は freshness 述語（`scripts/no-silent-drop-evidence-adapter.ts:226-240`）が throw し、回復分岐（`scripts/no-silent-drop-evidence.ts:162-171`）は述語が false のときだけ走るため到達不能。#2330 は `readStore`（`amadeus-advisory-choice.ts:681-691`）の回復が「store 不在時のみ」で、既存 schema 1 ファイルは常に parse 失敗 → fail-closed hold となり、hold を解く CLI verb がない（verb は `record` / `correct-misattributed` の2つのみ）。#2358 は全被覆アーム（`amadeus-orchestrate.ts:3727-3731`）が「unit ディレクトリを作れ」と案内するが、残る仕事が無い状況では実行不能。**fail-closed そのものは3件とも既決の正当な機構であり、是正の方向は「拒否をやめる」ではなく「明示的な回復入口を新設する」に限られる**
- **影響範囲の訂正（#2385「影響・価値」節と食い違う）**: #2385 は「全 PR の trusted base ゲートが偽赤になり、あらゆる修正 PR が着地できない」とするが observed では成立しない — main の最新 CI run **31135183415 は success**（ratchet ステップを含む `Lint and complexity` job も success）、ローカル実測 `bun tests/no-silent-drop-gate.ts check --base-revision <HEAD^ の完全 SHA>` → exit 0 / `{"schemaVersion":1,"status":"pass","code":"NO_SILENT_DROP_OK","findings":[]}`。**恒久赤は main 限定の `No Silent Drop Evidence Reconcile` ワークフローのみ。** 修正の必要性は変わらないが S1-FATAL / P1 の根拠文は requirements 段で再判定が要る
- **advisory store 分布の再census（#2385 §7(b) より広い）**: clone 内に `.amadeus-advisory-choice.json` が **6 件**実在し、**schema 1 が 5 件・schema 2 が 1 件**。#2385 は「本調査 clone では 1 件」とのみ記す。store は gitignored の per-clone ランタイムであり git から census 不能という前提は変わらないが、**1 clone 内で複数 worktree にまたがって schema 1 が滞留する**ことは実測で確定した。回復 verb の対象範囲（単一 store か探索して複数か）は requirements で確定を要する
- 主要所見: **①同一意味論の2実装** — freshness 述語が広域 set（adapter、`packages/framework/core/tools` を含む）と narrow set（`tests/integration/t413-no-silent-drop-ci-adoption.test.ts:181-195`、含まない）の2箇所に存在し、observed の同区間で前者のみ drift する。t413 の選定理由コメントは逐語で "it needs an evidence-regeneration path, not a pin here" と述べており、**正しい判断は既にテスト側に文書化されている**。**②回復手段がゲートの内側にある** — #2330 の guard（`amadeus-orchestrate.ts:797-799`）は pending 非空でしか走らないため、回復入口は CLI 側に置く必要がある。**③述語の共有による修正干渉** — #2358 の `unitCovered`（`:3746-3760`）は §12a Review の記録有無を見ず #2359（**OPEN・未修正**）と共有されるため、宣言受理点は述語の外側に置く
- 既決裁定との整合: #2358 の非対称は選挙 E-OBB2-CG1 が **INTENTIONAL と裁定**したものであり（選挙記録 `amadeus/spaces/default/elections/260730-e-obb2-cg1/` ほか `-cgs13` / `-ras13` / `-res13` の実在を確認）、`amadeus/spaces/default/memory/project.md:287` の `cid:code-generation:c1-degrade-batch-directive-capture` が逐語で「全 unit covered 後の engine emit は裁定 B（E-OBB2-CG1）どおり fail-closed のため、build 時捕捉が唯一の in-band 経路」と記す。テスト pin は `t367-degrade-unitname-resolution.test.ts:411-420`（test 13 = multi-unit 全被覆 → refuse）と `:428-437`（test 14 = 単一 unit は covered でもゲートを運ぶ）、`:422-426` が INTENTIONAL を明記。**詰みは multi-unit 限定**
- ローカル実行の規約（build-and-test 向け）: `bun tests/no-silent-drop-gate.ts check` を `--base-revision` 無しで実行すると必ず `{"code":"BASELINE_INVALID","detail":"check mode requires a non-zero trusted base revision"}` / exit 2。これは欠陥ではなく規約（`tests/no-silent-drop/engine.ts:250-252` が null を拒否、`tests/no-silent-drop/ledger.ts:213-223` の解決順は explicit → `AMADEUS_NSD_TRUSTED_BASE_SHA` → `GITHUB_BASE_SHA` → `GITHUB_EVENT_BEFORE`）。base は **HEAD の厳密祖先**でなければならない（HEAD 自身は `"trusted base is not a strict ancestor of HEAD: b8e3e664f…"` / exit 2）
- tNNN 予約: 使用済み最大は **t465**、ユニーク採番は **436 個**。**新規は t466 以降**。空き番号は per-intent record を参照。同一 tNNN の複数ファイル共存は既存の生態であり債務として記録しない
- docs 章番号空間: `docs/reference` の最大は **24**（新章 `24-intent-autonomy.md` / `.ja.md`）。次の新章は **25** から。`docs/guide` の最大は 23（新章追加なし）、`docs/harness-engineering` は 09
- Requirements Analysis へ送る裁定候補: **(1)** #2313 の freshness 述語をどちらの set へ canonical 化するか（t413 の narrow set へ寄せるか、広域 set を保ったまま再生成経路を足すか）。**(2)** #2313 の回復 verb の形（`scripts/no-silent-drop-evidence.ts` への verb 追加か、既存 rebind 分岐の条件変更か）と、第1段／第2段 tree 証明のどちらに乗せるか。**(3)** #2330 の回復 verb の対象範囲（単一 store か、探索して複数 store か — 実測で 5 件の schema 1 が複数 worktree に滞留）。**(4)** #2330 の回復形（schema 1 pending の salvage か、破棄して人間へ訊き直すか）。**(5)** #2358 の宣言受理点の所在と形（#2359 の hook を塞がないこと、および `t367` test 13 の明示改訂の要否 — `cid:reverse-engineering:c1-pinned-behavior-ruling`）。**(6)** #2313 の S1-FATAL / P1 の再判定（影響範囲の訂正を受けて）
- Updated artifacts: 共有9成果物の現在断面を更新し、直前の現在断面3件（`260805-cross-harness-resume` / `260805-subagent-type-guard` / `260805-semi-redefine-autonomy-f`）を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。per-intent record `re-scans/260807-failclosed-recovery-path.md` を新設
- Per-intent record: `re-scans/260807-failclosed-recovery-path.md`


## 実行メタデータ（履歴: 260805-cross-harness-resume）

- Date: `2026-08-05`
- Base commit: `b938898f364160d4b5857e153579b40b5ab18372`（`cid:reverse-engineering:rescan-base-ancestry` に従い、記録済み observed のうち祖先性を満たす最新を採用。`git merge-base --is-ancestor b938898f3 7060956c5` exit 0 を実測）
- Observed commit: `7060956c5617125dd2f4e284957aa180cb306484`（= 本 worktree HEAD。`git rev-parse HEAD` で一致を実測。`cid:reverse-engineering:c2-observed-mainline-commit` により origin/main 系譜のコミットを記録）
- Ancestry: exit 0。距離は **34 commits / 493 files**（`+43826 / −217`）。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal、Test Strategy: Comprehensive
- Focus: [Issue #2285](https://github.com/amadeus-dlc/amadeus/issues/2285) — **ハーネス跨ぎのワークフロー引き継ぎ（cross-harness resume）**。ユーザー要件は「`claude` / `codex` / `cursor` / `kimi` / `kiro` / `kiro-ide` / `opencode` / `pi` のどの組み合わせでも引き継ぎ可能であること」。患部は (a) `amadeus-caller-authorization.ts` の Kimi 認可判定、(b) `.current-session` carrier の書き手分布、(c) Kimi adapter の projectDir 解決、(d) resume 経路のハーネス一致検査の不在。
- Scan mode: DIFFERENTIAL refresh。Developer scan の列挙を一次入力とし、Architect が患部 seam を observed 断面の verbatim 実読で再検証した。引用の訂正・精密化 5 件（内訳は `re-scans/260805-cross-harness-resume.md` § Developer scan との差分）。
- Verification: conductor が repo 外 scratch で `authorizeMainConductor` を直 import した**決定的再現 C1-C6**（`cid:reverse-engineering:c2-parallel-process-repro-harness` の系譜）。`AMADEUS_HARNESS_TYPE=kimi` 下で C1 marker 不在 / C2 セッション不一致 / C3 ended-deny 残存 / C6 carrier 分裂の**4原因がすべて同一の `{"kind":"denied","role":"unknown"}` に畳まれる**ことを実測。C4 整合状態は `authorized`、C5 `roles={reviewer:1}` は `denied/reviewer`。対照の `AMADEUS_HARNESS_TYPE=claude-code` では全ケース `authorized`。テストスイートの再実行はしていない（`cid:code-generation:c1-coverage-single-owner` に従い coverage も未実行）。
- Current decision: **患部は区間の外側で導入済みの既存構造であり、区間内の退行ではない。** session lifecycle / caller-authorization / harness detection のコード面は区間内で無変更（当該パスの区間内コミットは `fc862e879` の1件のみ、内容は kimi `SKILL.md` の docs 変更）。34 commits の大半は TLA+ authoring / metrics / live E2E / phase-boundary docs。
- 主要所見: **①デッドロック** — `amadeus-state.ts:902` `enforceCallerAuthorization` は `get` / `count` / `lookup` 以外の全27語彙をゲートし、`case "park"` `:1024` と `case "unpark"` `:1027` を含む。したがって拒否状態の Kimi セッションは park 復旧文言が案内する当の unpark も打てず、**in-band 復旧経路が構造的に存在しない**。**②判別不能性** — `denied/unknown` を返す4経路（`:85` / `:94` / `:105` / `:108`）が同一文言に畳まれ、復旧手順も `callerAuthorizationError` `:117-122` に含まれない。**③carrier を書かない3面** — `.current-session` の書き手は `amadeus-session-start.ts:97` の唯一箇所だが、`kiro-ide`（session_id 転送なし）/ `opencode`（hooks 不使用、`plugins/` 構成）/ `pi`（`extensions/amadeus-pi-extension.ts:779` でネイティブ処理）の3面はこれを書かない — **8ハーネス対称の引き継ぎは現行 carrier 設計では成立しない**。**④未文書の認可バイパス** — `amadeus-harness.ts:113-123` の `detectHarnessType` は `AMADEUS_HARNESS_TYPE` を最優先するため、kimi 以外の値で `:75` の早期 return が発火し認可境界が丸ごと素通りする（対照実験で実測確定）。**⑤carrier 分裂** — Kimi adapter `:704` の `const dir = env.cwd ?? projectDir;` は raw cwd を採り、core hook の marker 検証ラダー `amadeus-lib.ts:298` と非対称。
- 文書との不整合: `docs/guide/11-session-management.md:7` は "Session resume works on every harness" と宣言するが、Kimi の認可境界と carrier 分布は全ハーネス往復を保証しない。
- Requirements Analysis へ送る裁定: **(1) 復旧経路の形** — 復旧 verb 新設 / doctor 拡張 / SessionStart 自動回復強化のどれを主にするか（復旧手段自体がゲート外にあることが必要条件）。**(2) エラーメッセージの原因判別化＋復旧ガイド**（既存 assert は substring のみのため明示改訂不要）。**(3) 全ハーネス要件の充足範囲** — carrier を書かない3面へ配線するか、判定を寛容化するか（認可弱化を伴う）、docs 側の全ハーネス宣言を限定するか。**(4) `AMADEUS_HARNESS_TYPE` バイパスの扱い**（文書化 / 認可判定での env 無視 / 現状維持。裁定(1)と競合しうる）。**(5) Kimi adapter raw-cwd の是正可否**（`tests/integration/t-kimi-adapter.test.ts:413` の pin 改訂を伴うため、仕様裁定とテスト契約改訂をセットで確定 — `cid:reverse-engineering:c1-pinned-behavior-ruling`）。
- テスト現況: caller-authorization 専用 unit テストなし。`tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` が substring（`"is not the main conductor"`）で拒否／許可を pin。coverage 台帳に `authorizeMainConductor` エントリ3件、no-silent-drop 台帳にも同ファイルエントリあり — 行挿入時は機械 remap＋span 検査＋census 再バインドが該当。
- Updated artifacts: 共有9成果物の現在断面を更新し、直前の `260804-phase-boundary-approval` を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。per-intent record `re-scans/260805-cross-harness-resume.md` を新設。
- Per-intent record: `re-scans/260805-cross-harness-resume.md`

## 実行メタデータ（履歴: 260805-pr-convergence-plugin）

- Date: `2026-08-05`
- Base commit: `b938898f364160d4b5857e153579b40b5ab18372`（直前の現在断面 `260804-phase-boundary-approval` の observed。`cid:reverse-engineering:rescan-base-ancestry` に従い祖先性を実測）
- Observed commit: `8409c2039c5281e533db88a637649276d8bc4a73`（= 本 worktree HEAD。`git rev-parse HEAD` で一致を実測）
- Ancestry: `git merge-base --is-ancestor b938898f3 8409c2039` exit 0（実測）
- 区間規模: **27 commits / 474 files**（`git log --oneline base..HEAD | wc -l` = 27、`git diff --name-only base..HEAD | wc -l` = 474）
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- Focus: [Issue #1971](https://github.com/amadeus-dlc/amadeus/issues/1971) — PR 収束を opt-in プラグインとして出荷する構想。患部は (a) plugin compose の seam 機構、(b) `unitCovered` の per-unit 前進ガード、(c) センサーの advisory 契約、(d) plugin manifest schema、(e) `gh` 実行面、(f) 収束述語の canonical 所有。
- Scan mode: DIFFERENTIAL refresh。Issue #1971 のクロスレビュー2件（xrev-1 / xrev-2）の verdict を Developer scan の一次入力とし（`cid:reverse-engineering:c1-xrev-single-issue`）、レビュー時 SHA と observed が異なるため**引用は全件 observed で再解決**した（`cid:reverse-engineering:upstream-cite-reresolve-on-shift` — 免除条件は適用しない）。Architect は主要主張を独立コマンドで verbatim 再実測し、**訂正2件・scan 未検出の追加発見1件**を得た（内訳は `re-scans/260805-pr-convergence-plugin.md` § Developer scan との差分）。
- Verification（実測、`--timeout=30000`）: `tests/unit/t301-plugin-cli-seams.test.ts` + `tests/unit/t252-plugin-composition.test.ts` = **34 pass / 0 fail / 119 expect / exit 0**。`tests/integration/t254-reference-plugin-lifecycle.test.ts` = **9 pass / 0 fail / 68 expect / exit 0**。`tests/integration/t299-plugin-cli-walking-skeleton.integration.test.ts` + `tests/integration/t340-plugin-drop-fs-restore.integration.test.ts` = **24 pass / 0 fail / 102 expect / exit 0**。coverage は `cid:code-generation:c1-coverage-single-owner` に従い未実行。
- **主要 Finding（critical path）: plugin seam 機構は半分だけ実装されており、実ステージへ接続していない。** seam 語彙は `amadeus-plugin-compose.ts:74` の `SEAM_NAMES = ["produces", "consumes", "sensors", "required_sections"]` として既に定義済みで、merge / 台帳 / drop 復元も実装済みである。しかし host stage の認識面は `serializeStageSeams`（`:555`）が吐く 4 行の合成バイト形（1 行目 `stage: <slug>`）であり、`parseHostStageSeams`（`amadeus-plugin.ts:258-270`）は 1 行目に `/^stage: (.+)$/` を要求する。**実ステージ Markdown の 1 行目は `---`（`head -3 .../code-generation.md` で実測）のため、リポジトリ内のどの実ステージも HostStage にならない。** コード自身が `:552-554` のコメントで `the real frontmatter serializer is U11+` と未着地を明記し、`tests/unit/t301-plugin-cli-seams.test.ts:7-10` も同じ制約を記述する。挙動は**無音スキップではなく loud reject**（probe 実測: `inspect kind: rejected` / `unknown-seam`）。
- **設計含意: `scopes: []` の opt-in stage 形では Issue の目的を達成できない。** `applyPluginScopeOptIns`（`amadeus-graph.ts:1484`）は plugin stage を transpose の生産者にせず厳密加算の overlay として適用するため、`scopes: []` は stock workflow の per-unit ループへ一切参加しない（参照実装 `plugins/formal-model-check/stages/formal-model-check.md:4` の condition が同旨を明記）。Issue が要求する「install した環境では code-generation の全 Bolt に収束レポートを必須化」は、seam による既存 code-generation への produces overlay 経路にのみ依存する。すなわち上記 seam の未着地面が本 intent の critical path である。
- **ガード非対称（observed でも現存）**: `unitCovered`（`amadeus-orchestrate.ts:3452-3472`）は produces を**全件** `existsSync` で要求し承認状態を一切参照しない（fail-closed）。一方 approve 側の `producesArtifactsExist`（`amadeus-state.ts:1683-1696`）は `:1691-1694` のループで**1 件でも存在すれば true**（ANY）を返し、加えて `AMADEUS_SKIP_ARTIFACT_GUARD=1`（`:1529`）のバイパスを持つ。fail-closed の実現面は per-unit ループ前進以外にない、という xrev-2 の結論は observed でも成立する。
- **fail-open 経路（3件、うち1件は scan 未検出）**: ① `unitCovered:3465` `if (names.length === 0) return true;` — `produces_kinds` により当該 unit kind への必須成果物が 0 件になると covered へ落ちる（`requiredArtifactsForUnit`、`amadeus-graph.ts:842-849`）。② `producesArtifactsExist:1689` `if (produces.length === 0) return true;`。③ **`kindAwareArtifactsExist`（`amadeus-state.ts:1653-1678`、Developer scan 未検出）** — `:1677` `return !hasApplicableArtifact;` により、どの unit にも適用成果物が無い場合 true を返す。①の直上コメント（`:3448-3451`）は「an empty required set remains NOT covered so the engine never silently skips a unit it cannot prove it ran」と述べるが、この保証が成立するのは `declared.length === 0` の枝だけであり、`produces_kinds` で絞られた `names.length === 0` の枝は逆に true を返す。**コメントの宣言と実装が食い違う**（`cid:reverse-engineering:comment-premise-verify-not-just-quote`）。`code-generation.md` は現状 `produces_kinds` を持たない（宣言は functional-design / nfr-requirements / nfr-design / infrastructure-design の4件のみ）ため今日は顕在化しないが、新規 produces を足す側が `produces_kinds` に触れると無音で fail-open へ落ちる。
- **plugin は sensor manifest を同梱できない**: `parsePluginManifest`（`amadeus-plugin-compose.ts:325-345`）が構築するのは `{ name, stages, seams, fragments, tools }` の4種のみで、**`sensors` フィールドは schema に存在しない**（未知の top-level キーは拒否されず無視される）。参照実装 formal-model-check の sensor manifest も plugin バンドル内ではなく **core 側** `packages/framework/core/sensors/amadeus-model-completeness.md` にあり、`plugins/formal-model-check/plugin.json` の `sensors` 出現数は 0（実測）。すなわち Issue 役割分担表の「センサー: plugin が manifest 同梱」に対応する既習形は存在しない。plugin stage の frontmatter が `sensors: [...]` を宣言し manifest 実体は core が持つ、が実像である。
- **センサー advisory は observed でも接地**: 出荷センサー **8件すべて** `default_severity: advisory`（`grep -c` 実測）。`amadeus-sensor.ts:29-31` のコメントが「Sensor outcomes are advisory」と明記し、`:573-574` は無条件 `process.exit(0)`。`severity` の分岐利用は `:271` の表示1箇所のみ。Issue の「執行はセンサーに置かない」という設計判断は現行実装と整合する。
- **再利用資産3件**: ① `parseMergeability`（`scripts/metrics-publication-domain.ts:256-262`）が `mergeStateStatus` を mergeable / pending / conflicting へ正規化し、`UNKNOWN` を pending へ落とし未知値は throw する既存 fail-closed 契約を持つ（Issue の「UNKNOWN は不成立として retry」と整合）。② `amadeus-github-gateway.ts`（1034行）が `versionArgv()` / `authArgv()`（`:112` / `:116`）で runnable / auth readiness を検査し envelope / GraphQL 解釈まで持つ。③ `amadeus-quality-repair.ts` の `QualityRequiredOutputDescriptor` は「ステージへ必須成果物を宣言する」形そのものだが、`:242` `if (contribution.requiredOutputs.length !== 0) return null;` により**非空にすると activation が失敗する fail-closed の未接続面**であり、消費者は repo 全域で 0 件。
- **新設義務: import-closure guard**（区間内 #2240 で着地、`scripts/plugin-projection.ts` に **+77行 / −1行**。区間内で touch された患部ファイルはこの1本のみ）。plugin の `tools[]` から相対 import で到達可能な全モジュールが manifest 宣言かつ owned でなければ projection を write-0 で拒否する。pr-convergence plugin が tools を出荷する場合、import 閉包の全数宣言が受け入れ基準に入る。
- **接続点ゼロの確認**: ステージ本文 32件に対する `grep -rniE 'converge|reviewThread|gh pr |pull request|収束'` は **0 hit**（実測）。収束スキル（`j5ik2o-gh-pr-converge-loop` 等）はハーネス側 `~/.agents/skills/` にのみ実在し、リポジトリ内に正本を持たない。
- **tNNN 予約**: observed の最大採番は **443**（区間で t436〜t443 が新規着地）。本 intent は **t444 以降**を予約する（`cid:code-generation:swarm-test-number-reservation`）。
- Requirements Analysis へ送る裁定候補（10件、全文は per-intent record § 8）: (1)【critical path】seam の実 frontmatter 接続の実装方式 — frontmatter 保存型 parse/serialize の新設 / `QualityRequiredOutputDescriptor` の接続 / 第3案。(2) plugin が sensor manifest を同梱できない事実を受けた Issue 役割分担表の訂正方針。(3) `scopes: []` opt-in 形では目的を達成できないことを受けた代替経路の確定。(4) `produces_kinds` fail-open の封鎖を受け入れ基準へ明文化。(5) 収束述語の canonical 所有（`parseMergeability` を canonical 化するか意図的に別定義とするか）。(6) `gh` 実行面の所有（core gateway 相乗り / 独自ラッパ）。(7) import-closure 宣言義務の受け入れ基準化。(8) approve ガード ANY 非対称と fail-open 3経路を明示受容するか塞ぐか。(9) tNNN = t444 以降の予約。(10) 収束スキル本文の正本所在（リポジトリ内正本 / 外部参照）。
- Updated artifacts: 共有5成果物（本ファイル / `architecture.md` / `component-inventory.md` / `code-structure.md` / `code-quality-assessment.md`）に本 intent の現在断面を追加した。`business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` は区間内に該当変更が無いため本文を追記していない（根拠は per-intent record § 9）。直前の現在断面 `260804-phase-boundary-approval` は全 9 成果物で本文保持のまま履歴へ降格した（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Per-intent record: `re-scans/260805-pr-convergence-plugin.md`
## 実行メタデータ（履歴: 260803-advisory-human-choice）

- Date: `2026-08-03T08:00:01Z`
- Base commit: `a8e1ce025a918310ab7d803270bb6fc6b649c598`（本intentのprior recordはなし。他 `re-scans/` 中で日付が最新の `260802-plugin-projection-parity` のobservedを採用）
- Observed commit: `498c3034a78bd432dc426f9f807b79c8ae980762`（conductor実測のHEAD = origin/main）
- Ancestry: `git merge-base --is-ancestor a8e1ce025a918310ab7d803270bb6fc6b649c598 498c3034a78bd432dc426f9f807b79c8ae980762` は exit 0。距離は42 commits。
- Scope: `self-fix`、Brownfield、単一repo `amadeus`、Depth: Minimal、Test Strategy: Comprehensive
- Focus: [Issue #2129](https://github.com/amadeus-dlc/amadeus/issues/2129)。`requirements-analysis` / per-unit `functional-design` / `build-and-test` のadvisory発火、main / `--single` directive、pending消費とlatch、report入力、human presence / gate approval、stage protocol §11a、audit registryを対象に、人間選択receipt状態機械の有無を確認した。
- Finding: advisoryの発火・通知は存在するが、advisory固有の選択を入力・保持・検証する状態機械はない。一般 `HUMAN_TURN` / standing grant / `GATE_APPROVED` は意味相関したreceiptではない。実際のAI発話内容と実損量は凍結証拠上INCONCLUSIVE。
- Verification: Developer scanのテスト結果を再利用。対象2 integration filesはexit 0、28 pass、0 fail、107 expect。Architect synthesisでは再実行なし。
- Updated artifacts: 共有9成果物の現在断面を更新し、直前の `260802-registry-drift-guard` 節を本文保持のまま履歴へ降格。per-intent record `re-scans/260803-advisory-human-choice.md` を新設。
- Per-intent record: `re-scans/260803-advisory-human-choice.md`

## 実行メタデータ（履歴: 260805-subagent-type-guard）

- Date: `2026-08-06`
- Base commit: `b938898f364160d4b5857e153579b40b5ab18372`（`cid:reverse-engineering:rescan-base-ancestry` に従い、記録済み observed のうち祖先性を満たし距離最小のものを採用 = 直前記録 `260804-phase-boundary-approval` の observed。`git merge-base --is-ancestor b938898f3 7060956c5` exit 0 を実測）
- Observed commit: `7060956c5617125dd2f4e284957aa180cb306484`（`cid:reverse-engineering:c2-observed-mainline-commit` により mainline 系譜のコミットを記録。`git merge-base --is-ancestor 7060956c5 origin/main` exit 0 を実測。本 worktree の HEAD は `c66a2c987`（= observed + record コミット1件）だが、患部8ファイルは当該コミットで無変更のため file:line は observed 断面と同一）
- 区間規模: **34 commits / 493 files**（`+43826 / −217`）。**外部依存の変更なし**（`package.json` / `bun.lock` / `packages/setup/package.json` の diff は空出力）。ビルドは bun 不変。
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard
- Focus: [Issue #2279](https://github.com/amadeus-dlc/amadeus/issues/2279)（mirror [#2288](https://github.com/amadeus-dlc/amadeus/issues/2288)）— subagent イベントの `Agent Type` に型規律の照合が一切なく、実効 model が記録されない。患部は subagent 観測パイプラインの4層（hook seam → `normalizeAgentType` / `subagentStartFields` → audit registry → 集計 seam）。
- Scan mode: **xrev scan mode**（`cid:reverse-engineering:c1-xrev-scan-mode` / 単発 Issue への拡張 `c1-xrev-single-issue`）。クロスレビュー2名の verdict を Developer scan の一次入力とし、Architect が患部座標を observed 断面の verbatim 実読でスポット再実測した（11 seam）。**座標不一致4件 + 根拠・判定の訂正3件を検出・訂正**（内訳は `re-scans/260805-subagent-type-guard.md` § 9）。
- **行番号再解決の免除: APPLIES（適用される）** — 両 verdict の `<!-- target-sha: 7060956c5617125dd2f4e284957aa180cb306484 -->`（`gh issue view 2279 --json comments` から実抽出、2件とも同一）が observed と完全一致するため `E-OBB5-RES13` の免除条件を満たす。**免除の根拠は患部の no-touch ではない** — 同 norm は「区間 touch の有無のみを根拠とした一般免除へ拡大しない」と明示しており、Developer scan の no-touch 根拠は取り違えである（結論 APPLIES は不変）。
- Verification: `tests/unit/t-subagent-purpose.test.ts` / `t-subagent-lifetime.test.ts` / `t211-log-subagent-complete-gate.test.ts` / `tests/integration/t-log-subagent-start.integration.test.ts` を Architect 段で再実行 — **43 pass / 0 fail / 118 expect / 4 files / 970ms**。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。
- Current decision（C10 裁定）: **model 供給はハーネス横断で一律ではない。** `cid:reverse-engineering:c1-xrev-mechanism-resolution` により機序をここで裁定した。Codex は `model` を hook payload に**供給している**（fixture `tests/fixtures/codex-hook-payloads/payloads.json` の `subagentStop.model = "openai.gpt-5.5"`、Codex CLI 0.137.0 捕捉。アダプタ `harness/codex/hooks/amadeus-codex-adapter.ts:349-352` が rawInput を verbatim pipe するため core hook の stdin に到達する = 供給あり・消費なし）。Claude Code は `PreToolUse` / `SubagentStop` の**両 seam に不在**（live 実測 `2.1.222`、model パス `[]`。Agent ツールへ `model:` を明示指定したときの `tool_input.model` のみが例外）。**したがって C10 の不一致は「ハーネス横断で一律か否か」の粒度差であり、両 reviewer の観測はそれぞれの対象ハーネスについて正しい。** 設計は `cid:application-design:external-seam-vocab-measurement` の面分割に従いハーネス別に組む。未実測の残余: Codex live（現行 0.146.0）、Cursor / OpenCode / Kimi / Kiro / Kiro-IDE / Pi。
- **新規発見 D-1（S2 相当）**: `amadeus-lib.ts:4102` `export const SUBAGENT_DISPATCH_TOOL = "Task";` が Claude Code `2.1.222` の実 payload の `tool_name = "Agent"` と不一致であり、`:4129` の照合で `subagentStartFields` が常に `null` を返す。**Claude Code では `SUBAGENT_STARTED` が永久に emit されない。** matcher は無関係（`^Task$` / `^Agent$` どちらでも発火する負対照 run 済み — 落ちるのはフック内部の文字列比較のみ）。既存テスト `tests/unit/t-subagent-purpose.test.ts:89`（他 `:96` / `:97` / `:101`）と `core/knowledge/amadeus-shared/audit-format.md:154` の doc が `"Task"` 前提を固定しているため、`cid:reverse-engineering:c1-pinned-behavior-ruling` により**要件段でテスト契約の明示改訂とセットで裁定すべき事項**である。
- **D-2 は既知（scan 判定の訂正）**: live `.claude/settings.json` の `.hooks` に `PreToolUse` が不在（配線は `.claude/settings.json.example` にのみ存在）という事実は [#2297](https://github.com/amadeus-dlc/amadeus/issues/2297)（`bug` / `P2` / `S3-MAJOR`、OPEN）として起票済みで、本 intent の scope-document が Out に置いている。Developer scan の「新規発見」判定は誤りであり、**新規は D-1 のみ**。重要な含意として **D-1 と D-2 は独立であり、#2297 の修正だけでは start seam は 0 件のまま**（#2297 の受入基準にこの閉包が書かれていない）。
- 観測ギャップ（audit 実測、Architect 再計測 2026-08-06）: `SUBAGENT_STARTED` **60** 対 `SUBAGENT_COMPLETED` **974**。STARTED を含むシャードは 1 intent（`260801-tla-multi-model`）のみで型は `coder` 33 / `explore` 27。**Claude Code 由来の STARTED は全 132 intent で 0 件。** COMPLETED の `Agent Type` は distinct **200**、うち persona 8（416 件）/ 組込型 8（297 件）/ **許可集合外の `name:` 値 184（261 件）**。`Explore`（Claude Code）と `explore`（Codex / kimi）がケーシング違いの別値として共存する。`SUBAGENT_COMPLETED` 総数は本セッション中も追記が続く**移動値**（Developer scan 時点 973）。
- 実効 model の解決順の取得可否（R-3）: ① 明示指定 = `tool_input.model`（明示時のみ可）/ ② persona ピン = `.claude/agents/*.md` の `model:`（14 ファイル全数にピン、`opus` 9 / `sonnet` 5、ピン無し 0）/ ③ セッション継承 = `core/hooks/amadeus-statusline.ts:232` `input.model?.id` → `runtime-attrs.json`（`:230-256`）だが **observability 未設定（`amadeus/config.json` の `observability` は `null`）・ディスク実体 0 件・読み手 0 件**の write-only 休眠面で、statusline はメインセッションのプロセスであり subagent hook へ直接届かない。① ② のみで組む案は追加機構ゼロで成立する。
- 休眠面3つ（実装先の候補と負債の両面）: `gen_ai.request.model`（`core/otel/resource-suppliers.ts:24` で宣言済み、`supplyResourceAttribute(` の本番呼出は `amadeus-session-start.ts:148` の `"session.id"` 1 箇所のみ = **本番供給 0**）/ `composeSubagentLifetimes`（`core/otel/subagent-lifetime.ts:112`、audit journal を入力に取る唯一の subagent 集計面だが**本番消費者 0**）/ `runtime-attrs.json`（上記）。CAP-2 の記録先は前者、CAP-3 の host は中者が第一候補。
- 許可集合照合の不在（再確認）: `subagentStartFields`（`:4128-4139`）/ `normalizeAgentType`（`:4082-4084`、`raw?.trim() ? raw : "unknown"` の空白判定のみ）/ 両 hook 本体に**所属検査は 1 行も無い**。compile 時のロスタ照合（`core/tools/amadeus-graph.ts:2191` `knownAgents` + `:2218` `validateStageFrontmatter`）は stage frontmatter の `lead_agent` / `support_agents` を検査する別機構であり、**dispatch の `subagent_type` は一切見ない**。
- Requirements Analysis へ送る裁定: **Q1** D-1 を本 intent で直すか別 Issue か（既存テスト4箇所のピン改訂を伴う）/ **Q2** D-1 の修正形（集合化 / 置換 / `subagent_type` 実在判定 — 後者は `TaskUpdate` 誤検知の防波堤 `:4133-4137` を失う）/ **Q3** D-2 を #2297 に残し受入基準へ二層性を追記するか / **Q4** 実効 model の解決範囲（① ② のみか ③ を含めるか）/ **Q5** ハーネス別供給差の扱い（CON-3 の parity 制約下）/ **Q6** model の記録先（audit optional 属性 / `gen_ai.request.model` / 両方）/ **Q7** 組込型の正本（手書き台帳 count-free / ハーネス別 registry 導出。ケーシング衝突の正規化方針を含む）/ **Q8** `name:` 値が `Agent Type` に入る機序（**未確定 HYPOTHESIS** — 名前付き spawn の live probe が未実施）/ **Q9** CAP-3 の入力（lifetime ペア / COMPLETED 単独）。詳細は `re-scans/260805-subagent-type-guard.md` § 7 を正本とする。
- 技術的負債シグナル5件: ①D-1 の dispatch tool 名 drift（テスト4箇所と doc が誤前提を固定）、②観測の非対称（STARTED 60 / COMPLETED 974、lifetime 集計面の入力が構造的に欠落）、③型規律の不在（distinct 200 中 184 が許可集合外）、④休眠面の三重（宣言と本番結線の非対称クラス）、⑤ケーシング衝突（`Explore` / `explore` の二重計上リスク）。
- Updated artifacts: 共有9成果物の現在断面を更新し、直前の `260804-phase-boundary-approval` を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。per-intent record `re-scans/260805-subagent-type-guard.md` を新設。
- Per-intent record: `re-scans/260805-subagent-type-guard.md`
## 実行メタデータ（履歴: 260805-semi-redefine-autonomy-f）

- Date: `2026-08-05`
- Base commit: `b938898f364160d4b5857e153579b40b5ab18372`（`cid:reverse-engineering:rescan-base-ancestry` に従い、記録済み observed のうち HEAD 祖先で距離最小のものを採用。`git merge-base --is-ancestor b938898f3 2f255bc69` exit 0 を実測）
- Observed commit: `2f255bc6993316f1a271bcd932fabf773096494e`（`cid:reverse-engineering:c2-observed-mainline-commit` により origin/main 系譜のコミットを記録。commit date `2026-08-05 13:24:20 +0900`。本 worktree HEAD は `bff776fd8`（ideation checkpoint）だが、`git diff 2f255bc69 bff776fd8 -- packages tests docs scripts` が **空**であることを実測しており、コード実体は observed と同一。`git merge-base --is-ancestor 2f255bc69 bff776fd8` も exit 0）
- 区間規模: **19 commits / 464 files**（`+36989 / −199`、`git diff --shortstat` 実測）。**外部依存の変更は 0 件**（`git diff --stat -- package.json bun.lock packages/setup/package.json` が空）。ビルドは bun 不変。
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- Focus: [Issue #2253](https://github.com/amadeus-dlc/amadeus/issues/2253) — (1) `semi` を「`full` − 節目の自動裁定」へ再定義する、(2) `/amadeus --autonomy semi|full` の起動宣言を追加する。患部は autonomy 判定機構（`amadeus-intent-autonomy*.ts` 4本）、stop hook の carve-out、`amadeus-orchestrate.ts` の flag parser、規約 `stage-protocol.md`、docs 対訳、旧仕様を固定する既存テスト。
- Scan mode: DIFFERENTIAL refresh。Developer scan の列挙を一次入力とし、Architect が焦点 seam の file:line・件数・verbatim を observed 断面で独立に再実測した。
- **Developer scan との差分（引用訂正 3 クラス）**: ①`resolveAutoDecision` 梯子の行範囲が申告値より一律1行低い（full ハードゲート 申告 `:700-701` → 実測 `:702`、confirmed-policy `:705-706` → `:706-707`、norm `:707-716` → `:708-717`、history `:717-724` → `:718-725`、solo-election `:725-734` → `:726-735`、agent-recommendation `:735-743` → `:736-744`）。②`handleSetAutonomy` 申告 `:1050` → 実測 `:1051`、`handleListAutoDecisions` 申告 `:960` → 実測 `:961`。③`selectDecision` 分岐 申告 `:516-534` / `:517-518` → 実測 `:522-524`、`applySemiDecision` 申告 `:545-560` → 実測 `:546-554`。なお `createGateAutoDecision :666` / `authorizeInteraction :501` / `:510-514` / `:667-673` の申告は実測一致。
- **未確定事項の解消 3 件**: ①statusline の配布機構＝ハーネス manifest の `coreDirs` の `{ src: "hooks", dst: "hooks" }` 投影（`packages/framework/harness/claude/manifest.ts:55` 以降で確認）。②`stage-protocol.md` の on-disk ミラーは **14 本**（canonical 1 + self-install 5 + `dist/` 8）だが `git ls-files` 追跡は canonical 1 本のみ（source-only 境界）。③`tests/unit/t97.test.ts` の `semi` hit は `semicolon` の偽陽性（`:168`, `:170`）で autonomy とは無関係 — 実質的な `semi` 関与テストは 14 → **13 ファイル**。
- Verification: 本 synthesis ではテストを再実行していない（`cid:code-generation:c1-coverage-single-owner` に従い coverage も実行せず）。検証は observed 断面に対する `grep -n` / `awk` / `wc -l` / `git diff` の実測と、焦点 seam の verbatim 直読による。
- Current decision: **`semi` は現在「`full` から日常裁定を差し引いたもの」ではなく、「`none` に phase 内ステージゲート自動承認だけを足したもの」である。** 第1関門 `authorizeInteraction:510-514` が phase 内 stage-gate 以外をすべて `MODE_REQUIRES_HUMAN` で弾くため、`semi` は無人裁定梯子へ**構造的に到達しない**。梯子は 4 段ではなく **5 段**（先頭 confirmed-policy 段を #2253 が数えていない）。`semi` を梯子へ載せる最小介入点は3つ（`authorizeInteraction:510-514` / `selectDecision:522-524` / `createGateAutoDecision:667`）だが、加えて `resolveAutoDecision:702` の full ハードゲート（`mode !== "full" || grant === null`）を緩める必要があり、`semi` は grant を持たない mode（`:250-257`）であるため、これは「grant なしで梯子を回す」構造変更を意味する。
- **既存の非対称（伏線）**: `amadeus-stop.ts` は cap の軸では `semi` を既に自律側として扱う（`stopContinuationDefaultCap:147-151` が `full` と同じ `AUTONOMOUS_BLOCK_CAP = 8`）一方、質問 carve-out `isFullyAutonomousIntent:167-178` は `full` 限定であり `semi` を除外する。再定義はこの非対称を解消する方向の変更である。
- **`--autonomy` はコード面に 0 件**（`grep -rn -- "--autonomy" packages tests docs .claude scripts specs plugins contrib` → 0。repo 全体の 22 hit は全件が本 intent 自身の record 成果物）。追加時の落とし穴は `amadeus-orchestrate.ts:1072-1073` — 値を consume しない値付きフラグは値が intent 自由文へ漏れる（コメント `:1068-1069` が根拠）。autonomy は状態変更のため read-only 梯子（`:1014-1016`）には置けない。
- **隣接する既存不整合**: `set-autonomy --mode semi --policies-file <json>` は exit 0 のまま policies を黙って破棄する（`amadeus-bolt.ts:1067` が読む → `amadeus-intent-autonomy-production.ts:417` の分岐で `prepareNonFullCommand:382-395` が受け取らない）。observed 時点では `semi` が policy を使わないため実害なしだが、**再定義と同時に実欠陥へ転化する**。
- 旧仕様ピン: `tests/unit/t431-intent-autonomy.test.ts:307-314`（`:313` が semi の質問封鎖を直接ピン。`:312` の walking-skeleton ピンは #2253 の射程では保存対象）、`tests/integration/t121-stop-hook-enforce.test.ts:1138-1150`（`expect(r.out).toBe("")` = semi + 質問で block しない。再定義後は反転が必要）。付随同期先は `tests/.coverage-patch-allowlist.json:5268`。
- 同期面の規模: 正本知識 `stage-protocol.md` に `semi` **9 行**（`:33` と `:131` が直接反転する最重要行）、docs **22 ファイル = 11 対訳ペア**（#2253 の「11 ファイル」は片側のみの数）。
- 構成デルタ: core tools `.ts` **116 → 119**、`tests/**/*.test.ts` **927 → 941**。区間内新規 core tools は `amadeus-autonomy-review.ts`(1273) / `amadeus-autonomy-review-production.ts`(484) / `amadeus-harness-registry.ts` / `amadeus-intent-completion.ts` と `packages/framework/harness/registry.ts`。前2者は auto-decision の **unreviewed レビュー面**であり本 intent の焦点に直接隣接する（base 時点では不在）。**最大テスト番号は t439 — 後続 Bolt は t440 以降を採ること。**
- 区間内の行シフト: 焦点ファイルの大半は無変更（`amadeus-intent-autonomy.ts` / `amadeus-stop.ts` / `amadeus-utility.ts` / `amadeus-orchestrate.ts` / `amadeus-statusline.ts` / `t431` / `t121` はシフト 0）。例外は `amadeus-bolt.ts` `100/1`（**`:961` 以降が +96**、#2229 が `get-auto-decision` / `review-auto-decision` を追加）と `stage-protocol.md` `2/0`（`:35` 以降 +2、履歴節が引く `:129` は observed で `:131`）。
- Requirements Analysis へ送る裁定: **(1)「節目」の機械判別基準** — phase 境界のみか、質問にも節目クラスを設けるか。既存の判別軸は `occurrence.phase !== "phase-boundary"` と `applySemiDecision` の `workflow-reversible` 分類の2つのみで、質問 occurrence に phase 概念はない。**(2) `semi` が使える梯子の段数** — 全5段か、`reviewState: "unreviewed"` を生む後段2段（solo-election / agent-recommendation）を除く3段か。**(3) `--autonomy` の契約形** — birth 経路へ結線するか、既存流儀どおり `amadeus-bolt set-autonomy` を名指しする print directive（先例 `birthPrintDirective:2617-2646`）に留めるか。**(4) 旧仕様ピンの反転範囲** — `t431:313` / `t121:1138-1150` を反転し、`t431:312`（walking skeleton）を保存するか。**(5) `--policies-file` 無音破棄の是正を本 intent に含めるか。**
- 技術的負債シグナル4件: ①`semi` の cap 軸と質問軸の非対称（stop hook 内で mode の扱いが割れている）、②公開 flag `--policies-file` の無音破棄、③互換投影 `Construction Autonomy Mode` が `semi` と `none` をともに `gated` へ潰す（`amadeus-bolt.ts:1071`）、④`--status` は autonomy を8行出すが statusline は 0 行という表示面の非対称。
- Updated artifacts: 共有9成果物の現在断面を更新し、直前の `260804-phase-boundary-approval` を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）— 区間内で `+96` / `+2` のシフトが生じた箇所は、履歴節を書き換えるのではなく現在節に実測値と差分の由来を明記した。per-intent record `re-scans/260805-semi-redefine-autonomy-f.md` を新設。
- Per-intent record: `re-scans/260805-semi-redefine-autonomy-f.md`

## 実行メタデータ（履歴: 260804-phase-boundary-approval）

- Date: `2026-08-05`
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`（`cid:reverse-engineering:rescan-base-ancestry` に従い、記録済み observed のうち祖先性を満たす最新を採用。`git merge-base --is-ancestor 9458bbda8 b938898f3` exit 0 を実測。`58761daa5` は observed の祖先ではないため不採用）
- Observed commit: `b938898f364160d4b5857e153579b40b5ab18372`（= 本 worktree HEAD。`git rev-parse HEAD` で一致を実測。`cid:reverse-engineering:c2-observed-mainline-commit` により mainline 系譜のコミットを記録）
- 区間規模: **134 commits / 1041 files**（`+84296 / −11280`）。外部依存の変更なし、ビルドは bun 不変。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal
- Focus: [Issue #2143](https://github.com/amadeus-dlc/amadeus/issues/2143) — phase boundary verification の**規約順序**と **approval guard** の非両立。患部は (a) governance protocol § 13「いつ検証するか」、(c) `amadeus-state.ts` の `verifyPhaseCheckArtifact` ガード、(d) 各ハーネス annex の approval 手順。加えて区間内の `state` / `approve` 隣接着地を対象に含めた。
- Scan mode: DIFFERENTIAL refresh。Developer scan の列挙を一次入力とし、Architect が患部 seam を observed 断面の verbatim 実読で全数検証した。**引用不一致 9 件を検出・訂正**（内訳は `re-scans/260804-phase-boundary-approval.md` § Developer scan との差分）。
- Verification: `tests/unit/t-phase-check-gate-seam.test.ts` を実行 — **16 pass / 0 fail / 36 expect / 214ms**。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い行っていない。
- Current decision: **#2143 の3契約のうち規約側 (a) は区間内で既に是正済み**である。`stage-protocol-governance.md:14-18` は `f7273b9ab`（"feat(pi): add Pi agent core support (#2166)"）で「After the last stage of each phase is approved / Before the first stage of the next phase begins」から「After the last stage's outputs and review are complete / Before reporting approval for the gate whose `run-stage` directive carries `phase_boundary`; the approval transition is fail-closed until the artifact exists」へ書き換わった（当該パスの区間内コミットは1件のみ、実測）。ガード (c) `amadeus-state.ts:379-396` は区間内で無変更であり、approve 経路では `:3472` が checkbox 書込 `:3484` より前に発火する fail-closed のままである。**したがって残余のギャップは (d) annex 対 guard へ移動した。**
- **annex 判定の重大な訂正**: 8ハーネスを全数実読した結果、**`phase_boundary` → artifact → approval の順序を正しく記述しているのは `pi` 1本だけ**（`harness/pi/skills/amadeus/SKILL.md:98-103`）である。claude `:98-99` / codex `:96-97` / kimi `:96-97` / kiro `:92-93` / kiro-ide `:92-93` はいずれも approval 条項を**持っている**が、artifact 前提に触れずに `report --result approved` を直呼びさせる。cursor / opencode は `commands/amadeus.md` が薄く approval 条項自体が実質ない。5ハーネスが `:117` / `:119` に持つ governance protocol へのポインタは「load at phase boundaries」としか言わず、`report` に対する相対順序を指定しない。Developer scan の「claude/kiro/kiro-ide/pi には approval 条項なし」は**両方向に誤り**であり、この訂正は是正の形を変える — 「annex 一般に phase-check を追加する」ではなく「**pi の既存記述を残り5つの skill-bearing annex へ横展開する**」が正しい。
- 新規交差（#2211 autonomy Bolt3 由来）: `amadeus-orchestrate.ts:2160-2166` が `directive.phase_boundary` を算出し、`:2181-2196` の `routeMainWorkflowDirective` が同じ directive に `autonomy_auto_approve` を立てる。`stage-protocol.md:33` は auto-approve directive で人間質問なしに approval を report させ、`:129` は `full` が phase boundary も auto-approve すると定める。一方ガード `:3472` は autonomy を一切参照しない。**artifact を書く主体が人間ターンだと暗黙に仮定されているのに、その人間ターンが存在しない経路が新設された。** fail-closed ではあるが進行不能になる。`full` grant 下の実 run を再現していないため実損は **UNCONFIRMED**。
- Requirements Analysis へ送る裁定: **(1) annex 横展開の範囲** — skill-bearing 5本（claude / codex / kimi / kiro / kiro-ide）に限るか、cursor / opencode の薄い `commands/amadeus.md` も含めるか。**(2) autonomy full × phase boundary の解** — `full` で phase boundary だけ人間へ戻すか、conductor が autonomy 下でも artifact を書く責務を負うか、ガードを autonomy 認識にするか。`stage-protocol.md:129` の「`full` auto-approves both」の意味論変更を伴う。**(3) 規約 (a) が既に是正済みである事実を #2143 の受入基準へどう反映するか** — Issue 本文の前提（3契約すべてが不整合）は observed では成立しない。**(4)** annex 間の drift を CI で止める機械検査（governance 順序条項の存在検査）を本 intent に含めるか。
- 構成デルタ: core tools **103 → 116**（追加14 / 削除1 = `amadeus-grant-authorization.ts`。後継は `amadeus-approval-authorization.ts` の `classifyApprovalAuthority`（`:20-48`）+ `parseApprovalProcessResult`（`:55-80`）、消費側 `amadeus-orchestrate.ts:4445` `handleAuthorizedApprovalReport`）。新ハーネス `pi`（8番目、driver / guardian / replay-store / extension 構成）。config の破壊的再編（canonical key が6本のドットパスへ、`amadeus-config.ts:59-64`）。テスト `.test.ts` **883 → 927**（`.ts` 全体 991 → 1066）。CI workflow 3本・scripts 6本追加。
- 技術的負債シグナル4件: ①annex 対 guard の契約ギャップ（#2143 残余、pi 1本のみ正・7本未追随）、②autonomy full × phase boundary（ガードは autonomy 非認識）、③config 破壊的再編の波及（テスト2スイート削除、conductor 記述の要確認）、④`X.ts` / `X-runtime.ts` / `X-replay.ts` 三つ組が4系統・約7500行で共有抽象なし。
- Updated artifacts: 共有9成果物の現在断面を更新し、直前の `260804-evidence-revision-rebind` を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。per-intent record `re-scans/260804-phase-boundary-approval.md` を新設。
- Per-intent record: `re-scans/260804-phase-boundary-approval.md`

## 実行メタデータ（履歴: 260804-evidence-revision-rebind）

- Date: `2026-08-04`
- Base commit: `498c3034a78bd432dc426f9f807b79c8ae980762`（祖先性を `git merge-base --is-ancestor 498c3034a 9458bbda8` exit 0 で実測確認。observed からの距離 `11`（`git rev-list --count`）。**直前記録 `260803-state-integrity` の observed `6c15af23a` は observed の祖先ではない**（`--is-ancestor` exit 1 を実測）— ローカル merge コミットを observed に記録したことによる非祖先化であり、`cid:reverse-engineering:c2-observed-mainline-commit` が防ごうとした事象そのもの。記録済み observed のうち祖先かつ距離最小である `498c3034a` を `cid:reverse-engineering:rescan-base-ancestry` に従い base とした）
- Observed commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`（= `origin/main`。`cid:reverse-engineering:c2-observed-mainline-commit` によりローカル merge でなく mainline 系譜のコミットを記録した。本 worktree の HEAD `668e88665` は observed と**同一ではなく**、台帳3ファイルと t413 が内容差分を持つため、全 file:line は `git show "${OBS}:<path>"` で observed から抽出している）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal
- Focus: [Issue #2156](https://github.com/amadeus-dlc/amadeus/issues/2156)（`bug` / `P0` / `S1-FATAL`）— no-silent-drop の evidence registry が PR ブランチ SHA を `currentRevision` に固定しており、スカッシュ着地後に到達不能となって `main` の必須チェック（`CI Success`）を赤で固定している。参考として [Issue #2153](https://github.com/amadeus-dlc/amadeus/issues/2153)（同一テスト内の別 assertion）。
- Scan mode: **xrev scan mode**（`cid:reverse-engineering:c1-xrev-scan-mode` / 単発 Issue への拡張 `c1-xrev-single-issue`）。クロスレビュー2名の verdict（`XREV-2156-20260804`、いずれも CONFIRMED_WITH_REFINEMENTS）を Developer scan の一次入力とし、Architect が主要 seam を observed 断面の verbatim 実読で二重化した（`t413:151-174` / `repository-adoption.ts:182-187` / `repository-adoption-evidence.ts:197,268,333-345,360` / `engine.ts:49` / `gate.ts:35` / `bootstrap.ts:331,427-433,493-497` / `ci.yml:893-906` の8 seam、引用不一致 0 件）。件数はすべて observed で独立再計算（`currentRevision` 24 / manifest `testedRevision` 24 / run `testedRevision` 25 / `evidenceDigest` 23 / manifest `sha256` 25 / 書込 API 8ファイル全 0）。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。
- **行番号再解決の免除: APPLIES（適用される）** — 両 verdict の `<!-- target-sha: 9458bbda85eb7257310a80882b4858dc6ce3d1fc -->` が observed と同一であり、E-OBB5-RES13 の免除条件「当該引用が observed と一致する SHA で検証済みであること」を満たす。**免除の根拠は touch の有無ではない**（患部9パスは base 区間で `M` = 変更あり）。
- 区間規模: `git diff --name-only 498c3034a 9458bbda8 | wc -l` = **7283 files**。支配的変化は `9458bbda8`（PR #2152）の生成物 Git 追跡除去（`D dist` 3951 / `D .claude` 580 / `D .kimi-code` 578 / `D .codex` 552 / `D .opencode` 539 / `D .cursor` 536 / `D .agents` 94）。生成物・`amadeus/` record・`metrics/` を除く実質変更は **227 files**。
- Current decision: 欠陥機序は確定した — `t413…test.ts:157/:159` だけが「台帳に永続化した SHA を後日 git で解決する」検査であり、スカッシュ運用では PR ブランチ tip が着地後に消えるため、着地の瞬間に到達不能へ反転する。PR 上では緑になるため PR CI でもレビューでも構造的に捕捉できず、evidence 更新4回のうち3回で再発した（導入コミット `7c29e33f7` 自身の CI が既に赤）。**「修復不能」の前提は反証された**: 再バインドは3層の不動点（SHA 置換 73箇所 → `adoption-runs.json` の sha256 を manifest 25エントリへ反映 → 23 receipt の `evidenceDigest` 再計算 = 計 121 箇所）として機械的に計算可能で、`validateEvidenceRegistry` が `ok: true`、`t413` が `10 pass / 0 fail`、ゲートが `NO_SILENT_DROP_OK` へ閉じる（repo 外 scratch clone で conductor が独立再現）。**不在なのは再生成ロジックではなく書込経路**である（`tests/no-silent-drop/` 配下 + gate の `.ts` 8ファイルで書込 API 0 件、CLI モードは `engine.ts:49` の4種のみ）。
- Requirements Analysis へ送る裁定: **(1) 恒久解の方式** — 「着地後に main SHA へ再バインドする経路」か「PR ブランチ SHA を記録できない構造」か。**即時の再バインドだけでは次に registry を更新する PR で再発する**ため、止血のみで閉じない。前者はマージ時点で台帳を更新する経路を要し、後者は `t413:157/:159` の到達性検査の意味論変更を伴う。**(2) `bootstrap-provenance.json` の同クラス破損を本 intent の射程に含めるか** — `candidate.digest` 乖離（`607988a05…` vs 現行 `baseline.json` の `9c1e72750…`、乖離は `a2f08658e` / PR #2127 から）、`bootstrap.ts:331` の等値破れ（`69338a56f…` ≠ `fc49f8de2…`）、bootstrap fallback の恒久 fail-closed。fail-closed のため偽緑は生まないが fallback は事実上死んでいる。**(3) [#2153](https://github.com/amadeus-dlc/amadeus/issues/2153) との関係** — `t413:165-173` の path spec は独立の欠陥だが、**同一テスト・同一 test 名を共有する**ため片方だけ直しても test 単位の赤が残りうる。同一 intent で扱うか。
- 新規所見（Issue 本文にもレビューにも未記載）: (a) bootstrap fallback は observed で既に恒久破損（上記(2)。同一設計クラスの3件目）、(b) `postRevision` は mainline のみのクローンでは「非祖先」ではなく**オブジェクトとして存在しない**（`git cat-file -e` exit 128）。reviewer-1 の「非祖先 + `--contains` 0件」は複数 remote を持つツリーでの観測であり、CI の fresh clone では 128 形になる、(c) verdict の「23 receipt 全件が `primary revision mismatch`」は実測では **run 単位 25 件**で、うち4件は `primary` 以外の run 名。発生元は `canonicalBinding` ではなく `repository-adoption-evidence.ts:268`、(d) `t413:164` は期待値に registry 自身のフィールドを渡す自己参照 assertion であり、台帳の外部妥当性を検査しない、(e) 直前 intent の observed `6c15af23a` がローカル merge のため本 observed の非祖先になっており、`cid:reverse-engineering:c2-observed-mainline-commit` の違反実例が実測で現存した。
- 反証された未確定事項: 「`baseline-proof` receipt は台帳再バインド後に構造的に再現しない（exit 2 / `bootstrap.candidate exact-bytes digest mismatch`）」は**成立しない**。記録コマンドどおりの `--base-revision 9e699ea79…` は再バインド前後とも exit 0 / `NO_SILENT_DROP_OK`。当該エラーは `bootstrap.ts:493-495` により「信頼ベースに `baseline.json` が存在しない場合」にのみ発火し、pristine observed でも `--base-revision 47574fbab…` で同一に再現する（再バインド非依存）。両レビュアーが INCONCLUSIVE とした点は解消。
- Updated artifacts: 9 共有成果物の現在断面を更新し、直前の `260803-state-integrity` を本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。per-intent record `re-scans/260804-evidence-revision-rebind.md` を新設。
- Per-intent record: `re-scans/260804-evidence-revision-rebind.md`

## 実行メタデータ（履歴: 260803-state-integrity）

- Date: `2026-08-03`
- Base commit: `a8e1ce025a918310ab7d803270bb6fc6b649c598`（`git merge-base --is-ancestor` exit 0 で祖先性を実測確認。HEAD から 42 コミット手前の最近祖先を `cid:reverse-engineering:rescan-base-ancestry` に従って選択。直近記録 `260802-registry-drift-guard` の observed `64b44a9f8` は本 worktree HEAD の祖先ではないため不採用）
- Observed commit: `498c3034a78bd432dc426f9f807b79c8ae980762`（worktree HEAD、`git rev-parse` exit 0。scan による source 変更なし）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal
- Focus: audit lock の相互排他破れ（[Issue #1906](https://github.com/amadeus-dlc/amadeus/issues/1906)、P2 / S1-FATAL / `origin:bootstrap`）と `Completed` カウンタ定義の三分裂（[Issue #1875](https://github.com/amadeus-dlc/amadeus/issues/1875)、P3 / S4-MINOR / `origin:bootstrap`）。両 Issue とも本 observed SHA でクロスレビュー2名成立済み。
- Scan mode: **xrev scan mode**（`cid:reverse-engineering:c1-xrev-scan-mode`、単発のクロスレビュー済み Issue への拡張 `c1-xrev-single-issue`）。両 Issue のレビュー verdict を Developer scan の一次入力とし、Architect が主要 seam 9 箇所を verbatim 実読で二重化した（引用不一致 0 件）。**行番号再解決の免除は適用される（APPLIES）** — 理由: レビュアーが引用した file:line はすべて本 observed SHA `498c3034a` で検証されており、レビュー対象 SHA == observed SHA が成立する。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。
- Current decision: #1906 の相互排他破れは 2 つの steal 分岐に分解される。支配的なのは分岐 B（live-owner-over-age、`amadeus-lib.ts:6274-6282` / `:6296-6300`）で、CAS 後検証は **構造的に不活性**（live holder は stamp を更新しないため `stampMatches` が守るべきケースで必ず通過する）。6/6 の scratch run が 20 増分中 14–16 を失い全プロセス exit 0。分岐 A（old-unstamped-dir）は grace ノブ単独では 0/6 だが、`finalizeAuditLockAcquire:6345` の fail-open が一時的な stamp 書込失敗を恒久的に steal 可能な live lock へ変換し決定的にする。**既定ノブでの挙動は fail-CLOSED**（41 成功 + 19 loud 非ゼロ終了 = 60、無音損失ゼロ）であり、Issue 原文の記述は既定構成を描写していない。最小かつ高価値の修正は `:6345` を fail closed にすること。#1875 は `Completed` に 3 定義（R=生カウント / E=EXECUTE 実効 / G=graph 由来）が並存し、`amadeus-state.ts:3377` の approve 検証器は自分が書いたのと同じ定義で再計算するため乖離検出が構造的に不可能（検証劇場）。
- Requirements Analysis へ送る裁定: (1) 3 つの `Completed` 定義のどれを正準とするか — R と E は既存 e2e/integration テストで矛盾して pin されており、いずれの裁定も既存テストの明示改訂を伴う、(2) live PID の over-age reap を heartbeat 付きで残すか除くか — 除く場合の wedge holder 回復手段を定義する必要があり、`amadeus-audit.ts:429-433` は現行挙動を意図的と文書化している、(3) ロック bucket 統一と UNLOCKED な RMW のロック化を本 intent に含めるか繰り延べるか（`t164` の bucket 意味論 pin 改訂と `resyncOneIntent` の扱いを含む）、(4) Bolt 直列化か唯一の綺麗な並行分割か — 生成面 12 コピーは分割しても衝突するため並行化の実益は限定的、(5) 付随: NSD001 の対処方針（ロック catch 編集は baseline 再 fingerprint を伴う）。
- 新規所見（どちらの Issue にも記載なし）: (a) ロックは heartbeat を持たない — `owner.startedAtMs` は acquire 時刻のまま更新されず、健全な長時間 holder と wedge した holder が区別不能、(b) ロック bucket が不整合 — `handleSet`/`handleCheckbox` は per-intent bucket、`handlePark`/`handleUnpark` 他は同一 state file を workspace sentinel bucket で変更する（**code-derived、未実測**）、(c) `resyncOneIntent`（`amadeus-lib.ts:5843→5888`）は `Completed` を書く UNLOCKED な state RMW である。
- Updated artifacts: 9 共有成果物の現在断面を更新し、直前の `260802-registry-drift-guard` を本文保持のまま履歴へ降格。per-intent record `re-scans/260803-state-integrity.md` を新設。
- Per-intent record: `re-scans/260803-state-integrity.md`

## 実行メタデータ（履歴: 260802-registry-drift-guard）

- Date: `2026-08-02T18:00:19Z`
- Base commit: `47574fbabf274e11cb8e0b37bf35a0309a7b3d42`（本 intent の過去recordはなし。`re-scans/` のうち最新時刻 `2026-08-02T10:27:57Z` で共有 freshness pointer にも採用された `260802-scope-grid-face-sync` の observed を最新の記録済み祖先として選択。dirty worktree保全のため今回のpreflightではtrunk統合・追加git操作を行わず、既存recordの系譜記録を根拠とした）
- Observed commit: `64b44a9f8c8c79aff876d3275b194f39ead62a49`（ユーザー指定の観測HEAD。dirty worktreeを保全し、scanによるsource変更なし）
- Scope: `self-fix`、Brownfield、単一repo `amadeus`、Depth: Minimal、Test Strategy: Comprehensive
- Focus: Issue #2037の文書バックフィルと分離したregistry drift再発防止。CLI dispatch 33 ↔ `Valid:` 30、stage schema accepted 25 ↔ emitter 25 ↔ authoritative spec欠落9、EN/JA Field referenceのmachine registry不在、docs-only CI迂回を対象とした。
- Scan mode: Developer Code Scanの完全要点をArchitectがlive sourceの主要seam（state switch/default、schema required/optional、emitter order、英日H3、authoritative table/reserved節、CI change detector）と照合して合成。テストはDeveloper scanで対象5 suite 164 pass / 316 assertions / 0 fail。Architect synthesisではテスト再実行なし。
- Current decision: 全25 fieldのmachine registryを英日Field reference冒頭へ置き、judgement-heavy H3は維持する二層案を推奨。schema既存配列をreadonly exportし、pure extraction/comparison helper、双方向/cardinality/empty/negative tamper、docs-path CI配線で閉じる。
- Requirements Analysisへ送る裁定: (1) CLI表示順を契約化するか集合一致だけにするか、(2) machine registryの表現と英日parity、(3) authoritative spec欠落9件とactive `when`、stale `t62`を同一intentで直すか、(4) docs-only change detectorの最小対象path。
- Updated artifacts: 9共有成果物の現在断面を更新し、直前の `260802-scope-grid-face-sync` を本文保持のまま履歴へ降格。per-intent record `re-scans/260802-registry-drift-guard.md` を新設。
- Per-intent record: `re-scans/260802-registry-drift-guard.md`

## 実行メタデータ（履歴: 260802-plugin-projection-parity）

- Date: `2026-08-03`
- Base commit: `47574fbabf274e11cb8e0b37bf35a0309a7b3d42`（直近の祖先observed、260802-scope-grid-face-sync）
- Observed commit: `a8e1ce025a918310ab7d803270bb6fc6b649c598`（`feat(swarm): enforce fixed-width unit execution pool (#2071)`）
- Distance: `25 commits`。区間規模: `1085 files changed, 92157 insertions(+), 9694 deletions(-)`。
- Scope: `self-fix`、Brownfield。Focus: [Issue #2018](https://github.com/amadeus-dlc/amadeus/issues/2018)／PR [#2049](https://github.com/amadeus-dlc/amadeus/pull/2049) 後に残る committed plugin projection parity。Claude 58 tracked、他4 self-install面0 tracked、startup composeによるdirty生成、Codex runnerの `.codex/skills` 誤投影を再実測した。
- Architecture ruling: packageはneutral bundle／0-plugin baselineを維持し、5 self-install面へ決定的project projectionをversion管理する。startup composeはrepair-only。Codex runnerの正規先はproject-root `.agents/skills`、Kiro CLI／IDEはpackage-only。
- Updated artifacts: 共有CodeKB 8成果物、本ファイル、`re-scans/260802-plugin-projection-parity.md`。既存の他intent履歴と `architecture.md` の Interaction Diagrams は保持した。

## 実行メタデータ（履歴: 260802-scope-grid-face-sync）

- Date: `2026-08-02T10:27:57Z`
- Base commit: `33e196b80b2254eee733fcaec4359dfbdd29c24b`（前回 observed = 260801-tla-multi-model。祖先性実測: `git merge-base --is-ancestor 33e196b80 47574fbab` exit 0）
- Observed commit: `47574fbabf274e11cb8e0b37bf35a0309a7b3d42`（`chore(metrics): maintain snapshots at 6b68dd65b8bf6fc1ae97a5c33ffb5b849ea7ecfb (#2027)`、origin/main tip = 作業ツリー HEAD）
- Distance: `57 commits`（`git rev-list --count 33e196b80..47574fbab`）
- 区間規模: `1295 files changed, 74640 insertions(+), 10737 deletions(-)`（`git diff --shortstat 33e196b80..47574fbab`）。主な構造変化はいずれも患部外 — #2017 の `amadeus-layered-config` → `amadeus-config` 全域リネーム（167 ファイル）、#2012 の formal-model-check 全登録 TLA モデル一般化、plugin compose 読取境界の fail-closed 化（#1964/#1996/#2005/#1970、新規 t410/t411）、fatal-latch 系 loud fail 徹底（#1959/#1961/#1966/#2000）、cg-plan-guard 3 Bolt（#1928/#1939/#1948）+ #2016 mirror label 同期（t412）。残りは metrics スナップショット群。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal、Test Strategy: 既存 CI ブロッキング集合を維持
- Focus: Issue #2033（クロスレビュー 2 名 CONFIRMED_WITH_REFINEMENTS 済み）— 2026-07-28 の self-feature lightening 決定が `.claude` 1 面にしか着地せず、他 4 dogfood 面（`.codex` / `.cursor` / `.kimi-code` / `.opencode`）が決定前の姿で残存。患部 = grid 5 面（`self-feature` の feasibility / approval-handoff / practices-discovery / nfr-requirements が claude SKIP vs 他 EXECUTE、15/33 vs 18/32）、scope prose 3 種 × 4 面（self-feature 17 行差 / self-document 4 行差 / self-refactor 4 行差、self-fix は 0 行差）、検査機構（`amadeus-sensor-self-scope-consistency.ts` の `readGridScopes :110-137` が `:116-117` で `.stages` を読み捨て、`compareExpected :153-172` に面間比較が不在）、周辺ガード 3 層（`promote-self.ts` の extras verbatim 保持 `:151`/`:156`、`amadeus-graph.ts` の folded row 保存 `:1409` と単一面検査 `:330-332`、CI `ci.yml:243-255`）。意図的非対称（`self-feature.formal-model-check` = `amadeus-graph.ts:1375`/`:1387` の設計コメントが一次根拠、および `installer-distribution` scope）は是正対象から除外。差分リフレッシュ: 直近かつ祖先である `33e196b80` を base とし、全 file:line を observed で再実測。患部 9 パスは区間内 0 コミット（乖離は区間内の新規導入ではなく残存）。
- Updated artifacts: 実質更新 3 件 = `architecture.md`（3 層構造とガード 3 層の盲点機序、意図的非対称の一次根拠、面間比較が第 2 正本を作らない設計含意）、`code-structure.md`（患部 3 グループの配置・区間 touch 判定表・センサー拡張の挿入点表）、`code-quality-assessment.md`（面間セル値を pin するテスト不在、fixture の空 `stages` による vacuous 化、除外条件の誤りによる偽赤、t93/t89 の id pin 連動、t413 予約、manifest 文言の是正、発火経路の狭さ）。判断 1 行のみ 5 件 = `business-overview.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md`。加えて本ファイルと per-intent `re-scans/260802-scope-grid-face-sync.md`。
- 現在マーカーの降格: 直前の現在断面 `260801-tla-multi-model`（observed `33e196b8`）を全 8 成果物で履歴へ全文保存のまま降格した（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。降格後の各成果物の `、現在、` 出現数は 1 件（`grep -c` 実測）。
- Per-intent record: `re-scans/260802-scope-grid-face-sync.md`（患部 touch 判定表・乖離の現存実測・ガード 3 層の実行結果・センサー挿入点表・テスト景観・引用再確認テーブルを含む）。

## 実行メタデータ（履歴: 260802-plugin-optin-parity）

- Date: `2026-08-02`
- Base commit: `33e196b80b2254eee733fcaec4359dfbdd29c24b`
- Observed commit: `689c38744cb9f4fcf2eb517e490cb66b3bb58ce8`
- Distance: `55 commits`
- Focus: [Issue #2018](https://github.com/amadeus-dlc/amadeus/issues/2018) — formal-model-check の project-level opt-in、7 package face／6 host directory の materialization・composition・activation parity
- Scan mode: differential refresh。Issue本文・独立クロスレビュー2件・Developer Code Scan・現行コード・pinned testsを照合し、既存CodeKB本文は保持した。ゲート前に `origin/main` へrebaseし、#2017の config module正規名 `amadeus-config.ts` への変更を追加確認した。

## 実行メタデータ（履歴: 260801-tla-multi-model）

- Date: `2026-08-01T15:42:54Z`
- Base commit: `c49e385ac7b787ce151ab0f077943620bd8bf7e2`（observed の祖先、`git merge-base --is-ancestor c49e385ac HEAD` exit 0）
- Observed commit: `33e196b80b2254eee733fcaec4359dfbdd29c24b`（`fix(kimi): session-start で .current-session を state-file ガードより前に書く(#1922 …)`。作業 HEAD `7e63522f5` は observed + 本 intent の record コミット 2 本のみでコード同一 — `git diff --name-only 33e196b8..HEAD` の非 `amadeus/spaces` ヒット 0 件）
- Distance: `40 commits`（`git rev-list --count c49e385ac..33e196b8`）
- 区間規模: `1396 files changed, 135185 insertions(+), 15633 deletions(-)`（`git diff --shortstat c49e385ac..33e196b8`）。最大の構造変化は `54bf1f805`（#1925、intent 260731-formal-verif-value-chain）の `scripts/formal-verif/` 30 ファイル削除 → `plugins/formal-model-check/tools/` 移設 + canonical コピー新設。残りは otel 基盤拡張、mirror 系整備、#1922 修正、metrics スナップショット群。
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- Focus: Issue #1920（formal-model-check の TLC run/verify 複数モデル対応、MirrorLifecycle 恒常ジョブ化）+ #1921（model-map identity pin の補助モジュール拡張）— model-map v2 の単一モジュール世界観という同根 2 件。患部 = model-map スキーマ（exactObject `:204` / 定数 `:52-54`）、loader（`:252-275`）、arm（`:322-330`）、toolchain（`:418` / `:434-436` / `:439-440` / `:493-494` / `:515-516`）、CI（`ci.yml:508-564` + 直書き 3 ファイル）、byte-pin（`run-model-check-source.ts:118-123`）、stage doc、tests 景観。差分リフレッシュ: 直近の observed `c49e385ac`（260801-open-bug-batch-5）を base とし、全 file:line を observed HEAD で再実測。
- Updated artifacts: 実質更新 3 件 = `architecture.md`（単一モジュール世界観 → 複数モデル一般化の 6 露出面 + identity 設計 + wrapper/Core 構造）、`code-structure.md`（plugin 移設後配置と患部 × 区間 touch 判定）、`code-quality-assessment.md`（テスト空白 — MirrorLifecycleCore.tla 編集で赤になるテスト不在、doc `:35-36` の未実装能力約束）。判断 1 行のみ 5 件 = `business-overview.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md`。加えて本ファイルと per-intent `re-scans/260801-tla-multi-model.md`。
- 現在マーカーの降格: 直前の現在断面 `260801-kimi-bootstrap-deadlock`（observed `861688c31`）を全成果物で履歴へ全文保存のまま降格した（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Per-intent record: `re-scans/260801-tla-multi-model.md`（患部 file:line 全数・引用再確認テーブル・降格確認 grep を含む）。

## 実行メタデータ（履歴: 260801-silent-drop-gate）

- Date: `2026-08-02`
- Base commit: `861688c31fd08cc0068318d71b0d5c5a87153b57`
- Observed commit: `d72f60b5a81fc6e45f99431d61b6561e91b2fc37`
- Distance: `54 commits`
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`
- Focus: Issue #1979 no-silent-drop static gate。3 shape（空／ログのみ catch、成否を返す emit・Result の戻り値破棄、永続化を伴わない偽成功）、ast-grep、shrink-only baseline、node-scoped exemption、#1878 `persistBlocked`、#1874 `setCheckbox` / `setStageSuffix`、#1963 回帰契約。
- Authored scan roots: `packages/framework/core/`、`packages/framework/harness/`、`scripts/`。`dist/`、ルート生成投影、テスト fixture は除外。
- Scan mode: Developer 委譲は2回とも成果物確定前に停滞したため、conductor が承認済みの限定範囲を observed の detached source `/tmp/amadeus-re-scan-wdyCU8/repo` で読取走査した。この偏差は探索範囲・revision を変更していないが、Developer による独立完遂ではない。
- 判定: ast-grep は未導入。既存 `callsite-guard` / `complexity-gate` / lint job は静的 gate の実装先例。#1878 と #1874 は runtime 修正対象。#1963 は [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970)（commit `deb7b91f3`、observed の祖先）で修正済みのため再実装せず回帰契約のみ維持。
- NFR: gate 単独15秒以内、偽陽性率5%以下、fixture 分類100%。tool／rule／baseline／exemption の欠落・不正、zero scan、partial scan は typed fail-closed。
- Verification: Developer scan に記録された ancestor check と限定 `rg` / diff 観測を入力として Architect が主要 file:line を observed source で再読。追加の網羅探索、テスト、typecheck、lint、ast-grep prototype、性能計測は未実行。
- Updated artifacts: `business-overview.md`、`architecture.md`、`code-structure.md`、`api-documentation.md`、`component-inventory.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、本ファイル、`re-scans/260801-silent-drop-gate.md`。
- Per-intent record: `re-scans/260801-silent-drop-gate.md`

## 実行メタデータ（履歴: 260801-kimi-bootstrap-deadlock）

- Date: `2026-08-01T12:15:00Z`
- Base commit: `c49e385ac7b787ce151ab0f077943620bd8bf7e2`（observed の祖先、`git merge-base --is-ancestor c49e385ac HEAD` exit 0）
- Observed commit: `861688c31fd08cc0068318d71b0d5c5a87153b57`（origin/main tip `d9f68e13c` とコード同一 + intent-record 1件 `record: birth intent 260801-kimi-bootstrap-deadlock`）
- Distance: `33 commits`（`git rev-list --count c49e385ac..HEAD`）
- 区間規模: `537 files changed, 28879 insertions(+), 3094 deletions(-)`（`git diff --shortstat c49e385ac..HEAD`、測定 ref = observed `861688c31`）。大半は otel 基盤拡張（resource-core / span-context / exception イベント / metrics 語彙配線）、mirror 系（boundary 対称性・title バイトクランプ）、plugin scope opt-in、composed-scope drop、metrics snapshot 定期コミット群。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal
- Focus: Issue #1922 kimi ハーネスの bootstrap デッドロック — session-start hook の順序（`:70` state-file ガード vs `:117` `writeCurrentSessionId`）/ caller-authorization の fail-closed 連鎖 / `.current-session` writer-reader 棚卸し / 近傍テスト。差分リフレッシュ: 直近の observed `c49e385ac`（260801-open-bug-batch-5）を base とし、患部の区間 touch 判定（session-start.ts +14 は otel seam のみで順序不変、機序生存）と全 file:line の observed HEAD 再実測で二重化した。
- Updated artifacts: 実質更新3件 = `architecture.md`（#1922 機構断面: デッドロック連鎖 + `.current-session` writer/reader + 最小修正方向）、`code-structure.md`（患部配置と区間 touch 判定）、`code-quality-assessment.md`（テスト空白の記録 — no-state-file SessionStart → `.current-session` 書込みを検証するテスト不在、t10 `:211` / `:222` が現行 early-exit を pin）。判断1行のみ5件 = `business-overview.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md` — 単一バグの既存構成内修正であり、区間の構成変化（otel 基盤拡張等）は各ファイルの現在節1行で注記した（`cid:reverse-engineering:c3-relabel`）。加えて本ファイルと per-intent `re-scans/260801-kimi-bootstrap-deadlock.md`。
- Per-intent record: `re-scans/260801-kimi-bootstrap-deadlock.md`（患部 file:line 全数・認可連鎖・テスト足場を含む）。

## 実行メタデータ（履歴: 260801-cg-plan-guard）

- Date: `2026-08-01T08:15:00Z`
- Base commit: `c49e385ac`（前回 observed、`git merge-base --is-ancestor` exit 0）
- Observed commit: `cb809c4dec912e594204cdfe56582e2303159dbe`（origin/main tip）
- Distance: `22 commits`（open-bug-batch-5 の6 PR+record #1896、otel-meta U1 #1899、docs #1897/#1898、metrics 往来）
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`
- Focus: CG 計画整合ガード（#1892）の患部3点 — `tryEmitSwarm`（orchestrate:2919-、`:2937` の bolt_dag 不在無音 false）、`computeBoltDag`（runtime:300-313、stderr advisory が spawnRecompile の stdio:ignore に飲まれる実質無音）、`parseUnitsBlock`（lib:7823-、`- name:` 限定 = #1893 患部）— を conductor が verbatim 直読で確定。実績突合の一次証拠は audit SWARM イベント（swarm.ts:325-327）。
- Scan mode: conductor focused live scan+#1893 クロスレビュー2名（進行中、成立後 RA で消費）。orchestrate/runtime は区間内無変更・lib のみ touch（parseUnitsBlock 本体不変）で、患部引用は observed で verbatim 直読により再解決済み（免除の適用ではない — E-CPG-RES13 投票者2訂正反映）。
- corpus: 計画不履行4 record+正当直列6 record+#1893 現物（260712）— M7 sweep の最小 corpus、読み取り専用。
- RA へ送る裁定2件: #1893 修正方向（A 受理拡張 / B 訂正+loud 拒否）、autonomy null 期の扱い。
- Updated artifacts: 実質更新4件 = `architecture.md`（患部3点+SWARM 証拠+区間変化）、`code-structure.md`（実装対象と corpus）、`code-quality-assessment.md`（無音 degrade 3経路と真因）、`business-overview.md`（利用者価値と delivery boundary）。判断1行のみ4件 = `technology-stack.md` / `component-inventory.md` / `api-documentation.md` / `dependencies.md`。加えて本ファイルと per-intent `re-scans/260801-cg-plan-guard.md`。
- Per-intent record: `re-scans/260801-cg-plan-guard.md`

## 実行メタデータ（履歴: 260801-open-bug-batch-5）
## 実行メタデータ（履歴: 260731-formal-verif-value-chain）

- Date: `2026-07-31T09:06:44Z`
- Base commit: `6e7a9d701`（observed の祖先、`git merge-base --is-ancestor 6e7a9d701 HEAD` exit 0、距離 `12`）
- Observed commit: `da51af37533c31a9c3f4ed46bf71b5b15988b0d6`（`origin/main` head。`record: sync intent 260731-open-bug-batch-4 (4 bug fixes) with elections and §13 learning (#1834)`）
- 作業断面: HEAD `16486d3c715eec6566a18ba03898b43e5bc3dcdc`（observed + 本 intent の record コミット1本のみ。ソース面は observed と同一）
- Distance: `12 commits`（base→HEAD）／ observed→HEAD は `1 commit`
- 区間規模: `126 files changed, 4214 insertions(+), 102 deletions(-)`（`git diff --shortstat 6e7a9d701..HEAD`、測定 ref = HEAD `16486d3c`）。面別内訳（`git diff --numstat` の機械集計）は `amadeus/` record `89 files / +3221 / −9`、`dist/` `14 files / +133 / −14`、self-install `10 files / +95 / −10`、`metrics/` `4 files / +215 / −2`、**ソース面 `9 files / +550 / −67`**（`amadeus/` を除く合計 `37 files / +993 / −93`）。
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`
- Delivery boundary: 3件を1 Intent で追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: [#1738](https://github.com/amadeus-dlc/amadeus/issues/1738)（formal-model-check の価値チェーン貫通 — advisory 発火点と新規モデル題材、多ハーネス compose）、[#1829](https://github.com/amadeus-dlc/amadeus/issues/1829)（実行器の配布自立化 — `scripts/formal-verif/` 54 本の plugin 移設と manifest スキーマ拡張）、[#1510](https://github.com/amadeus-dlc/amadeus/issues/1510)（model-map の正規更新経路 — MODEL_UNCHANGED と SOURCE_DRIFT の詰み解消）
- Scan mode: Developer の静的 live-code scan を上流入力とし、Architect が確約級引用を HEAD 断面で独立再確認する直列構成（`cid:reverse-engineering:c3`）。テスト未実行、TLC 未実行。
- 判定: **3件とも現存し、いずれも「片側だけ実装された非対称」クラス**。#1829 = projection（ディスク駆動・全走査）と compose（宣言駆動・`stageCopies` ∪ `sharedWrites` のみ）の非対称で、manifest に `tools` 語彙が存在しない。#1738 = advisory が `build-and-test` 1点・stderr 1行に閉じ、compose も `.claude/` 1面のみ（`.amadeus-plugin-src` の実在は `.claude/` だけ）。#1510 = 読取側（`tla-model-loader-internal.ts:232`）が impl-hash を照合するのに書込側（`amadeus-sensor-model-completeness.ts:650-659`）は model/cfg identity しか見ず、impl だけの変更に正規更新経路が無い。
- 区間の主要変化: mirror presentation の completion 境界後 Status を `Completed` で描画（`9008141df`、`amadeus-mirror-presentation.ts` / `-lifecycle.ts` + dist 同期、新規 integration テスト1本 + t281 拡張）、テスト堅牢化3件（`20230b90d` t259 単一プロセス交互計測 / `7ec3e0eae` t224 spawn 枯渇リトライ / `1a3087508` team-up supervisor reap）、metrics スナップショット3件、`v0.1.7` リリース。**`git diff --name-only 6e7a9d701..HEAD | grep "formal-verif\|plugins/\|model-map\|ci.yml"` のヒット6件はすべて本 intent 自身の record ファイルであり、対象実装面（`scripts/formal-verif/` / `plugins/` / `specs/tla/` / `.github/workflows/ci.yml`）への変更はゼロ。** 本 intent の技術・依存前提は前回 RE から不変。
- 引用再確認の相違: Developer 報告の**所在・機序・結論は全件一致**。相違・精密化は4点 — (a) mirror の遷移種数は 16 ではなく **21**（`amadeus-mirror-state-reducer.ts:55` の inline 18 種 + `:113` `| ProjectSyncTransition;` の入れ子 3 種。報告の「16」は warning 系3種を1群に畳んだ数え） (b) `tests/` の formal-verif 参照は `grep -rl` で **93 パス**（報告 82）、うち `.test.ts` は **72**（内訳 unit **29** / integration **35** / e2e 8。報告は unit 30 / integration 34） (c) `dist` の plugin 変種ファイル数は `find -type f` で **38**（報告 39。変種数 8 は一致） (d) `ci.yml` の job キーは `:545`（`:544` は `# U4 formal-model-check begin` マーカー行）、reducer の実ファイル名は `amadeus-mirror-state-reducer.ts`（報告の「reducer」略記）。いずれも実測を正とし、要件段の判断には影響しない。
- 現在マーカーの降格: 直前の現在断面 `260731-open-bug-batch-4`（observed `6e7a9d701`）を本節の新設に伴い履歴へ全文保存のまま降格した（`cid:reverse-engineering:c3-relabel`）。共有 codekb 8成果物の line 3 現在ヘッダも同様に降格し、本 intent 断面を新しい現在節として追記した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Base 選定根拠: 記録済み observed のうち HEAD の祖先かつ距離最小は `6e7a9d701`（exit 0、距離 12）。前々 intent の `3f73823b1` も祖先だが距離が大きいため不採用（`cid:reverse-engineering:rescan-base-ancestry`）。merge-base 復元は不要。本 intent の observed は `origin/main` 系譜の `da51af375` を記録し、ローカル record コミット `16486d3c` は observed にしない（`cid:reverse-engineering:c2-observed-mainline-commit`）。
- Updated artifacts: 実質更新8件 = `architecture.md`（3機構 A–E の対象機構節と相互作用表）、`code-structure.md`（54 ファイル 3+1 分類の配置・dist 8 変種・台帳2面）、`component-inventory.md`（対象コンポーネント 14 + mirror 骨格 2）、`api-documentation.md`（manifest / projection / advisory / model-map / 非対称 / mirror 遷移の6契約）、`dependencies.md`（推移閉包・台帳の直列化点・model-map の閉路）、`code-quality-assessment.md`（非対称4クラスと良い面5点）、`technology-stack.md`（形式検証層スタックと検証ツール断面）、`business-overview.md`（価値チェーンの3切断点と出荷単位）。加えて本ファイルと per-intent `re-scans/260731-formal-verif-value-chain.md`。
- Per-intent record: `re-scans/260731-formal-verif-value-chain.md`。


## 実行メタデータ（履歴: 260731-perf-ci-separation）
## 実行メタデータ（履歴: 260801-open-bug-batch-5）

- Date: `2026-08-01T01:30:00Z`
- Base commit: `da51af375`（observed の祖先、`git merge-base --is-ancestor da51af375 HEAD` exit 0）
- Observed commit: `c49e385ac7b787ce151ab0f077943620bd8bf7e2`（origin/main tip、`record: sync intent 260731-perf-ci-separation ... (#1862)`）
- Distance: `11 commits`（`git rev-list --count da51af375..HEAD`）
- 区間規模: `3408 files changed, 176368 insertions(+), 18008 deletions(-)`（`git diff --shortstat da51af375..HEAD`、測定 ref = observed `c49e385ac`）。大半は `771afe2a2`（#1850 OTel 統合）の dist 7面+self-install 投影で、ソース面の実変化は `packages/framework/core/otel/`（18ファイル）と perf CI 分離4 Bolt（#1848/#1851/#1855/#1859）、norm 2件（#1843/#1847）。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Delivery boundary: 9 Issue を5 Bolt で追跡（Bolt 1: #1838+#1860 / Bolt 2: #1846+#1849 / Bolt 3: #1856+#1857 / Bolt 4: #1863+#1864 / Bolt 5: #1861）。Bolt ごとに PR を切り `main` へスカッシュマージ。
- Focus: クロスレビュー2名成立済みの9バグの患部確定と区間シフト判定。全9件の独立2名 verdict（計18コメント）が検証 SHA `c49e385ac` = 本 RE の observed で投稿済みのため、レビュー成果を scan の一次入力とし、conductor が患部6箇所の verbatim スポット再実測+区間 touch 判定（患部16ファイル中、区間内変化は #1850 touch の7ファイルのみ・全引用は #1850 着地後検証のため再解決不要）で二重化した。
- 既存 open PR 棚卸し: 9 Issue すべて 0 件 — 引き取りなし、全件新規実装（`cid:reverse-engineering:c1-preexisting-pr-inventory`）。
- テスト採番予約: `t391`〜`t398` を8件へ予約（現最大 `t390`。既存テスト拡張で足りる場合は返上）。
- Bolt 間交差判定: Bolt 1 は mirror 4ファイル共有で Bolt 内直列、Bolt 2 は `amadeus-utility.ts` 交差で Bolt 内直列、Bolt 3 は `bootstrap.ts` 交差で Bolt 内直列、Bolt 4 は非交差で並行可、Bolt 5 は全 Bolt と非交差。dist 再生成面はマージ順直列。
- Updated artifacts: 実質更新4件 = `architecture.md`（9バグの機構節 + 区間の構造変化: OTel ファミリー到着・perf tier 分離）、`code-structure.md`（患部配置と区間の機械集計）、`code-quality-assessment.md`（根因確度と品質所見）、`business-overview.md`（利用者影響と delivery boundary）。判断1行のみ4件 = `technology-stack.md` / `component-inventory.md` / `api-documentation.md` / `dependencies.md` — 9バグはすべて既存構成内の欠陥であり、区間の構成変化（OTel 18モジュール等）は各ファイルの履歴節整合を保つ現在節1行で注記した（`cid:reverse-engineering:c3-relabel`）。加えて本ファイルと per-intent `re-scans/260801-open-bug-batch-5.md`。
- Per-intent record: `re-scans/260801-open-bug-batch-5.md`（患部 file:line 全数・要件段へ送る裁定事項3件を含む）。

## 実行メタデータ（履歴: 260801-otel-meta-schema）

- Date: `2026-08-01T01:07:56Z`
- Base commit: `6e7a9d701`（observed の祖先、`git merge-base --is-ancestor 6e7a9d701 HEAD` exit 0）
- Observed commit: `9c8df859ef0492b6fbc82f26d931a1558277faaa`（`git rev-parse HEAD`）
- Distance: `56 commits`（`git log --oneline 6e7a9d701..HEAD | wc -l`。scan 報告の 55 は本実測で 56 と訂正）
- 区間規模: `3436 files changed, 177199 insertions(+), 18066 deletions(-)`（`git diff --shortstat 6e7a9d701 HEAD`、測定 ref = observed `9c8df859e`）。面別内訳（`git diff --numstat` の機械集計）は `dist/` `1484 files / +77091 / −8274`、self-install `1060 files / +55067 / −5911`、`amadeus/` record `459 files / +17893 / −12`、`metrics/` `5 files / +288 / −2`、**ソース面 `428 files / +26860 / −3867`**
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`
- Focus: [#1868](https://github.com/amadeus-dlc/amadeus/issues/1868) — OTel メタ情報スキーマ v1（§1 resource 12属性 / §2 span attributes / §3 log = 変更なし / §4 exception / §5 subagent 観測 / §6 metrics 語彙）の実装のための技術断面確定
- Scan mode: Developer の静的 live-code scan を上流入力とし、Architect が主要主張（resource literal 1箇所・`registerMeterProvider` の production 未呼出・PreToolUse 不在・exception 属性の欠落・78-pin ガード集合）を observed commit で独立再確認する直列構成。テストは未実行
- **区間の性質（重要）**: base `6e7a9d701` の時点で `packages/framework/core/otel/` は**存在しない**（`git cat-file -e 6e7a9d701:packages/framework/core/otel/tracer-provider.ts` → 「exists on disk, but not in `6e7a9d701`」）。すなわち本区間は OTel v1 実装プログラム（#1672 系）の全体を含み、diff-refresh は実質「新設サブシステムの初回スキャン」にあたる。区間規模が前回（13 commits / 188 files）比で桁違いなのはこのため
- 区間の主要変化: Phase 1 walking skeleton（`42dc68988` #1678 — Providers / Local Exporters / vendored OTel API）、event registry 78語彙 + drift guard（`e37f81094` #1703）、W3C Trace Context 伝播（`5ad0a1d04` #1705）、Local Exporters の production 化（`fe2e0480c` #1719）、fail-open diagnostic log（`d60f73208` #1731）、metrics API subset（`f8f87c797`）、Relay 縮退（`a169e5e9b`）、共有 bootstrap seam + subprocess span ラッパ（`fc94b38ba` Bolt M-P）、audit-emit 系 29 site の canonical 移行（`559c84b01` Bolt G1）、targeting 系移行（`a59b41870` Bolt G2）、subprocess 境界の span 化（`1a6dac8b7` Bolt G3）、旧 audit writer 削除（`5d912e0dd` #1844、削除ゲート6条件 GREEN）、perf tier 分離（`67ca151b5` ほか）、統合 patch-coverage 解消（`37dbc18eb`）
- 判定: **#1868 の6面すべてについて患部と拡張点が確定**。最小改修は §4 exception（`tracer-provider.ts:155-156` の2行 + registry def の `optionalAttributes`）、最大は §5 subagent（PreToolUse hook 新設 + プロセス跨ぎのスパン設計 + canonical イベント追加による 78-pin 全面更新）。§6 metrics は §1 resource に依存し、bootstrap の metrics arm 新設が前提
- 引用再確認の相違（Developer 報告との差分）: 所在・機序・結論は**主要主張すべて一致**。相違・精密化は次の6点 — (a) コミット数 = 56（報告 55、`git log --oneline 6e7a9d701..HEAD | wc -l`） (b) `EXPECTED_CANONICAL_COUNT` は `event-registry.ts:77`（報告 `:79`） (c) 報告「redaction は span event 属性を通らない」は **write-time に限れば正、export 境界では誤** — `local-span-exporter.ts:93` が `events[].attributes` を `redactAttributes` に通す（報告自身が後段で default-deny 前提の記述をしており内部的にも不整合） (d) **`resource` は export 境界の `redactRecord`（`local-span-exporter.ts:88-99`）の対象外**であり、ローカルストアでは無処理で書かれる（報告は Relay 側の扱いのみ言及）。Relay（`relay.ts:298-312`）は値スクラブのみでキー admission を意図的に迂回（`:294-297` に理由コメント） (e) 78-pin は drift test 内で **5箇所**（報告 4 箇所 = `:51-54`。加えて `:192` の `vocab.length` 78 pin が独立に存在） (f) ハーネス注入チャネルとして報告の3様式に加え、**packager 生成データファイル `tools/data/harness.json`**（`scripts/package.ts:206-214` `writeHarnessData()`、canonical に不在・dist 7ツリーに実在、コメント `:207-208`「the object shape leaves room for future per-harness runtime facts」）が第4様式として存在する。`amadeus.harness.version` の供給に env 配線を新設せずに済む最有力経路
- 独立検証で追加した所見: **セッション相関の片側欠落** — `amadeus.session.started` / `.resumed` の def（`event-registry.ts:245-262`）は `requiredAttributes: ["Source"]` のみで session ID を持たない。#1868 §1 が `session.id` を「SESSION_STARTED 監査行との突合キー」と位置づけるが、監査行側に突合対象が存在しないため、resource への追加と registry への optional 属性追加が対になる（属性追加のみなら cardinality pin は不動）
- 現在マーカーの降格: 直前の現在断面 `260731-open-bug-batch-4`（observed `6e7a9d701`）を本節の新設に伴い履歴へ全文保存のまま降格した（`cid:reverse-engineering:c3-relabel`）。共有 codekb 8成果物の line 3 現在ヘッダも同様に降格し、本 intent 断面を新しい現在節として追記した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）
- Base 選定根拠: 前 intent の observed `6e7a9d701` は `origin/main` 系譜のコミット（`record: sync intent 260730-open-bug-batch-3 completion (3 bug fixes) (#1815)`）であり、祖先性が保たれている（exit 0、距離 56）。merge-base 復元は不要。`cid:reverse-engineering:rescan-base-ancestry`（日付最新でなく祖先性を判定してから採用）に従い、祖先性を先に実測してから base とした
- Updated artifacts: 実質更新8件 = `architecture.md`（3プロバイダ構成・resource 一元化位置・redaction 二層・exception / subagent / trace 連結）、`code-structure.md`（otel 18モジュールの規模表・6面と患部の対応・ハーネス注入4様式・resource 属性の供給元棚卸し）、`component-inventory.md`（改修面の目録・registry 構成実測・subagent def・計器の現状）、`api-documentation.md`（bootstrap / 3プロバイダ登録 / Span / redaction / registry / 監査 accept-set / ハーネス検出の各契約）、`technology-stack.md`（vendored API 自前実装・semconv 語彙の前例不在・env / git 断面の空白・ビルド時注入チャネル・二重モジュールグラフ・リセットシーム）、`dependencies.md`（モジュール依存の向き・6面の相互依存・78-pin ガードの依存グラフ・外部依存）、`code-quality-assessment.md`（面別難度・強み5件・弱み7件・検証設計上の注意）、`business-overview.md`（解決される問い・受益者・プライバシー境界・スコープ境界）。加えて本ファイルと per-intent `re-scans/260801-otel-meta-schema.md`
- Per-intent record: `re-scans/260801-otel-meta-schema.md`

## 実行メタデータ（履歴: 260731-perf-ci-separation）

- Date: `2026-07-31T08:20:00Z`
- Base commit: `6e7a9d701d7cf350310a047bc5b70ff18ed15272`（observed の祖先、`git merge-base --is-ancestor 6e7a9d701 HEAD` exit 0）
- Observed commit: `da51af37533c31a9c3f4ed46bf71b5b15988b0d6`
- Distance: `11 commits`（`git rev-list --count 6e7a9d701..da51af375`）
- 区間規模: `120 files changed, 3939 insertions(+), 102 deletions(-)`（`git diff --shortstat 6e7a9d701..da51af375`、測定 ref = observed `da51af375`）。ソース面を触るのは4コミットのみで、残りは `record:` / `chore(metrics):` のスナップショット往来（#1824–#1832、#1834）。
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`
- Delivery boundary: Bolt 単位で PR を切り `main` へスカッシュマージ。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: perf/ベンチマーク検証を PR ブロッキング CI から分離する面の棚卸し — ランナーの tier モデルと除外フック、スイート内 perf テストと予算定数、`ci.yml` のジョブグラフとブロッキング境界、coverage 機構への波及、非ブロッキング workflow の既存様式、サイズ／residency ラチェットとの相互作用。
- Scan mode: Developer の静的 live-code scan を上流入力とし、Architect が主要引用を observed commit で独立再確認する直列構成。テスト未実行。
- 判定: 本 intent の実質的対象は**スイート内 perf テスト**（`t258` / `t257` / `t259` / `t269` / `t292` / `t-plugin-stage-discovery`）に絞られる。理由は2つ — (a) e2e tier は `tests/run-tests.ts:197-202` の `--ci` に含まれず既に PR ブロック外 (b) mirror distribution ベンチマーク鎖は `distribution-release-gate`（`ci.yml:279`）が `ci-success` の `needs`（`:651-659`）に不在で、かつ GitHub ruleset `18843917`（name `main`）の required status check が **`CI Success` 1件のみ**（`gh api repos/amadeus-dlc/amadeus/rulesets/18843917`、2026-07-31 実測）であるため、**de jure でも既に非ブロッキング**である。残る論点はランナー時間（replica 3本 + aggregate + release gate）のみ。
- 最強の論拠: **integration tier は1 PR あたり最大3回実行される**（`ci.yml:189` `tests` / `:320` `coverage-head` / `:395` `coverage-base`。`package.json:19-20` により `test:ci` と `coverage:ci` は同じ3 tier）。`scripts/detect-ci-changes.sh:9-32` が `tests/*` と `*.ts` を `full=true` かつ `coverage=true` に分類するため、テストファイル1つの変更で3ジョブすべてが起動する。単発コストではなくこの多重評価が、負荷感受性のある予算（最厳は `t269...performance.integration.test.ts:102` の 1ms）を偽赤に晒す。
- 区間の主要変化: #1820 `7ec3e0eae`（`t224` に subprocess 終了チャネル3分類 `EXIT_CHANNEL_CASES` `:72` と spawn 枯渇リトライ seam `RETRYABLE_SPAWN_ERROR` `:90` / `SPAWN_RETRY_LIMIT` `:91` / `SPAWN_RETRY_BACKOFF_MS` `:92` / `runWithSpawnRetry` `:206` — integration tier が既に spawn 競合下にあることの直接証拠）、#1822 `20230b90d`（`t259` を単一プロセス交互計測へ集約し予算を `90_000` → `180_000` へ、`:121`）、#1823 `9008141df`（`mirrorSnapshotStatus` `:250-252` 新設）、#1821 `1a3087508`（`t-team-up-codex-resume.serial.test.ts` の fixture supervisor reap）。**`.github/`、`scripts/`、`package.json`、`tests/run-tests.ts` は区間内で無変更**であり、本 intent の対象構造は base 断面から不変である。
- 引用再確認の相違（Developer 報告 → Architect が observed `da51af375` で再実測）: (a) `levelFiles` は `:839-850`（報告 `:838-848`） (b) `runFilesPartitioned` 宣言は `:875`（報告 `:873`） (c) `runTier` は `:900-909`、`pinnedSerial` `:881` / `effectiveParallel` `:901`（報告 `:899-909`） (d) `reportDynamicSizes` 宣言は `:952`、drift 出力は `:984-990`（報告 `:951` / `:983-990`） (e) integration の excludes 呼び出しは `:1161-1166`（報告 `:1162-1166`） (f) `printSummary` は `:911`、`tests-totals.json` 書込は `:913`（報告 `:912-915`）。**所在・機序・結論は全件一致**しており、相違はいずれも1〜2行のオフセットで方針に影響しない。
- 新規に確定した事実（scan notes が INCONCLUSIVE としていた面）: branch protection。scan notes は「working tree からは確認できない」としていたが、`gh api repos/amadeus-dlc/amadeus/rulesets/18843917` で required status check が `CI Success` 1件のみと確定した（2026-07-31 実測）。これにより mirror ベンチマーク鎖の非ブロッキング性は de facto から de jure へ格上げされた。
- 現在マーカーの降格: 直前の現在断面 `260731-open-bug-batch-4`（observed `6e7a9d701`）を本節の新設に伴い履歴へ全文保存のまま降格した（`cid:reverse-engineering:c3-relabel`）。共有 codekb 8成果物の line 3 現在ヘッダも同様に降格し、本 intent 断面を新しい現在節として追記した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Base 選定根拠: 前 intent の observed `6e7a9d701` は `origin/main` 系譜のコミットとして記録されており、`git merge-base --is-ancestor 6e7a9d701 HEAD` exit 0、距離 `11` で祖先性が保たれている（`cid:reverse-engineering:rescan-base-ancestry`、`cid:reverse-engineering:c2-observed-mainline-commit` の2世代連続の効果）。merge-base 復元は不要だった。本 intent の observed `da51af375` も `origin/main` 系譜のコミットである（`da51af375 record: sync intent 260731-open-bug-batch-4 (4 bug fixes) with elections and §13 learning (#1834)`）。
- Updated artifacts: 実質更新8件 = `architecture.md`（区間の構造変化と機構 A–D: tier 軸・`--ci` 構成・ci.yml ジョブグラフ・非ブロッキング様式）、`code-structure.md`（perf テストの所在と予算定数、サイズ注記の罠、並列帯の競合相手）、`code-quality-assessment.md`（現状所見と分離が作りうる6リスク、未決4点）、`business-overview.md`（問題定義・利用者影響・既に分離済みの境界）、`component-inventory.md`（分離候補／分離不可／周辺機構の目録）、`api-documentation.md`（ランナー CLI 契約・判定述語契約・CI 契約）、`technology-stack.md`（ランナーと計測時間軸、CI プラットフォーム面、ベンチマークプロトコル）、`dependencies.md`（分離手段 A/B/C ごとの波及チェーン）。加えて本ファイルと per-intent `re-scans/260731-perf-ci-separation.md`。
- Per-intent record: `re-scans/260731-perf-ci-separation.md`。



## 実行メタデータ（履歴: 260731-open-bug-batch-4）

- Date: `2026-07-31T05:31:35Z`
- Base commit: `3f73823b1`（observed の祖先、`git merge-base --is-ancestor 3f73823b1 HEAD` exit 0）
- Observed commit: `6e7a9d701d7cf350310a047bc5b70ff18ed15272`
- Distance: `13 commits`
- 区間規模: `188 files changed, 6355 insertions(+), 424 deletions(-)`（`git diff --shortstat 3f73823b1..HEAD`、測定 ref = observed `6e7a9d701`）。面別内訳（`git diff --numstat` の機械集計）は `dist/` `52 files / +1661 / −171`、self-install 8面 `33 files / +1164 / −123`、`amadeus/` record `72 files / +2204 / −10`、`metrics/` `5 files / +286 / −2`、**ソース面 `26 files / +1040 / −118`**。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Delivery boundary: 4件を1 Intent で追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: [#1811](https://github.com/amadeus-dlc/amadeus/issues/1811) P1/S2（`t-team-up-codex-resume.serial.test.ts` の fake supervisor stub が不死設計で、テスト終了後もプロセスが残留する）、[#1800](https://github.com/amadeus-dlc/amadeus/issues/1800) P3/S3（`t224-upstream-v2-migration-cli.test.ts:1411` の素の `status` 比較が spawn 失敗のセンチネル `-1` を診断不能な差分として表示する）、[#1797](https://github.com/amadeus-dlc/amadeus/issues/1797) P3/S4（`t259-guard-corpus.test.ts:108-109` の比 2.5 assert が逐次計測の別時間窓に立ち負荷変動で系統的にずれる）、[#1816](https://github.com/amadeus-dlc/amadeus/issues/1816) P3/S4（mirror Issue の close 経路が body を書かず、completion 境界の最終 body は Status が構造的に `Running` のまま残る）
- Scan mode: Developer の静的 live-code scan を上流入力とし、Architect が主要引用を observed commit で独立再確認する直列構成。テストは未実行（`#1811` のみプロセス残留のライブ実測あり）。
- 判定: **4件とも現存**。#1811 は本番 supervisor 側が fail-closed 実装済み（`packages/framework/core/tools/team-up-codex-safety-wait.ts:643` の `runRecordIsActive` ループ、`:561-582` の `catch` → `false`）であり、患部はテスト fixture 側に限局する。#1816 は close 経路の body 非書込（`packages/framework/core/tools/amadeus-mirror-executor.ts:1156-1159`）と completion 境界の Status 強制（`amadeus-mirror-lifecycle.ts:311-312`）の2機序が残存する。
- 区間の主要変化: 選挙ストアの pending ballot lane 新設（#1773 修正 `25f54b066` — `amadeus-election-store.ts` `+168/−10`、`pendingDir` `:113` / `readPending` `:139` / `appendPending` `:161` / `ballotKey` `:187` / `pendingNotOnLedger` `:197` / `integratePending` `:205`、tally 時に `:535` `:540` で統合）、選挙モデル view への question / 選択肢 description 搬送（#1772 修正 `75367ba67` — `amadeus-election-model.ts` `+36/−9`）、mirror boundary report の create 受理判定の反転（#1752 修正 `8a8abf567` — `succeededMirrorCreateExists`（`amadeus-mirror-state-codec.ts:1731`）新設と `amadeus-orchestrate.ts:4249` の `createRan` 化）、`release.yml` の再実行可能ジョブ分割（#1799 `b488466b8`、`+68/−22`）、7ハーネス `dot-gitignore` への pending lane 除外（各 `+5/−0`）、`v0.1.7` リリース（`e06b8f601`）。**core 正本の変更は選挙2モジュール・mirror 2モジュールに限局**し、sensors / hooks / scopes の構成は不変。
- 引用再確認の相違: Developer 報告の**所在・機序・結論は全件一致**。相違は (a) コミット数 = 13（報告 14。`git rev-list --count 3f73823b1..HEAD`） (b) 区間の numstat 各値 — 報告値は insertions+deletions の合算に見え、insertions 単独では `election-store +168`（報告 +178）/ `election-model +36`（+45）/ `release.yml +68`（+90）/ `t223 +76`（+77）/ `t236 +55`（+63）/ `t265 +120`（+137）/ `t234 +66`（+68）、`t373 +323` のみ完全一致 (c) `afterEach` は `:39-41`（報告 `:38-41`） (d) `expectSuccessfulMigration` 宣言は `:218`、診断配列は `:225-238`（報告 `:222-236`） (e) 収束判定は `:1038-1041`（報告 `:1039-1041`） (f) allowlist の presentation 行ピン5件のうち `renderMirrorIssueContent`（`:239-273`）と交差するのは `245-247`（直撃）と `266-271`（下方シフト）の**2件**であり、`193-194` / `230-234` / `237-239` は同関数より上方に位置するため挿入位置が `:239` より下なら不変（報告「直撃3件+シフト2件」）。いずれも修正方針に影響しない。
- 現在マーカーの降格: 直前の現在断面 `260730-open-bug-batch-3`（observed `3f73823b1`）を本節の新設に伴い履歴へ全文保存のまま降格した（`cid:reverse-engineering:c3-relabel`）。共有 codekb 8成果物の line 3 現在ヘッダも同様に降格し、本 intent 断面を新しい現在節として追記した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Base 選定根拠: 前 intent の observed `3f73823b1` は `origin/main` 系譜のコミットとして記録されており（`cid:reverse-engineering:c2-observed-mainline-commit` の実践）、今回**初めて祖先性が保たれた**（`git merge-base --is-ancestor 3f73823b1 HEAD` exit 0、距離13）。merge-base 復元は不要だった。本 intent の observed `6e7a9d701` も `origin/main` 系譜のコミットである。
- Updated artifacts: 実質更新8件 = `architecture.md`（4バグの機構節 + 区間の構造変化）、`code-structure.md`（患部配置・区間の機械集計）、`code-quality-assessment.md`（根因確度と品質所見）、`business-overview.md`（利用者影響と delivery boundary）、`component-inventory.md`（対象コンポーネントと修正面）、`api-documentation.md`（4件が触れる内部契約）、`technology-stack.md`（構成カウントの変化）、`dependencies.md`（Bolt 間の交差判定 — 4件とも並行可・条件2点）。加えて本ファイルと per-intent `re-scans/260731-open-bug-batch-4.md`。
- テスト採番予約: 空き最大は `t373`（`t372` は欠番）。本 intent は `t374`（#1811）/ `t375`（#1800）/ `t376`（#1797）を予約し、#1816 は既存 `tests/unit/t281-amadeus-mirror-presentation.test.ts` へのケース追加とする（`cid:code-generation:swarm-test-number-reservation`）。`t372` の欠番は埋めない。
- Per-intent record: `re-scans/260731-open-bug-batch-4.md`。

## 実行メタデータ（履歴: 260730-open-bug-batch-3）

- Date: `2026-07-30T23:40:33Z`
- Base commit: `a38a1f4d3`（observed の祖先、`git merge-base --is-ancestor a38a1f4d3 HEAD` exit 0）
- Observed commit: `3f73823b1cf5969836faa22dfa333b48b933f2fc`
- Distance: `25 commits`
- 区間規模: `588 files changed, 52675 insertions(+), 27351 deletions(-)`。生成面（`dist/`）・self-install 6面・`amadeus/` record・`metrics/` を除くソース面は `98 files changed, 9531 insertions(+), 2532 deletions(-)`。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Delivery boundary: 3件を1 Intent で追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: [#1773](https://github.com/amadeus-dlc/amadeus/issues/1773)（未開票中の全票本文が単一共有 tracked ファイル `ledger.json` に平文で載り blind 性が格納面から破れる）、[#1772](https://github.com/amadeus-dlc/amadeus/issues/1772)（配布ビューに設問文が無く選択肢の説明が parse 時に無音 drop される）、[#1752](https://github.com/amadeus-dlc/amadeus/issues/1752)（mirror boundary report の create 拒否条件が ask の指示と自己矛盾する）
- Scan mode: Developer の静的 live-code scan を上流入力とし、Architect が主要引用を observed commit で独立再確認する直列構成。テストは未実行。
- 判定: **3件とも現存**。#1752 は本区間で着地した #1791（`ffb68c484`、`intent-initialized` boundary の新設）の後も再現経路が温存されていることを `amadeus-orchestrate.ts:486-500` の実読で確認した。
- 区間の主要変化: 自動起票 finding capability の新設（#1744 `d56e76ddd` — GitHub 汎用ゲートウェイ・階層設定リゾルバ・`gh` spawn の単一不純エッジを mirror 専用実装から抽出、新キー `auto-file-findings`）、sensor 発火 scope の exact-path allowlist 化（#1758 / #1770 — 前 intent #1742 の構造的解決）、degrade unit の engine 側一意解決（#1774 — 前 intent #1711 の解決）、mirror initial-create boundary の新設（#1791 — 前 intent #1750 の解決）、metrics 公開パイプライン（#1761）、phase-check 正名化と auto-solo 選挙フックの protocol 焼き込み（#1776 / #1782 — 前 intent #1749 / #1735 の解決）。**core tools は base `79` → observed `88`（新規9件）**、sensors `7` / hooks `12` / scopes `10` はいずれも不変。
- 引用再確認の相違: Developer 報告の主要引用は**全件所在一致**（appendBallot の ledger 書込・materialize の blind lift・`Choice` 型・`parseChoices` の無音 drop・`DistributionView` のキー集合・`t234` の3重固定・report 拒否条件・`SKILL.md:18` / `:51`・tracked `ledger.json` 183件・`git check-ignore` exit 1）。行**範囲**表記に3点の精密化 — (a) #1791 の prompt 降格は `:488`（報告 `:479`。分岐全体は `:486-500`、`initialCreateIsOutstanding` 宣言は `:373`） (b) #1752 の拒否条件は条件式 `:4252-4256` のうち患部節が `:4255`、state 再評価は `:4241-4242`（報告 `:4251-4255` / `:4242`） (c) `t265` の fixture 行は `:793`（報告 `:791-810` は周辺ブロック）。いずれも所在・意味論は一致し結論に影響しない。加えて1点の精密化: Developer の「`.claude/hooks/` に ledger 配信機構 0件」は結論として正しいが、`grep -rn 'ledger' .claude/hooks/` は**3ヒットする**（`amadeus-mint-presence.ts:4` / `:37`、`amadeus-audit-logger.ts:67`）。全件を実読し、いずれも監査シャードの append-only ledger を指す語彙で選挙 ledger と無関係と確定した（`cid:requirements-analysis:absence-claim-grep-verify`）。
- 追加所見（Developer 報告外）: 本区間で追加されたテストに**番号重複が3組**ある（`t366` = 3ファイル、`t367` = 2ファイル、`t368` = 3ファイル。`ls tests/integration tests/unit` の実測）。`cid:code-generation:swarm-test-number-reservation` が守られなかった実測であり、本 intent の新規テスト採番は `t371` より後を使う。テスト引用は `tNNN` 短形でなくフルパスで書く（`cid:requirements-analysis:mechanism-cite-verify-at-draft` 追補）。
- 現在マーカーの降格: 直前の現在断面 `260730-open-bug-batch-2`（observed `c42ef4d77`）を本節の新設に伴い履歴へ全文保存のまま降格した（`cid:reverse-engineering:c3-relabel`）。共有 codekb 8成果物の line 3 現在ヘッダも同様に降格し、本 intent 断面を新しい現在節として追記した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Base 選定根拠: 記録済みの observed 3件（`c42ef4d77` / `278d61d8e` / `22ee27dbe`）はいずれも現 HEAD の**祖先ではない**。squash マージ運用で record ブランチの observed が `main` に残らない既知現象であり、`cid:reverse-engineering:rescan-base-ancestry`（祖先性を判定してから base を採用）に従い merge-base 復元で `a38a1f4d3` を採用した（`git merge-base --is-ancestor a38a1f4d3 HEAD` exit 0、距離25）。本 intent の observed `3f73823b1` は `origin/main` 系譜のコミットであり、次回 RE での非祖先化を避ける（`cid:reverse-engineering:c2-observed-mainline-commit`）。
- Updated artifacts: 実質更新8件 = `architecture.md`（3バグの機構節 + 区間の構造変化）、`code-structure.md`（患部配置・区間の機械集計・テスト番号重複）、`code-quality-assessment.md`（根因確度と品質所見8件）、`business-overview.md`（利用者影響と delivery boundary）、`component-inventory.md`（対象コンポーネントと新規9モジュール）、`api-documentation.md`（3件が触れる内部契約と区間の新契約）、`technology-stack.md`（構成カウントの変化 core tools 79→88）、`dependencies.md`（Bolt 間の交差判定 — #1773 × #1772 が**交差する**）。加えて本ファイルと per-intent `re-scans/260730-open-bug-batch-3.md`。
- Per-intent record: `re-scans/260730-open-bug-batch-3.md`。

## 実行メタデータ（履歴: 260730-open-bug-batch-2）

- Date: `2026-07-30T15:34:39Z`
- Base commit: `8b8016f62`（observed の祖先、`git merge-base --is-ancestor 8b8016f62 HEAD` exit 0）
- Observed commit: `c42ef4d77ef79d4230efe4fdac5d0d7abf7155f2`
- Distance: `12 commits`
- 区間規模: `116 files changed, 4276 insertions(+), 181 deletions(-)`。生成面（`dist/`）・self-install 面・`amadeus/` record を除く比較断面は `26 files changed, 997 insertions(+), 81 deletions(-)`。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Delivery boundary: 5件を1 Intent で追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: [#1750](https://github.com/amadeus-dlc/amadeus/issues/1750)（Ideation SKIP スコープで初回 auto-mirror create が Inception 完了まで遅延）、[#1749](https://github.com/amadeus-dlc/amadeus/issues/1749)（phase boundary 成果物名の不一致）、[#1742](https://github.com/amadeus-dlc/amadeus/issues/1742)（非成果物へのステージセンサー発火）、[#1735](https://github.com/amadeus-dlc/amadeus/issues/1735)（codex ハーネスで auto-solo-election が不発）、[#1734](https://github.com/amadeus-dlc/amadeus/issues/1734)（promote:self の scope-grid キー順 churn）
- Scan mode: Developer の静的差分スキャンを上流入力とし、Architect が主要引用を observed commit で独立再確認する直列構成。テストは未実行。
- 区間の主要変化: degrade スコープの per-unit directive で `{unit-name}` を実ディレクトリへ解決（#1760 `e839b20ce`、`degradeUnitDirectories()` / `degradeUnitResolutionError()` 新設）、SKILL.md の new-work 経路ツール名修正（#1753 `042237263`）、TLC 標準モジュール parse の tmpdir 追従（#1745 `8bb81c2e7`）。残りは前 intent の record 同期・dist 畳み込み・metrics スナップショット。
- 引用再確認の相違: Developer 報告の主要引用は**全件一致**（boundary 4種・intent-capture 発行元・phase-check 正準名・誤記18ファイル・センサー matches-only フィルタ・election 2箇所・SKILL.md 唯一所在・promote-self 非対称・HEAD churn 非再現）。関数の行**範囲**表記に3点の軽微な精密化 — (a) `scopeGridInSync` は `:130-142`（報告 `:130-144`） (b) `mergeScopeGrid` は `:147-160`（報告 `:147-159`） (c) `hasPersistedMirrorBoundary` は宣言 `:359`・呼び出し `:464`（報告は `:458-465` として呼び出し側のみを指していた）。いずれも所在・意味論は一致し、結論に影響しない。
- 現在マーカーの降格: 直前の現在断面 `260730-skill-reviewer-fixes`（observed `278d61d8e`）を本節の新設に伴い履歴へ降格した（`cid:reverse-engineering:c3-relabel`）。共有 codekb 8成果物の line 3 現在ヘッダも同様に降格し、本 intent 断面を新しい現在節として追記した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Base 選定根拠: 直前の現在節が宣言する observed `278d61d8e` は現 HEAD の**祖先ではない**（`git merge-base --is-ancestor` exit 1）。その前の `22ee27dbe` も同様に非祖先（exit 1）。squash マージ運用で record ブランチの observed が `main` に残らない既知現象であり、`cid:reverse-engineering:rescan-base-ancestry`（祖先性を判定してから base を採用）に従い、HEAD の祖先である `8b8016f62` を差分 base として採用した。
- Updated artifacts: 実質更新4件 = `architecture.md`（5バグの機構節）、`code-structure.md`（患部配置と区間の構造変化）、`code-quality-assessment.md`（根因確度と品質所見6件）、`business-overview.md`（利用者影響と delivery boundary）。判断1行のみ4件 = `technology-stack.md` / `component-inventory.md` / `api-documentation.md` / `dependencies.md` — 本区間で構成カウント・コンポーネント集合・公開契約・依存方向のいずれも変化がなく、5バグはすべて既存構成内の欠陥のため、現在マーカーの整合（`cid:reverse-engineering:c3-relabel`）を保つ目的で判断1行の現在節のみを置いた。加えて本ファイルと per-intent `re-scans/260730-open-bug-batch-2.md`。
- Per-intent record: `re-scans/260730-open-bug-batch-2.md`。

## 実行メタデータ（履歴: 260730-skill-reviewer-fixes）

- Date: `2026-07-30T12:39:53Z`
- Base commit: `22ee27dbef9027203658a6cd98bf97501c4b222c`（observed の祖先、`git merge-base --is-ancestor` exit 0）
- Observed commit: `278d61d8efcea278bfefd2b384c22fcf72e717ab`
- Distance: `34 commits`
- 区間規模: `951 files changed, 54850 insertions(+), 8428 deletions(-)`。生成面（`dist/`）・self-install 面・record を除く比較断面は `340 files changed, 16513 insertions(+), 2547 deletions(-)`。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Delivery boundary: 2件を1 Intent で追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: [#1736](https://github.com/amadeus-dlc/amadeus/issues/1736)（SKILL.md が new-work 経路で `amadeus-utility.ts next --new-intent` を指示するツール名誤り）、[#1711](https://github.com/amadeus-dlc/amadeus/issues/1711)（units-generation SKIP スコープで `{unit-name}` が未解決のまま reviewer-runtime へ渡り produces 実在検査で落ちる）
- Scan mode: Developer の静的差分スキャンを上流入力とし、Architect が主要引用を observed commit で独立再確認する直列構成。テストは未実行。
- 区間の主要変化: `bugfix` → `fix` スコープ改名と `self-*` スコープ4種の dogfood 5ハーネス自己インストール面への集約（新センサー `amadeus-self-scope-consistency` 付き）、Kimi subagent の caller-authorization 拒否層の新設、mirror boundary 自動発火とワークフロー完了の2相化。core tools は base 76 → observed 79（新規3件）、sensors は 6 → 7。
- 引用再確認の相違: Developer 報告の3点を observed で訂正した — (a) `amadeus-utility.ts` の `default:` は `:6182`（報告の `:6179` は不一致、`switch (subcommand)` = `:6088` は一致） (b) `stage-protocol.md` の「unchanged directive JSON」規定は `:898`（報告の `:897` は不一致） (c) `amadeus-mirror-policy.ts` と `team-up-codex-safety-wait.ts` は **新設ではなく既存の変更**（`git diff --name-status 22ee27dbe 278d61d8e` で両者 `M`、base にも実在）。本区間の新規 core tool は `amadeus-caller-authorization.ts`（122行）、`amadeus-sensor-self-scope-consistency.ts`（231行）、`amadeus-workflow-completion.ts`（110行）の3件のみ。
- 現在マーカーの降格: 直前の現在断面 `260729-open-bug-batch`（observed `22ee27dbe`）を本節の新設に伴い履歴へ降格した（`cid:reverse-engineering:c3-relabel`）。共有 codekb 8成果物の line 3 現在ヘッダも同様に降格し、本 intent 断面を新しい現在節として追記した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Updated artifacts: `technology-stack.md`、`component-inventory.md`、`architecture.md`、`api-documentation.md`、`code-structure.md`、`business-overview.md`、`dependencies.md`、`code-quality-assessment.md`、本ファイル、および per-intent `re-scans/260730-skill-reviewer-fixes.md`。
- Per-intent record: `re-scans/260730-skill-reviewer-fixes.md`。

## 実行メタデータ（履歴: 260729-open-bug-batch）

- Date: `2026-07-29T07:06:38Z`
- Base commit: `ca8ff0af40d6250edffe42246d3f5538819c22af`（observed の祖先、`git merge-base --is-ancestor` exit 0）
- Observed commit: `22ee27dbef9027203658a6cd98bf97501c4b222c`
- Distance: `13 commits`
- 区間規模: `624 files changed, 71100 insertions(+), 26206 deletions(-)`。生成面・record・metrics等を除く比較断面は `215 files changed, 16982 insertions(+), 7844 deletions(-)`。
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`、Depth `Minimal`、Test Strategy `Comprehensive`
- Delivery boundary: 6件を1 Intentで追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667)、[#1664](https://github.com/amadeus-dlc/amadeus/issues/1664)、[#1663](https://github.com/amadeus-dlc/amadeus/issues/1663)、[#1662](https://github.com/amadeus-dlc/amadeus/issues/1662)、[#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)、[#1607](https://github.com/amadeus-dlc/amadeus/issues/1607)、および進行中 OTel Intent [#1679](https://github.com/amadeus-dlc/amadeus/issues/1679) との衝突。
- Scan mode: Developer の静的 live-code scan を完全な上流入力として使った differential refresh。Architect は主要引用（timeout 120/180秒、t224診断欠落、parallel checkout status、coverage diff、safety-wait 50ms、completion→audit seal）と区間/件数を observed commit で再確認した。テストは未実行。
- 区間の主要変化: Intent Mirror Project 同期スタック、Bun-only test runner 契約、CLI/SDK/TUI test mechanisms、gated/unset swarm routing、番号回答の意味解決。#1607 / #1664 はこの最新 mirror/journal 断面を基準にする。
- OTel 分離: 別 worktree `otel-improvement` は source 未変更で、未コミットの CodeKB は latest reachable trunk ではない。内容を読まず、本 scan へ混ぜていない。衝突評価は Developer scan の source-level 分析だけを採用した。
- Working tree: 本 scan 開始時点で `amadeus/spaces/default/intents/intents.json` と `260729-open-bug-batch/` に別作業の未コミット変更が存在した。これらを変更・復元せず、CodeKB 9成果物と本 intent の re-scan 記録だけを更新した。
- Updated artifacts: `business-overview.md`、`architecture.md`、`code-structure.md`、`api-documentation.md`、`component-inventory.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`reverse-engineering-timestamp.md`。
- Per-intent record: `re-scans/260729-open-bug-batch.md`。

## 実行メタデータ（履歴: 260728-slop-cleanup）

- Date: `2026-07-28`
- Base commit: `none`（既存 codekb の最新 observed `afb93a825...` は現 HEAD の祖先ではなく、差分 base として不適格。現 HEAD の実測を正とした）
- Observed commit: `ca8ff0af40d6250edffe42246d3f5538819c22af`
- Release reference: `v0.1.6` = `68f2d6699ccb8148c0427b1ff56d37116e565f89`（observed の祖先、`v0.1.6..observed` は 47 commits、1,939 files changed、188,699 insertions、830,609 deletions）
- Scope: `amadeus-bugfix`、Minimal、Brownfield、単一 repo `amadeus`
- Focus: 5 パス・3 カテゴリの確定 Slop — `amadeus-journal.ts` の失効コメント、`amadeus-observability.ts` の未使用 `registered`、Markdown 3 件の空白診断
- Scan summary: Bun/TypeScript の既存構造、7 harness 面、正本 + 7 dist + 5 self-install の同期境界、対象 test / lint / typecheck を確認。HTTP server / database はなく、外部境界は CLI、GitHub、OTLP/HTTP JSON
- 更新成果物: 共有 codekb 9 件と per-intent `re-scans/260728-slop-cleanup.md`
- Sensor 代替: codekb path が既存 sensor filter と一致しないため成功とは扱わず、10 ファイルの H2 数、競合マーカー、現在マーカー、Mermaid 構文、対象パス限定 `git diff --check` を機械確認する

## 実行メタデータ（履歴: 260727-plugin-verb-skills）

- Date: `2026-07-28`
- Base commit: `0c4709102cfa1d13e5aca6b49c65f31a903d72f2`（前 intent `260727-e2e-plugin-conformance` の observed。`git merge-base --is-ancestor 0c4709102 HEAD` **exit 0 = 祖先**、`git rev-list --count 0c4709102..HEAD` = **16**。cid:reverse-engineering:rescan-base-ancestry)
- Observed commit: `afb93a825917220660a3d9bbfdb23d83474b94a6`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `plugin-dev`、ブランチ `worktree-plugin-dev`）
- 区間規模: `git diff --shortstat 0c4709102..HEAD` = **192 files changed, 5529 insertions(+), 956 deletions(-)**（測定 ref: observed `afb93a825`）。record 除外は `git diff --name-only 0c4709102..HEAD | grep -vc '^amadeus/'` = **161**。面別内訳は `git diff --name-only 0c4709102..HEAD | awk -F/ '{print ($2!=""? $1"/"$2 : $1)}' | sort | uniq -c | sort -rn` 出力の転記で `amadeus/spaces` **31**（record）/ `docs/reference` **22** / `docs/guide` **18** / `tests/integration` **9** / `dist/{opencode,kiro-ide,kiro,kimi,cursor,codex,claude}` 各 **7** / `packages/framework` **6** / `dist/plugins` **6** / `tests/unit` **4** / `.{opencode,kimi-code,cursor,codex,claude}/tools` 各 **4** / `docs/harness-engineering` **2**。
- 区間の内訳: 主系統は `git log --oneline 0c4709102..HEAD` 転記で **`f1d561904`（[PR #1596](https://github.com/amadeus-dlc/amadeus/pull/1596) 積み残し 7 Issue バッチ）** — #1591 裁定 B のホストルート統一 / #1592 の 2 段 recompile / #1586 の FS 実測 baseline / #1585 の doctor レンダラ一本化 / #1575 の定数一本化 / #1589 の t341 E2E + 専用 blocking CI ジョブ。これに release `68f2d6699`（**v0.1.6**）、docs 3 本（`3eba39a90` #1584 / `d5e8912f0` #1587 / `daa18009e` #1600）、metrics スナップショット `713fe139b`（#1599）が続く。**前 intent（260727-e2e-plugin-conformance）が要件化した 4 Issue はこの区間で全て着地済み**であり、本 scan はその着地後断面を確定する。
- Scope: `amadeus-feature`（intent `260727-plugin-verb-skills`）、Brownfield、単一 repo `amadeus`
- Focus: plugin 面の **CLI 動詞体系とスキル面**（plugin 導入 UX の CLI/スキル層）。走査対象は (a) `amadeus-plugin.ts` の動詞・結果 union・exit code 規約とエントリ 3 層 (b) `amadeus-utility.ts` の subcommand dispatch と `plugin` 委譲の不在 (c) `amadeus-runner-gen.ts` の runner 生成入力とドリフト検査（compose 済みホストでの `check` 破綻 = [#1598](https://github.com/amadeus-dlc/amadeus/issues/1598) の機序）(d) スキル正本 `packages/framework/core/skills/` の投影行列。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。差分区間 + 本 intent の対象面（plugin CLI / utility dispatch / runner-gen / skills 投影）に限定して走査した。上流入力は Developer スキャン結果（実測済みスキャンノート、全文読了）。
- 主要な確定事項: (A) **plugin CLI は 4 動詞のみ**（`compose` / `drop` / `doctor` / `status`、`amadeus-plugin.ts:71-75` 判別 union・`:100-106` USAGE・`:146-153` `parsePluginCliArgs`）で `install` 動詞は不在。結果 union は `:87-94` の 7 値、exit code 規約は `renderPluginCliResult:645-670`（成功 0 / doctor は degraded で 1 / usage-error 2 / failure 1）、エントリは `runPluginCli:634-642` → `renderPluginCliResult:645` → `handlePluginCli:674-676`（in-process seam）→ `:678` `import.meta.main` の 3 層。 (B) **ホストルートが `#1591` 裁定 B で統一された** — `defaultPluginHostRoot:293-297` / `pluginHostRootFromHook:305-311` / エンジン読取 `amadeus-graph.ts:pluginsHostRoot:2021-2023` が同じハーネスディレクトリへ解決する。 (C) **recompile が 2 段化された**（`spawnRecompile:253-263` が `amadeus-graph.ts compile` → `amadeus-runtime.ts compile` の順、いずれか失敗で false）。 (D) **`amadeus-utility.ts` に `plugin` case は存在しない**（`switch (subcommand)` `:5945`、`grep -n '"plugin"'` = **0 hit**）— 委譲型の先例は `handleMigrate:5900` のみ。 (E) **runner-gen は plugin stage を識別できない** — `isRunnableStage:88-90` は `phase !== "initialization"` のみを見るため、compose 済みホストでは plugin stage が runnable と判定され `handleCheck:363-385` が MISSING で exit 1 になる（#1598 の機序）。 (F) **スキル投影は manifest 側の明示選択**で自動ではない — `amadeus-mirror` は 7 面すべて、`amadeus-election` は claude / codex / kimi の **3 面のみ**（`find dist -type d -name amadeus-election` 実測）。
- Architect 段の独立再検証と **訂正 3 件**: 上流スキャンノートの記述を observed `afb93a825` に対して spot-check し、次の 3 点を訂正した — (1) `amadeus-plugin-compose.ts` の行数は **1488**（`wc -l` 実測。従前成果物および上流の 1469 は失効） (2) SessionStart hook 正本 `core/hooks/amadeus-plugin-compose.ts` は **25 行**（同上、従前の 23 は失効） (3) 区間の record 除外ファイル数は **161**（`grep -vc '^amadeus/'` 実測、上流の 159 は不一致）。その他の核心 file:line（`amadeus-plugin.ts:71-75`/`:100-106`/`:146-153`/`:159-174`/`:195-197`/`:206`/`:253-263`/`:265-282`/`:293-297`/`:305-311`/`:313-316`/`:322`/`:329-331`/`:368`/`:401`/`:457`/`:472`/`:634-642`/`:645-670`/`:674-676`/`:678`、`amadeus-utility.ts:5945`/`:6033`/`:216`/`:5900`、`amadeus-runner-gen.ts:75-77`/`:88-90`/`:118`/`:342`/`:363`、`amadeus-graph.ts:1666`/`:2021-2023`、`plugin-projection.ts:42`/`:56`/`:64`/`:584`/`:598`、`promote-self.ts:37`/`:186`、`t129:203-208`/`:221`、`ci.yml:146`/`:165`/`:678`）は直読一致で **訂正 0 件**（cid:reverse-engineering:cite-shift-vs-nonshift-separation）。
- 測定 ref: 本節および本 scan で更新した全成果物の数値・SHA・file:line は observed `afb93a825` での `git rev-parse` / `git merge-base --is-ancestor` / `git rev-list --count` / `git diff --shortstat` / `git diff --name-only … | awk | sort | uniq -c` / `git log --oneline` / `git ls-files … | grep -c` / `grep -n` / `sed -n` / `find` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 更新した成果物（9 件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md`（#1596 着地後の plugin アーキテクチャ = ホストルート統一・2 段 recompile・E2E/CI 面の新節、旧「現在」節は履歴降格）/ `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` / `api-documentation.md` / `business-overview.md` / `technology-stack.md` / `dependencies.md`。旧「現在」マーカー（`260727-e2e-plugin-conformance`）は本ファイルおよび body 4 成果物（`architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md`）の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。**履歴節の当時記述（4 Issue が未解消だった断面）は削除せず保存**する。
- Sensors: RE ステージが宣言する 3 センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter に構造的に不適合で発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として更新 9 成果物へ `grep -c '^## '`（H2 ≥ 2）と正準 3 語彙の conflict マーカー検査（ヒット 0、cid:code-generation:conflict-marker-grep-before-commit）を機械実行した。
- Delivery boundary: 本 scan は codekb 9 成果物の差分更新のみを成果物とし、コード・テスト・CI 設定・生成配布物・intent record / state / audit・GitHub Issue への書込は一切行わない。設計判断（`plugin` を `amadeus-utility` の subcommand へ委譲するか / plugin 動詞にスキル面を与えるか / #1598 の runner-gen 除外機構をどこへ置くか）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260727-e2e-plugin-conformance）

- Date: `2026-07-27`
- Base commit: `1673c433209c74820881c75a0816bbce3fb2d512`（intent 指定。`git merge-base --is-ancestor 1673c433209c74820881c75a0816bbce3fb2d512 HEAD` **exit 0 = 祖先**、`git rev-list --count 1673c433..HEAD` = **60**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `0c4709102cfa1d13e5aca6b49c65f31a903d72f2`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `plugin-dev`、ブランチ `worktree-plugin-dev`）
- 区間規模: `git diff --shortstat 1673c433..HEAD` = **1830 files changed, 316726 insertions(+), 7366 deletions(-)**（測定 ref: observed `0c4709102`）。面別内訳は `git diff --name-only 1673c433..HEAD | awk -F/ … | sort | uniq -c | sort -rn` 出力の転記で `amadeus/spaces/default` **639**（record）/ `dist/kimi` **301** / `.kimi-code` **296** / `docs` **73** / `tests/integration` **64** / `tests/unit` **48** / `dist/plugins` **37** / `.claude` **29** / `.opencode` **27** / `.cursor` **26** / `.codex` **26** / `dist/{opencode,kiro-ide,kiro,codex,claude}` 各 **25** / `packages/framework/core` **24** / `dist/cursor` **24** / `metrics` **20** / `packages/framework/harness` **17** / `tests/fixtures` **13** / `scripts` **8** / `packages/setup/src` **6** / `tests/smoke` **3** / `tests/e2e` **2** / `plugins` **2** / `tests/conformance` **1**。
- 区間の内訳: 大半は (a) intent record **639** (b) 第 7 ハーネス Kimi Code の着地（`dist/kimi` 301 + `.kimi-code` 296、#1522）(c) 全ハーネス dist 再生成。plugin/E2E に関わる主系統（`git log --oneline 1673c433..HEAD` 転記）は `f8fe817c5`（#1554 plugin walking skeleton — engine relocation / CLI / claude projection / auto-compose hook）、`a03944748`（#1568 U3-U8 全 7 ハーネス追従 — 全面投影・フック配線・doctor 観測・activation policy・適合スイート・docs）、`0e21b7c08`（#1569 INSTALL.md のコピー先を `.amadeus-plugin-src/` へ整合）、`499a65488`（#1518 discovery の dangling symlink スキップ）、`1edf2abfb`（#1535 discovery overhead ゲートを比率 AND 絶対 floor へ）。**`tests/e2e/` の区間変更は 2 ファイルのみ**（`t-print-kimi-doctor.serial.test.ts` / `t-print-kimi-status.serial.test.ts`）で、plugin 二大着地は e2e 層に一切テストを追加していない — これが #1589 の一次事実。
- Scope: `amadeus-bugfix`（intent `260727-e2e-plugin-conformance`）、Brownfield、単一 repo `amadeus`
- Focus: 4 Issue — **#1575**（`PACKAGE_HARNESSES` 同名 export の値衝突: `scripts/promote-self.ts:184` の 5 値 vs `scripts/plugin-projection.ts:42-50` の 7 値。5 値の canonical は `plugin-projection.ts:56` `SELF_INSTALL_HARNESSES`）、**#1585**（standalone doctor が 0-plugin ホストで exit 0 / stdout 0 バイト。`amadeus-plugin.ts:591-593` が 0 件 degrade を持つ `doctorPluginRows:534-536` を通らない）、**#1586**（drop 後に `plugins/<name>/stages/` 等 3 階層が空ディレクトリとして残存。`amadeus-plugin-compose.ts:1150` mkdir recursive ⇔ `:1154` rm ファイルのみの非対称。判定側 `amadeus-plugin.ts:377` は record のみを見る）、**#1589**（plugin の e2e 検証面が不在: `git ls-files tests/e2e/ | grep -c plugin` = **0**、plugin テスト計 **24** は全て unit/integration/fixtures）。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。差分区間 + 本 intent の対象面（plugin / doctor / drop / E2E / 配布面）に限定して走査した。上流入力は Developer スキャン結果 `inception/reverse-engineering/scan-notes.md`（594 行、全文読了）。
- 主要な確定事項: (A) **plugin 現行アーキテクチャ**は projection（`scripts/plugin-projection.ts` → `dist/plugins/` 中立バンドル + 7 面 `INSTALL.md`）→ discovery（staging root `amadeus-plugin.ts:277` `.amadeus-plugin-src`）→ CLI 4 動詞 → 合成エンジン → graph discovery（`amadeus-graph.ts:2011-2013`）→ orchestrate 到達（`amadeus-orchestrate.ts:1017-1034` / 呼び出し `:2289`）の一方向連鎖で、SessionStart auto-compose hook（正本 `core/hooks/amadeus-plugin-compose.ts`、**23 行**の薄いラッパ）が `dist/claude/.claude/settings.json.example:34-46` に配線される。 (B) **ホストスナップショットにディレクトリ語彙が無い**（`amadeus-plugin.ts:204-223` はファイルのみ）ため計画層・検証層のどこにも #1586 を捕捉する概念がない。 (C) **既存 plugin テストの盲点 4 種** — recompile スタブ（`t299:75-78`、ヘッダ `:1-13` が自認）、`hashSurface` のファイルバイト限定（`t299:88-101`、`:94-97` で空ディレクトリを構造的に無視）、e2e 0 件、出荷面（dist コピー）を読むテストが 0 件（唯一の spawn `t299:206` も正本パス）。 (D) **e2e は既定 CI で走らない** — `tests/run-tests.ts:125`（`--ci` = smoke+unit+integration）/ `:126`（`--release` = +e2e）、`.github/workflows/ci.yml:163` = `bun run test:ci -- -P 4` のみ。tests/e2e/ に置くだけではリグレッションガードにならず、実行トリガーを要件で決める必要がある。 (E) **tests/e2e/ の既習様式は 2 系統** — 出荷 dist ツリーを tmp へコピーして駆動する live gate 付き（`t-print-kimi-doctor.serial.test.ts:1-37`、Kimi クレジット消費・既定 skip）と、実バイナリ spawn + fetch shim のオフライン既定（`setup-install.test.ts:1-19`）。#1589 は後者の様式に載せうる。
- 測定 ref: 本節および本 scan で更新した全成果物の数値・SHA・file:line は observed `0c4709102` での `git rev-parse` / `git merge-base --is-ancestor` / `git rev-list --count` / `git diff --shortstat` / `git diff --name-only … | awk | sort | uniq -c` / `git log --oneline` / `git ls-files … | grep -c` / `grep -n` / `sed -n` / `find` / `ls … | wc -l` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer コードスキャン結果 `scan-notes.md`。Architect 段の独立再検証で核心の file:line・件数を observed `0c4709102` に対して spot-check し **訂正 0 件**（`amadeus-plugin.ts:277`/`:377`/`:534-536`/`:591-593`、`amadeus-plugin-compose.ts:1149-1156`（`:1150` mkdir / `:1154` rm）、`promote-self.ts:184`、`plugin-projection.ts:42`/`:56`、`amadeus-orchestrate.ts:913`/`:1017-1019`/`:2289`、`amadeus-graph.ts:2011-2013`、`t299:94-97`/`:205-208`、`run-tests.ts:125-126`、`ci.yml:163`、`settings.json.example:34-46`、`dist/plugins` 10 ファイル、行数 613/1469/295/23、plugin テスト 24 / e2e 83 / serial 35 / e2e-plugin 0 をいずれも直読・コマンド出力で一致確認。cid:reverse-engineering:cite-shift-vs-nonshift-separation）。
- 更新した成果物（9 件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md`（plugin 現行アーキテクチャと 4 Issue の欠陥所在の新節）/ `code-quality-assessment.md`（テスト層の盲点 6 シグナルと e2e 既習様式の新節）/ `code-structure.md`（区間の面別内訳と対象ファイル配置の新節）/ `component-inventory.md`（実行系・検証系コンポーネント棚卸しの新節）/ `business-overview.md` / `technology-stack.md` / `dependencies.md` / `api-documentation.md`（以上 4 件は本 intent 断面の追記）。旧「現在」マーカー（`260727-install-doc-mismatch`）は本ファイルおよび body 4 成果物（`architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md`）の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。
- Sensors: RE ステージが宣言する 3 センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として更新 9 成果物へ `grep -c '^## '`（H2 ≥ 2）と、正準 3 語彙（開始・終了・diff3 base の各マーカー）による conflict マーカー検査（ヒット 0、cid:code-generation:conflict-marker-grep-before-commit）を機械実行した。
- Delivery boundary: 本 scan は codekb 9 成果物の差分更新のみを成果物とし、患部コード（`amadeus-plugin.ts` / `amadeus-plugin-compose.ts` / `promote-self.ts`）・テスト・CI 設定・生成配布物・intent record / state / audit・GitHub Issue への書込は一切行わない。修正方式（#1575 の canonical 統合先、#1585 の standalone レンダラ是正形、#1586 の除去側対称化 vs `baselineRestored` の FS 実測化、「baseline 復元」にエンジン dot-state を含めるかの境界定義、#1589 の e2e 様式選択と実行トリガー）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260727-install-doc-mismatch）

- Date: `2026-07-27`
- Base commit: `0d83aa48b886fe85cd977569c0e7b3015b84d3e5`（前 intent `260726-plugin-host-delivery` の observed。`git merge-base --is-ancestor 0d83aa48b886fe85cd977569c0e7b3015b84d3e5 HEAD` **exit 0 = 祖先**、`git rev-list --count 0d83aa48b..HEAD` = **70**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `46a75f2e7c53aaa475a19cc217d10c9172ad4129`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `fix-plugin`、ブランチ `fix/plugin`）
- 区間規模: `git diff --name-only 0d83aa48b..HEAD | wc -l` = **458 files**（測定 ref: observed `46a75f2e7`）。面別内訳は `git diff --name-only 0d83aa48b..HEAD | awk -F/ '{print $1"/"$2}' | sort | uniq -c` 出力の転記で amadeus/spaces **192** / dist **111**（うち `dist/plugins` **37**）/ tests **55**（integration 32 / unit 16 / smoke 2 / conformance 1 / harness 1）/ packages/framework **16**（core 10・harness 6）/ .kimi-code **16** / .claude **13** / docs **12** / .cursor **10** / .codex **10** / .opencode **9** / scripts **4** / plugins **2**。
- 区間の内訳: **本区間はほぼ全体が前 intent `260726-plugin-host-delivery`（plugin ホスト配信）の Construction である。** 前回 RE（observed `0d83aa48b`）は同 intent の inception 段で実施されており、その時点では plugin-composition / `dist/plugins` / トップレベル `plugins/` は**未着地**（前節が「区間内で完全に無変更」と記録したとおり）だった。本区間 `0d83aa48b..46a75f2e7` はその Construction 本体（U2–U8）を含み、`dist/plugins`（7面 install bundle）・`plugins/`（authoring source）・composition engine の core 再配置がすべて**この区間で新規着地**した。主系統（`git log --oneline 0d83aa48b..HEAD` より）: U2 walking-skeleton + engine core 再配置（`f8fe817c5` / [PR #1554](https://github.com/amadeus-dlc/amadeus/pull/1554)）、U3 host-projection-all（`250265adb`、§12a 是正 `30b3afc99`）、U4 hook-wiring（`a6b20dfe4`）、U5 doctor（`a0b15e1ab`）、U6 activation-policy（`8ae1ef058`）、U7 conformance（`14b004f55`、t188）、U8 docs-sync（`60eb7517e` / `4858fb8d7`）。周辺: promote-self kimi 配線（`e688c9f79` / `f1905d7cd`）、mirror 非対称是正 [#1553](https://github.com/amadeus-dlc/amadeus/issues/1553)（`82df115ae`）、t177 flake 修正 [#1565](https://github.com/amadeus-dlc/amadeus/pull/1565)（`46a75f2e7`）。
- Scope: `amadeus-bugfix`（intent `260727-install-doc-mismatch`）、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1569](https://github.com/amadeus-dlc/amadeus/issues/1569) — plugin の **INSTALL.md / docs が案内するコピー先** と **CLI discovery が実際に走査するステージング先** の不一致。ユーザー裁定 **A**（installDoc / docs を `.amadeus-plugin-src/<name>/` へ修正、**CLI discovery が正**）。欠陥は前 intent の U3 host-projection-all（`250265adb`）で導入された。対象面: discovery（正）`packages/framework/core/tools/amadeus-plugin.ts:278`、installDoc（誤）`scripts/plugin-projection.ts:593`、`dist/plugins/formal-model-check/<face>/INSTALL.md`（6面）、docs `docs/guide/19-plugins.md:183`（EN）+ `19-plugins.ja.md:175`（JA）、テスト棚卸し（t307 / t299 / t302 / t328 / t338 ほか）。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。上流入力は Developer スキャン結果（実測済みスキャンノート）。Architect 段で #1569 対象面の全 file:line・件数を observed `46a75f2e7` で独立再実測し、**訂正 0 件**（`amadeus-plugin.ts:278` `pluginSourceRootOf` / 呼び出し 3 経路 `:288`/`:323`/`:405`、`plugin-projection.ts:593` `Copy this bundle's …` / SELF_INSTALL_HARNESSES `:56` = 5 面、docs `:183`/`:175`、dist 6 INSTALL.md、t307 `:53`/`:60` の非アサート、`.amadeus-plugin-src` の test 配置 6 箇所、`plugin-projection.ts` の `.amadeus-plugin-src` grep = **0 hit** をいずれも実測一致）。
- 測定 ref: 本節および本 scan で更新した全成果物の数値・SHA・file:line は observed `46a75f2e7` での `git rev-parse` / `git rev-list --count` / `git diff --name-only` / `grep -n` / `grep -c` / `sed -n` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 更新した成果物（9件 + 新規 re-scan 記録）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md`（以上は本 intent の新節を追加）/ `dependencies.md` / `technology-stack.md` / `api-documentation.md` / `business-overview.md`（以上は区間の plugin 面変化と #1569 の最小追記）。加えて per-intent 記録 `re-scans/260727-install-doc-mismatch.md` を新規作成。旧「現在」マーカー（`260726-plugin-host-delivery`）は本ファイルおよび body 4 成果物（architecture / code-structure / component-inventory / code-quality-assessment）の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コード（`plugin-projection.ts` / docs / `dist/plugins`）・テスト・intent record / state / audit・生成配布物・GitHub Issue への書込は一切行わない。修正方式（共有定数化で discovery↔installDoc の一致を構造強制するか、文言のみ是正するか / docs 二重管理の扱い / 回帰テストの不変量固定先）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260727-docs-impl-sync）

- Date: `2026-07-27`（intent slug 基準）
- Base commit: `1673c433209c74820881c75a0816bbce3fb2d512`（`chore(metrics): record snapshot (#1501)`、2026-07-26。`git merge-base --is-ancestor 1673c4332 HEAD` **exit 0 = 祖先**、`git rev-list --count 1673c4332..HEAD` = **47**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `aabc0527d96344420cf8236967763b81ce82ac83`（= 現 HEAD、`git rev-parse HEAD` 実測、ブランチ `main`）
- **base 選定の経緯（squash 運用起因の非祖先 observed 群）**: conductor がブリーフィングした base `ad1ff5de9`（前 intent `260726-answer-manual-binding` の observed）は `git merge-base --is-ancestor ad1ff5de9 HEAD` = **exit 1 = 非祖先**で採用不能。`re-scans/` 71 ファイル + ledger から抽出した **80 SHA** を全数祖先判定した結果、**祖先 30 / 非祖先 49**。**直近 5 observed（`ad1ff5de9` / `09c669901` / `f9a0fb86a` / `e39402224` / `0d83aa48b`）はいずれも非祖先**で、これは Bolt worktree のスカッシュマージ運用（org.md § Way of Working）により worktree 上の observed SHA が `main` の履歴に存在しないことに起因する。祖先のうち距離最小は `1673c4332`=**47**（次点 `e12259ba7`=49、`11f1ad61f`=53）で、cid:reverse-engineering:rescan-base-ancestry の「日付最新でなく HEAD の祖先かつ距離最小」に従い `1673c4332` を採用した。**この 47 コミット区間は前 4 intent（mirror-envelope-lf / crossreviewed-bug-batch / mirror-state-split / t258-p95-flake / answer-manual-binding）の RE が非祖先 base で部分的にしか走査できなかった面を含む**（cid:reverse-engineering:rescan-prompt-record-sync が警告する base 退行の実例）。
- 区間規模: `git diff --shortstat 1673c4332 HEAD` = **1602 files changed, 282182 insertions(+), 6842 deletions(-)**。record（`amadeus/`）除外で `git diff --numstat … | grep -v $'\t'amadeus/ | awk` = **1034 files, +212379 / -6817**（測定 ref: observed `aabc0527d`）。トップレベル内訳（`git diff --name-only … | sed 's|/.*||' | sort | uniq -c`）= `dist` **444** / `.kimi-code` **294**（新規セルフインストール面）/ `tests` **109** / `packages` **42** / `.claude` **25** / `.opencode` **24** / `.codex` **23** / `.cursor` **22** / `metrics` **18** / `docs` **18** / `scripts` **7** / その他 8。**生成物面（dist + 5 セルフインストールツリー）= 832**、正本コード（`packages/framework` 36 + `packages/setup` 6 + `scripts` 7）= **49**。
- Scope: `amadeus-document`、Brownfield、単一 repo `amadeus`
- Focus: **docs と実装の乖離の同期**。区間で着地した 7 番目のハーネス（Kimi Code）と plugin walking skeleton が、利用者向け docs の **ハーネス数・投影面数・hook 数**の記述へ伝播していない。中核の実測は下記「乖離クラスタ」。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間 47 コミットの正本 49 ファイルと `docs/` 18 ファイルを対象に差分走査し、docs 側の陳腐化は現 HEAD の実ファイル直読 + `grep -ci` で確定した。
- **乖離クラスタ A — README のハーネス数（区間内で導入）**: `README.md:5`「running natively inside **six** coding-agent harnesses」/ `:67`「extending the four shipped upstream to **six**」/ `:78-83` ハーネス表 **6 行**（Kimi 行なし）。`README.ja.md:5`「**6つ**のコーディングエージェントハーネス」/ `:78-83` 同。`grep -ci kimi README.md` = **0**、`grep -ci kimi README.ja.md` = **0**。実態は `ls -d packages/framework/harness/*/ | wc -l` = **7**（claude / codex / cursor / kimi / kiro / kiro-ide / opencode）。`git diff --name-only 1673c4332..HEAD -- README.md README.ja.md` = **0 行**（= Kimi 着地 PR #1522 が README を更新せず、**本区間で陳腐化が発生**）。対照として `docs/guide/harnesses/README.{md,ja.md}` は区間内で更新され Kimi 行を持つ（正）。
- **乖離クラスタ B — plugin 投影面数（区間内で導入）**: `docs/guide/19-plugins.md` は `:14-15`「the **six** packaged harness faces differ from the **four** self-install faces」/ `:70` / `:131` / `:148` 見出し「Six packaged faces, four self-install faces」/ `:150-156`（列挙に kimi なし）。`docs/guide/19-plugins.ja.md` も「6 つのパッケージ面、4 つのセルフインストール面」で同型。両ファイルとも `grep -ci kimi` = **0**。実態は `scripts/plugin-projection.ts:41-49` `PACKAGE_HARNESSES` = **7**（kimi 追加）、`:55` `SELF_INSTALL_HARNESSES` = **5**（`["claude","codex","cursor","opencode","kimi"]`）。base 断面（`git show 1673c4332:scripts/plugin-projection.ts`）では `:46-53` が 6、`:59` が 4 で、**6→7 / 4→5 の遷移は本区間内**（`git diff --name-only … -- docs/guide/19-plugins.md docs/guide/19-plugins.ja.md` = 0 行 = 未追随）。
- **乖離クラスタ C — EN/JA 対訳の非同期（8 ファイル、区間内で導入）**: 12 番目の hook（`packages/framework/core/hooks/amadeus-plugin-compose.ts`、`ls packages/framework/core/hooks/ | wc -l` = **12**）の着地に伴い EN 側 8 ファイルが更新されたが、JA 対訳は **1 ファイルも更新されていない**。`git diff --name-only 1673c4332..HEAD -- docs/` の 18 件のうち、EN のみ変更で JA 対がないのは `docs/amadeus-files.md` / `docs/guide/01-getting-started.md` / `docs/guide/12-cli-commands.md` / `docs/guide/15-troubleshooting.md` / `docs/guide/glossary.md` / `docs/reference/01-architecture.md` / `docs/reference/06-hooks-and-tools.md` / `docs/reference/11-contributing.md` の **8 件**。JA 側の残存旧数値は `docs/reference/06-hooks-and-tools.ja.md`「11個」= **7 出現 / 5 行**（`:5` / `:13` ×3 / `:15` / `:50` / `:496`）、`docs/guide/15-troubleshooting.ja.md:39`「11 個すべての TypeScript フック」（列挙も 11 個で新 hook 欠落）、`docs/guide/glossary.ja.md:45`「11 個のフックを使い」、`docs/reference/01-architecture.ja.md:476`「11個のフック」。`grep -c 'plugin-compose' docs/reference/06-hooks-and-tools.ja.md` = **0**（EN は **2**）。
- **未裁定仮説（欠陥断定しない）**: EN 側の是正方針が不整合の疑い — 6 ファイルは件数語を除去（count-free 化、cid:code-generation:count-comment-sync-on-catalog-change の推奨形）だが `docs/reference/06-hooks-and-tools.md` は `:5` / `:13` / `:15` / `:52` で硬数値「twelve」「Eleven of the twelve」を採用している。どちらを正準様式とするかは requirements-analysis 以降の**判断事項**として記録する。
- **非欠陥判定（スコープ膨張防止）**: (D) `docs/reference/06-hooks-and-tools.md` に CLI ツール目録 46 件の全数記載がないことは章スコープ外であり欠陥ではない。 (E) 「11 domain-expert agents」を主張する 20 ファイルは domain-expert 限定の表現として**正**（`ls packages/framework/core/agents/*.md | wc -l` = **14** は 11 domain + reviewer 2 + composer 1 の内訳）。ただし `docs/reference/01-architecture.md:60`「**Eleven** flat agent files」と `.ja.md:60`「**11個**のフラットなエージェントファイル」は **flat agent files = 14** を主張しており誤り — ただしこれは **区間外の pre-existing** 乖離で、本 intent のスコープ判断は requirements-analysis で行う。
- 区間の主要実装変更（docs が追随すべき面）: (1) **Kimi Code ハーネス追加**（#1522 / #1549 / #1551、`packages/framework/harness/kimi/` 8 ファイル + `.kimi-code/` 294 ファイル）。 (2) **plugin walking skeleton**（#1554）— `packages/framework/core/tools/amadeus-plugin.ts` **+454 新設 CLI**（4 verb: compose / doctor / drop / status、`:95-101` USAGE）、`scripts/plugin-composition.ts` → `packages/framework/core/tools/amadeus-plugin-compose.ts` **移設**（+111/-7、現 1469 行）、`packages/framework/core/hooks/amadeus-plugin-compose.ts` **+23 = 12 番目の hook**（SessionStart、CLI の薄いラッパで合成ロジック非再実装）。 (3) **metrics ダッシュボード**（#1500 / #1504）— `scripts/metrics-visualize.ts` **+292 新設**（自己完結 HTML、決定的レンダリング、`--check` バイト比較ドリフトガード）、`docs/guide/23-metrics-dashboard.{md,ja.md}` は**対訳同時着地（正）**、`metrics/*.json` = **141 件**。 (4) **mirror v1 統一**（#1553 / #1559 / #1537）— legacy「Mirror Issue」フィールド読取を全廃（`grep -rn 'Mirror Issue"' packages/framework/core/tools/*.ts` = コメント 1 行のみ）、`amadeus-mirror.ts` は +73/-303 で **357 行**へ縮小、mirror 系 **16 モジュール**構成。 (5) **election 強化**（#1517 / #1516 / #1523、`amadeus-election.ts` +61/-16）。 (6) **CI 分割・bench ゲート**（#1528 / #1507 / #1508 / #1557、`.github/workflows/ci.yml` の job = changes / typecheck / lint / distribution-contract / tests / drift-check / distribution-benchmark / -aggregate / -release-gate / coverage-head / coverage-base / coverage / metrics-snapshot / formal-model-check / ci-success）。
- docs 構造スナップショット: `find docs -name '*.md' | wc -l` = **197**（EN **100** / JA **97**）。非対訳 EN 3 件（`docs/guide/team-messaging.md` / `docs/guide/publishing-setup.md` / `docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md` — research は凍結記録で対訳対象外という**仮説**、裁定は後続）。孤児 JA **0**。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `aabc0527d` の実ファイル直読、および `git rev-parse` / `git merge-base --is-ancestor` / `git rev-list --count` / `git diff --shortstat` / `git diff --numstat … | awk` / `git diff --name-only … | sed | sort | uniq -c` / `git show <base>:<path>` / `grep -ci` / `grep -c` / `grep -o … | wc -l` / `ls -d … | wc -l` / `find … | wc -l` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer コードスキャン結果（本 RE の read-only scan、全文読了）。Architect 段の独立再検証で核心の主張を observed `aabc0527d` に対して全数 spot-check し、**訂正 2 件**を確定した — (i) ブリーフィングの `kimi-hooks.ts +401（新）` は**実在しないファイル名**で、実体は `packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts` **+352** と `amadeus-kimi-adapter.ts` **+28**（`git diff --numstat` 実測、cid:requirements-analysis:mechanism-cite-verify-at-draft）。 (ii) ブリーフィングの「docs 20」は実測 **18**（`git diff --name-only … | grep -c '^docs/'`）。他の主張（base 祖先性・距離 47・1034/+212379/-6817・harness 7・PACKAGE 7 / SELF_INSTALL 5・hook 12・agents 14・docs 197/100/97・README kimi 0 hit・19-plugins kimi 0 hit・EN 専用 8 ファイル）は全て一致。
- 更新した成果物（9 件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` / `technology-stack.md` / `dependencies.md` / `api-documentation.md` / `business-overview.md`。加えて per-intent 記録 `re-scans/260727-docs-impl-sync.md` を新規作成。旧「現在」マーカー（`260726-answer-manual-binding` および取り残されていた `260726-plugin-host-delivery`）は計 **6 箇所**の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。
- Sensors: RE ステージが宣言する 3 センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として更新 9 成果物 + 新規 re-scan 記録へ `grep -c '^## '` を実行し H2 ≥ 2 を機械確認した。結果表は `re-scans/260727-docs-impl-sync.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、`docs/` 本体・README・正本コード・生成配布物・GitHub Issue・intent record / state / audit への書込は一切行わない。是正方針（README/19-plugins の 7/5 更新、JA 8 ファイルの対訳同期、EN 側の count-free vs 硬数値の正準様式、pre-existing な「Eleven flat agent files」を本 intent で扱うか）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260726-answer-manual-binding）

- Date: `2026-07-26`（intent slug 基準。RE 実行は `2026-07-27`）
- Base commit: `09c669901385ad44e9a5b378b8d8903eebbc184c`（前 intent `260726-t258-p95-flake` の observed。`git merge-base --is-ancestor 09c669901 HEAD` **exit 0 = 祖先**、`git rev-list --count 09c669901..HEAD` = **2**。候補中で祖先かつ距離最小（`f9a0fb86a`=距離4 / `e39402224`=非祖先 / `1673c4332`=距離42）。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `ad1ff5de9785af38f3c845b64372b65e8b73bb4e`（= 現 HEAD、`git rev-parse HEAD` 実測）
- 区間規模: `git diff --numstat 09c669901..HEAD | grep -v 'amadeus/spaces/' | wc -l` = **0**（測定 ref: observed `ad1ff5de9`）。区間 2 コミット `f8c068975`（前 intent RE+RA record）/ `ad1ff5de9`（前 intent CG+B&T record）はいずれも record-only の snapshot で、**コード/dist/self-install 面は区間内 0 変更**。対象面の交差確認 `git diff --name-only 09c669901..HEAD | grep -iE "mirror-lifecycle|mirror-coordinator|t282|coordinator"` = **0 hit**（mirror answer/guard スタックは区間内で完全に不変）。
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1548](https://github.com/amadeus-dlc/amadeus/issues/1548) **bug / P?・S?（トリアージ参照）** — mirror lifecycle の **manual-boundary ask への answer が構造的に不成立**。manual create（非終端 receipt を残す）＋後続 prompt モード boundary の reconciliation で `expectedPrompt.event.boundary.kind === "manual"` の ask が永続化されるが、`runMirrorLifecycleAnswer`（`amadeus-mirror-lifecycle.ts:969-985`）が answer 転送時に `manualOperation` / `invocationId` を渡さないため、冒頭の manual guard（`:257-265`）で `Manual Mirror lifecycle requires an operation and invocation ID.` を返して常に error 終了し、正規の answer 経路（coordinator `driveMirrorBoundary`→`handlePromptAnswer`）へ到達不能。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間はコード変更ゼロ（record 2 コミットのみ）のため、患部 mirror スタック（`amadeus-mirror-lifecycle.ts` / `-coordinator.ts` / `-types.ts`）は base 時点から不変。#1553（v1 読取統一）は着地済みで本コードは分割後の姿。RE は現 HEAD の実ファイル直読で確定した（欠陥は区間の退行ではなく guard 導入コミット `2bb63f6b8`（#feat complete automatic mirror modes、2026-07-25）から現存）。
- 主要な確定事項: (A) **根本原因 = answer 転送の欠落**。`runMirrorLifecycleAnswer`（`:969-985`）は `boundary: expected.event.boundary` を転送するが `manualOperation` / `invocationId` を渡さない。 (B) **guard が answer を免除しない**。`runMirrorLifecycleBoundary` 冒頭（`:257-265`）は `boundary.kind === "manual"` かつ両フィールド欠落で error 終了し、`expected.event.boundary.kind === "manual"` な answer を常に弾く。 (C) **修正案 (b)（answer 側での補填）は永続情報だけで実現可能** — manual 経路の元値（`parseManualArgs` `:445-447`）は `invocationId === boundary.instance` かつ `manualOperation === operation` なので、answer 側で `manualOperation = expected.operation`・`invocationId = expected.event.boundary.instance`（types `:118-124` `MirrorExpectedPrompt` + `:28`/`:30-34` から再構成可）を補填すれば元値と一致し guard を字義充足する。 (D) **修正案 (a)（guard に `&& !request.answer`）は防御を毀損しない** — `driveMirrorBoundary`（coordinator `:713-714`）は answer 有りで常に `handlePromptAnswer` へ分岐し、その先の `prompt-approved` 権限分岐（`:292-303`）は `invocationId` / `manualOperation` を一切参照しない（invocationId 消費 `:304-308`・manualOperation 消費 `:573-577` はいずれも非 answer 経路専用）。answer なし manual decision 経路には guard がそのまま残る。 (E) **stale 遡及ゼロ** — committed record の `amadeus-state.md` 5 件はすべて `"expectedPrompt":null`（`bindingId` 付き非 null は 0 件）で、修正後の遡及回復手順は不要。 (F) **テスト gap** — t282（998 行）の answer 往復テスト（`:579`）は全て `intent-capture-approved` boundary、manual テスト（`:832`）は ask→answer 往復を経ず直接呼び。**manual boundary ask を answer で貫通する往復テストが不在**で、regression-first の落ちる実証はこの往復を新設する必要がある。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `ad1ff5de9` の実ファイル直読、`git rev-parse` / `git merge-base --is-ancestor` / `git rev-list --count` / `git diff --numstat … | grep -v` / `git diff --name-only … | grep -iE` / `git ls-files … | wc -l` / `grep -rl` / `grep -rEn` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer コードスキャン結果 `re3-dev-scan-result.md`（本 RE の read-only scan、全文読了。本 intent record には `scan-notes.md` が生成されず scratchpad に出力されたため、確定事実は本鮮度ポインタと `re-scans/260726-answer-manual-binding.md` に永続化する）。Architect 段の独立再検証で、核心の file:line を observed `ad1ff5de9` で spot-check し **訂正 0 件**（lifecycle guard `:253-265` / answer forward `:969-985` / request type `:56-65` / `parseManualArgs` `:445-447` / coordinator executionAuth `:304-312` / manualOperation consume `:573-577` / driveMirrorBoundary answer 分岐 `:713-714` / prompt-approved 分岐 `:292-303` / types `:118-124`・`:28`・`:30-34` / 配布 13 コピー / expectedPrompt 5 件全 null をすべて直読一致で確認、cid:reverse-engineering:cite-shift-vs-nonshift-separation）。ブリーフィングの `:340-346` / `:1052-1067` は #1553 のモジュール分割前の stale 値のため全て現 HEAD で再解決した。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md`（answer/guard/handlePromptAnswer の経路断面と両修正案の安全性根拠の新節を追加）/ `code-quality-assessment.md`（manual ask→answer 往復のテスト gap と欠陥クラスの新節を追加）。他 6 成果物（`code-structure.md` / `component-inventory.md` / `api-documentation.md` / `dependencies.md` / `business-overview.md` / `technology-stack.md`）は区間にコード変更ゼロのため「本 intent 断面: 対象外（変更なし）」の 1 行注記のみ（無変更温存優先、cid:reverse-engineering:c1）。加えて per-intent 記録 `re-scans/260726-answer-manual-binding.md` を新規作成。旧「現在」マーカー（`260726-t258-p95-flake`）は本ファイルおよび body 2 成果物（`architecture.md` / `code-quality-assessment.md`）の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。
- Sensors: RE ステージが宣言する 3 センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新した成果物 + 新規 re-scan 記録に `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（`re3-dev-scan-result`）への実参照を各成果物本文で機械確認 (c) 旧「現在」マーカー降格の残存 grep を実施した。結果表は `re-scans/260726-answer-manual-binding.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コード（mirror スタック）・t282 テスト・coverage allowlist・GitHub Issue・intent record / state / audit・生成配布物への書込は一切行わない。修正方式（案 (a) guard 免除 vs 案 (b) answer 側補填、往復 regression テストの新設、配布 13 コピー同期）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260726-t258-p95-flake）

- Date: `2026-07-26`（intent slug 基準。RE 実行は `2026-07-27`、observed commit `09c669901` の author 日時も `2026-07-27 02:04 +0900`）
- Base commit: `f9a0fb86abaa2450d559cd04b4ee889d2271fd71`（前 intent `260726-mirror-state-split` の observed。`git merge-base --is-ancestor f9a0fb86a HEAD` **exit 0 = 祖先**、`git rev-list --count f9a0fb86a..HEAD` = **2**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `09c669901385ad44e9a5b378b8d8903eebbc184c`（= 現 HEAD、`git rev-parse HEAD` 実測）
- 区間規模: `git diff --shortstat f9a0fb86a HEAD` = **32 files changed, 3709 insertions(+), 5 deletions(-)**（測定 ref: observed `09c669901`）。**32 ファイルすべて `amadeus/` 配下**（前 intent `260726-mirror-state-split` の RE+RA / CG+B&T record + codekb diff-refresh + `intents.json` + `memory/project.md`。`git diff --name-only f9a0fb86a HEAD | sed 's|/.*||' | sort -u` = `amadeus` のみ）。`git diff --name-only f9a0fb86a HEAD | grep -vc '^amadeus/'` = **0** — **source/test/CI ファイルの区間内変更はゼロ**。区間 2 コミットは `2a52729fe`（前 intent RE+RA record）/ `09c669901`（前 intent CG+B&T record）でいずれも record snapshot（`git log --oneline f9a0fb86a..HEAD`）。
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1511](https://github.com/amadeus-dlc/amadeus/issues/1511) **bug / P2 / S3-MAJOR** — `tests/integration/t258-lifecycle-transaction.test.ts` の**絶対 p95 latency 予算**（`:461` `archiveP95Ms <= 500`、`:462` `recoveryP95Ms <= 750`）が CI 共有ランナーのジッタで偽赤になるフレーク（可視赤・回避策=再実行・機能影響なし）。RSS 予算（`:463` `rssDifferenceP95MiB <= 96`）は noop 差分ベースのため該当外。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間に source/test/CI 変更が **ゼロ**のため、患部 t258 とその実装面（`tests/`, `packages/`, `.github/`）は base 時点から不変。RE は現 HEAD の実ファイル直読で確定した（欠陥は区間の退行ではなく `2e157d7fe`（#1424、t258 追加時）から現存）。
- 主要な確定事項: (A) **欠陥箇所 = t258 `:461-462` の絶対 latency ceiling 500/750ms**。`p95()`（`:430-433`）は nearest-rank `sorted[Math.ceil(len*0.95)-1]`（len=100 なら `sorted[94]`）で上位 5 サンプルの超過は許容、**6/100 超過で初めて fail**。 (B) **予算 500/750 は #1424（`2e157d7fe`、t258 と同一コミットで導入）のユーザー選択 round number** — intent `260723-archived-status-guard` の nfr-requirements で Options「500ms/750ms, 1s/2s, N/A, Other」から A 案を選択（record 実在）。CI 実測 p95 は **archive 41.177ms / recovery 29.314ms**（同 intent code-summary、予算の約 12〜25 倍のヘッドルーム）で、**noise floor から導出されていない裸マジックナンバー**（`:461-463` に rationale コメントなし）。 (C) **機序** = child helper（`tests/helpers/lifecycle-transaction-benchmark-child.ts`、size=10000）が 10,000 行 registry/audit の**実 FS transaction**（`spawnSync` 1 プロセス起動、elapsed は transaction 区間のみ）を測り、`bun run test:ci -- -P 4`（`.github/workflows/ci.yml:162` name / `:163` run）の**並列度 4 integration tier**（専用 perf ジョブ・リトライ・負荷分離なし）で IO/CPU 競合しスパイク → 絶対 ceiling を 6/100 超が跨ぐと偽赤（cid:code-generation:fanout-load-settle-before-integration / cid:code-generation:rerun-red-reattribution クラス）。 (D) **同型先例 2 件が修正様式を確立済み** — `tests/lib/plugin-discovery-overhead-gate.ts`（#1525）は「**相対比 AND 絶対 noise floor**」（`additionalMs/baseline > 0.2` **AND** `additionalMs > 10ms`）+ 判定述語の計測ループ分離 + fail-closed、`scripts/mirror-distribution-benchmark-aggregate.ts`（#1507）は median 基準 + 絶対 spread noise floor（予算の 5%）。t258 は RSS 用に **noop baseline を既に測っており**（`:444`）、archive/recovery も noop 相対へ転用できる素材が既存（事実。方式は設計段で裁定）。 (E) **same-root（cid:code-generation:same-root-inventory）**: `tests/integration/t257-status-registry-migration.test.ts:240-241`（`strictReadP95Ms <= 100` / `migrationP95Ms <= 250`）が**同根・#1511 未報告**（同じ #1424 由来・同じ 10,000-entry child benchmark）。`t259-guard-integration.test.ts:209/211` は既に **baseline 相対**（`p95(archived)-p95(allowed) <= 100ms` / RSS `<= 16MiB`）で #1511 クラス非該当（参照実装）。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `09c669901` の実ファイル直読、`git diff --shortstat` / `git diff --name-only … | grep -vc` / `git rev-list --count` / `git log --oneline` / `grep -rn` / `sed -n` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer コードスキャン結果 `re2-dev-scan-result.md`（本 RE の read-only scan、全文読了。本 intent record には `scan-notes.md` が生成されず scratchpad に出力されたため、確定事実は本鮮度ポインタと `re-scans/260726-t258-p95-flake.md` に永続化する）。Architect 段の独立再検証で、核心の file:line を observed で spot-check し **訂正 0 件**（`:461-463` assert / `:430-433` p95 / `:444-447` noop baseline / `t257:240-241` / same-root grep = t257・t258 のみ / `ci.yml:162` name・`:163` run / `:2` `// @test-size medium` / `:466` `120_000` をすべて直読一致で確認、cid:reverse-engineering:cite-shift-vs-nonshift-separation）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `code-quality-assessment.md`（t258/t257 の絶対 p95 契約フレーク構造と同型先例ゲート様式の新節を追加）/ `architecture.md`（性能ゲート系の 2 様式 = 絶対 ceiling vs 相対+floor の短い断面を追加）。他 6 成果物（`code-structure.md` / `component-inventory.md` / `api-documentation.md` / `dependencies.md` / `business-overview.md` / `technology-stack.md`）は区間に source/test 変更ゼロのため「本 intent 断面: 対象外（変更なし）」の 1 行注記のみ（無変更温存優先、cid:reverse-engineering:c1）。加えて per-intent 記録 `re-scans/260726-t258-p95-flake.md` を新規作成。旧「現在」マーカー（`260726-mirror-state-split`）は本ファイルおよび body 4 成果物（`architecture.md` / `code-quality-assessment.md` / `code-structure.md` / `component-inventory.md`）の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。
- Sensors: RE ステージが宣言する 3 センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新した成果物 + 新規 re-scan 記録に `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（`re2-dev-scan-result`）への実参照を各成果物本文で機械確認 (c) 旧「現在」マーカー降格の残存 grep を実施した。結果表は `re-scans/260726-t258-p95-flake.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部テスト（t258/t257）・child helper・CI 設定・coverage allowlist・GitHub Issue・intent record / state / audit・生成配布物への書込は一切行わない。修正方式（archive/recovery の noop 相対 + noise floor 複合述語 vs 予算緩和、判定述語の計測ループ分離、t257 同根の同一 PR 修正 or 別 Issue 化、専用 perf ジョブ分離の是非）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260726-mirror-state-split）

- Date: `2026-07-26`
- Base commit: `1673c433209c74820881c75a0816bbce3fb2d512`（前々 intent `260726-crossreviewed-bug-batch` の observed。`git merge-base --is-ancestor 1673c4332 HEAD` **exit 0 = 祖先**、`git rev-list --count 1673c4332..HEAD` = **38**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `f9a0fb86abaa2450d559cd04b4ee889d2271fd71`（= 現 HEAD、`git rev-parse HEAD` 実測）
- 区間規模: `git diff --shortstat 1673c4332 HEAD` = **1225 files changed, 215089 insertions(+), 2682 deletions(-)**（測定 ref: observed `f9a0fb86a`）。面別内訳は record（`amadeus/`）**333** / 実装正本（`packages/framework/core/`）**15** / harness 正本（`packages/framework/harness/`）**12** / dist **389** / tests **86** / docs **10** / self-install（`.claude/`）**15** / その他 **359**（`git diff --name-only … | grep -c` 出力の転記）。
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1547](https://github.com/amadeus-dlc/amadeus/issues/1547) + [Issue #1534](https://github.com/amadeus-dlc/amadeus/issues/1534) の**同根修正** — mirror の状態表現分裂。lifecycle は **v1 sentinel ブロックのみ**を書き、status/orchestrate は **legacy「Mirror Issue」フィールド**を読む write⇔read 非対称（#1547）。legacy 経路で生成された marker 無し 10 record は relink/adopt とも fail-closed で **in-tool 復旧経路ゼロ**（#1534）。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。**mirror スタック 8 モジュール**（`amadeus-mirror.ts` / `-lifecycle` / `-executor` / `-state-store` / `-state-codec` / `-provenance` / `-coordinator` / `-state-reducer`）はいずれも `git log --oneline 1673c4332..HEAD -- <path>` の**出力 0 行**で無変更を機械確認した。したがって分裂は区間の退行ではなく base 以前から現存する。
- 主要な確定事項: (A) **Write は v1 ブロックのみ**（executor `:71` / lifecycle `:629` → state-store `:158` `mutateMirrorStateAtomic` → codec `:38-39` sentinel）。 (B) **Read 3 箇所は legacy field**（status `amadeus-mirror.ts:169` `getField(…, "Mirror Issue")`、orchestrate `:314` / `:3522` の `hasMirrorIssue`）。lifecycle create 後も status は `mirror-missing`（`:249-258` `compareMirrorStatus(snapshot, null)`）を報告。 (C) **legacy writer は CLI 実行時不到達** — `writeMirrorIssueField`（`:363`）の唯一の呼び手 `:413` は `handleCreate` 内で `main`（`:570-585`）から到達しない dead code。 (D) **偽 green の機序** = real-create → status の e2e 不在。status テスト（`t232`）は `snapshot({ mirrorIssue: 1161 })` で legacy field を直接シードし、create は lifecycle stub 化で実 lifecycle を走らせない。 (E) **#1534 は marker 無きで復旧不能** — marker 唯一の書き手 `renderMirrorMarker`（`amadeus-mirror-provenance.ts:47`）を legacy 経路が呼ばず、relink（`amadeus-mirror-lifecycle.ts:785` `marker.kind !== "parsed"` fail-closed）も `verifyOwnership`（`:165` `missing-marker`）も拒否する。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `f9a0fb86a` の実ファイル直読、`git diff --shortstat` / `git diff --name-only … | grep -c` / `git log --oneline` / `git ls-files … | wc -l` / `grep -n` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer スキャン結果 `amadeus/spaces/default/intents/260726-mirror-state-split/inception/reverse-engineering/scan-notes.md`（全文読了）。Architect 段の独立再検証で **2 件の訂正**を検出した — (1) **scan §6 の repair relink 行番号**: `runRepairRelink` は observed で **`:775`**（呼び出し `:925`）、`parseMirrorMarker` **`:784`**、`if (marker.kind !== "parsed")` **`:785`**、error message **`:788`**（scan-notes の `:783` / `:788` / `:789-793` は単発ずれ、cid:reverse-engineering:cite-shift-vs-nonshift-separation）。 (2) **scan §1 の「欠陥面は区間内未変更」の精密化**: `amadeus-mirror.ts` と lifecycle スタック 7 モジュールは区間内 0 変更で正しいが、`amadeus-orchestrate.ts` は区間内で [PR #1521](https://github.com/amadeus-dlc/amadeus/pull/1521)（dedup refactor、`8 insertions / 29 deletions`）により変更されている。ただし変更ハンク（`:102` / `:116` / `:1288` / `:3019`）に欠陥 reader 行 `:314` / `:3522` は含まれず（`grep -c "hasMirrorIssue\|Mirror Issue"` = 0）、両 reader は observed で `:314` / `:3522` に正しく解決する。その他の write⇔read 非対称の file:line はすべて直読で一致（訂正 0）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md`（mirror write⇔read の Interaction を Mermaid+テキストで新設）/ `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md`（以上は本 intent の新節を追加）/ `api-documentation.md` / `dependencies.md` / `business-overview.md` / `technology-stack.md`（以上は区間の公開挙動変化・状態表現分裂の最小追記）。加えて per-intent 記録 `re-scans/260726-mirror-state-split.md` を新規作成。旧「現在」マーカー（`260726-mirror-envelope-lf`）は本ファイルおよび body 4 成果物の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel、cid:reverse-engineering:re-timestamp-merge-resolution の様式）。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新9成果物 + 新規 re-scan 記録に `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（`scan-notes.md`）への実参照を各成果物本文で `grep -c 'scan-notes'` により機械確認 の2点を実施した。結果表は `re-scans/260726-mirror-state-split.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コード（mirror スタック）・テスト fixture・coverage allowlist・GitHub Issue・intent record / state / audit・生成配布物への書込は一切行わない。修正方式（read の v1 片寄せ vs write の legacy 二重化、dead legacy 群の扱い、legacy 10 record の in-tool 復旧設計、互換フォールバックの是非）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260726-mirror-envelope-lf）

## 実行メタデータ（履歴: 260726-plugin-host-delivery、2026-07-26）

- Date: `2026-07-26`
- Base commit: `1673c433209c74820881c75a0816bbce3fb2d512`（`git merge-base --is-ancestor 1673c4332 HEAD` **exit 0 = 祖先**、`git rev-list --count 1673c4332..HEAD` = **43**。cid:reverse-engineering:rescan-base-ancestry。注: 前回 observed `e39402224` は現 HEAD の**非祖先**と実測した — `git merge-base --is-ancestor e3940222480b15d9cf10dd0a97df6a35a7ffb7d5 HEAD` **exit 1**。squash マージ運用では record の observed が現 HEAD の祖先でない場合があるため、祖先である `1673c4332` を base に採用した）
- Observed commit: `0d83aa48b886fe85cd977569c0e7b3015b84d3e5`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `fix-plugin`、ブランチ `fix/plugin`）
- 区間規模: `git diff --shortstat 1673c4332..HEAD` = **1239 files changed, 217578 insertions(+), 2683 deletions(-)**（測定 ref: observed `0d83aa48b`）。面別内訳は `git diff --name-only 1673c4332..HEAD | grep -c` 等の転記で packages **33** / tests **86** / scripts **7** / .github **1**。`tests/` 配下の新規ファイルは `git diff --name-only --diff-filter=A … -- tests/ | wc -l` = **29**（うち `*.test.ts` は **15** 本 — kimi 群・metrics t298 群・setup 群・plugin-discovery-overhead-gate）。
- 区間の内訳（`git log --oneline 1673c4332..HEAD` 全43件の主系統）: (a) **Kimi Code CLI ハーネス追加** `a45b01bd3`（[PR #1522](https://github.com/amadeus-dlc/amadeus/pull/1522) — 第7ディストリ面・self-install 第5面） (b) **metrics 可視化** `aef8fad20` / `8fd9d4138`（[PR #1500](https://github.com/amadeus-dlc/amadeus/pull/1500) / [PR #1504](https://github.com/amadeus-dlc/amadeus/pull/1504) — `scripts/metrics-visualize.ts`、CI render+drift-check） (c) **mirror gateway envelope 修正** `3b87d1027`（[PR #1537](https://github.com/amadeus-dlc/amadeus/pull/1537) — `--paginate --slurp` 廃止・`FIND_PER_PAGE=100` の明示ページ walk・bare-LF ステータス行回収 = 前 intent `260726-mirror-envelope-lf` の Focus #1498 の解消） (d) **plugin discovery perf ゲート再設計** `1edf2abfb`（[PR #1535](https://github.com/amadeus-dlc/amadeus/pull/1535) — 相対比 0.2 + 絶対フロアの AND。注: ブリーフィングは #1525 としていたが、`git log` 実測は **#1535**） (e) CI 検証ジョブ分割 `4e95162e3`（[PR #1528](https://github.com/amadeus-dlc/amadeus/pull/1528)） (f) 前 intent のクロスレビュー済みバグ 6 修正の着地（#1516/#1517/#1518/#1521/#1523/#1524）+ benchmark dispersion gate 修正 `1886a2567`（[PR #1507](https://github.com/amadeus-dlc/amadeus/pull/1507)） (g) 残りは record 同期・metrics スナップショット・`origin/main` マージ。
- Scope: `amadeus-feature`（intent `260726-plugin-host-delivery`）、Brownfield、単一 repo `amadeus`
- Focus: **plugin 導入 UX**。`scripts/plugin-projection.ts` の self-install 面が「closed four → **closed five**」へ拡張された（`SELF_INSTALL_HARNESSES = ["claude", "codex", "cursor", "opencode", "kimi"]`、`:60`）一方、**plugin-composition / formal-model-check / `dist/plugins` / トップレベル `plugins/` は区間内で完全に無変更**（`git log --oneline 1673c4332..HEAD -- <各パス>` および `git diff --name-only … | grep -c` の**出力 0 件**で反証確認済み）。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。上流入力は Developer スキャン結果（実測済みスキャンノート）。Architect 段で主要主張を独立再実測し、**1件の PR 番号訂正**（perf ゲート再設計 #1525 → 実測 **#1535**）を検出した。
- 測定 ref: 本節および本 scan で更新した全成果物の数値・SHA は observed `0d83aa48b` での `git rev-parse` / `git rev-list --count` / `git diff --shortstat` / `git diff --name-only … | grep -c` / `git log --oneline` / `grep -n` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 更新した成果物（8件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` / `technology-stack.md` / `dependencies.md` / `api-documentation.md`（区間の公開挙動変化の最小追記）。`business-overview.md` は区間内に業務境界の変化が該当しないため無変更。旧「現在」マーカー（`260726-mirror-envelope-lf`）は本ファイルおよび body 4 成果物の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel。`grep -n "、現在、\|（現在:" *.md` の残存ヒットが本 intent `260726-plugin-host-delivery` の節のみであることを機械確認）。
- Delivery boundary: 本 scan は codekb の差分更新のみを成果物とし、実装コード・intent record / state / audit・生成配布物への書込は一切行わない。

## 実行メタデータ（履歴: 260726-mirror-envelope-lf）

- Date: `2026-07-26`
- Base commit: `1673c433209c74820881c75a0816bbce3fb2d512`（前 intent `260726-crossreviewed-bug-batch` の observed。`git merge-base --is-ancestor 1673c4332 HEAD` **exit 0 = 祖先**、`git rev-list --count 1673c4332..HEAD` = **27**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `e3940222480b15d9cf10dd0a97df6a35a7ffb7d5`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `.claude/worktrees/bugfix`、ブランチ `worktree-bugfix`）
- 区間規模: `git diff --shortstat 1673c4332 HEAD` = **322 files changed, 20142 insertions(+), 2027 deletions(-)**（測定 ref: observed `e39402224`）。面別内訳は record（`amadeus/`）**137** / 実装（`packages/`・`tests/`・`scripts/`・`.github/`）**58** / dist + self-install **114**（いずれも `git diff --name-only 1673c4332 HEAD | grep -c` 出力の転記）。
- ブリーフィングとの差異: ブリーフィングは区間 **23 コミット**としていたが、observed での実測は **27**（`git rev-list --count`）。直近の `origin/main` マージ（`e39402224`）以降の前進分を含むためで、本 codekb は実測値 27 を採る（cid:requirements-analysis:numbers-from-command-output-only）。
- 区間の内訳（`git log --oneline 1673c4332..HEAD` 全27件の主系統）: (a) **前 intent `260726-crossreviewed-bug-batch` のクロスレビュー済みバグ 6 修正の着地** — `da94f232c`（[PR #1516](https://github.com/amadeus-dlc/amadeus/pull/1516) election verify の自己相関除去 = [#1457](https://github.com/amadeus-dlc/amadeus/issues/1457)）/ `6aa1eb3eb`（[PR #1517](https://github.com/amadeus-dlc/amadeus/pull/1517) `Election.parse` の fail-closed 棄却 = [#1459](https://github.com/amadeus-dlc/amadeus/issues/1459)）/ `499a65488`（[PR #1518](https://github.com/amadeus-dlc/amadeus/pull/1518) plugin discovery の dangling symlink skip = [#1462](https://github.com/amadeus-dlc/amadeus/issues/1462)）/ `071cb2f7b`（[PR #1521](https://github.com/amadeus-dlc/amadeus/pull/1521) core tools 共有知識の重複排除）/ `2f76f79a4`（[PR #1523](https://github.com/amadeus-dlc/amadeus/pull/1523) `reportDelivery` の distributed transition 配線 = [#1458](https://github.com/amadeus-dlc/amadeus/issues/1458)）/ `a41035c63`（[PR #1524](https://github.com/amadeus-dlc/amadeus/pull/1524) bare `intents/` ルートへの audit シャードを fail-closed 拒否 = [#1377](https://github.com/amadeus-dlc/amadeus/issues/1377)）/ `1886a2567`（[PR #1507](https://github.com/amadeus-dlc/amadeus/pull/1507) benchmark dispersion gate の単一スパイク耐性 = [#1489](https://github.com/amadeus-dlc/amadeus/issues/1489)） (b) `4e95162e3`（[PR #1528](https://github.com/amadeus-dlc/amadeus/pull/1528) CI 検証ジョブの分割） (c) `aef8fad20` / `8fd9d4138`（[PR #1500](https://github.com/amadeus-dlc/amadeus/pull/1500) / [PR #1504](https://github.com/amadeus-dlc/amadeus/pull/1504) metrics ダッシュボード） (d) 残りは record 同期・metrics スナップショット・`origin/main` マージ。
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1498](https://github.com/amadeus-dlc/amadeus/issues/1498) **P1/S2** — `amadeus-mirror-gateway.ts` の HTTP envelope パーサが実 `gh` 出力を解釈できず、auto-mirror の 5 verb すべてが `invalid-response` で不成立になる欠陥。クロスレビュー 2/2 が Issue 本文の機序記述（主因 = `--slurp` 先頭の `[`）を訂正しており、本 scan はその訂正を独立再現している。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。**患部 `amadeus-mirror-gateway.ts` 系は区間内で完全に無変更**であることを `git log --oneline 1673c4332..HEAD -- '*amadeus-mirror-gateway*'` の**出力 0 行**で機械確認した（`t272` / `t270` / `amadeus-mirror-lifecycle.ts` も同様に 0 行）。したがって欠陥は区間の退行ではなく base 以前から存在し、クロスレビュー時点（実測 ref `9ea9a6160`）の観測は observed でもそのまま有効で、行番号も一致する。
- 主要な確定事項: (A) **主因は bare-LF ステータス行**。`gh 2.96.0` の `--include` はステータス行のみ LF 終端・ヘッダ行は CRLF で出力するのに対し、パーサ `:196` `const eol = bin.indexOf("\r\n", pos);` は CRLF 前提で終端を探すため `:198` の `STATUS_LINE_RE` が不一致となり `:199` で `malformed` に落ちる（実バイトへ実 `parseHttpEnvelope` を適用した対照実測: 実バイト → `{"kind":"malformed"}` / ステータス行のみ LF→CRLF 置換 → `{"kind":"ok","statuses":[200]}`）。 (B) **影響は 5 verb 全部** — `--slurp` を含まない `viewArgv` 経路（`:138`）でも malformed。 (C) **find の `--slurp` は interleave 文法**で、過去 record の設計宣言（`security-design.md:37`）が要求する「P 個の HTTP block 連続 + 単一 JSON 配列」とは構造的に別物。 (D) **CI が緑のままなのは fixture が自作 CRLF だから**（`t272:61`、`grep -c 'HTTP/'` = **1**）— 実 `gh` 出力を一度も通していない検証劇場クラス。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `e39402224` の実ファイル直読、`git diff --shortstat` / `git diff --name-only … | grep -c` / `git log --oneline` / `git ls-files … | wc -l` / `grep -n` / `grep -c` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer スキャン結果 `amadeus/spaces/default/intents/260726-mirror-envelope-lf/inception/reverse-engineering/scan-notes.md`（全文読了）。Architect 段の独立再検証では **file:line の訂正 0 件** — 照合対象（`amadeus-mirror-gateway.ts` の `:138` / `:179` / `:195` / `:196` / `:198` / `:199` / `:215` / `:220` / `:495` / `:509` / `:525-534` / `:649-650` / `:656-657` / `:665` / `:669-670` / `:690-691` / `:704-705` / `:718-719`、`t272:61`、`projections.ts:26`、`amadeus-mirror-lifecycle.ts:29`、`security-design.md:37`、allowlist の gateway 行ピン 5 件）はすべて直読で一致した（cid:reverse-engineering:cite-shift-vs-nonshift-separation）。数値も再実測で一致（`wc -l` = **724** 行、`git ls-files "*amadeus-mirror-gateway*"` = **12** パス、`grep -c 'HTTP/' tests/unit/t272-…` = **1**）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-structure.md` / `code-quality-assessment.md` / `component-inventory.md`（以上は本 intent の新節を追加）/ `api-documentation.md` / `dependencies.md` / `business-overview.md` / `technology-stack.md`（以上は区間の公開挙動変化の最小追記）。加えて per-intent 記録 `re-scans/260726-mirror-envelope-lf.md` を新規作成。旧「現在」マーカー（`260726-crossreviewed-bug-batch`）は本ファイルおよび body 4 成果物の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel。`grep -n '^## .*現在' amadeus/spaces/default/codekb/amadeus/*.md` の残存ヒットが本 intent `260726-mirror-envelope-lf` の節のみであることを機械確認）。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新9成果物 + 新規 re-scan 記録に `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（`scan-notes.md`）への実参照を各成果物本文で `grep -c 'scan-notes'` により機械確認 の2点を実施した。結果表は `re-scans/260726-mirror-envelope-lf.md` の「センサー不適用と代替検証」節。
- 本 scan 完了直後の HEAD 前進（cid:reverse-engineering:upstream-cite-reresolve-on-shift）: 合成の途中で conductor が `origin/main` を取り込み、HEAD は `e39402224` → **`ccdabd323b8fa56ae8794584f51aec2e68e888ba`** へ前進した（`9e3d6d2fb` metrics snapshot [#1533](https://github.com/amadeus-dlc/amadeus/pull/1533) / `a45b01bd3` **Kimi Code CLI ハーネス追加** [#1522](https://github.com/amadeus-dlc/amadeus/pull/1522) / `3442beec3` metrics snapshot [#1531](https://github.com/amadeus-dlc/amadeus/pull/1531) を含む）。**本節および body 成果物の file:line は測定 ref `e39402224` のまま有効** — 前進後の HEAD で再実測しても `amadeus-mirror-gateway.ts` は 724 行・`:196` `const eol = bin.indexOf("\r\n", pos);` で不変（`git log e39402224..HEAD -- '*amadeus-mirror-gateway*'` のヒットは kimi ハーネス追加による**新規配布コピー 2 パスのみ**でソース変更ではない）。影響を受けたのは配布コピー数だけで、`git ls-files "*amadeus-mirror-gateway*"` は **12 → 14**（`.kimi-code/tools/` と `dist/kimi/.kimi-code/tools/` が追加。`cmp -s` で配布 12 コピーすべて正本とバイト一致を再実測）。あわせて `origin/main` から並行 intent `260725-kimi-harness` の RE 節が codekb へ合流したが、同節は合流時点で既に「履歴」ラベルであり本 intent の「現在」マーカーと競合しない。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コード（`amadeus-mirror-gateway.ts` およびその配布コピー）・テスト fixture・allowlist・GitHub Issue・intent record / state / audit・生成配布物への書込は一切行わない。修正方式（単一系の LF/CRLF 両対応、find の interleave 対応 vs `--slurp` 撤去、過去 record の誤宣言の扱い）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260726-crossreviewed-bug-batch）

- Date: `2026-07-26`
- Base commit: `e12259ba78b8c56bf3572c9bfd44a7bdf84d681c`（前 intent `260726-grant-scope-gate` の observed。`git merge-base --is-ancestor e12259ba7 HEAD` **exit 0 = 祖先**、`git rev-list --count e12259ba7..HEAD` = **2**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `1673c433209c74820881c75a0816bbce3fb2d512`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree ブランチ `worktree-bugfix`）
- 区間規模: `git diff --shortstat e12259ba7 HEAD` = **52 files changed, 3024 insertions(+), 48 deletions(-)**（測定 ref: observed `1673c4332`）。うち正本（`packages/framework/core/`）の実装変更は `git diff --stat e12259ba7 HEAD -- packages/framework/core/` = **`amadeus-lib.ts` 1ファイル、35 insertions(+) / 3 deletions(-)** のみで、残りは dist×6 + self-install×4 の生成物増幅・テスト・record である。
- 区間の内訳（`git log --oneline e12259ba7..HEAD` 全2件）: `10d8bcfbb`（[PR #1499](https://github.com/amadeus-dlc/amadeus/pull/1499) = [Issue #1497](https://github.com/amadeus-dlc/amadeus/issues/1497) standing grant の gate スコープ判定を scope-grid 由来解決へ修正）/ `1673c4332`（record snapshot のみ、コード面の変更なし）
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: **クロスレビュー済みバグ7件のバッチ** — [#1489](https://github.com/amadeus-dlc/amadeus/issues/1489) P2/S3（Intent Mirror benchmark 分散ゲートの偽赤）/ [#1457](https://github.com/amadeus-dlc/amadeus/issues/1457) P2/S3（`handleVerify` が `verifySelf` へ自己相関引数 = 検証劇場）/ [#1377](https://github.com/amadeus-dlc/amadeus/issues/1377) P3/S3（audit シャードが bare `intents/audit/` へ書かれる）/ [#1459](https://github.com/amadeus-dlc/amadeus/issues/1459) P3/S3（`Election.parse` が空 choices・重複 internalNo・重複 voter を無音受理）/ [#1462](https://github.com/amadeus-dlc/amadeus/issues/1462) P3/S4（`discoverPluginStageFiles` が dangling symlink で raw ENOENT）/ [#1458](https://github.com/amadeus-dlc/amadeus/issues/1458) P3/S4（既定 subagent 経路で distributed timeline 未記録・`reportDelivery` が dead export）/ [#1388](https://github.com/amadeus-dlc/amadeus/issues/1388) P3/S4（`team-up.sh` codex 経路の初期プロンプト一発供給・watcher arming 検証欠如 — **FR-6 既決との関係が要精査**）
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間2コミットのうち実装面1件を直読したうえで、**対象7件の患部は区間内で無変更**であること（区間の正本 diff が `amadeus-lib.ts` の #1497 修正のみ）を `git diff --stat` の出力で機械確認した。すなわち7件はいずれも区間の退行ではなく、区間より前から存在する欠陥である。
- 主要な確定事項: 7件中6件は**対操作の非対称**（cid:requirements-analysis:symmetric-pair-review）に還元できる — #1377 は `auditShardDir` の fail-closed に対する `auditFilePath` / `stateFilePath` の bare-root フォールバック、#1462 は stages 判定の `existsSync` ガードに対する plugin 名フィルタの `statSync` 無ガード、#1459 は `voters` 側の `.length === 0` 検査に対する `choices` 側の欠落、#1457 は「self-reference 回避」を明言する doc コメントに対する caller 配線の逸脱、#1458 は「`reportDelivery` が mint する」設計意図に対する配線の不在（dead export）、#1489 は判定側 noise floor とワークロード別予算の不整合。#1388 のみ性格が異なり、検証除外が **FR-6 として明示的に既決**である（`team-up.sh:1098-1099` のコメント）。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `1673c4332` の実ファイル直読、`git diff --shortstat` / `git diff --stat` / `git log --oneline` / `git ls-files … | wc -l` / `grep -n` / `grep -c` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only）。
- 上流入力: Developer スキャン結果 `amadeus/spaces/default/intents/260726-crossreviewed-bug-batch/inception/reverse-engineering/scan-notes.md`（全文読了）。Architect 段の独立再検証で **1件の行番号訂正**を検出した — scan-notes が `mirror-distribution-benchmark-aggregate.ts:30` とした `if (minimum <= 0) return true;` は observed で **`:32`**（`grep -n "minimum <= 0"` 出力）。`:20` / `:33-35` / `:61-62` ほか他の file:line はすべて直読で一致を確認した（cid:reverse-engineering:cite-shift-vs-nonshift-separation）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `component-inventory.md` / `code-structure.md` / `code-quality-assessment.md`（以上は本 intent の新節を追加）/ `api-documentation.md` / `dependencies.md` / `business-overview.md` / `technology-stack.md`（以上は区間に新規公開契約・新規依存エッジが無い旨の最小追記）。加えて per-intent 記録 `re-scans/260726-crossreviewed-bug-batch.md` を新規作成。旧「現在」マーカー（`260726-grant-scope-gate`）は本ファイルおよび body 5 成果物の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel。`grep -rn "、現在、\|（現在:" amadeus/spaces/default/codekb/amadeus/` の残存ヒットが本 intent `260726-crossreviewed-bug-batch` の節のみであることを機械確認）。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新9成果物 + 新規 re-scan 記録に `grep -c '^## '` を実行し H2 ≥ 2 を機械確認（全件充足。内訳は `re-scans/260726-crossreviewed-bug-batch.md` の「センサー不適用と代替検証」節） (b) 上流入力（`scan-notes.md`）への実参照が各成果物本文に存在することを `grep -c 'scan-notes'` で機械確認 の2点を実施した。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コードへの修正、Issue 操作、intent record / state / audit / 生成配布物への書込は一切行わない。7件の修正可否・方式（特に #1388 の性格判定と #1458 の2案）は後続の requirements-analysis 以降で確定する。

## 実行メタデータ（履歴: 260726-metrics-visualization）

- Date: `2026-07-26`
- Base commit: `11f1ad61f5ea4942332da5bd6e3e433c44aa4cab`（前 intent `260725-worktree-ref-fixes` の observed。`git merge-base --is-ancestor 11f1ad61f 1c43438df` exit **0** = 祖先、`git rev-list --count 11f1ad61f..1c43438df` = **5**。いずれも本 scan で再実測。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `1c43438df0348fed63c5fe88af46c9417258d4e0`（= 現 HEAD、`git rev-parse HEAD` 実測。ブランチ `main`）
- 区間規模: `git diff --shortstat 11f1ad61f 1c43438df` = **452 files changed, 68457 insertions(+), 2792 deletions(-)**（測定 ref: observed `1c43438df`）。実装面は2系統のみ（solo standing grants / worktree hooks 修正）で、残りは record・audit・生成配布物。
- 区間の内訳（`git log --oneline 11f1ad61f..1c43438df` 全5件）: `bbd74a942`（chore(metrics): record snapshot、[PR #1490](https://github.com/amadeus-dlc/amadeus/pull/1490)）/ `77d871d57`（feat(grants): standing delegation grants を solo mode で利用可能にする、[PR #1483](https://github.com/amadeus-dlc/amadeus/pull/1483)）/ `272f4bd58`（chore(metrics): record snapshot、[PR #1491](https://github.com/amadeus-dlc/amadeus/pull/1491)）/ `e12259ba7`（fix(hooks,tests): worktree セッションのパス／ref 解決ファミリを修正、[PR #1493](https://github.com/amadeus-dlc/amadeus/pull/1493)、#1482 / #1481 / #1455、refs #1492）/ `1c43438df`（Merge branch 'main'）
- Scope: `amadeus-feature`、Depth Standard、Brownfield、単一 repo `amadeus`
- Focus: `metrics/` スナップショットの可視化機能。既存 metrics サブシステム（`scripts/metrics-snapshot.ts` / `metrics-timeseries.ts` / `metrics-retention.ts`、ci.yml `metrics-snapshot` job、`metrics/*.json` **123 件**）の現況把握と、可視化機能の再利用 seam・挿入点・既習様式の同定が本 scan の主眼。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間5コミットの実装面を直読したうえで、**本 intent の重点である metrics サブシステムは区間内で完全に無変更**であることを `git diff --name-only 11f1ad61f 1c43438df -- scripts/ .github/` の**出力 0 行**で機械確認した。すなわち metrics 面の現況は区間より前から安定しており、可視化の挿入 seam は observed HEAD の直読で確定できる。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `1c43438df` の実ファイル直読、および `git diff --numstat` / `grep -n` / `ls | wc -l` の出力からの転記による（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。上流 Developer スキャン結果の file:line は本 Step 3 で全数スポット再実測し、不一致は下記および `re-scans/260726-metrics-visualization.md` に訂正として記録した。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` / `business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md`。加えて per-intent 記録 `re-scans/260726-metrics-visualization.md` を新規作成。
- 上流主張の訂正（本 scan で再実測）: (1) `resolveProjectDirFromHook` の所在は前 intent 記録の `amadeus-lib.ts:247` → observed で **`:269`**（PR #1483 / #1493 による +22 行シフト、cid:reverse-engineering:upstream-cite-reresolve-on-shift） (2) `package.json` の scripts エントリは 16 → 実測 **15**（うち metrics 系 **0**） (3) 正本 diff の行数はスキャン結果と numstat で乖離（`amadeus-state.ts` +540 → 実測 **+467 −73**、`amadeus-orchestrate.ts` +188 → **+184 −4**、`amadeus-directive.ts` +168 → **+127 −41**、`amadeus-lib.ts` +160 → **+202 −29**）。本 codekb は numstat 実測値を採る。 (4) snapshot collectors の定義行は `:71-110` → 実測 **`:72-110`**。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新9成果物すべてに `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（Developer スキャン結果）の参照を各成果物本文で直接検証（file:line のスポット再実測を含む）の2点を実施した。結果は `re-scans/260726-metrics-visualization.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新のみを成果物とし、実装コード・intent state・memory・`intents.json`・生成配布物には一切書き込まない。可視化機能の方式（挿入点、出力形式、CI 配線）は後続の requirements-analysis 以降で確定する。

## 実行メタデータ（履歴: 260726-grant-scope-gate）

- Date: `2026-07-26`
- Base commit: `11f1ad61f5ea4942332da5bd6e3e433c44aa4cab`（前 intent `260725-worktree-ref-fixes` の observed。`git merge-base --is-ancestor 11f1ad61f e12259ba7` exit 0 = 祖先、`git rev-list --count 11f1ad61f..e12259ba7` = **4**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `e12259ba78b8c56bf3572c9bfd44a7bdf84d681c`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `.claude/worktrees/1497-standing-grant-scope-gate`）
- 区間規模: **452 files changed, +68,457 / -2,792**（測定 ref: observed `e12259ba7`）。大半は dist×6 + self-install×4 の生成物増幅で、正本の実装面は 2 コミットに閉じる。
- 区間の内訳（`git log --reverse 11f1ad61f..e12259ba7` 全4件）: `bbd74a942`（record のみ）/ `77d871d57`（[PR #1483](https://github.com/amadeus-dlc/amadeus/pull/1483) solo standing grants）/ `272f4bd58`（record のみ）/ `e12259ba7`（[PR #1493](https://github.com/amadeus-dlc/amadeus/pull/1493) worktree パス／ref 修正）
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1497](https://github.com/amadeus-dlc/amadeus/issues/1497) — standing grant の scope 解決。`standingGrantSatisfiesGate`（`amadeus-lib.ts:3985-4017`）が composed scope（`amadeus-*`）を解決できない `stage.scopes` を直読する構造欠陥。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間4コミットのうち実装面 2 件を直読し、患部機構は **PR #1483 で新規に持ち込まれた面**として精査した。
- 主要な確定事項: (A) composed scope では `inScope()` が全 stage で false → `crossesPhaseBoundary` 恒真 → 既定グラントが全ゲート ineligible（#1497 本体、無音 no-op） (B) 同じ `inScope` により `isFirstConstructionGate` が恒偽 → **walking-skeleton 除外が無音不発**（未報告、project.md Forbidden / Mandated への現在進行の違反）。A と B は**単一の根本原因から出る 2 症状**。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `e12259ba7` の実ファイル直読、`grep -n` / `wc -l` / `find` 出力、および `python3 -c json` による `stage-graph.json`（32 stages / `scopes` 語彙 10 / キー欠落 0）・`scope-grid.json`（15 scope キー）・`.coverage-patch-allowlist.json`（`amadeus-lib.ts` 行ピン 4 件）の直接読取からの転記（cid:requirements-analysis:numbers-from-command-output-only）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `component-inventory.md` / `code-structure.md` / `code-quality-assessment.md`（以上は本 intent の新節を追加）/ `api-documentation.md` / `dependencies.md`（区間の新規公開契約・新規エッジを最小追記）/ `business-overview.md` / `technology-stack.md`（冒頭ブロックのみ）。加えて per-intent 記録 `re-scans/260726-grant-scope-gate.md` を新規作成。旧「現在」マーカー（`260725-worktree-ref-fixes`）は本ファイルおよび body 4 成果物の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel。`grep -rn "、現在、\|（現在:"` の残存ヒットが本 intent `260726-grant-scope-gate` の節のみであることを機械確認）。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新9成果物すべてに `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（Developer スキャン結果）の参照を各成果物本文で直接検証 の2点を実施した。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コードへの修正、intent record / state / audit / 生成配布物への書込は一切行わない。#1497 の修正方式（`inScope` の解決方式差し替え、fixture 是正、per-unit 軸の扱い）は後続の requirements-analysis 以降で確定する。

## 実行メタデータ（履歴: 260725-worktree-ref-fixes）

- Date: `2026-07-26`
- Base commit: `ec624022ff65cc8b3912001f768bd66ec41a0e39`（前 intent `260725-teamup-attach-latency` の observed。`git merge-base --is-ancestor ec624022f 11f1ad61f` exit 0 = 祖先、`git rev-list --count ec624022f..11f1ad61f` = **10**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `11f1ad61f5ea4942332da5bd6e3e433c44aa4cab`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree ブランチ `worktree-bugfix-1482-1481-1455`）
- 区間規模: `git diff --shortstat ec624022f 11f1ad61f` = **143 files changed, 22167 insertions(+), 725 deletions(-)**（測定 ref: observed `11f1ad61f`）。実装面は `team-up.sh` 系1系統のみ（正本+harness 表層4+dist 6、tests 3件）で、残りは record/audit。
- 区間の内訳（`git log --reverse ec624022f..11f1ad61f` 全10件）: `dcadcce17`（前 intent inception checkpoint）/ `294df1281`（watcher 検証の適用可否ガード）/ `22829d0b8` / `a0febedd2` / `872919958`（Merge [PR #1477](https://github.com/amadeus-dlc/amadeus/pull/1477)）/ `c4c9531ee` / `6248fdac4`（[PR #1484](https://github.com/amadeus-dlc/amadeus/pull/1484) actas 移行）/ `f54ce2b5e`（[PR #1486](https://github.com/amadeus-dlc/amadeus/pull/1486) record 同期）/ `8eeab33e5`（[PR #1488](https://github.com/amadeus-dlc/amadeus/pull/1488)）/ `11f1ad61f`（[PR #1487](https://github.com/amadeus-dlc/amadeus/pull/1487) worktree checkout 並列化）
- Scope: `amadeus-bugfix`、Depth Minimal、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1482](https://github.com/amadeus-dlc/amadeus/issues/1482)（EnterWorktree セッションの Stop hook が本線 state を読む）+ [Issue #1481](https://github.com/amadeus-dlc/amadeus/issues/1481)（worktree で t257/t258/t259 が ref 解決失敗で常赤）+ [Issue #1455](https://github.com/amadeus-dlc/amadeus/issues/1455)（t257 `currentGitSha` の common-dir loose ref 未解決 — #1481 と同根）
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間10コミットの実装面を直読したうえで、**患部（`amadeus-lib.ts` / `amadeus-stop.ts` / t257 / t258 / t259）は区間内で無変更**であることを `git diff --name-only ec624022f 11f1ad61f -- <5パス>` の**空出力**で機械確認した。すなわち本 intent の3 Issue はいずれも区間の退行ではなく、区間より前から存在する欠陥である。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `11f1ad61f` の実ファイル直読と、worktree `.claude/worktrees/bugfix-1482-1481-1455` 上での git plumbing 実測（`git rev-parse --git-dir` / `--git-common-dir`、`ls`、`grep -c`）による。件数はすべて grep/wc 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-quality-assessment.md` / `code-structure.md` / `component-inventory.md` / `business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md`。加えて per-intent 記録 `re-scans/260725-worktree-ref-fixes.md` を新規作成。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch）。**センサー成功として扱わず**、代替として (a) 更新9成果物すべてに `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（Developer スキャン結果）の参照を各成果物本文で直接検証 の2点を実施した。詳細は `re-scans/260725-worktree-ref-fixes.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新のみを成果物とし、患部コードへの修正は行わない。3 Issue の修正方針（rung 順序の裁定、helper の git plumbing 化と共有化）は後続の requirements-analysis 以降で確定する。

## 実行メタデータ（履歴: 260725-teamup-launch-hardening）

- Date: `2026-07-25`
- Base commit: `ec624022ff65cc8b3912001f768bd66ec41a0e39`（前 intent `260725-teamup-attach-latency` の observed。`git merge-base --is-ancestor` exit 0、`git rev-list --count` = **9**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `4a0f91ad07dbe17c6477b7fe9b52a0e9ab4532ba`（= 現 HEAD、`git rev-parse HEAD` 実測。ブランチ `feat/teamup-actas-migration-and-worktree-parallel`）
- 区間規模: `git diff --stat ec624022f..4a0f91ad0` = **65 files changed, 6516 insertions(+), 54 deletions(-)**（測定 ref: observed `4a0f91ad0`）。実装面は `team-up.sh` 11 面 × `+31/-8` と tests 2 件のみで、残りは record/audit。
- 区間の内訳: [PR #1477](https://github.com/amadeus-dlc/amadeus/pull/1477)（merge `872919958`、実装 `294df1281` = watcher 検証の適用可否ガード、Issue #1449）+ 本 intent の ideation 記録（`5219bbd54` / `a3ab8dff4` / `4a0f91ad0`）+ 前 intent の record checkpoint。
- Scope: `amadeus-feature`、Depth Standard、Test Strategy Minimal、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1476](https://github.com/amadeus-dlc/amadeus/issues/1476)（bug / P1 / S2-CRITICAL — 初期プロンプトの actas 移行）+ [Issue #1478](https://github.com/amadeus-dlc/amadeus/issues/1478)（enhancement / P2 — `git worktree add` の並列化）の2ユニット同時対応。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間9コミットの実装面（`team-up.sh` の diff 全文、tests 2件）を直読し、外部 agmsg スキル側の主張は前 intent の記録を**再実測して追認**した。
- 測定 ref: 本ファイル記載の file:line・件数はすべて observed `4a0f91ad0` の実ファイル直読、および repo 外・非バージョン管理の外部スキル `~/.agents/skills/agmsg/`（読取 2026-07-25）による。`git worktree add` の並列度別実測値は本 intent の `ideation/feasibility/feasibility-assessment.md`（測定 ref: `c4c9531ee`、隔離環境、実施後完全撤去）からの引用であり、本 scan では再実行していない。
- 更新した成果物: 本ファイル（鮮度ポインタ + 旧「現在: 260725-teamup-attach-latency」→履歴ラベル化、cid:reverse-engineering:c3-relabel）、`architecture.md`（PR #1477 の適用可否ガード現況、actas 移行後に検証が再発火する経路、`mux_attach` との順序関係、worktree 直列作成の位置づけ）、`code-quality-assessment.md`（#1384 の保護が現在不在、テストが sentinel を自前で書く構造、worktree 直列作成）、`code-structure.md` / `component-inventory.md`（`WATCHER_SKIP_ANNOUNCED` 等の追加と行番号の更新）、`re-scans/260725-teamup-launch-hardening.md`（新規）。`business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` は本 intent 由来の構造変化なしのため「変更なし、確認済み」一行のみ追記。
- Sensors: RE ステージの宣言センサー3種（required-sections / upstream-coverage / answer-evidence）は codekb 出力パスが sensor filter（`**/{amadeus-docs,intents}/**` と `**/*-questions.md`）に構造的に不適合で発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わない**。代替として (1) 更新した全成果物の `## ` 見出しが 2 以上あることを `grep -c '^## '` で機械確認、(2) 上流入力（`ideation/feasibility/feasibility-assessment.md`、Issue #1476 / #1478、実コード file:line）の本文実参照を直接検証した。
- Delivery boundary: codekb 9成果物 + 本 intent の re-scan 記録のみ更新。実装・テスト・state・audit・生成配布物・commit・PR 操作は未実施。

## 実行メタデータ（履歴: 260725-teamup-attach-latency）

- Date: `2026-07-25`
- Base commit: `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`（`re-scans/` の到達可能な observed のうち HEAD の祖先で距離最小。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `ec624022ff65cc8b3912001f768bd66ec41a0e39`（= 現 HEAD、`git rev-parse HEAD` 実測）
- Base ancestry / distance: `git merge-base --is-ancestor <base> HEAD` exit 0、`git rev-list --count <base>..HEAD` = **125**
- 区間規模: `git diff --stat <base>..<observed>` = **1018 files changed, 274683 insertions(+), 4573 deletions(-)**（測定 ref: observed `ec624022f`）
- Scope: `amadeus-bugfix`、Depth Minimal、Test Strategy Minimal、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1449](https://github.com/amadeus-dlc/amadeus/issues/1449) — `team-up.sh` 起動が約200秒かかる問題。**起動レイテンシの解消のみ**がスコープ。
- 症状（実 launch 実測、2026-07-25、3人構成 leader+engineer×2、隔離インスタンス `bench`）: `T+200.85s team-up.sh EXIT (rc=1)`、armed になったメンバー **0 / 3**、`ERROR: agmsg watcher never armed for: leader engineer-1 engineer-2 (after 1 re-send(s))`。Claude Code は3プロセスとも正常起動し `herdr agent list` 上 `agent_status: idle`。
- 根本原因（本 scan で独立に裏取り）: `verify_watchers_armed` が待つ ready sentinel は **actas モードの watcher しか書かない**が、`team-up.sh` が投入する初期プロンプトは `/agmsg mode monitor`（monitor モード）である。モード不一致により sentinel は**構造的に一度も生成されない** → 検証は常に全員 unarmed でタイムアウトし、`mux_attach` を待ち budget 全量ぶんブロックする。
- 測定 ref: 本ファイル記載の file:line・件数はすべて observed `ec624022f` の実ファイル直読、および外部 agmsg スキル `~/.agents/skills/agmsg/`（repo 外・非バージョン管理、読取時刻 2026-07-25）による。
- 更新した成果物: 本ファイル（鮮度ポインタ + 旧「現在: 260725-mirror-review-fixes」→履歴ラベル化、cid:reverse-engineering:c3-relabel）、`architecture.md`（actas/monitor モード不一致の機序を新設、260724 節の失効数値を訂正）、`code-quality-assessment.md`（「常に失敗する検証ゲート」= 検証劇場クラス + テストスタブによる検出不能性）、`code-structure.md`・`component-inventory.md`（HEAD 行番号への更新と欠陥所在の登録）、`re-scans/260725-teamup-attach-latency.md`（新規）。`business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` は本 intent 由来の構造変化なしのため「変更なし、確認済み」一行のみ追記（cid:reverse-engineering:c1）。
- Sensors: RE ステージの宣言センサー3種（required-sections / upstream-coverage / answer-evidence）は codekb 出力パスが sensor filter に構造的に不適合で発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、H2 構成（各成果物の `## ` 見出し ≥2、直読確認）と上流入力参照（Issue #1449 / 実 launch 実測ログ / 実コード file:line）を直接検証した。
- Delivery boundary: codekb 9成果物 + 本 intent の re-scan 記録のみ更新。実装・テスト・state・audit・生成配布物・commit・PR 操作は未実施。

## 実行メタデータ（履歴: 260725-solo-standing-grants）

- Date: `2026-07-25`
- Base: `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`
- Observed: `4491310cc0b432eb404524ef30a7d8a0a3f68f73`
- Focus: [Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466)
- Reference only: [PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) は凍結試作で参考のみ、実装前提にしない。
- Method: Developer scan の結論を Architect が canonical code と既存テストで照合し、shared CodeKB の先頭 current view と per-intent re-scan に合成。実装方式は確定していない。
- Conclusion: standing grant は監査イベントのまま維持する。solo route / report に grant identity がなく route / commit race がある。commit 時不適格には mutation 前の typed non-error human-approval fallback が必要。具体方式は未決定。
- Diff / verification: 373 files、`+71,339/-811`。grant core は base..observed で無変更、orchestrate plugin 系は `+109/-3` の同時編集面。関連178テスト、dist 6 harness check、promote 4面 check は成功。`bun run check` は `tsc: command not found`（exit 127）で未判定。
- Delivery boundary: 実装コード、intent state、memory、`intents.json`、generated dist は変更していない。

## 実行メタデータ（履歴: 260725-mirror-review-fixes）

- Date: `2026-07-25T01:35:20Z`
- Base commit: `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`（この intent に先行記録がないため、到達可能な `re-scans/` の observed commit のうち HEAD に最も近い `260724-watcher-timeout-fix` を採用）
- Observed commit: `70336937529f5be31c011de5d368c0f03e534506`（[PR #1469](https://github.com/amadeus-dlc/amadeus/pull/1469) head、`git rev-parse HEAD` 実測）
- Base ancestry / distance: `git merge-base --is-ancestor <base> HEAD` exit 0、`git rev-list --count <base>..HEAD` = 49
- Scope: `amadeus-bugfix`、Depth Minimal、Test Strategy Comprehensive、Brownfield、単一 repo `amadeus`
- Focus: PR #1469 の検証済みレビュー修正面。Mirror lifecycle の未完了 outcome exit、prompt 回答 CLI 欠落と binding 不一致、legacy mutation verb、config safe read TOCTOU、state codec の未エスケープ C0 制御文字、Cursor/OpenCode coverage source 正規化、関連 tests/CI。
- Diff focus: `packages/framework/core/tools`、coverage helper/smoke test、`ci.yml` の23ファイル、`+10,319/-161`。正本コードの大宗は Mirror lifecycle 一式。
- Findings: [review thread 1](https://github.com/amadeus-dlc/amadeus/pull/1469#discussion_r3648935678)、[review thread 2](https://github.com/amadeus-dlc/amadeus/pull/1469#discussion_r3648935682)、[review thread 3](https://github.com/amadeus-dlc/amadeus/pull/1469#discussion_r3648935684) のP1 3件に、config/codec/coverage の実測3件を加えた6クラスタ。詳細は `architecture.md` と `code-quality-assessment.md`。
- Baseline: focused 7 test filesを `bun test` で実行し、127 pass / 0 fail / 274 expect()（16.68秒）。現行テストは green だが6欠陥条件を直接検証していない。
- Per-intent record: `re-scans/260725-mirror-review-fixes.md`
- Delivery boundary: codekb 9成果物とこの intent の re-scan 記録のみ更新。実装、tests、state、audit、生成配布物、commit、PR mutation は未実施。

## 実行メタデータ(履歴: 260725-kimi-harness)

- Date: 2026-07-25
- Observed at: `d31b8a5db5798ef761f3871ca66824c87530afb4`(現 HEAD `git rev-parse HEAD` 実測一致)
- Intent: `260725-kimi-harness`(新ハーネス「kimi」/ `.kimi-code` を本 AI-DLC フレームワーク repo へ追加する intent)
- Scope: `amadeus-feature`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Focus: differential refresh + kimi ハーネス追加に向けた移植面(harness-porting surface)の再測定
- Method: differential refresh。base `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`(前回 scan `260724-watcher-timeout-fix` の observed)、observed `d31b8a5db5798ef761f3871ca66824c87530afb4`、`git merge-base --is-ancestor 6d4df9056 HEAD` exit 0、distance `git rev-list --count 6d4df9056..HEAD`=105。`260724-harness-provenance` の observed `2d0da11d` は現 HEAD の**非祖先**(exit 1、squash マージ着地で観測点が HEAD 系統に無い)のため base 不適格。記録済み observed のうち祖先かつ距離最小の `6d4df9056` を採用(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `d31b8a5db` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。区間件数(105)・diff 規模(624 files, +103965/−1957。非 record 295 files, +34617/−1957)はコマンド出力からの転記(numbers-from-command-output-only)。
- 現行結論: 区間の構造変化はハーネス関連 4 クラスタに集中。(1) **ハーネス検出クラスタの新規分離**(`58053fa61`): 新規 `packages/framework/core/tools/amadeus-harness.ts`(137 行、base 非存在)へ `HarnessType`(:5-12)/`HARNESS_DIR_TO_TYPE`(:14-22)/`KNOWN_HARNESS_DIRS`(:34-40)/`KNOWN_RULES_SUBDIR`(:53-57)と検出手続き群が `amadeus-lib.ts` から移管。lib は import(:7-14)+型 re-export(:15-18)+compat facade(:152-166)へ縮退(区間 +21/−99)し、呼び出し側契約は不変。(2) **plugin 同梱モデル変更**(`47d5e3f9c`): plugin は harness 中立バンドル `dist/plugins/<name>/` のみで出荷、per-harness `<harnessDir>/plugins/` 投影は廃止(`scripts/package.ts:316` `projectPluginsIntoHarnessTree` は read-source 会計のみの no-op)。`dist/plugins/formal-model-check/` が初のバンドル(base では `dist/plugins/` 非存在)。(3) **plugin 信頼層**(`f67b931c2` + `454194231`): `scripts/plugin-composition.ts`(+138/−15)に sha256 `contentDigest`・stage index 検証(`parseStages` :293)・journal 信頼付与(`validJournal` :813、sha256 形式 :826)・drop 時ドリフト拒否。(4) **intent birth での harness provenance 記録**(`dc1eeba20`): `amadeus-lib.ts` +78/−9、`amadeus-utility.ts` +3/−0、新テスト t269(unit+cli)/t270/t271 + t144-harness-seam.cli。**kimi 移植面の要点は 3 つの閉集合の非対称**: `scripts/plugin-projection.ts:46-53` `PACKAGE_HARNESSES`(6 面)vs 同 :59 `SELF_INSTALL_HARNESSES`(4 面)vs `amadeus-swarm.ts:100` `HARNESS_VALUES`(4 面、cursor/opencode を意図的除外 — kimi 追加は opt-in で `resolveDriver` :118-136 が未知値を fail-closed 拒否)。packager 本体は manifest 自動発見(`scripts/package.ts:85-91`、コメント :80-84)で新ハーネス追加に編集不要。`packages/framework/harness/` は base・HEAD とも同じ 6 dir で新ハーネス dir は区間内未追加。kimi の雛形は cursor/manifest.ts(75 行)と codex/emit.ts(375 行)。バージョンは `amadeus-version.ts:4` AMADEUS_VERSION="0.1.5"。
- Per-intent record: `re-scans/260725-kimi-harness.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「現在: 260724-watcher-timeout-fix」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`code-structure.md`(amadeus-harness.ts 新規分離と lib facade 化 + kimi 移植面目録を先頭 current view に新設)、`component-inventory.md`(amadeus-harness.ts + plugin 信頼層コンポーネント登録 + 移植面を current view 化)、`architecture.md`(plugin 中立バンドル出荷モデル + 3 閉集合非対称を先頭 current view に新設)、`code-quality-assessment.md`(区間の新テスト t269/t270/t271/t144-harness-seam + t252 信頼層更新を current view に追記)、`re-scans/260725-kimi-harness.md`(新規)。他 body 4 成果物(business-overview / api-documentation / technology-stack / dependencies)は本文温存で「変更なし、確認済み」一行のみ追記(区間変化は 4 成果物のドメイン外。plugin-composition の node:crypto は stdlib で依存変化なし。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。kimi ハーネス本体の実装は未着手。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ（履歴: 260724-watcher-timeout-fix）

- Date: 2026-07-24
- Observed at: `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`(現 HEAD `git rev-parse HEAD` 実測一致)
- Intent: `260724-watcher-timeout-fix`([Issue #1449](https://github.com/amadeus-dlc/amadeus/issues/1449) — `packages/framework/core/tools/team-up.sh` の `verify_watchers_armed`(:1139-1178)が 1 メンバー unarmed で既定 `WATCHER_READY_TIMEOUT=90` 秒 ×(`WATCHER_RESEND_MAX=2`+1)= 最大 270 秒(4.5 分)`mux_attach` を構造上ブロックする性能問題。正常系はオーバーヘッドほぼゼロ = 実測 59.1ms)
- Scope: `amadeus-bugfix`(Depth Minimal)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh。base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`、observed `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`、`git merge-base --is-ancestor a81c11dde HEAD` exit 0、distance `git rev-list --count a81c11dde..HEAD`=155。base は祖先(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `6d4df9056` のワークツリー実ファイル直読、および repo 外 read-only の agmsg skill(`~/.agents/skills/agmsg/scripts/spawn.sh`)直読(cid:measurement-ref-in-artifacts)。diff 規模(1762 files, +217563/−3536。team-up.sh は 1462 行の新規パス、テスト 197 行)・配布 11 コピー・タイムアウト値(90×(2+1)=270)はコマンド出力からの転記(numbers-from-command-output-only)。
- 現行結論: 性能問題の核心は `packages/framework/core/tools/team-up.sh:1139-1178` `verify_watchers_armed` の二重ループ(外側 = 再送 `max_attempts = WATCHER_RESEND_MAX + 1` = 3 :1141、内側 = 1 秒刻みポーリング最大 `WATCHER_READY_TIMEOUT`=90 秒 :1156)が **:1442-1445 で :1448 `mux_attach` の直前に無条件実行**されること。1 メンバーでも armed しないと最大 90×3=270 秒 attach をブロックする。導入は区間内 2 コミット — `42c9341d8`(#1391、`verify_watchers_armed` 検証ロジック本体、#1384 修正)+ `0d24c6f93`(#1421、`scripts/team-up.sh` → `packages/framework/core/tools/` へ移動 + 配布 11 コピー生成、ロジック不変)。原因の所在=**設計(受容されたリスクの先送り)**: `260722-teamup-prompt-race/inception/requirements-analysis/requirements.md` FR-4(:17)で 90 値を `spawn.sh:132 READY_TIMEOUT=90` verbatim に接地(根拠あり)、FR-3 [e4] 留保(:16)で「起動レイテンシが将来問題化した場合のみ `--no-wait` を再検討」と本問題を予見・先送り、FR-5 [e5] 留保(:18)で「exit code 分岐は mux_attach より前に検証完了が前提」と attach 前ブロックを契約化。実装は設計どおりで逸脱なし。agmsg spawn.sh(:576-588)は**単発 90 秒待ちで再送ループ無し**(値は一致・構造は非対称、team-up.sh が独自に ×3 増幅)。テストは `WATCHER_READY_TIMEOUT: "0"`(test:79)でタイミングを無被覆。区間 a81c11dde..HEAD のバグ面はこの 2 コミットに限局し、他 codekb body 成果物(architecture 除く新規知識は本欠陥クラスタのみ)のドメインは不変。
- Per-intent record: `re-scans/260724-watcher-timeout-fix.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「現在: 260723-marker-heading-exemption」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`code-quality-assessment.md`(#1449 の性能欠陥「watcher arming 検証が mux_attach を最大 270 秒ブロック」節を先頭 current view に新設)、`architecture.md`(agmsg watcher arming 検証の launch シーケンス上の位置と mux_attach ブロッキング機序を新設)、`code-structure.md`(team-up.sh の packages 昇格 + watcher 検証関数群の配置)、`component-inventory.md`(`verify_watchers_armed` ほか watcher 検証コンポーネント群の登録)、`re-scans/260724-watcher-timeout-fix.md`(新規)。他 body 4成果物(business-overview / api-documentation / technology-stack / dependencies)は本文温存で「変更なし、確認済み」一行のみ追記(#1449 は既存 bash ツールの制御フロー性能問題でドメイン外。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。区間フォーカス正本変更は #1391/#1421 の既着地分のみで、本 intent の修正は未着手。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260724-harness-provenance)

- Date: 2026-07-24T11:34:46Z
- Observed at: `2d0da11d022565bf4a613da9fbcccf078716f8f4`
- Intent: `260724-harness-provenance`([Issue #1452](https://github.com/amadeus-dlc/amadeus/issues/1452) — AI ハーネス種別を `amadeus-state.md` / stage `memory.md` に記録する機能)
- Scope: `amadeus-feature`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh。base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`、observed `2d0da11d022565bf4a613da9fbcccf078716f8f4`、distance 186。Developer スキャン→Architect 合成の直列。
- 現行結論（当時）: provenance 機能の seam は、birth-time の state template、4見出しを保つ memory diary、既存 harness-dir resolver、bun 書込に非発火の sensor 境界に限定される。
- Per-intent record: `re-scans/260724-harness-provenance.md`
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。

## 実行メタデータ(履歴: 260723-marker-heading-exemption)

- Date: 2026-07-23T01:37:10Z
- Observed at: `ffc79aad9a53c600ea9b464f1f04c6fa627ae59e`(現 HEAD `git rev-parse HEAD` 実測一致)
- Intent: `260723-marker-heading-exemption`([Issue #1296](https://github.com/amadeus-dlc/amadeus/issues/1296) — required-sections センサーの汎用 ≥2-H2 floor が単一行 timestamp / [Answer] 様式 questions の marker 成果物へ無条件適用され、意図的に H2 を欠く marker が常に `pass:false` になる。既決ノルム E-FVEPD が要求する marker 免除がセンサー実装に未反映)
- Scope: `bugfix`(Depth Minimal)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh。base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`(直近 freshness pointer `re-scans/260722-teamup-prompt-race.md` の observed)、observed `ffc79aad9a53c600ea9b464f1f04c6fa627ae59e`、`git merge-base --is-ancestor a81c11dde HEAD` exit 0、distance `git rev-list --count a81c11dde..HEAD`=13。base は祖先かつ距離最小(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `ffc79aad9` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。diff 規模(96 files, +7226/−17。非 record 51 files, +1660/−16)・stage marker 20件・intents corpus 391 questions+22 timestamp・配布 11コピー×2 はコマンド出力からの転記(numbers-from-command-output-only)。
- 現行結論: #1296 の根本原因は `amadeus-sensor-required-sections.ts:141` の `pass = h2_count >= 2` が全成果物へ**無条件適用**され、marker(単一行 timestamp / [Answer] questions)を免除する分岐が不在なこと。ELIGIBILITY GATE(`:167-186`、stem 判別 `:173`)は template 面のみ免除し floor は維持(`:184-185` verbatim `keeping the generic >=2-H2 floor.`)。再利用候補は `amadeus-graph.ts:801-808` `templateEligibleArtifacts` の suffix 弁別(`!a.endsWith("-questions")` / `!a.endsWith("-timestamp")`)で、これは既決規範 E-FVEPD(cid:practices-discovery:e-fvepd-marker-heading-floor)が要求する挙動そのもの — 規範は免除を要求するがセンサーが未実装という乖離。修正は「文書化済み仕様への回復」であり仕様変更ではない。再現(read-only 診断): timestamp marker で `{"pass":false,"h2_count":0,"findings_count":2}`、questions marker でも同様に floor FAIL。原因の所在=**実装**(規範 E-FVEPD が定めた免除挙動をセンサースクリプトが実装していない)。区間 a81c11dde..HEAD の非 record 差分(`scripts/team-up.sh` ほか)はバグ面と無交差でセンサー正本・graph・manifest・stage marker 宣言は不変。
- Per-intent record: `re-scans/260723-marker-heading-exemption.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「現在: 260722-teamup-prompt-race」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`code-quality-assessment.md`(#1296 の欠陥クラス「marker 成果物への required-sections floor 誤適用」節を先頭 current view に新設、旧「現在」= 260722-teamup-prompt-race を履歴へ降格)、`re-scans/260723-marker-heading-exemption.md`(新規)。他 body 7成果物(architecture / code-structure / component-inventory / technology-stack / api-documentation / business-overview / dependencies)は**本文温存**で、先頭の 260722 current marker「(…、現在)」→「(…、履歴)」の label のみ降格(c3-relabel — 単一 current view を code-quality + 本鮮度ポインタに一意化。#1296 のセンサー面はこれら7成果物のドメイン外で新規節なし)。実質の新規知識は「required-sections floor が marker を無条件 FAIL させる+graph suffix 弁別が再利用可+E-FVEPD 規範との乖離」の1クラスタのみで code-quality-assessment + per-intent record に集約(区間非交差でセンサー正本・graph・manifest・stage marker は不変。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。区間フォーカス正本変更0件のため dist 11コピーは base と同一。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260723-t241-ci-residency)

- Date: 2026-07-23T00:57:42Z(scan-notes 実行時刻の転記)
- Observed at: `78bce87615b985d0151f604c915c6aab1d6ba9f1`(現 HEAD `git rev-parse HEAD` 実測一致)
- Intent: `260723-t241-ci-residency`([Issue #1294](https://github.com/amadeus-dlc/amadeus/issues/1294) — `tests/e2e/t241-election-machine-executor.test.ts` のヘッダが「CI-resident」(FR-0 機械実行器の常設証明、ADR-6 layer (i))を自称するが、PR CI(`--ci`)は e2e 層を実行しない)
- Scope: `bugfix`(Depth Minimal)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`(前回 scan `260722-teamup-prompt-race` の observed)、observed `78bce87615b985d0151f604c915c6aab1d6ba9f1`、`git merge-base --is-ancestor` exit 0、distance `git rev-list --count base..HEAD`=35。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `78bce876` のワークツリー実ファイル直読(Developer scan、cid:measurement-ref-in-artifacts)。区間件数(35)・diff 規模(224 files, +10774/−16)はコマンド出力からの転記(numbers-from-command-output-only)。
- ★本バグ面は base..HEAD で無変更: `git diff --numstat <base>..HEAD -- tests/e2e tests/run-tests.ts tests/run-tests.sh tests/gen-coverage-registry.ts .github/workflows package.json` = **0 行(出力空)**。欠陥コード(t241 の e2e 配置・CI tier 定義・ワークフロー)は base より前(intent `260718-election-ts-foundation`、導入 PR #1235)に導入済みで、差分リフレッシュ区間 35 コミットとは無交差。差分リフレッシュとしては「バグ面ドリフトなし」を確定。
- 現行結論: `tests/e2e/t241-election-machine-executor.test.ts` はヘッダ(:1 verbatim `// t241 — FR-0 machine executor (ADR-6 layer (i), CI-resident, Bolt 4).`)で「CI-resident」、本文(:4-5)で「strongest standing proof of FR-0」を自称するが、`tests/e2e/` 配置ゆえ自動 CI で非実行。`--ci`(`run-tests.ts:197-202`)は smoke+unit+integration のみ(runE2e 非設定)、e2e は `--release`/`--all`(:203-211)= ローカル手動用の `test:all`(package.json:14-16)のみ。`ci.yml`(:114/:152/:227 が `test:ci`/`coverage:ci`)・`release.yml`(test ステップ無し)・`formal-verification.yml`(:12 workflow_dispatch)いずれも `--e2e`/`--release`/`test:all` 0 ヒットで e2e 非実行。**決定的原因所在は実装逸脱**: ADR-6(`application-design/decisions.md:41-48`)Decision が layer (i) 機械実行器を「integration テストで固定する」と明記しているのに、実装(#1235)が `tests/e2e/` に配置し CI 実行範囲との整合検証を欠いた(cid:bug-intent-linkage、原因所在=設計は正・実装が逸脱)。回復先の実在: integration に election CLI spawn 兄弟 6 本既存(t235/t236/t240/t242/t244 + t-formal-verif-arm-s-blind、`--ci` で CI 実行済み)、t241 は spawnSync+fs→`classifyTestSize`=medium で integration MAX=medium に適合(clean)、`gen-coverage-registry.ts` 未登録。sibling t237(:1-5「Layer: e2e」)は CI-resident 非自称の健全対照。
- Per-intent record: `re-scans/260723-t241-ci-residency.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「現在: 260722-teamup-prompt-race」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、codekb body 8成果物(先頭 current view に本 intent の外科的追加、旧「現在」節は履歴へ降格 — bugfix Minimal 相応で本文温存)、`re-scans/260723-t241-ci-residency.md`(新規)。
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260722-teamup-prompt-race)

- Date: 2026-07-22T22:03:26Z
- Observed at: `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`(現 HEAD `git rev-parse HEAD` 実測一致)
- Intent: `260722-teamup-prompt-race`([Issue #1384](https://github.com/amadeus-dlc/amadeus/issues/1384) — `scripts/team-up.sh` の fresh セッションで初期プロンプト `/agmsg mode monitor` が Claude Code TUI 起動レースで消失し watcher が起動しない。再現率 5/6)
- Scope: `bugfix`(Depth Minimal)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh。base `a326f47bc0146a3b4285552f42b92fd61fb343a7`、observed `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`、`git merge-base --is-ancestor` exit 0、distance `git rev-list --count base..HEAD`=101。日付がより新しい非祖先 observed(`545e69c8` 等)は exit 1 で除外(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `a81c11dde` のワークツリー実ファイル直読、および repo 外 read-only の agmsg skill(`~/.agents/skills/agmsg/`)直読(cid:measurement-ref-in-artifacts)。区間件数(101)・diff 規模(2593 files, +349417/−5289)はコマンド出力からの転記(numbers-from-command-output-only)。
- 現行結論: `scripts/team-up.sh` の claude member 起動経路は初期プロンプト `/agmsg mode monitor` を一発勝負で渡し(`:800` init_prompt 固定、`:830-832` 起動組立、`run-claude.sh` 末尾 `exec claude ... "$@"`)、TUI 起動レースで取りこぼされても再送・検証が一切ない。pane 起動(`:429`/`:447`)は cmd を一度 exec するのみ、`start_safety_wait_supervisors()`(`:338-395`)は `:340` `[ "$RUNTIME" = "codex" ] || return 0` で claude runtime には readiness 検証が構造的に不在。対照として agmsg `spawn.sh:576-588` は ready センチネル(`agmsg_ready_path` `lib/actas-lock.sh:69-73`、touch 側 `watch.sh:294-310`)出現までブロックする handshake を持つ(default `--ready-timeout` 90s `spawn.sh:46-47`)。原因の所在は**設計(一般化漏れ)**: 直近 intent `260721-teamup-safety-wait` が起動後の pane readiness 検証を Codex 専用に新設(`team-up.sh:212-395`,`:1259` + 新規 `team-up-codex-safety-wait.ts` +567)したが claude 経路へ一般化せず、watcher arming の回帰テストも現状ゼロ(既存 team-up テストは init_prompt/`agmsg mode monitor`/ready/watch を参照しない)。
- Per-intent record: `re-scans/260722-teamup-prompt-race.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「現在: 260720-upstream-sync-230」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、codekb body 8成果物(先頭 current view に本 intent の外科的追加、旧「現在」節は履歴へ降格 — bugfix Minimal 相応で本文は温存)、`re-scans/260722-teamup-prompt-race.md`(新規)。
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260720-upstream-sync-230)

- Date: 2026-07-20T06:43:32Z
- Observed at: `545e69c836d46f7bec2fa351c8e668026eb5fad5`
- Intent: `260720-upstream-sync-230`（upstream `awslabs/aidlc-workflows` v2.2.0→v2.3.0 の承認済み24 ADOPT/ADAPT を Amadeus へ同期）
- Scope: `amadeus`（Depth Standard / Test Strategy Comprehensive）
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh。base `a326f47bc0146a3b4285552f42b92fd61fb343a7`、observed `545e69c836d46f7bec2fa351c8e668026eb5fad5`、`git merge-base --is-ancestor` exit 0、distance 32。次点 `591b6a2a` は distance 84、日付が新しい非祖先 observed は exit 1 で除外。
- Focus: plugin/schema/package/compose/test/docs、6 harness 適応を含む24 ADOPT/ADAPT。SKIP 6件は EQUIVALENT/生成物/フォーク固有として境界維持。
- Measurement ref: Developer scan の observed HEAD 実ファイル直読。差分865 files、`+48,636/-241`、core tools 30、hooks 11、agents 14、stages 32、sensors 5、harness 69 files/6面、TS 621、tests 461。詳細 file:line と24判定は `architecture.md` 、品質検査は `code-quality-assessment.md` に記録。
- Current conclusion: MISSING 19 / PARTIAL 4 / EQUIVALENT 候補 1。明確な縮小候補は `swarm-batch-advance`、`gate-next-stage-naming` は PARTIAL、plugin 機構が最大 block。
- Updated artifacts: body 8成果物、本 freshness pointer、`re-scans/260720-upstream-sync-230.md`。既存本文は履歴として温存し、先頭の current view のみ追加／更新。
- Delivery boundary: 実装コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。
- Base source of truth: 本 intent の per-intent record。共有 timestamp は freshness pointer であり、次回の differential base は `re-scans/` の到達可能 observed から決める。

## 実行メタデータ(履歴: 260720-formal-verif-experiment)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `1865bc902ff5ecb1e51caefc339aae18e015431b`(`git rev-parse HEAD` 実測一致。merge commit — origin/main 取込後の断面)
- Intent: `260720-formal-verif-experiment`(選挙 CLI に対する形式検証(PBT / モデル検査)実験ハーネスの実現可能性 RE。既知5欠陥 #1268 / #1273 三系 / #1277 を「型緑・意味赤」の外科的注入面として使い検出力を実証する実験の下地観測)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。`re-scans/*.md` 43ファイルを `Observed at` / `Observed commit` / 既存小文字ヘッダの様式差込みで全数走査し、観測 SHA を抽出できた42ファイルの祖先性と距離を機械照合した。自己 scan を除く距離最小の祖先 observed は `a326f47bc0146a3b4285552f42b92fd61fb343a7`(`260719-goa-multiseg-ecode` / `260719-cursor-complete-clear`、`git merge-base --is-ancestor a326f47bc 1865bc902` exit 0、`git rev-list --count a326f47bc..1865bc902`=**29**)であり、これを base に採用(rescan-base-ancestry)。非祖先 observed `c2e4975ff` の merge-base `bd147dc7b`(距離47)を使った旧選定を訂正した。observed=`1865bc902`。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `1865bc902` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。区間件数(29)はコマンド出力からの転記(numbers-from-command-output-only)。区間フォーカス変更は3コミット(#1268=`ea6acac53` / #1273=`a6f4a4522` / #1277=`e1fd1826b`)・4ファイル(model / store / record / 本体。transport は変更0件)で、いずれも本実験が再注入対象とする既知5欠陥の修正そのもの。
- 現行結論: 選挙 CLI 5ファイル(model 464 / store 261 / record 224 / transport 207 / 本体 589 = 計1745行)に対し、既知5欠陥(#1268 winner=GoA 軸 model :445-463 / #1273-2a invalid-timestamp model :253 / #1273-2b amend 経路 `parseKindRef`:194-203・store :150-158 / #1273-2c per-voter `resolveBallots` model :431・本体 :381,:459 / #1277 timeline record :212-213)はいずれも**型緑・意味赤の外科的注入が可能**で、4欠陥が分離可能性=高・2b のみ中(2b/2c は意味連鎖)。選挙テスト(unit t234/t238/t239・integration t235/t236/t240/t242・e2e t237/t241)に **fast-check 使用ゼロ**、PBT 参照様式は setup-semver/setup-manifest/t204 の3本(固定 `PBT_SEED`・`numRuns` 100・`AMADEUS_PBT_DEEP=1` で 50k・dist コピー import の unit 層)。CI 面: `ci.yml` の `test:ci` は smoke+unit+integration のみで e2e 除外(package.json:15)、**t241(機械実行器)は「CI-resident」自称(:2-6)だが PR CI で未実行 = FR-0 意図との乖離(確信度高)**。実験ハーネスは unit/integration 層配置で CI+coverage 両ゲートに載る。CLI `--project` override(本体 :577-578)実在で scratch 隔離可能。原因の所在=**実験下地の観測**(バグ修正でなく形式検証実験の feasibility 確認)。
- Per-intent record: `re-scans/260720-formal-verif-experiment.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260720-diary-autogen-guard」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260720-formal-verif-experiment.md`(新規)。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 選挙 CLI 詳細は re-scans 管轄で `architecture.md`/`code-structure.md` と矛盾なし、実質の新規知識は 5欠陥の注入面確定・fast-check 不在と PBT 参照様式・t241 の CI-resident 自称と PR CI e2e 非実行の乖離・`--project` override による scratch 隔離の1クラスタのみで per-intent record に集約。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。区間フォーカス正本には既知5欠陥を修正した3コミット・4ファイルの変更があり、Observed の現行断面から逆変換可能な注入面を確定した。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260720-diary-autogen-guard)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `0b11036d5d990c9f5de98dc172222d8e2df4928a`(`git rev-parse HEAD` 実測一致、engineer-1 worktree)
- Intent: `260720-diary-autogen-guard`([Issue #1279](https://github.com/amadeus-dlc/amadeus/issues/1279) — stage diary 自動生成が engineer-1 環境でのみ無音不発。同スコープ・同コードの engineer-3 は全ステージ ✅)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`37f8cf5e67cef77adfd82ef292303790f756c8fd`(直前の鮮度ポインタ `re-scans/260720-ballot-received-at.md` の Observed、全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小。`git merge-base --is-ancestor 37f8cf5e6 HEAD` exit 0 実測、`git rev-list --count 37f8cf5e6..HEAD`=**17**。tally observed `262a86db9`=dist33・record 宣言 base `a326f47bc`=dist53 はいずれも祖先だが非最小のため base に採らず。rescan-base-ancestry / 距離最小の祖先を採用)、observed=`0b11036d5d990c9f5de98dc172222d8e2df4928a`。区間 `37f8cf5e6..HEAD`=17コミットは全て `record(ballot-received-at)` 工程記録+1 audit で、フォーカス正本 `amadeus-orchestrate.ts`(chokepoint :1168-1172)・`amadeus-lib.ts`(`relativeRecordDir`/`activeIntent`/`resolveProjectDir`)への `git log 37f8cf5e6..HEAD -- <両ファイル>`=**0件** = Observed=HEAD ワークツリー実測が base 断面と同一。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、確約級引用4クラスタ(`resolveProjectDir`:211-235 / `activeIntent`:1059-1084 / `relativeRecordDir`:1217-1226 / chokepoint `amadeus-orchestrate.ts`:1172 + `codekbCtxFor`:889-891)を独立スポット再実測し反証なし)。
- 測定 ref: 全 file:line は Observed=HEAD `0b11036d5` の engineer-1 worktree 実ファイル直読(cid:measurement-ref-in-artifacts)。intent-dir 件数(e1=46)はコマンド出力からの転記(numbers-from-command-output-only)。環境固有バグのため決定的再現は scratchpad の read-only probe のみ(正本・配布コピー未改変、instrumentation-syntax-check 準拠、cwd 変更・checkout/stash/reset・record/state 書換 verb 不使用)。
- 現行結論: diary 自動生成の可否は chokepoint の guard `if (recordPrefix !== null && codekbCtx) ensureStageDiary(...)`(`amadeus-orchestrate.ts:1172`)で決まり、**❌ 枝は例外なく `recordPrefix === null`**(`codekbCtx` は `codekbCtxFor` :889-891 が常に object を返すため実 `next` 経路では never falsy — 除外)。`recordPrefix === null ⟺ activeIntent(pd) === null`(`relativeRecordDir`:1224 が null を返す)。e1 は intent record dir が46件あり lone-intent fallback(`activeIntent`:1080 `records.length === 1`)は発火しないため、`activeIntent` は `active-intent` cursor 解決に完全依存する。**pd(projectDir)が本質の可変軸**: `resolveProjectDir`:211-235 の優先順は ①--project-dir ②`CLAUDE_PROJECT_DIR` env ③script-path ④cwd で、②が③より先に効くためエンジンの pd は当該セッションの `CLAUDE_PROJECT_DIR` に支配される。cursor 非解決ツリー(main checkout=cursor 不在等)を指すと `activeIntent(pd)=null → recordPrefix=null → diary 無音 skip`。read-only probe で pd 差のみによる ✅/❌ の決定的反転を実証(e1 worktree=FIRES / main checkout=SKIPPED)。設計欠陥は guard が「pre-birth の正当 skip」と「intent 実在だが cursor/pd 解決失敗のバグ skip」を**無音で混同**すること(template-missing 枝は stderr 警告 :1121 を出すのに本 skip は無警告)。非対称性: audit/report/state 系は `--intent <record>` 明示アンカー(`amadeus-audit.ts:433`)で cursor 非依存のため、260719-tally の RE audit は tally 正シャードに着地しており「audit は正シャード・diary だけ不発」を説明する。原因の所在は**設計**(diary chokepoint に audit 同様の明示 intent アンカーを持たせず ambient cursor 解決のみに依存させた設計判断)。
- Per-intent record: `re-scans/260720-diary-autogen-guard.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260720-ballot-received-at」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260720-diary-autogen-guard.md`。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は「diary chokepoint guard が cursor/pd 非解決を無音 skip し pre-birth 正当 skip と混同+diary 経路が audit と非対称に ambient cursor 依存+pd 解決が `CLAUDE_PROJECT_DIR` 支配で環境固有」の1クラスタのみ。これは bugfix の環境依存挙動欠陥であり構造・API・依存・技術スタックの変化を伴わず、フォーカス正本の区間変更0件で本文と矛盾しない。詳細は per-intent record に集約済み。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。区間フォーカス正本変更0件のため dist ツリーは base と同一。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260720-hold-choice-resolution)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `f6ab1e48d321e11ab6355fa315d505e28bd0273b`(`git rev-parse HEAD` 実測一致、subject = `record(hold-choice-resolution): approval-handoff approved (ideation complete)`)
- Intent: `260720-hold-choice-resolution`([Issue #1267](https://github.com/amadeus-dlc/amadeus/issues/1267) — 選挙 CLI の hold-resolution に勝者 choice 指定を追加する。多肢 choice tie 由来の hold を人間解決する際、二値語彙 adopted/rejected では勝者 choice を表現できないギャップ。E-TCRCG e4 留保の履行)
- Scope: `amadeus`(enhancement — bugfix ではない)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`6f2455c43b7dbadafec83ab3d0b57d9fc8e5156c`(全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小 = `re-scans/260719-ballot-failclosed-amend.md` の Observed。`git merge-base --is-ancestor 6f2455c43 f6ab1e48d` exit 0 実測、`git rev-list --count 6f2455c43..f6ab1e48d`=**87**)、observed=`f6ab1e48d321e11ab6355fa315d505e28bd0273b`。より新しい re-scan observed `37f8cf5e6`(260720-ballot-received-at)・`262a86db9`(260719-tally-choice-ruling)は本 HEAD の**非祖先**(`--is-ancestor` exit 1、並行 intent の squash tip)につき base 候補から除外(cid:reverse-engineering:rescan-base-ancestry / re-timestamp-merge-resolution)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、確約級引用5クラスタ+区間交差の帰属を独立スポット再実測 = **1点反証**あり)。
- 測定 ref: 全 file:line は Observed=HEAD `f6ab1e48d` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。区間変更は `git log/diff 6f2455c43..f6ab1e48d -- <path>`、crossing 帰属は `git blame`/`git show 6f2455c43:<file>` で実測。実データ census は本 worktree(engineer-2、`f6ab1e48d`)の `amadeus/**/elections/**/tally.json` 実測。
- 現行結論: 本 intent は**enhancement**(scope `amadeus`)で原因所在の該当なし。多肢 choice tie の hold(`model.ts:456` `{kind:"hold", reason:"tie"}`)を人間解決するとき、resolution 語彙 `tie: {adopted, rejected}`(`election.ts:70`、二値)は**勝者 choice を表現できない**。裁定は `rulingOverride`(`election.ts:389-393`)で `採用`/`不採用` へ二値写像され勝者 choice ラベルが描画に出ない。#1267 は `--resolution choice:<internalNo>` 形の受理を `renderPersistDraft` の winner 描画経路(`record.ts:120-131` established winner label 相当)へ合流させ、human-ruling-persist-through 準拠で record.md 反映まで実装する。拡張5面(語彙テーブル `election.ts:69-74` / fail-closed 検証 `:201-208` / 二値写像 `:389-393` / 永続 `HoldResolution` 型 `:89-94` / tie 発生源 `model.ts:442-456`)はすべて Observed に実在し機序確定。**1点反証(区間交差)**: Developer scan の「rulingOverride 本体は未変更(Bolt 4 由来)」は誤り — `rulingOverride`(`election.ts:389-393` + `record.ts:155/159` param)は区間内の **#1268(`ea6acac53`、2026-07-20)が `effective:TallyResult` established 合成から再形成した直近変更面**(`git blame` / `git show 6f2455c43:` 実測)。HOLD_RESOLUTIONS(:69-74)・handleHoldResolved(:190-226)の未変更判定は正しい。tie hold・resolution の本番実績ゼロ(本 worktree tally.json 51件は全て旧 outcome スキーマ、hold 0/winner-schema 0/非空 resolutions 0。Developer leader-tree 計数 62 との差は worktree ref 差で定性結論は一致)、tie hold-resolved / 採用分岐 / tie resolution 検証のテストも全欠落。e4 バッチ面(GoaLineCode/renderGoaLine/handleOpen/norm-metrics)は関数レベル非交差を裏取り。
- Per-intent record: `re-scans/260720-hold-choice-resolution.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260720-ballot-received-at」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260720-hold-choice-resolution.md`。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は「hold-resolution が tie 勝者 choice を表現できない enhancement ギャップ + 拡張面 rulingOverride が #1268 の直近変更面である crossing 事実 + tie hold/resolution の本番・テスト双方の空白」の1クラスタのみ。既存機構への機能追加であり構造・API・依存・技術スタックの現状を変えず、詳細は per-intent record に集約済み。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。区間 `scripts/` は #1268/#1273/#1277 の3本が変更しているが、本 intent の実装は未着手。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260720-ballot-received-at)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `37f8cf5e67cef77adfd82ef292303790f756c8fd`(`git rev-parse HEAD` 実測一致)
- Intent: `260720-ballot-received-at`([Issue #1262](https://github.com/amadeus-dlc/amadeus/issues/1262) — agmsg 中継票に受理側機械時刻 `receivedAt` が無く、中継遅延で timeline の `at` 列が非単調化し、正当な選挙が verify の `timeline-order` finding で完走不能になる)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`262a86db9b2a47b59ac0b1287e540295ca212378`(直近 re-scan `re-scans/260719-tally-choice-ruling.md` の Observed、全 `re-scans/*.md` observed のうち HEAD 祖先。`git merge-base --is-ancestor 262a86db9 HEAD` exit 0 実測)、observed=`37f8cf5e67cef77adfd82ef292303790f756c8fd`。区間 `262a86db9..HEAD`=16コミットだが `git log 262a86db9..HEAD -- scripts/ tests/ packages/`=**0件**(全て `record(tally-choice-ruling)` の工程記録コミット)で、フォーカス正本 `scripts/amadeus-election*.ts`+`tests/` は区間内無変更 = Observed=HEAD ワークツリー実測が base 断面と同一(rescan-base-ancestry 準拠)。#1268(tally winner 化)は本ブランチの区間には未着地(`scripts/` diff 0件で確認)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、確約級引用3クラスタ+反証2 grep を独立スポット再実測し反証なし)。
- 測定 ref: 全 file:line は Observed=HEAD `37f8cf5e6` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。回避運用の非単調実データは leader tree のリードオンリー実測(正規化コミット `5e96f8766`)、e2 交差は e2 worktree(branch `team/.../engineer-2` @ `67cf31165`)のリードオンリー実測。
- 現行結論: バグの一次原因は `scripts/amadeus-election-store.ts` の `appendBallot` が timeline イベントの `at` に投票者自己申告時刻 `ballot.submittedAt` をそのまま書く(:156 late lane / :166 normal lane、verbatim 再実測済み)ことにある。受理側機械時刻 `receivedAt` は scripts/tests/packages 全域 **0件**(反証 grep 実測)。verify の `verifySelf`(`amadeus-election-record.ts:179-183`、隣接 `at` の辞書式単調検査)が agmsg 中継票(sender submittedAt 保持のまま受理遅延)と CLI 直接票の混在で `cur < prev` を検出し `timeline-order` finding を返すため、`handleVerify`(`amadeus-election.ts:456-457`)が fail=exit 1 → 状態機械が `recorded`(=done)へ遷移不能。原因の所在は**設計** — timeline の時刻軸として submittedAt(投票者申告)を採用し受理境界の機械時刻を捨てる設計判断が intent `260718-election-ts-foundation`(Bolt 1〜4)でなされ、中継 vs 直接混在シナリオが requirements/functional-design/テストで未固定。distributed(`election.ts:304` `at: d.result.value.record.at`)/tallied(`store.ts:228` `at: talliedAt`)は既に機械時刻を使う非対称(symmetric-pair-review クラス)。実害は E-BFARA1/2/3(2026-07-19)で顕在化し、ユーザー承認のうえ timeline 配列を `at` 昇順ソート(時刻値不変・並び正規化のみ)して verify 通過させる暫定運用で回避(leader コミット `5e96f8766`)。e2 `260719-ballot-failclosed-amend`(#1252/#1253)と同一3ファイル(`amadeus-election-model.ts`/`-store.ts`/`.ts`)を編集する高交差=直列化 or merge 協調前提。
- Per-intent record: `re-scans/260720-ballot-received-at.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260719-tally-choice-ruling」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260720-ballot-received-at.md`。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は「timeline の `at` が submittedAt 軸で受理境界機械時刻を捨てる+verify 単調性検査が中継/直接混在で偽 fail+受理側 receivedAt の絶対不在(distributed/tallied との非対称)」の1クラスタのみ。これは bugfix の挙動欠陥であり構造・API・依存・技術スタックの変化を伴わず、フォーカス正本の区間変更0件で本文と矛盾しない。詳細は per-intent record に集約済み。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。区間 `scripts/` 変更0件のため dist 16ツリーは base と同一。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260719-tally-choice-ruling)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `262a86db9b2a47b59ac0b1287e540295ca212378`(`git rev-parse HEAD` 実測一致)
- Intent: `260719-tally-choice-ruling`([Issue #1261](https://github.com/amadeus-dlc/amadeus/issues/1261) — 選挙 CLI の `tally` が `choiceInternalNo` を裁定導出に使わず、多肢選挙で choice 多数を無視して GoA favor/against のみで outcome を決める)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`a326f47bc0146a3b4285552f42b92fd61fb343a7`(直近 re-scan `re-scans/260719-goa-multiseg-ecode.md` の Observed、全 `re-scans/*.md` observed のうち HEAD 祖先。`git merge-base --is-ancestor a326f47bc HEAD` exit 0 実測、`git rev-list --count a326f47bc..HEAD`=**20**。rescan-base-ancestry / 距離最小の祖先を採用)、observed=`262a86db9b2a47b59ac0b1287e540295ca212378`。区間 `a326f47bc..HEAD`=20コミットだが `git log a326f47bc..HEAD -- scripts/`=**0件**(工程記録+delegate 取込のみ)で、フォーカス正本 `scripts/amadeus-election*.ts` は区間内無変更 = Observed=HEAD ワークツリー実測が base 断面と同一。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、確約級引用3点を独立スポット再実測し反証なし)。
- 測定 ref: 全 file:line は Observed=HEAD `262a86db9` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。E-GMEBT 実データは leader tree `55af93d95` の `elections/E-GMEBT/` リードオンリー実測。区間変更は `git log a326f47bc..HEAD -- <path>` で実測。
- 現行結論: バグの一次原因は `scripts/amadeus-election-model.ts:321` `tally(_election, ballots)` が第1引数 election を明示 underscore で捨て、`choiceInternalNo` を裁定導出に一切参照せず GoA の favor/against 集計(FAVOR={1,2,3,6} / AGAINST={7,8})だけで `outcome:"adopted"|"rejected"` を決めること(:334-335)。`TallyResult`(:312-314)は choice 内訳フィールドを持たない。原因の所在は**設計** — tally は intent `260718-election-ts-foundation` Bolt 1 walking-skeleton の "minimal tally"(GoA-only)として導入され、以後の Bolt でも choice 集計が設計されなかった設計時欠落。choice は受理(model.ts:198)→ store(store.ts:161)→ materialize(store.ts:223)まで運ばれるが、tally で脱落し render(record.ts:107 rulingText は outcome のみ)へ流れる。verify(election.ts:440)は tally を recompute するため**修正は tally 一点に集約すれば verify も自動追随**する。隣接ギャップ: `Ballot.parse`(:184-204)の5分類 fail-closed に `unknown-choice` 照合がなく、unknown-voter と対称の欠落(symmetric-pair-review クラス)。実害は E-GMEBT で顕在(全票 GoA2 で favor=3/against=0 → `adopted` 誤描画、正は choice 多数 2-1 で不採用。leader 注記でユーザー裁定「不採用」へ是正済み)。tally 呼び出しは t234 の7箇所のみ(fixture は choiceInternalNo:1 固定)、choice 多数決の assert は全域0件。e2 `260719-ballot-failclosed-amend` と同一関数 `tally`(母集団 per-voter 化)+`Ballot.parse`(分類追加)で**強交差=直列化前提**。
- Per-intent record: `re-scans/260719-tally-choice-ruling.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260719-goa-multiseg-ecode」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260719-tally-choice-ruling.md`。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は「tally が choice-blind で裁定を導出+検証チェーン(verify recompute)が tally 修正に自動追随+受理段の unknown-choice 対称欠落」の1クラスタのみ。これは bugfix の挙動欠陥であり構造・API・依存・技術スタックの変化を伴わず、フォーカス正本の区間変更0件で本文と矛盾しない。詳細は per-intent record に集約済み。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。区間 `scripts/` 変更0件のため dist 20ツリーは base と同一。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260719-ballot-failclosed-amend)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `6f2455c43b7dbadafec83ab3d0b57d9fc8e5156c`(`git rev-parse HEAD` 実測)
- Intent: `260719-ballot-failclosed-amend`(選挙 CLI の ballot 受理境界における fail-open / kind 無差別集計の RE。Issue #1252/#1253。本 intent は ideation 起点)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`591b6a2a222357f41061128f1b5a93c7f7a877be`、observed=`6f2455c43b7dbadafec83ab3d0b57d9fc8e5156c`。祖先性 `git merge-base --is-ancestor 591b6a2a2 6f2455c43` **exit 0 実測**、距離 `git rev-list --count 591b6a2a2..6f2455c43`=**65**。非祖先 observed(並行 squash tip 等)は base 候補から構造的に除外(cid:reverse-engineering:rescan-base-ancestry / re-timestamp-merge-resolution)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証ゼロ)。
- 測定 ref: 行番号・件数は observed HEAD `6f2455c43` の実ファイル直読、区間変更は `git log 591b6a2a2..6f2455c43 -- scripts/` で実測(measurement-ref-in-artifacts)。
- 現行結論: 選挙 CLI ballot 受理パイプラインの **fail-open 3点**(いずれも #1231/#1235 の設計時ギャップ、区間内退行ではない): (1) **kind 非読取** — `Ballot.parse`(`amadeus-election-model.ts:180`)が raw kind を無視し `kind:"original"` 固定(`:194`)、`parseBallotShape`(`:160-178`)も kind 非参照 → vote verb 経由の amend 投入経路が構造的に不在。(2) **normalizeAt 素通し** — `amadeus-election-transport.ts:87-91` が NaN 時に入力を無検証で返す fail-open(`:90`)。(3) **tally 無差別集計** — dup(`store.ts:131-133`)は amend 除外、`classifyLate`(`model.ts:296-298`)/`tally`(`model.ts:321-337`)は kind 非区別で original+amend の二重計上、`verify`(`election.ts:440` recompute)でも検出不能。実データ 12件は全 kind=original・全 late=[](amend/late ゼロ世代)。配布: `amadeus-election*.ts` は dist 投影0件、SKILL のみ3面(`.agents`/`.claude`/`contrib`)。
- Per-intent record: `re-scans/260719-ballot-failclosed-amend.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260718-election-ts-foundation」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260719-ballot-failclosed-amend.md`。**body 9成果物は全点温存**(churn 回避 — 実質の新規知識は選挙 CLI 受理境界の fail-open 3点のみで本 re-scan/scan-notes に収載、`architecture.md` には ballot 受理境界を扱う選挙 CLI アーキテクチャ節が不在で新設は churn。cid:reverse-engineering:c1)。
- Delivery boundary: 実装、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260719-goa-multiseg-ecode)

- Date: 2026-07-19(Asia/Tokyo)
- Observed at: HEAD `a326f47bc0146a3b4285552f42b92fd61fb343a7`(`git rev-parse HEAD` 実測)
- Intent: `260719-goa-multiseg-ecode`([Issue #1226](https://github.com/amadeus-dlc/amadeus/issues/1226) — `parseGoaLine` の `GOA_HEAD_RE` がハイフン複節 E-code(`E-SDE-CG4` 等)を head 段で拒否)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小。`git merge-base --is-ancestor 6495e03a12d9e7149c2e80b59f171a90607a2d2c HEAD` exit 0 実測、`git rev-list --count 6495e03a..HEAD`=**178**。日付が新しい squash tip の非祖先 observed は cid:reverse-engineering:rescan-base-ancestry に従い除外)、observed=`a326f47bc0146a3b4285552f42b92fd61fb343a7`。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)。
- 測定 ref: 件数・行番号は observed HEAD `a326f47bc` のワークツリー実ファイル直読、区間変更は `git log 6495e03a..HEAD -- <path>` で実測(cid:measurement-ref-in-artifacts)。フォーカス正本 `amadeus-norm-metrics.ts`+dist+tests に触れた区間変更は2件のみ(`0ab3f22c4` Bolt 1 rank、`b48f89bf0` PR #1112 Bolt 2 で `parseGoaLine`/`GOA_HEAD_RE`/テスト固定を導入)。
- 現行結論: バグの一次原因は `packages/framework/core/tools/amadeus-norm-metrics.ts:157` `GOA_HEAD_RE = /^GoA\[(E-[A-Z0-9]+)\]:\s*(.+)$/` が複節ハイフン E-code を許容しないこと(新規 regression でなく PR #1112 Bolt 2 の schema 設計時欠陥)。**ただし regex 修正は必要条件だが十分条件ではない**: team.md の実 GoA 行9行(distinct E-code)はすべてサブ問別スパース表記(`c1 1x2 2x1 / c2 …`)で canonical 8-bin 形は0行 — hyphen 許容後も bin 段 `:692`(`tokens.length !== 8`)で BINFAIL に反転し 9行中0行が parse する(`parseGoaLine` 直呼びで pass=0/headFail=8/binFail=1 を実測)。被害面は現状 **latent**: `parseGoaLine`/`parsePmCidLine` は蒸留(`collectMetrics`/`distillCandidates`)から集計消費されず、`:544` で `GoA-variance … NOT COLLECTED` を明示出力(header comment :38-44「aggregation is future」)。唯一の live consumer は `scripts/amadeus-election.ts:413 checkGoaLine` だが、round-trip する record.md 行は `scripts/amadeus-election-record.ts:77 renderGoaLine` が compressed 非ハイフン+canonical 8-bin で書くため #1226 を踏まない。同根の `PM_CID_RE :161` round= も非ハイフン制約(複節 round 実在0件・潜在のみ)。`scripts/amadeus-election-record.ts:34 GoaLineCode`(`GOA_LINE_CODE_RE=/^E-[A-Z0-9]+$/`、#1226 コメント :31)は #1226 の既知 write 段 workaround。テスト `t238-election-record.test.ts:104` が現行バグ挙動(hyphen 形の `parseGoaLine` 失敗)をピン留め = 修正で assertion 反転必須。
- Per-intent record: `re-scans/260719-goa-multiseg-ecode.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260718-election-ts-foundation」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260719-goa-multiseg-ecode.md`。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は「GOA_HEAD_RE 複節拒否+corpus スパース様式乖離+蒸留 parse-only」の1クラスタのみで、これは bugfix の欠陥挙動であり構造・API・依存・技術スタックの変化を伴わない。フォーカス正本の区間変更は2件のみで parse schema 以外の本文と矛盾せず、詳細は per-intent record に集約済み。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260719-cursor-complete-clear)

- Date: 2026-07-19(Asia/Tokyo)
- Observed at: HEAD `a326f47bc0146a3b4285552f42b92fd61fb343a7`(`git rev-parse HEAD` 実測)
- Intent: `260719-cursor-complete-clear`([Issue #1248](https://github.com/amadeus-dlc/amadeus/issues/1248) — intent 完了後の active-intent カーソル残留により、完了済み intent のシャードへ無期限に監査追記が続くモグラ叩き)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`591b6a2a222357f41061128f1b5a93c7f7a877be`(全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小。`git merge-base --is-ancestor 591b6a2a2 HEAD` exit 0 実測、`git rev-list --count 591b6a2a2..HEAD`=**52**。base は 260717-state-mirror-fixes の observed に一致)、observed=`a326f47bc0146a3b4285552f42b92fd61fb343a7`。日付が新しい squash tip の非祖先 observed(`c2e4975ff` = 260718-election-ts-foundation、`594ba21d…` = 260718-hooks-config-conflict)は `--is-ancestor` exit 1 につき base 候補から除外(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)
- 測定 ref: 件数・行番号は observed HEAD `a326f47bc` の実ファイル直読、区間変更は `git log 591b6a2a2..HEAD -- <path>` で実測(measurement-ref-in-artifacts)。フォーカス面(カーソルライフサイクル・complete 経路・監査追記チェーン・フック群)の focus ファイル区間コミットは13件で **全13件が focus-hits=0**(`git show <sha> -- <focus files> | grep -icE` で機械計測)。区間の大宗は election TS 基盤 Bolt(#1227〜#1236)・swarm 三値化・codex hooks 分離でフォーカス面と非交差。
- 現行結論: **カーソルの set⇔clear 非対称が欠陥の核心**(symmetric-pair-review)。書き手は `setActiveIntentCursor`(`amadeus-lib.ts:1725-1733`、書込 `:1729`)と birth 時書込(`:2147`)の2箇所のみで、clear 経路はコードベースに不在。`handleCompleteWorkflow`(`amadeus-state.ts:1550-1680`)は status 前進(`:1668-1669` `updateIntentStatus`)のみでカーソルを触らず、完了 intent を指したまま残留する。監査追記チェーン全段(`appendAuditEntry`→`ensureAuditFile`→`auditFilePath`→`recordDir`→`activeIntent`)に status ゲートが無く、`activeIntent`(`:1059-1084`)は `records.includes(raw)`(`:1074`)のみで registry status を参照しない。追記到達フックは7つ(主犯 `mint-presence:73-74`)。欠陥は base 時点から現存し区間内退行なし。修正2案(エンジン側 complete 時 clear / フック側 status ゲート防御層)は requirements/選挙で確定。
- Per-intent record: `re-scans/260719-cursor-complete-clear.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260718-election-ts-foundation」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260719-cursor-complete-clear.md`、`architecture.md`(「active-intent カーソルの set⇔clear 非対称と監査ルーティング」節を新設 = 完了後シャード汚染の構造的機序)。**他 body 7成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識はカーソル set⇔clear 非対称と監査チェーンの status ゲート不在の構造的事実1点で、architecture.md へ集約。フォーカス面は既存構造の欠落(clear 経路不在)であり配置の追加・移動・品質評価の新規欠陥クラスタ導入を伴わない。cid:reverse-engineering:c1)
- Delivery boundary: 実装、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260718-election-ts-foundation)

- Date: 2026-07-19(Asia/Tokyo)
- Observed at: HEAD `c2e4975ff2abe0290d899fdbd04b856213175c7a`(`git rev-parse HEAD` 実測)
- Intent: `260718-election-ts-foundation`(選挙4類型ライフサイクルの決定的 TS 基盤 + user-invocable SKILL 薄ラップ。チーム内ツール・配布外(W-04)、ソロ選挙も輸送抽象で取込 = D-12。本 intent は ideation のみ)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`e9a001105`(全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小。`git merge-base --is-ancestor e9a001105 HEAD` exit 0 実測、`git rev-list --count e9a001105..HEAD`=**69**。base は 260717-swarm-dispatch-enum の observed に一致)、observed=`c2e4975ff2abe0290d899fdbd04b856213175c7a`。直前の鮮度ポインタが指した 260718-hooks-config-conflict の observed `594ba21d…` は `--is-ancestor`=**exit 1(非祖先)**の並行 squash tip につき base 候補から除外(cid:reverse-engineering:rescan-base-ancestry / re-timestamp-merge-resolution)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)
- 測定 ref: 件数・行番号は observed HEAD `c2e4975ff` の実ファイル直読、区間変更は `git log e9a001105..HEAD -- <path>` で実測(measurement-ref-in-artifacts)。フォーカス面(配布チャンネル/選挙 parse 資産/agmsg/mirror 前例/SKILL packaging/選挙ノルム)の区間変更は軽微(mirror 8行 = #1172 の `cd9865194`、norm メモリ追記のみ)。増分の大宗は codex-hooks 移行でフォーカス面と非交差。
- 現行結論: **反証課題「local overlay チャンネルが存在しない」は反証** — `contrib/skills/` overlay(`promote-self.ts:45-46,229-236`、ヘッダ :7-9)が正本→`.claude/skills`+`.agents/skills` を **dist 非対象**で投影(既存例 `amadeus-upstream-sync` = dist 0件・self-install 3件を `git ls-files` 実測)。W-04 整合の SKILL 配置経路。最有力実装前例は `scripts/amadeus-mirror.ts`(dist/投影いずれも非対象・`amadeus-lib` 決定的状態読取・判別ユニオン Result・exit code 契約)。GoA/PM parse 資産(`amadeus-norm-metrics.ts:157-161` + `parseGoaLine`:688/`parsePmCidLine`:704)は区間変更ゼロ・never-estimates で S-05 生成側と byte 互換の対(C-08)。選挙ノルム機械化対象=13 cid(In-Scope)、隣接6+は W-01/02/03 で out。ライフサイクル契約は区間無変更。
- Per-intent record: `re-scans/260718-election-ts-foundation.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260718-hooks-config-conflict」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260718-election-ts-foundation.md`、`architecture.md`(「contrib overlay 配布チャンネル(dist バイパス)」節を配布境界に新設)。**他 body 7成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は contrib overlay の存在1点のみ、他フォーカス面は区間無変更で本文と矛盾なし。cid:reverse-engineering:c1)
- Delivery boundary: 実装、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260718-hooks-config-conflict)

- Date: 2026-07-18(Asia/Tokyo)
- Observed at: HEAD `594ba21d636218558b711b371c286f16731fb081`（`git rev-parse HEAD` 実測）
- Intent: `260718-hooks-config-conflict`（[Issue #770](https://github.com/amadeus-dlc/amadeus/issues/770) — tracked `.codex/hooks.json` と agmsg monitor runtime state の所有権衝突。marker側は [PR #783](https://github.com/amadeus-dlc/amadeus/pull/783) で解決済み）
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定則）。base=`e9a001105d253e14affb77417423d9f0b0360f9e`（全 `re-scans/*.md` observed のうち HEAD の祖先で距離最小。`git merge-base --is-ancestor` exit 0、`git rev-list --count e9a0011..HEAD`=**8**）、observed=`594ba21d636218558b711b371c286f16731fb081`。Developer scan→Architect synthesisの直列に、外部 agmsg reader／writerの独立対称走査を追加。
- Focus: Codex `HOOK_WIRING`→example→active copy→trust reader、`promote-self` preserve、`run-codex.sh`／`team-up.sh`→agmsg shim／monitor、`delivery.sh`／SQLite JSON1 writer、mode reader、bridge restart、markerの現行不在、packaging／doctor／fixture／テスト空白。
- 測定 ref: HEAD三者は同一 blob `8eeff909b38467415fdd63a93631db74f91e5b4f`（1925 bytes／93 lines）。現 worktree active fileは2021 bytes／改行0／diff 1 insertion・93 deletionsで、Amadeus 9 commandを保持しagmsg SessionStart／SessionEnd各1件と絶対 pathを追加。base..observedは15 files・+842/-31だがフォーカス契約変更0件。agmsgはローカル実体1.1.7をread-only直読。
- 現行結論: root causeはtracked canonical activationとmutable per-machine runtime configが同じ`.codex/hooks.json`を所有すること。marker対策だけ、pretty-printだけ、Codex退役前提の運用だけでは恒久解にならない。active file untrack／ignoreとtracked static dispatcher + ignored sidecarは双方`【裁定待ち】`。
- Per-intent record: `re-scans/260718-hooks-config-conflict.md`
- 更新した成果物: `architecture.md`、`code-structure.md`、`component-inventory.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、本ファイル、per-intent record。`business-overview.md`は事業目的不変、`api-documentation.md`はrepository所有の公開契約が未裁定のため温存。
- Delivery boundary: 実装、外部 agmsg変更、main merge/rebase、Issue close、PR作成・更新は本scanで実施していない。既存dirty `.codex/hooks.json` と旧intent state/auditは変更していない。
- Baseの真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有timestampはrepo-level freshness pointerであり、次回差分baseの真実源にはしない。

## 実行メタデータ(履歴: 260717-swarm-dispatch-enum)

- Date: 2026-07-18(Asia/Tokyo)
- Observed at: HEAD `e9a001105d253e14affb77417423d9f0b0360f9e`(`git rev-parse HEAD` 実測)
- Intent: `260717-swarm-dispatch-enum`([Issue #1157](https://github.com/amadeus-dlc/amadeus/issues/1157) — `AMADEUS_USE_SWARM` の三値 enum 化 `unset`/`claude-ultra`/`codex-ultra` + Codex 通常経路のセッション内 native subagent 並列化。Mirror Issue #1182)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1)。base=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` observed のうち HEAD 祖先かつ距離最小。`git merge-base --is-ancestor 6495e03a12d9e7149c2e80b59f171a90607a2d2c HEAD` exit 0 実測、`git rev-list --count 6495e03a..HEAD`=**128**。rescan-base-ancestry)。日付が新しい squash tip の非祖先 observed は E-L63 に従い除外。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)
- Focus: `AMADEUS_USE_SWARM` 全数188(実コード読み取りゼロ・conductor SKILL prose 二値 dispatch)・三値化改修サイト(claude SKILL:61 / codex SKILL:57,171 / onboarding.fills.ts / kiro・kiro-ide 各1、opencode/cursor は SKILL 不在の欠落面)・referee 契約(`amadeus-swarm.ts` 789行、ステートレス prepare/check/finalize、driver 型 `DriverName` :88-89 は swarm 内に閉じる)・6監査イベント(`SWARM_*`、Fallback `driver="subagent"` ハードコード :293)・Codex exec per-unit worker 経路(`codex/SKILL.md:57,171` / `emit.ts:81`)・旧 driver stack 不在確認(`AMADEUS_SWARM_DRIVER` adapter/driver スタック未着地)・テスト9件・docs 契約(08-construction-and-swarm.md:201-213 / 17-skill-system.md)
- 測定 ref: 件数・行番号は observed HEAD `e9a001105` の実ファイル直読、区間変更は `git log 6495e03a..HEAD -- <path>` で実測(measurement-ref-in-artifacts)。swarm 正本 `amadeus-swarm.ts` の区間変更は0件。
- 現行結論: swarm 正本・SKILL invoke-swarm dispatch 指示・swarm テスト群は区間 `6495e03a..HEAD`(128コミット)で**区間変更ゼロ**。関心 seam の実行コード・構造・API・依存は実質無変更。`AMADEUS_USE_SWARM` はエンジンのコードパスに一切読まれず、すべて conductor 側 SKILL prose の二値(`== "1"`)dispatch 指示 — 三値 enum 化は主に SKILL prose と監査 driver 語彙・Fallback ハードコードの改修面。区間の実変更はいずれも本 intent フォーカス面外(CI リファクタ・coverage-patch-gate 新設・無関係な新テスト群)。既決 `cid:feasibility:c1-2`(Codex native subagent 並列成立・effort telemetry 観測不能)を適用。
- Per-intent record: `re-scans/260717-swarm-dispatch-enum.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260717-codekb-diff3-cleanup」→履歴ラベル化)、`re-scans/260717-swarm-dispatch-enum.md`。**codekb body 9成果物は全点温存**(churn 回避 — swarm 正本の区間変更ゼロ、再照合で本文との矛盾なし、cid:reverse-engineering:c1)。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260717-state-mirror-fixes)

- Date: 2026-07-18(Asia/Tokyo)
- Observed at: HEAD `591b6a2a222357f41061128f1b5a93c7f7a877be`(`git rev-parse HEAD` 実測、worktree = `origin/main` 一致)
- Intent: `260717-state-mirror-fixes`(bugfix batch: [Issue #1170](https://github.com/amadeus-dlc/amadeus/issues/1170) — set-status hook 経由の state.md 巻き戻り(checkbox `[-]` と Current Stage の lost-update)/ [Issue #1172](https://github.com/amadeus-dlc/amadeus/issues/1172) — `countStageProgress` が scope-SKIP を分母に混入)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` の observed のうち HEAD 祖先かつ距離最小。`git merge-base --is-ancestor 6495e03a... HEAD` exit 0、`git rev-list --count 6495e03a..591b6a2a`=126)。squash マージで feature tip が HEAD の非祖先になる新しい observed(`0b5e24f8` 等の squash tip 群)は `--is-ancestor` exit 1 につき除外(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)
- Focus: **#1170** — state.md 書込経路の全数列挙(11 hook grep で内容ライターは `.claude/hooks/amadeus-sync-statusline.ts:69-73` の set-status spawn が唯一)+ `handleSetStatus`(`amadeus-utility.ts:3666-3690`)の無ロック read-modify-write の race window 機序確定。**#1172** — `scripts/amadeus-mirror.ts:87-105` `countStageProgress` の SKIP 分母欠陥 + scope-SKIP の現行様式実測(`- [ ] <stage> — SKIP` 空 checkbox 形、format-currency-grep)
- 測定 ref: 件数・行番号は observed HEAD `591b6a2a2` の実ファイル直読(cid:measurement-ref-in-artifacts)。全 state 横断マーカー集計 `[ ] — SKIP`=717件 / `[ ] — EXECUTE`=70件 / `[x] — EXECUTE`=414件、`^- \[S\]` checkbox=**0件**(実コーパス不在)。区間 `6495e03a..591b6a2a`=126コミット
- 現行結論: **2欠陥の機序を確定**。#1170 は `handleSetStatus` が `withAuditLock` を取らず(エンジン RMW ハンドラは全て保護、`amadeus-state.ts:251-266`)、S0 スナップショット読み→全文上書きで engine の advance を lost-update する。audit 非 emit のため巻き戻りは state.md のみ = Issue 症状と一致。set-status は intent フラグなしで active intent に解決し set-status 同士も相互 lost-update。#1172 は分母除外条件が checkbox `[S]`(実コーパス0件の runtime jump marker)のみで、実 scope-SKIP 様式 `[ ] — SKIP`(717件)が `total++` に混入(18/32 を返す、期待 18/18)。checkbox(実行状態)と suffix(計画)の直交2フィールドを混同したのが根本原因。テスト空白2件(t232 が捏造 `[S]` fixture で偽 green / t145 は set-status 経路 concurrency 未カバー)
- Per-intent record: `re-scans/260717-state-mirror-fixes.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260717-codekb-diff3-cleanup」→履歴ラベル化)、`re-scans/260717-state-mirror-fixes.md`、`code-quality-assessment.md`(#1170/#1172 の2欠陥 + 2テスト空白の観測節を新設、旧「最新」= swarm-driver-migration marker を履歴へ降格 cid:reverse-engineering:c3-relabel)。**他7 body 成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は全点温存**(churn 回避 — Focus seam の state ロック機構・core 中立層/表層境界は区間126コミットで不変。cid:reverse-engineering:c1)
- Delivery boundary: main merge/rebase、Issue close、GitHub 上のレビュー作成・更新操作は本 scan で実施していない。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260717-codekb-diff3-cleanup)

- Date: 2026-07-18(Asia/Tokyo)
- Observed at: HEAD `0b5e24f8ffeecb6648639adf4a8b1a257084efac`(`git rev-parse HEAD` 実測)
- Intent: `260717-codekb-diff3-cleanup`([Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129) — 共有 CodeKB 2ファイルへ孤立した diff3 base sentinel と旧「最新」ヘッダ断片の branch hygiene)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- 手法: diff-refresh(cid:reverse-engineering:c1)。base=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` の observed のうち HEAD 祖先かつ距離最小。`git merge-base --is-ancestor 6495e03a... HEAD` exit 0、`git rev-list --count 6495e03a..HEAD`=126)。次点祖先 `cf3dc88b...` は距離191、日付が新しい `46f51091...` は非祖先(exit 1)のため除外。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)
- Focus: 修正前 `9313fae4c...`、修正 commit `5e92d1516...`、`origin/fix/1027-state-set-fail-closed`、observed HEAD、`origin/main` の5 refで対象2ファイルを比較し、4 conflict marker語彙(`<<<<<<<` / `|||||||` / `=======` / `>>>>>>>`)と「最新」H2を全数走査。修正commitは2ファイル・4行削除でfix branchの祖先だが、HEAD/mainの祖先ではない。一方、HEAD/mainの対象2ファイルは同一で、4語彙はいずれも0件、「最新」H2は各1件。
- 測定 ref: 件数は上記各 git refへの `git show <ref>:<file> | awk`、系統は `git merge-base --is-ancestor`、内容同一性は `git diff --exit-code HEAD origin/main -- <file>` で実測。Issue は OPEN、`bug` / `P3` / `S4-MINOR` / `in-progress:amadeus`。
- 現行結論: 実行コード、構造、API、依存、technology stack、品質機構の変更はない。`amadeus-worktree.ts:549-568` は Git の `CONFLICT (` と unmerged indexだけを扱い、`tests/e2e/t03.test.ts:186-216` は通常merge conflictの検証で、孤立diff3 sentinel専用fixtureはない。既決 `cid:reverse-engineering:diff3-marker-vocab` を適用し、新規設計判断は導入しない。
- Per-intent record: `re-scans/260717-codekb-diff3-cleanup.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260717-mirror-issue-tool」→履歴ラベル化)、`re-scans/260717-codekb-diff3-cleanup.md`。他8 body成果物は全点温存(churn回避 — 実行コード・構造・API・依存に変化なし、cid:reverse-engineering:c1)。
- Delivery boundary: main merge/rebase、Issue close、GitHub上のレビュー作成・更新操作は本scanで実施していない。content cleanとfix commitの系統着地は別事実として追跡する。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260717-mirror-issue-tool)

- Date: 2026-07-17
- Observed at: HEAD `3d89916e6eb70f5d34683f8a7141ce1afe33d4b4`(`git rev-parse HEAD` 実測、conductor 本線 — scan-notes 参照)
- Intent: `260717-mirror-issue-tool`(`scripts/amadeus-mirror.ts` — intent を GitHub Issue へミラーする create / sync / close ツール)
- Scope: `amadeus`
- 手法: diff-refresh(cid:reverse-engineering:c1)。base=`6495e03a`(全 re-scans observed のうち HEAD 祖先・距離最小 dist=107 — rescan-base-ancestry、非祖先 observed `8e8cc9b1`/`5761e65c`/`6a23b0ec` は squash tip につき除外)。Developer スキャン→Architect 合成の直列(c3、再照合7点全一致・訂正なし)
- Focus: `amadeus-runtime.ts summary --json` 出力契約(`RuntimeSummary` :916-941、intent slug/record パス/Issue 番号を非含有)・intents.json 読み書き(`IntentRegistryEntry` :1548-1567 / `updateIntentStatus` :1930-1954 / `readIntentRegistry` :1615-)・park の機械可読表現(amadeus-state.md `## Runtime State` の Parked 2フィールド :607-636、intents.json は不変)・state parser(`getField` :3588-3599)・兄弟 CLI 様式(metrics-timeseries.ts main :188/import.meta.main :236、scripts lint/typecheck 自動配線 biome.json:41+tsconfig.json:19)・gh CLI 前例(repo 内不在=新規導入者)・完了2シグナル(:1652-1667)
- 現行結論: 関心 seam の canonical は区間107コミットで実質無変更。`summary --json` は集計カウントのみで intent 名・record リンク・Issue 番号を持たず、状態行の材料は intents.json + record ディレクトリ名 + state.md から別途取得が必要。park は intents.json に痕跡を残さず state.md の Parked フィールドが唯一の機械判定。gh 呼び出しは repo 内前例なく新規導入。close の機械検査 = intents.json status==complete または state.Status==Completed(human-confirmed complete-workflow 経由のみ書かれる)
- Per-intent record: `re-scans/260717-mirror-issue-tool.md`
- 更新した成果物: 本ファイル(鮮度ポインタ+旧「最新: 260716-teamup-resume-size-drift」→履歴ラベル化)、`re-scans/260717-mirror-issue-tool.md`。**codekb body は全点温存**(churn 回避 — 関心 seam の canonical は区間無変更、再照合で本文との矛盾なし。cid:reverse-engineering:c1)
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260716-teamup-resume-size-drift)

- Date: 2026-07-16
- Observed at: HEAD `5761e65ce73a82b055590a50f483161e5df2abca`(`git rev-parse HEAD` 実測、conductor 本線 — scan-notes 参照)
- Intent: `260716-teamup-resume-size-drift`(Issue #1081 — t-team-up-codex-resume の wall-clock drift。E-1081-FIX 裁定 C: size: large 宣言(PR #1090 着地済み)+短縮別 Issue #1087)
- Scope: `bugfix`
- 手法: diff-refresh(cid:reverse-engineering:c1)。base=`6495e03a`(全 re-scans observed のうち HEAD 祖先・距離最小 86 — rescan-base-ancestry、非祖先 observed は除外)。Developer スキャン→Architect 合成の直列(c3、再照合7点全一致)
- Focus: 対象テストの size/covers ヘッダ不在・test-size.ts の宣言パース(:279-291)と drift 上方向専用(:117)・run-tests.ts の観測専用出力(:915-923)・t-test-size-drift.test.ts の guard/purity・#1077 前例形
- 現行結論: 宣言不在ゆえ static=medium が effectiveDeclared となり実測 large 帯(3実行系 31.3〜32.5s、修正時までに7点)と乖離 — 最上部 `// size: large` 1行で drift 消滅(strictly-greater 機構)。全ゲートは宣言<static 方向専用のため large 宣言で赤化なし
- Per-intent record: `re-scans/260716-teamup-resume-size-drift.md`
- 更新した成果物: 本ファイル(鮮度ポインタ+旧「最新: 260716-github-issue-912-tests-s」→履歴ラベル化)、`re-scans/260716-teamup-resume-size-drift.md`。**codekb body は全点温存**(churn 回避 — test-size 専用節は不在、size 機構3ファイルは区間 86 コミットで不変、1行 bugfix。cid:reverse-engineering:c1)
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260716-github-issue-912-tests-s)

- Date: 2026-07-16
- Observed at: HEAD `8e8cc9b14d9c21e3e8282e3fdb6ae30db7f0f478`(`git rev-parse HEAD` 実測)
- Intent: `260716-github-issue-912-tests-s`(Issue #912 — t05 planted-failure ケースが高負荷ホストで `--parallel 4` 下 120005ms タイムアウト間欠 FAIL、labels=`bug / P3 / S4-MINOR`。単独実行では 28 pass/0 fail、負荷収束後の再 `--ci` は PASS。「実行コード変更なし、負荷起因」の見立て)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`e55cc25143717d84b3e7f1a543151f0b7c99b96f`(祖先性 `git merge-base --is-ancestor` exit 0 実測、距離=**37**、祖先かつ距離最小の指定 base を採用)、observed=`8e8cc9b14d9c21e3e8282e3fdb6ae30db7f0f478`(`git rev-parse HEAD` 実測一致)。**フォーカス3ファイル(`tests/smoke/t05-run-tests-parallel.test.ts`・`tests/run-tests.ts`・`tests/run-tests.sh`)の区間 diff は空** — 観測面は base..HEAD の37コミット区間で一切変化しておらず、現行 worktree の行番号は Issue #912 実測(2026-07-11)時点とバイト同一。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260716-github-issue-912-tests-s.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: t05 planted-failure ケース(test 8 = L411-438、`PER_TEST_TIMEOUT=120000` L161、入れ子 spawn `run()` L104-125/`spawnSync` L113、二重 spawn bun→bash→bun×2)・run-tests.ts 並列制御(`args.parallel` 既定1 L163、`runFileBand` L839-862、テスト子 spawn timeout なし L653-657、負荷適応 seam NONE FOUND)・先行修正3クラス(#819 e2e 移設/#831 lock 隔離/#877 キャッシュリセット、参考 #741)・E-L71(fanout-load-settle)の seam 不在
- 現行結論: t05・テストランナー本体・並列制御の実行コードは区間37コミットで不変。120s 予算超過は spawnSync のプロセスタイムアウトではなく**外側 bun の per-test timeout**(L161)で、内側 run-tests.sh 再帰の cold bun 起動 ×2 直列化が高負荷 CPU 待ちで伸びる構造。負荷適応 seam(load-average/nice/並列度 env 上書き/収束待ち)は皆無。修正3案評価 = 案C(test 8 フィルタを planted 単独へ最小化し入れ子コスト半減、L422-428 の1行 diff、契約完全保存)を本命、案A(timeout の env seam)を安全網併用、案B(#819 型 tier 隔離)は前例強だが構造分散コスト。最終選択は requirements/選挙で確定。
- Per-intent record: `re-scans/260716-github-issue-912-tests-s.md`
- 更新した成果物: `code-structure.md`(「t05 並列フレーク観測面 — 260716-github-issue-912」節を H1 直後に新設 = planted-failure 機序 / 並列制御の実態 / 先行修正3クラス / 修正3案評価。旧「最新」= parser/checkbox 欠陥面(260715-parser-checkbox-fixes)節見出しの「最新」→「履歴」降格(main 反映時点の最新節。harness port 節は既に履歴) cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ + 旧「最新: 260715-parser-checkbox-fixes」→履歴ラベル化)、`re-scans/260716-github-issue-912-tests-s.md`(per-intent re-scan 記録)。他 body 成果物(architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment の7点)は base→observed でフォーカス面と無関係、かつ区間 diff 空で構造不変のため温存(churn 回避、cid:reverse-engineering:c1)。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ（履歴: 260715-parser-checkbox-fixes）

- Date: 2026-07-16
- Observed at: `git rev-parse HEAD` = `6495e03a12d9e7149c2e80b59f171a90607a2d2c`
- Intent: `260715-parser-checkbox-fixes`（bugfix。#1013 practices-promote parseRules が ALWAYS/NEVER 契約を検証せず散文行を project.md へ append / #1015 scope-change checkbox 再構築の三項が6→4状態崩落＝awaiting-approval・revising が pending へ退行＋再構築ヘッダの4状態 drift）
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`（2.1）
- 手法: diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定2則）。base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`（リーダー割当。全 `re-scans/*.md` の observed のうち HEAD 祖先で距離最小=65。`git merge-base --is-ancestor cf3dc88 HEAD`=exit 0、`git rev-list --count`=65 を実測で裏取り）、observed=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`（`git rev-parse HEAD` 実測一致）。共有 timestamp 前 pointer の canonical-settings observed `e55cc25143717d84b3e7f1a543151f0b7c99b96f` は `--is-ancestor`=exit 1（非祖先・並行 intent）につき base 候補から除外。区間65コミットにフォーカス欠陥の修正は存在せず、両欠陥は observed に現存。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260715-parser-checkbox-fixes.md`。
- 実施体制: Developer（スキャン）→ Architect（合成）の2サブエージェント直列（cid:reverse-engineering:c3）
- Focus: #1013 `amadeus-state.ts:2556-2561`（parseRules、区間無変更で欠陥貫通。呼び出し元は handlePracticesPromote の :2570/:2571 のみ、stage 契約 `practices-discovery.md:101`）・#1015 `amadeus-utility.ts:3228-3230`（handleScopeChange 三項の6→4崩落）＋副次 drift `:3238`（再構築ヘッダ4状態、正本テンプレ :2748 は6状態）・状態型正本 `amadeus-lib.ts:58` CheckboxState / `:60-67` CHECKBOX_MAP / `:69-76` CHECKBOX_REVERSE / `:3395` parseCheckboxes（6状態復元）/ `:3435` CHECKBOX_MAP 正準経路。手書き marker 構築サイト2箇所（`utility.ts:3229` 欠陥 / `:2656` 良性 init）
- 現行結論: #1013 / #1015 とも observed HEAD で未修正・現存。両欠陥とも既存テスト未カバー（t75 は ALWAYS/NEVER 整形済み fixture のみ、t194 は別関数 handleRecompose を検査）。編集正本は `packages/framework/core/tools/`（`.claude/tools/*` と byte 同一）。codekb の本 intent 観測面に stale 記述は検出されず。
- Per-intent record: `re-scans/260715-parser-checkbox-fixes.md`
- 更新成果物: `code-structure.md`（「parser/checkbox 欠陥面の観測」節を先頭新設＋前「最新」= canonical-settings 節を履歴ラベル化 cid:reverse-engineering:c3-relabel）、本ファイル（鮮度ポインタ＋「最新: 260709-canonical-settings」→履歴ラベル化）、`re-scans/260715-parser-checkbox-fixes.md`（per-intent re-scan 記録）。他成果物（architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment）は両欠陥が挙動欠陥で構造変化を伴わず、base→observed でフォーカス面外に破壊的変化がないため温存（churn 回避、cid:reverse-engineering:c1）。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ(履歴: 260715-opencode-cursor-harness)

- Date: 2026-07-16
- Observed at: HEAD `6a23b0ec2498915532ab40930f82cc7744aa15b7`(`git rev-parse HEAD` 実測)
- Intent: `260715-opencode-cursor-harness`(Issue #626 — opencode / Cursor harness port。既存4 harness の packaging seam・installer 閉じ列挙・doctor/version 依存性・runner-gen・promote:self・docs 面を調査し、新ハーネス2種を最小差分で追加する開放性を確定する)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`(前 intent 260713-swarm-driver-migration の observed。全 `re-scans/*.md` observed の HEAD 祖先性を `git merge-base --is-ancestor` で走査し、祖先のうち距離最小=**65** を採用)、observed=`6a23b0ec`。祖先性実測済み(exit 0)。`git diff --stat origin/main HEAD -- ':!amadeus/'` は空 = HEAD と origin/main の差は record コミット(`amadeus/` 配下)のみで source 面完全一致。フォーカス面の file:line は observed HEAD 実コード直読で確定。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: packaging seam(`scripts/package.ts` discoverHarnessNames:68-73 / `manifest-types.ts:79-122` HarnessManifest 全フィールド)・既存4 harness の manifest+emit 対比(Claude/Kiro 型 vs Codex 型)・promote:self(`promote-self.ts:37-41` managedDirs ハードコード)・version/doctor 依存性(`amadeus-utility.ts:243-245` version 非依存 / `:676,:696` doctor `.claude` 専用ブロック / `:857` otherTrees / `:2000-2006` SCAN_EXCLUDE)・runner-gen(`amadeus-runner-gen.ts:60,63` `<harnessDir>/skills/` / skipRunnerGen)・閉じ列挙9ファイル台帳(installer 5必須:harness.ts:9,19-24 / engine-layout.ts:8-12 / reporter.ts:24-25,137 / setup-harness.test.ts:13)・docs 面(README 対応表 4→6 + harnesses/ ガイド×2言語)
- 現行結論: packaging seam は完全 open-set(manifest 1本 + 任意 emit.ts で package.ts 無編集ビルド、dist:check 自動対応)。新ハーネスは Claude/Kiro 型(薄 manifest)か Codex 型(emit.ts)の2系統に分かれ、系統は skills/agents/hooks 探索規約で決まる。閉じ列挙で手動追記が要るのは installer 5(正しさ必須)+ runtime/migrate/advisory 3 + self-install 1 = 9ファイル。promote:self は新ハーネス非自動対応(dogfood 判断)、doctor は `.claude` 専用ブロック + advisory 劣化のみで新ハーネス動作。区間65コミットはフォーカス面のハーネス開放性契約を一切変えていない。
- Per-intent record: `re-scans/260715-opencode-cursor-harness.md`
- 更新した成果物: `code-structure.md`(「harness port 開放性の観測面」節を先頭新設 = open-set 3層 / 閉じ列挙9ファイル台帳 / promote:self 非自動 / doctor advisory 劣化 / 最小ファイル集合。旧「swarm driver 変更面の配置境界」節見出しの「最新」→「履歴」降格 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ + 旧「最新: 260713」→履歴ラベル化)、`re-scans/260715-opencode-cursor-harness.md`(per-intent re-scan 記録)。他 body 成果物(architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment の7点)は base→observed で本 intent 観測面(packaging 開放性・閉じ列挙)と無関係、かつ区間65コミットで構造不変(scan-notes フォーカス面8実測)のため温存(churn 回避、cid:reverse-engineering:c1)。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ（履歴: 260709-canonical-settings）

- Date: 2026-07-16
- Observed at: `git rev-parse HEAD` = `e55cc25143717d84b3e7f1a543151f0b7c99b96f`
- Intent: `260709-canonical-settings`（#623: Amadeus 共通の既定挙動を型付き canonical settings＝1正本へ集約する基盤。現状 CLI フラグ `--depth`/`--test-strategy`・env `AMADEUS_DEFAULT_SCOPE`・state `Construction Autonomy Mode` の3系統に分散した設定を統合）
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`（2.1）
- 手法: diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定2則）。base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`（前 intent `260713-swarm-driver-migration` の observed。全 `re-scans/*.md` の Observed commit を `git merge-base --is-ancestor` で走査し、HEAD の祖先である候補のうち `git rev-list --count` が最小＝距離58 を採用）、observed=`e55cc25143717d84b3e7f1a543151f0b7c99b96f`（`git rev-parse HEAD` 実測一致）。区間58コミット（519 files, +98136/-1659、主因は upstream-v2 移行 `amadeus-migrate.ts` +3823行新規と移行テスト大量追加）に**本 intent 関連の新規機構は存在せず**、設定土台（doctor row 構造・stage-schema 厳格 parse 様式・amadeus-lib の JSON ロード様式・`AMADEUS_DEFAULT_SCOPE` precedent）は base 時点で確立済み。フォーカス面は observed HEAD 実コード直読で file:line 確定。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260709-canonical-settings.md`。
- 実施体制: Developer（スキャン）→ Architect（合成）の2サブエージェント直列（cid:reverse-engineering:c3）
- Focus: 設定配置（`amadeus/spaces/default/` 直下に設定ファイル不在・`.gitignore:47-58` はどのパターンでも新設 settings を ignore しない）・doctor 統合（`DoctorCheck{pass,label,fix?}` `amadeus-utility.ts:407-411`、`handleDoctor:676`、`process.exit(failed>0?1:0):1958`、`AMADEUS_DEFAULT_SCOPE` row:875-892 が雛形）・parse 様式（厳格＝`amadeus-stage-schema.ts` 判別ユニオン `{valid,data}｜{valid,errors[]}`:55-57/`unknown key:`:163 対 寛容＝`amadeus-rule-schema.ts` throw:69,72/未知キー許容:39）・JSON ロード（`readIntentRegistry` `amadeus-lib.ts:1496-1509`、`writeFileAtomic`、`AMADEUS_*` env-seam `amadeus-graph.ts:307`）・共通挙動設定の3系統分散（CLI フラグ/`AMADEUS_DEFAULT_SCOPE`/`Construction Autonomy Mode`、重複記述なし）・dist 同期（正本 `packages/framework/core/tools/` `package.ts:56-57`、`promote:self`、`dist:check`/`promote:self:check`）・env var 責務境界（約40 `AMADEUS_*` の唯一の挙動既定 precedent＝`AMADEUS_DEFAULT_SCOPE`、settings.json env 由来 `amadeus-utility.ts:871`）
- 現行結論: `settings.json` 相当の型付き canonical settings ファイルは製品に**未実装**（実装0件）。設定の3系統分散は現存し、`AMADEUS_DEFAULT_SCOPE`（settings.json env → env var → ツール読み）が canonical settings チャネルの唯一の既存 precedent。設定土台（parse/JSON/doctor/dist 同期）は base 時点で確立済みで区間内に破壊的変化なし。codekb の本 intent 観測面に stale 記述は検出されず。
- Per-intent record: `re-scans/260709-canonical-settings.md`
- 更新成果物: `code-structure.md`（「canonical settings 観測面」節を先頭新設 = フォーカス面1〜7 の要点を file:line 付き転記）、本ファイル（鮮度ポインタ + 「最新: 260713-swarm-driver-migration」→履歴ラベル化 cid:reverse-engineering:c3-relabel）、`re-scans/260709-canonical-settings.md`（per-intent re-scan 記録）。他成果物（architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment）は Developer が本 intent 観測面で stale なしと判定し、base→observed で構造変化・挙動欠陥を伴わないため温存（churn 回避、cid:reverse-engineering:c1）。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ（履歴: 260713-swarm-driver-migration）

- Date: 2026-07-13
- Observed at: 2026-07-13T07:57:31Z
- Intent: `260713-swarm-driver-migration`（`AMADEUS_SWARM_DRIVER` 新設、`AMADEUS_USE_SWARM` の0.1.x互換移行、Claude Agent Teams／Ultra Code、Codex Ultra、Kiro subagent の決定的選択・監査・live proof）
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`（2.1）
- 手法: diff-refresh。base=`13598b752b656cc9bbf5d931f8e3a6c34881fd1c`、observed=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`、距離49 commits。全 `re-scans/*.md` の Observed commit を `git merge-base --is-ancestor` で検査し、HEAD の祖先である候補のうち距離最小を採用した。`c11554226542faabd2a6c694650ea26323745ed8` は現 HEAD の非祖先であり除外した。
- 実施体制: Developer code scan → Architect synthesis の2サブエージェント直列
- Focus: engine eligibility、driver-neutral `invoke-swarm`、harness conductor の fan-out、Claude／Codex／Kiro の process／live-tool 境界、stateless referee、worktree／Bolt／audit、`scripts/package.ts`／`promote-self.ts`、決定的 selector matrix、capability probe、explicit hard error、auto loud fallback、driver-aware audit、4 driver の2 Unit以上 live proof
- 現行結論: `AMADEUS_SWARM_DRIVER` の製品実装は0件。現行 driver 選択は harness skill prose に分散し、referee は AI dispatcher ではない。#841 の batch progress、package source-side unreferenced scan、dist root orphan blind spot は解消済み。
- Per-intent record: `re-scans/260713-swarm-driver-migration.md`
- 更新成果物: `business-overview.md`、`architecture.md`、`code-structure.md`、`api-documentation.md`、`component-inventory.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、本ファイル、および per-intent record。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ(履歴: 260712-metrics-observation)

- Date: 2026-07-12
- Intent: `260712-metrics-observation`(既存計測経路 — CCN 分布・テスト数・カバレッジ% — の出力をコミット snapshot に保存する観測機構、#921)
- Scope: `feature`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/engineer-2`(branch `intent/921-metrics-observation`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定2則)。base=`13598b752b656cc9bbf5d931f8e3a6c34881fd1c`(前 intent `260711-docs-repair-batch9` の observed。全 re-scan observed の HEAD 祖先性を `git merge-base --is-ancestor` で判定し、祖先のうち距離最小=56 を採用。非祖先2件 `11c52f153`/`d6375bba6` は squash 別 SHA で除外)、observed=`c11554226542faabd2a6c694650ea26323745ed8`(`git rev-parse HEAD` 実測)。フォーカス面(snapshot 再利用 seam)は observed HEAD 実コード直読で file:line 確定、base→observed diff で ideation feasibility 前提の現存を検証。フォーカス面の export シグネチャは全て base と不変(実コード触は `tests/lib/coverage-normalize.ts` の #876 closing-only strip のみで export byte 同一)。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260712-metrics-observation.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `tests/complexity-gate.ts`(CCN seam: `runLizard:151`/`MEASUREMENT_ROOTS:43`/`CCN_BLOCK_THRESHOLD:35`/`CCN_WARN_FLOOR:36`/`parseLizardCsv:128`/`evaluateComplexity:241`、`python3 -m lizard` spawn 前提)・`tests/run-tests.ts`(カバレッジ機械可読出力 `writeCoverageTotalsJson:610`→`coverage/coverage-totals.json`、`collectCoverageTotals:538` 非 export、テスト数は `printSummary:899` の stdout print のみ=機械可読 seam 不在)・`tests/lib/coverage-normalize.ts`(`normalizeCoverageReport:273`/`computeStrippableLines:79` export)・`.github/workflows/ci.yml`(`contents:read` :23-24)/`release.yml`(`contents:write` :48、GITHUB_TOKEN push 非トリガー前例 :15-16)・`scripts/package.ts`(dist コピー源 CORE/HARNESS のみ :57-58 = scripts/tests は C2 対象外)・`.gitignore`(`coverage/` :30)
- 更新した成果物: `code-structure.md`(「計測 seam 台帳 — metrics-observation の観測面」節を先頭新設 = export 状況・非 export ギャップ・CI 権限前例・配置規約の seam 台帳)、本ファイル(鮮度ポインタ + 「最新: 260711-docs-batch10」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260712-metrics-observation.md`(per-intent re-scan 記録)。他成果物(architecture / code-quality-assessment / business-overview / api-documentation / component-inventory / technology-stack / dependencies)は base→observed で本 intent 観測面(既存 seam の再利用面)と無関係、かつ挙動欠陥・構造変化を伴わないため温存(churn 回避、cid:reverse-engineering:c1)。テスト数の機械可読 seam 不在のみ既知ギャップとして functional-design へ持ち越し。

## 実行メタデータ(履歴: 260711-docs-batch10)

- Date: 2026-07-12
- Intent: `260711-docs-batch10`(documentation 4件 — #765 `set-skeleton-stance` verb が `docs/` 全体で未記載 / #764 `orchestrate next --new-intent` フラグが `docs/reference/` で未記載 / #763 `docs/reference/18-workspace-layout.md` の `.ja.md` ペア欠落 / #728 `tests/` 13ファイル・14参照の `assertNotSiblingWorktree` stale コメント参照=product は `resolveWorktreeAnchor` へ改名済み)
- Scope: `documentation`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-2`(branch `intent/p3-cleanup-batch5`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1、E-L63 の base 選定2則)。base=`60f5e1edf472517c5fc2b4a1c388dd9a5030446c`(前回 intent `260711-p3-cleanup-batch8` の observed。re-scans 記録の observed を `git merge-base --is-ancestor` で走査し、HEAD 祖先のうち距離最小=64 を採用)、observed=`d6375bba68f415ce1a31e9a4d70e07fbfe80be85`(`git rev-parse HEAD` 実測)。本バッチは restart-loss ではなく起票時からの docs ギャップ(および tests の stale コメント)であり、区間 `base..observed` の docs/tests diff に4欠陥トークンは不在=区間で未変化のまま observed に現存(E-L53 3点法の (b)(c) を実測、(a) 元修正対照は非該当)。フォーカス4 Issue の file:line は現行 HEAD の実コード直読・grep で確定。base/observed の真実源は本 intent の `re-scans/260711-docs-batch10.md` および `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `docs/`(#765 grep 0件、正準ページ `docs/reference/12-state-machine.md`)・`docs/reference/`(#764 grep 0件、正準ページ `docs/reference/03-orchestrator.md`)・`docs/reference/18-workspace-layout.md`(#763、`.ja.md` 欠落=全20ファイル中の唯一欠落)・`tests/`13ファイル14参照(#728、旧名 stale)。source 側の真実: `amadeus-state.ts:371/:445/:518`(set-skeleton-stance)・`amadeus-orchestrate.ts:321/:336/:375/:1427`(--new-intent)・`amadeus-worktree.ts:167`(resolveWorktreeAnchor)
- 更新した成果物: `code-quality-assessment.md`(本 intent の documentation 4欠陥横断節を先頭新設 + 先頭バナーの「最新」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)、`re-scans/260711-docs-batch10.md`(per-intent re-scan 記録)。他成果物(architecture / business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は base→observed で本 intent 観測面(docs/tests のコメント・ペア面)と無関係のため温存(churn 回避)。

## 実行メタデータ(履歴: 260711-docs-repair-batch9)

- Date: 2026-07-11
- Intent: `260711-docs-repair-batch9`(docs/harness 修理バッチ第9弾 — #812 kiro-ide SKILL.md の kiro CLI 版 byte-copy / #824 onboarding.fills.ts の kiro CLI 表記残存 + guide_pointer 誤指し / #680 sensor-type-check の self-contained ヘッダと実 import の矛盾 / #885 normalizeWorktreeSlug 喪失 restart-loss / #886 phase-check ゲート喪失 restart-loss)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-1`(branch `intent/docs-repair-batch9`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`b845478bbf25a534a59f97f18e5a4a2a5a4e239c`(前回 bughunt-fix-batch RE observed。全 re-scan observed 候補の HEAD 祖先性を判定し最短距離59の最新祖先を採用)、observed=`13598b752b656cc9bbf5d931f8e3a6c34881fd1c`(現 HEAD = origin/main)。**#812/#824/#680 の欠陥3ファイルは区間内無変更で欠陥が区間を貫通して現存**、**#885/#886 の lib/state/worktree は区間内で #880(`c4304edf4` flip 配線)・#869(`aac1869e4` jump per-phase)の行番号シフトを受けたが欠陥自体(normalizeWorktreeSlug 喪失 / phase-check ゲート喪失)は未修復で残存**。Always-rerun-for-freshness は差分実測(区間内変更の有無 + 現行 file:line の grep 0件確認)で満たした。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `harness/kiro-ide/skills/amadeus/SKILL.md:14,84`(#812)+ `question-rendering.md:1,11`(#812 同根候補)・`harness/kiro-ide/onboarding.fills.ts:1,15,17,26,30` + `manifest.ts:93`(#824)・`core/tools/amadeus-sensor-type-check.ts:4-5,89`(#680)・`core/tools/amadeus-lib.ts:2099,2430,2580` + `amadeus-worktree.ts:39,195` + `amadeus-state.ts:248,250`(#885)・`core/tools/amadeus-state.ts:101,114,1104,1333,1428,1670` + `amadeus-jump.ts`/`amadeus-orchestrate.ts`(#886)
- 更新した成果物: `code-quality-assessment.md`(本 intent のフォーカス5欠陥現存確認節を先頭新設 + question-rendering.md localize 漏れの #812 未カバー候補記録 + 先頭バナー/batch5 節「本 intent」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`architecture.md`(restart-loss 系統節「docs-repair-batch9 の観測面」新設 + core-repair-batch3 バナー「最新」降格・「本 intent」履歴ラベル化)、`code-structure.md`(restart-loss フォーカス面の区間構造変化節 = #880/#869 の flip 再構築を新設)、`component-inventory.md`(docs/harness 修理コンポーネント節新設)、本ファイル(鮮度ポインタ)。他成果物(business-overview / api-documentation / technology-stack / dependencies)は本 intent 観測面と無関係のため温存(churn 回避、cid:reverse-engineering:c1)。

## 実行メタデータ(履歴: 260711-p3-cleanup-batch8)

- Date: 2026-07-11
- Intent: `260711-p3-cleanup-batch8`(P3 修理7件 — #843 stage-protocol.md persona 注入残存 / #846 sensor・validate ツールの無条件 main() import 副作用 / #850 audit-fork one-shot ガードの復活拒否 / #851 issue-ref-contract.md 全面不在 / #876 computeStrippableLines の brace-only 行 strip 漏れ / #877 run-tests バッチ時の persist seam 分離不全 / #878 orchestrate default 出口の recordEngineError 非配線)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/batch-c-learnings-audit`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`9738580ef`(re-scans 最新 observed 由来)、observed=`60f5e1edf`(現 HEAD)。差分区間 `9738580ef..60f5e1edf`(294 files, +25889/-3508)。restart-loss 4件(#843/#846/#850/#851)の欠陥ファイルは区間内で一切未変更(`git diff --name-only` grep = NONE)で base 時点の既存欠陥、#876/#877/#878 は区間内で導入・変更された面。フォーカス7 Issue の file:line は現行 HEAD の実コード直読で再確定。base/observed の真実源は本 intent の `re-scans/260711-p3-cleanup-batch8.md` および `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `core/amadeus-common/protocols/stage-protocol.md:611-614`(#843)・`core/tools/amadeus-sensor-required-sections.ts:229` + `amadeus-sensor-upstream-coverage.ts:111` + `amadeus-validate.ts:305`(#846、参照実装 `amadeus-learnings.ts:916`)・`core/tools/amadeus-audit.ts:471-475`(#850)・`harness/<name>/skills/amadeus/references/issue-ref-contract.md`(#851、不在)・`tests/lib/coverage-normalize.ts:40/:117/:126-132/:135`(#876)・`tests/run-tests.ts:692` + `tests/unit/t-learnings-persist-seam.test.ts:40-61`(#877)・`core/tools/amadeus-orchestrate.ts:2995-3001` + `recordEngineError:195`/配線 `:3017`(#878)
- 更新した成果物: `code-quality-assessment.md`(本 intent の修理7件横断分類節を先頭新設 + 先頭バナー/batch5 節見出しの「最新/本 intent」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`architecture.md`(「orchestrate エラー監査経路の部分配線(#879/#878)」構造節を新設 + 先頭バナー履歴化)、本ファイル(鮮度ポインタ)、`re-scans/260711-p3-cleanup-batch8.md`(per-intent re-scan 記録)。他成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は base→observed で本 intent 観測面と無関係のため温存(churn 回避、前回 RE と同判断)。

## 実行メタデータ(履歴: 260711-p2-repair-batch7)

- Date: 2026-07-11
- Intent: `260711-p2-repair-batch7`(restart-loss クラス5バグ — #834 orchestrate parked 短絡が `--new-intent` 非検査 / #839 orchestrate トップレベル catch・error 分岐が ERROR_LOGGED 非配線 / #844 doctor workspace-shell-ready の2状態判定+一律 fix 文言 / #845 log-subagent 完了 intent ゲート不在+agent_type 空文字素通し / #849 learnings readRuntimeStageRow の runtime-graph 欠落 hard fail=自己修復せず)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-2`(branch `intent/p2-repair-batch7` = origin/main ベース)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`d8de2362b`(最新祖先 observed = 260710-p3-cleanup-batch5)、observed=`37ad36a97`(`git rev-parse HEAD` 実測)。区間 `d8de2362b..37ad36a97` = 13 コミット。6フォーカスファイル限定 diff は `amadeus-utility.ts`(M、#830/#855 の doctor Check1/3 anchor の `5c5e042a2`、#844 面 `:619-632` には非関与)のみで、残り5ファイル(orchestrate / log-subagent / learnings / runtime / runtime-compile)は base 時点と**バイト同一**。**5欠陥はいずれも observed HEAD に未修正で現存**。base 決定は `git merge-base --is-ancestor` で実測(`11c52f153`=swarm-worktree-batch は HEAD 非祖先につき除外、最新祖先 `d8de2362b` を採用)。base/observed の真実源は本 intent の `re-scans/260711-p2-repair-batch7.md`(共有本ファイルは鮮度ポインタ)。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-orchestrate.ts:1243-1259`(#834 Branch 2.5)・`amadeus-orchestrate.ts:2913-2920`+`errorDirective:236`(#839、対照 `amadeus-lib.ts:4353` emitError)・`amadeus-utility.ts:619-632`(#844 handleDoctor 「5. Workspace shell ready」)・`amadeus-log-subagent.ts:41,48,50-52`(#845)・`amadeus-learnings.ts:127-153`(#849 readRuntimeStageRow、self-heal seam=`amadeus-runtime.ts:319` `export function compile`)
- 更新した成果物: `code-quality-assessment.md`(本 intent の restart-loss クラス5欠陥横断分類節を先頭新設 + 先頭バナー履歴化 + batch5 節の「本 intent」自己参照を履歴ラベル化 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は5件が挙動欠陥で構造変化を伴わず、かつ base→observed のフォーカス面が実質無変更のため温存(churn 回避、前例=p3-cleanup-batch5/batch4 の判断)。archive 参照解4件はすべて旧系譜パス `.agents/amadeus/{tools,hooks}/...` で、現行正本 `packages/framework/core/{tools,hooks}/...` へ読み替えて移植する(#834 は参照解なしの新規修正)。

## 実行メタデータ(履歴: 260711-p3-repair-batch6)

- Date: 2026-07-11
- Intent: `260711-p3-repair-batch6`(P3 修理6件 — #841 tryEmitSwarm が完了バッチ非除外で静的 batches[0] 再提示 / #842 jump が backward でも PHASE_VERIFIED emit・多相 forward 単一化・PHASE_SKIPPED 不在 / #836 delegate 承認で Phase Progress ロールアップ未更新 / #840 detectWorkspace が SCAN_SOURCE_DIRS 限定で Greenfield 誤判定 / #847 sensor-linter が eslint ラップ専用で lint:check 2段検出不在 / #848 docs-only の workspace_requires 免除経路 declare-docs-only/GUARD_EXEMPTED 喪失)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-3`(branch `claude-engineer-6`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`d8de2362b`(前回 batch5 RE observed)、observed=`37ad36a97`(現 origin/main)。介在13コミットのうち `packages/framework/core/tools/` のコア tools 変更は `amadeus-lib.ts`(#859 adapter mint を共有分類器へ経路変更ほか、+84)/`amadeus-state.ts`(+6)/`amadeus-swarm.ts`(+2)/`amadeus-utility.ts`(+5)の4ファイルに限定。**本 intent のフォーカス6欠陥が属する `amadeus-orchestrate.ts` / `amadeus-jump.ts` / `amadeus-sensor-linter.ts` / `amadeus-graph.ts` / `amadeus-stage-schema.ts` は本区間で未変更**。6欠陥は本区間の新規回帰ではなく、より古い時点で着地した元修正(#486=`3eca83a56` / #481=`2c2c48a39` / #459=`765fe4f20` / #538=`c6597bf18` / #499=`c8ddabffc`)が restart/reset により喪失し元修正前へ逆戻りした既存欠陥で、現 observed で全件現存。Always-rerun-for-freshness は差分実測(コア tools 4ファイルの差分確認+フォーカス5ファイル無変更判定+6欠陥の現行 file:line 実読)で満たした。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-orchestrate.ts:1703/:1717-1720`(#841 tryEmitSwarm)・`amadeus-jump.ts:432-447`(#842 phase 境界 emit)・`amadeus-utility.ts:2449/:2396-2414`(#836 Phase Progress 書き込み)+ `amadeus-state.ts:1135/:1655`(#836 advance/delegate 経路)・`amadeus-utility.ts:1917/:1949-1954/:1762`(#840 detectWorkspace/SCAN_SOURCE_DIRS)・`amadeus-sensor-linter.ts:5-43`(#847 eslint ラップ専用)・`amadeus-state.ts:952/:967-975`(#848 workspace_requires 拒否経路)+ 免除経路の不在確認
- 更新した成果物: `code-quality-assessment.md`(本 intent の restart 喪失 regression 6欠陥横断分類節を先頭新設 + 先頭バナーの batch6 現行化 + batch5 節見出しの「候補」→履歴ラベル化&修正着地状態行の追記 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は6件が挙動欠陥で構造変化を伴わず、かつ batch5 修正着地(lib/utility/swarm/state)も既存インベントリ済みコアツールの内部挙動変更で構造非改変のため温存(churn 回避、前例=p3-cleanup-batch5/batch4 の判断)。#840 の detectWorkspace 現状(SCAN_SOURCE_DIRS 限定で本 repo を Greenfield 誤判定しうる)は workspace 分類の CodeKB 根拠の現行限界として code-quality-assessment 内で接地済み。

## 実行メタデータ(履歴: 260710-p3-cleanup-batch5)

- Date: 2026-07-11
- Intent: `260710-p3-cleanup-batch5`(P3 候補6件 — #811 adapter inline mint が #755 分類器バイパス / #822 kiro 系 runCore の cwd 喪失 / #830 doctor Check1/3 の anchored base dir 非適用 = #746 残渣 / #730 bun lcov の関数内コメント/空白行 DA:0 の merge union false-red / #819 t92 case 15 の非ヘルメティック実 eslint spawn フレーク / #831 t76 test 12 の cursor 解決/timeOrigin 依存フレーク)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-2`(branch `intent/p3-cleanup-batch5`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`58f3453ad`(前回 batch4 RE observed)、observed=`d8de2362b`(コード基準、origin/main の batch3/batch4 全着地点)。現 HEAD `6279efe58` は `d8de2362b` の1コミット先だが intent birth checkpoint のみでフォーカスファイル無変更。介在16コミットのうちフォーカス領域に触れたのは #751(codex adapter wrapContext のみ)/#753(kiro-ide buildForward のみ)/#746(worktreeBaseDir 昇格、utility.ts 未変更)/#758(stop-hook carve-out)の4件だが、**いずれも本候補6件の欠陥箇所は未修正で行番号シフトのみ** — 6件は差分区間を通じて現存する欠陥。Always-rerun-for-freshness は差分実測(行番号現行値更新+未修正判定)で満たした。base/observed の真実源は当該 intent(260710-p3-cleanup-batch5)の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `harness/{codex,kiro,kiro-ide}/hooks/amadeus-*-adapter.ts`(#811 mint case / #822 runCore cwd)・`core/hooks/amadeus-mint-presence.ts:65` + `core/tools/amadeus-lib.ts:347`(#811 対照分類器)・`amadeus-utility.ts:831/:960/:998`(#830 doctor Check1/2/3)・`tests/run-tests.ts:509/:534/:674/:689`(#730 normalize/combine coverage)・`tests/integration/t92.test.ts:327/:610/:661`(#819 fire/runFailedTsReal/case 15)・`tests/unit/t76.test.ts:626-654` + lib `:2775-2851/:3135`(#831 auditLockDir/staleness/retry)
- 更新した成果物: `code-quality-assessment.md`(当該 intent(260710-p3-cleanup-batch5)の候補6欠陥横断分類節を先頭新設 + 先頭バナー/batch4 節見出しの「本 intent」→履歴ラベル化 + batch4 節へ全6件修正済み状態行を追記 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は6件が挙動欠陥で構造変化を伴わないため温存(churn 回避、前例=p3-cleanup-batch4 の判断)。ただし #811 起票の対照実装 path 誤り(core/tools → 正は `core/hooks/amadeus-mint-presence.ts:65`)は code-quality-assessment の #811 節で正誤を吸収済み。

## 実行メタデータ(履歴: 260710-p3-cleanup-batch4)

> 全6件修正着地済み(2026-07-10、PR #823/#821/#817/#818/#814/#815)。

- Date: 2026-07-10
- Intent: `260710-p3-cleanup-batch4`(P3 バグ6件 — #757 sensor-fire の生パス glob / #758 stop-hook carve-out の mutating verb 漏れ / #753 kiro-ide adapter の IDE/CLI 語彙不一致 dead seam / #739 promote-self walk の dangling symlink クラッシュ / #740 prerelease バッジ 404 / #784 gen-coverage-registry --check の無診断クラッシュ)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-2`(branch `intent/p3-cleanup-batch4`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`da1611a9a`(前回 observed 相当)、observed=`58f3453ad`(現 HEAD = main)。焦点9ファイル中7ファイルは `da1611a9a..HEAD` で無変更(起票時照合が有効)、2ファイルのみ変更 — `amadeus-sensor-fire.ts`(#793、`d715b8224`、行 +3 シフトのみで #757 欠陥不変)/`amadeus-state.ts`(#804、`d9d7b6ba4`、switch 下方シフトのみで #758 が数える7 verb 不変)。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-sensor-fire.ts`(#757)・`amadeus-stop.ts` + `amadeus-state.ts` switch(#758)・`kiro-ide/hooks/amadeus-kiro-adapter.ts` + `.kiro.hook`(#753)・`scripts/promote-self.ts`(#739)・`scripts/release-version-sync-plan.ts` + `release.yml`(#740)・`tests/gen-coverage-registry.ts`(#784)
- 更新した成果物: `code-quality-assessment.md`(本 intent の P3 6欠陥横断分類節を追加)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は6件が挙動欠陥で構造変化を伴わないため温存(churn 回避、cid:practices-discovery:c2 相当。前例=core-repair-batch3 の判断)。

## 実行メタデータ(履歴: 260710-core-repair-batch3)

- Date: 2026-07-11
- Intent: `260710-core-repair-batch3`(バッチ3: #746 / #786 / #742 / #743 / #747 / #741 / #751 / #744 / #749 / #750 — swarm/bolt の worktreePath read/write 非対称 / learnings emitKey の生 NUL バイト / setup の err swallow・非アトミック書き込み・prerelease 順序無視 / t90 test 13 の wallclock フレーク / codex adapter のレガシー flat root 参照 / orchestrate の PHASE_NUMBERS prototype-chain・single skeleton-gate 詰み・Branch 0 除外欠落)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/batch-c-learnings-audit`。焦点コードは origin/main と同一を都度確認)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1、E-L3 追補適用)。**焦点コードは base→observed でいずれも無変更**(`amadeus-swarm.ts`/`amadeus-learnings.ts`/`amadeus-orchestrate.ts` と setup の installation/upgrade/semver-factory、codex adapter、t90.test.ts は全て UNCHANGED。`amadeus-lib.ts`/`amadeus-jump.ts`/`amadeus-state.ts`/setup `fsops.ts`/`resolver.ts` は区間内変更ありだが**焦点行は無変更で行番号のみシフト**)。14コミットの差分区間はバッチ D と周辺 hooks/presence 修理が着地したが焦点面に非関与のため、バッチ3の10 Issue は差分区間を通じて現存する欠陥。Always-rerun-for-freshness は「焦点コード無変更」の確認で満たした。
- Base commit(前回 observed): `da1611a9ace9dc81d92c7c617d506bde938fa4cc`(= tools-dispatch-batch の observed)
- Observed commit(現 origin/main): `58f3453ad0d2cee653619c9fbc27ec3888f1d110`(差分区間 `da1611a9a..origin/main` は14コミット)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-lib.ts`(`:1905-1907` worktreePath / `:86` PHASE_NUMBERS / `:4124` firstInScopeStageOfPhase / `:850` FLAT_MIGRATION_ROOT / `:2120` hooksHealthDir)・`amadeus-swarm.ts`(`:233` verdictFor の生 read)・`amadeus-learnings.ts`(`:571` emitKey の生 NUL)・`amadeus-orchestrate.ts`(`:2194` canonicalisePhase / `:1017-1031` computeGate / `:1948-` emitSingleRunStage / `:1115-1117` Branch 0)・`amadeus-jump.ts:176`・`amadeus-state.ts:2512`(#744 各サイト)・setup `installation.ts:28-45`(#742)・`fsops.ts:66`(#743)・`semver-factory.ts:15-21`/`upgrade.ts:42`(#747)・`amadeus-codex-adapter.ts:193/198/200-217`(#751)・`tests/integration/t90.test.ts:503`(#741)
- 更新した成果物: `architecture.md`(「core-repair-batch3(2026-07-11)の観測面」節を新設 + 先頭バナー履歴化 + tools-dispatch-batch 節の「本 intent」→履歴ラベル化)、`code-quality-assessment.md`(同名品質観測節を先頭新設 + 先頭バナー/tools-dispatch-batch 節の「本 intent」→履歴ラベル化)、本ファイル(鮮度ポインタ)。他成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は base→observed 無変更かつ焦点欠陥が構造変化を伴わない挙動欠陥のため内容追記なし(churn 回避、前回 RE と同判断)。

## 実行メタデータ(履歴: 260710-complexity-gate)

- Date: 2026-07-10
- Intent: `260710-complexity-gate`(CI にコード複雑度の増加を機械的に止める2層ゲート — Biome `noExcessiveCognitiveComplexity` warn + lizard CCN の baseline ラチェット — を導入する)
- Scope: `feature`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-2`(branch `intent/codecov-project-gate`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。フォーカス5面(`ci.yml`・`tests/coverage-project-gate.ts`・`gen-coverage-registry.ts`・`biome.json`・`package.json`)。フォーカス面のコード diff は `ci.yml` +18/-3・`tests/coverage-project-gate.ts` 新規 +236 で、`gen-coverage-registry.ts`・`biome.json`・`package.json` は base→observed で無変更。base/observed の真実源は per-intent の `re-scans/`(共有本ファイルは鮮度ポインタ)。
- Base commit: `584262c1a`(前回スキャン observed)
- Observed commit: `05141555b`(現 HEAD 実測)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: ゲート系ツールの正準テンプレート(`coverage-project-gate.ts` の env seam・parse-don't-validate・fail-closed 5値 FailReason・`--check`/`--update`)・CI ジョブ DAG(`check`/`coverage`/`codecov-status`/`ci-success`、#777 concurrency・#801 Codecov flags 削除)・lizard 複雑度分布実測(1,093関数、CCN>15 が 42、最大 `blockBoltSlug` 65)・Biome lint スコープ(`tests/ packages/setup/`)拡大対象
- 更新した成果物: `code-quality-assessment.md`(複雑度ゲート導入節=分布実測+2層ゲート計画を先頭に追加)、`architecture.md`(ゲート系ツールの正準テンプレートと CI ジョブ構成節を追加)、`code-structure.md`(ゲート系ツールの構造テンプレート節を追加)、`technology-stack.md`・`dependencies.md`(lizard 1.23.0 pip 固定導入予定 + Biome noExcessiveCognitiveComplexity 有効化予定)、本ファイル(鮮度ポインタ)。全 codekb ファイルに c3-relabel(旧 intent の現在時制マーカー→履歴ラベル)を適用。business-overview / api-documentation / component-inventory は relabel のみ。

## 実行メタデータ(履歴: 260710-tools-dispatch-batch)

- Date: 2026-07-10
- Intent: `260710-tools-dispatch-batch`(バッチ D: #774 / #785 / #787 / #788 / #789 — setup version resolver のページング欠落 / runner-gen prune の非対称 / jump execute の direction 非再導出 / graph・runtime dispatch の prototype-chain / state advance の nextSlug 方向盲目)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(作業ツリー HEAD `c59c5a9c7`、branch `intent/batch-c-learnings-audit` 上だが焦点コードは origin/main と同一)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。**焦点5ファイルは base→observed でコード diff 空**(setup resolver/http は 2026-07-09、core tools は `0801d2100`=2026-07-07 が最終変更。`amadeus-runtime.ts` のみ #781 で改変されたが dispatch site を含む hunk は無し)。9 コミットの差分区間はいずれも Batch D の焦点面に非関与のため、Batch D の5 Issue は差分区間を通じて現存する欠陥。Always-rerun-for-freshness は「焦点コード無変更」の確認で満たした。
- Base commit(前回 observed): `8e212dbbb4c52939638c5cef18732cb351771259`
- Observed commit(現 origin/main): `da1611a9ace9dc81d92c7c617d506bde938fa4cc`(差分区間 `8e212dbbb..origin/main` は9コミット)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `packages/setup/src/modules/resolver.ts`(`:12` BR-F09 / `:22-37` fetchNames の単一ページ / `:57-79` resolveVersion)・`packages/setup/src/ports/http.ts`(`:9-12` getJson がヘッダ非露出)・`amadeus-runner-gen.ts`(`:295-300` prune の loadGraph 限定 / `:324-365` onDiskRunnerSlugs 対 compiledSet)・`amadeus-jump.ts`(`:220-` handleExecute の direction 非再導出 / `:173-180` handleResolve が権威)・`amadeus-graph.ts`(`:1670`/`:1901` COMMANDS[cmd])・`amadeus-runtime.ts`(`:1412`/`:1453` SUBCOMMANDS[cmd])・`amadeus-state.ts`(`:1005-1018` advance の nextSlug 検証 / `:1077` crossesPhaseBoundary の方向盲目 / `:1103-1126` phase イベント emit)
- 更新した成果物: `architecture.md`(「tools-dispatch-batch(2026-07-10)の観測面」節を新設 + 先頭バナー履歴化)、`code-quality-assessment.md`(同名観測節を新設 + 先頭バナー/旧節見出しの履歴化)、本ファイル(鮮度ポインタ)。他成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は c3-relabel の該当箇所を履歴ラベル化するのみで内容追記なし(焦点欠陥は構造変化を伴わない挙動欠陥のため churn 回避、前回 RE と同判断)。

## 実行メタデータ(前々回: 260710-learnings-audit-batch)

- Date: 2026-07-10
- Intent: `260710-learnings-audit-batch`(バッチ C: #754 / #745 / #761 — §13 learnings の persist 判定と runtime 集計窓の欠陥修理)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/batch-c-learnings-audit`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。**焦点2ファイル `amadeus-learnings.ts` / `amadeus-runtime.ts` は base→observed でコード diff 空**(最終変更 `0801d2100`=2026-07-07、前回スキャン base より前)。よって前回理解を温存し、バッチ C が要求する「persist 判定マトリクスの真理値表」「per-unit learnings 集計窓のデータフロー」を現行コード直読で第一級の事実として codekb に整理した。
- Base commit: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(前回 observed = intent 260710-source-unreferenced-check)
- Observed commit: `8e212dbbb`(origin/main 最新 = PR #759 込み)を含む現 HEAD `intent/batch-c-learnings-audit`。差分区間 `584262c1a..HEAD` は #759(package.ts source scan)等の後半マージ群だが**焦点2ファイルは無変更**。
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-learnings.ts` `handlePersist`(:411-608 の dedup 判定マトリクス、:407 cidMarker、:431 静的 auditContent スナップショット、:348-358 priorAuditRow、:508-511 flush)・`amadeus-runtime.ts`(:684-700 countLearnings、:702-755 populator の instance-bearing/single 分岐、:461-560 rollup null-out、:974-976 summarize 集計、:1034 maxInstanceCompletedAt)
- 更新した成果物: `architecture.md`(「§13 learnings persist 判定マトリクスと audit 整合」「runtime learnings 集計の窓(per-unit)」の2新設節 + 先頭バナー履歴化)、`code-quality-assessment.md`(learnings-audit-batch 観測節 + 先頭バナー/mint-presence 節見出しの履歴化)、本ファイル(鮮度ポインタ)。`code-structure.md` は**無変更**(両焦点ファイルは既存インベントリ済みのコアツールで、欠陥は構造変化を伴わない挙動欠陥のため churn 回避)。他成果物は base→observed 無変更かつ本 intent 観測面と無関係のため温存(cid:practices-discovery:c2 相当)。

## 実行メタデータ(履歴: 260710-bughunt-fix-batch)

- Date: 2026-07-10
- Intent: `260710-bughunt-fix-batch`(#771/#773/#775/#776/#779 の5バグをまとめて修理するバッチ)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-3`(branch `claude-engineer-6`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base→observed でフォーカス5面のうち `scripts/package.ts`(#759=#735)・`amadeus-lib.ts`(#756=#736)・`amadeus-runtime.ts`(#781=#761)に**実コード差分あり**だが、いずれも今回の修理対象欠陥そのものは**未修正**(5バグは全て現行コードに残存、file:line で裏取り)。base/observed の真実源は per-intent の `re-scans/260710-bughunt-fix-batch.md`。
- Base commit: `fc5a34cf194aac05a4913e99eb7f9c4707d9d8e1`(前回 observed = intent 260710-mint-presence-vectors)
- Observed commit: `b845478bbf25a534a59f97f18e5a4a2a5a4e239c`(現 HEAD 実測)
- 差分規模: `git diff --name-status <base>..<observed> -- ':!amadeus/' ':!dist/'` は **37 ファイル**(amadeus-lib/runtime/state/learnings の core+self-install コピー、ci.yml、codecov.yml、package.ts、promote-self.ts、manifest-types.ts、harness/codex/emit.ts、tests 多数 — 自前 coverage gate 新設 `tests/coverage-project-gate.ts`/baseline JSON を含む)。
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: (#771)`scripts/package.ts` writeHarness/checkHarness、(#773)`packages/setup/src/ports/fsops.ts` resolveUnderRoot + `scripts/package.ts:644`、(#775)`core/hooks/` の audit-logger/sensor-fire/log-subagent/validate-state の pre-init ガード、(#776)`core/hooks/amadeus-sync-statusline.ts` の Bun.spawnSync、(#779)`amadeus-lib.ts` の isoTimestamp/scanPresenceLedger/auditShards と消費者(humanActedSinceGate/humanActedSinceLastAnswer/runtime.ts pairStartedCompleted)。
- 更新した成果物: `code-quality-assessment.md`(本 intent 観測節を先頭に追加 + 直近 mint-presence マーカーを履歴ラベル化 cid:reverse-engineering:c3-relabel)、`code-structure.md`(自前 project ゲート出荷後状態を追補)、本ファイル(鮮度ポインタ)。`architecture.md` は skeleton 不変・新規 architecture decision 無しのため温存。他成果物も base→observed 無変更かつ本 intent 観測面と無関係のため温存(churn 回避)。

## 実行メタデータ(前々々回: 260710-mint-presence-vectors)

- Date: 2026-07-10
- Intent: `260710-mint-presence-vectors`(#755 — machine-injected-turn 分類器が `<task-notification>` 開頭のみを抑止し、teammate-message 注入ターン(agmsg/SendMessage inbox 配信、形式 D)が phantom HUMAN_TURN を鋳造して human-presence gate と #671 委任 provenance を汚染する)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-1`(branch `diag/683-codecov-project-numeric-target`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。フォーカス面のコード diff は**空**(base→observed でソース無変更)のため前回理解を温存し、e1/e6/e5 の 3 者食い違いを動的実測(隔離 temp プロジェクトでの合成 stdin 測定)+ 本番 Claude Code transcript の法医学的照合で確定した。base/observed の真実源は per-intent の `re-scans/260710-mint-presence-vectors.md`(共有本ファイルは鮮度ポインタでありベース点ではない)。
- Base commit: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(前回 observed = intent 260710-source-unreferenced-check)
- Observed commit: `fc5a34cf194aac05a4913e99eb7f9c4707d9d8e1`(現 HEAD 実測)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-mint-presence.ts`(分類器)・`amadeus-stop.ts` tier-3(`transcriptIsConversational`)・`amadeus-lib.ts` `humanActedSinceGate`・`amadeus-state.ts` 委任 grounding・`tests/unit/t203-mint-presence-classify.test.ts`
- 更新した成果物: `code-quality-assessment.md`(#755 観測節を追加)、`architecture.md`(注入分類カタログ非共有の構造事実を追補)、本ファイル(鮮度ポインタ)。他成果物は base→observed 無変更かつ当該 intent 観測面と無関係のため温存(churn 回避、cid:practices-discovery:c2 相当)。

## 実行メタデータ(前々々々回: 260710-source-unreferenced-check)

- Date: 2026-07-10
- Intent: `260710-source-unreferenced-chec`
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/735-source-unreferenced-check`, base `origin/main`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit(前回 codekb 観測コミット): `162553b99`(intent `260709-bug-zero-batch` の統合版、`codekb/amadeus/` 一本化後。前回 gate-mechanics スキャンもこのコミットを観測対象としており、実コード diff は0だった)
- Observed commit: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(現 HEAD、`origin/main` = #737 込みをマージ済み)
- 差分規模: `git log 162553b99..HEAD` は38コミット。本日の main マージ群(#711/#712/#713/#714/#715/#716、#721/#722/#724/#725/#726、#732、#727=#670修正、#729=#685修正、#737=#719修正 等)を含み、当該スキャンは前回2スキャン(bug-zero-batch/gate-mechanics)と異なり**実コードに差分がある**。
- Focus: Issue #735 が依存する理解面 — **packaging の入力集合と source 側 unreferenced 検査点**。`scripts/package.ts`(`checkHarness`/`buildTree`)、全 harness の `manifest.ts`(`harnessFiles`/`renames`/`authoredExempt`/`emit`)、#737(kiro CLI の stale `.kiro.hook` 削除 + vacuous exemption 除去)と #711(dist 全域 orphan scan)を重点読解。
- ベースにした codekb: `amadeus/spaces/default/codekb/amadeus/`(2026-07-09、intent `260709-gate-mechanics` 版)

## 再検証結果(source-unreferenced-check の差分、履歴)

38コミットのうち、前回 codekb(gate-mechanics 版)の記述を陳腐化させる主要変更と、#735 の理解面に新規に加える読解結果を記録する。

### 前回 codekb を陳腐化させた変更(2バグとも出荷済みに)

- **#685 delegate-rejection は解消済み(#729)**: 前回 codekb は「REJECT 側に delegate-approval 相当の遠隔委任機構が存在しない」と記録していたが、`14d1146e0`「fix #685: add DELEGATED_REJECTION ... (#729)」がマージ済み。現在 `amadeus-state.ts` の subcommand dispatch(L262-263)に `delegate-rejection` → `handleDelegateRejection` があり、`amadeus-audit.ts` の `VALID_EVENT_TYPES`(L73)と presence/provenance の trusted-writer 集合(L755)に `DELEGATED_REJECTION` が追加された。`humanActedSinceGate` は「`DELEGATED_APPROVAL` は approve のみ、`DELEGATED_REJECTION` は reject のみを開く」verb-scoped presence に分離されている(`amadeus-state.ts` L1444 近傍のコメント)。architecture.md・code-structure.md・api-documentation.md 等の #685「不在」記述は歴史的記録であり、以後は「#685 は fix 済み」を前提にする。
- **#670 sibling-worktree guard は解消済み(#727)**: 前回 codekb は `assertNotSiblingWorktree` が sibling worktree を無条件拒否すると記録していたが、`20c2e9674`「fix #670: anchor amadeus-worktree write paths to the main checkout (#727)」がマージ済み。現在 `amadeus-worktree.ts` は無条件拒否をやめ、cwd を分類して write パスをメインチェックアウトへ**アンカー**する方式(戻り値 `{ cwdTop, mainCheckout }`、L116-123)。sibling dev worktree から呼んでも Bolt worktree はメインチェックアウトの sibling として作成/マージ/破棄される(冒頭コメント L12-13、分類コメント L133-137)。architecture.md・code-structure.md の #670「無条件拒否」記述は歴史的記録。

### #735 の理解面(新規読解)

- **build が読む「入力集合」の確定点**: `scripts/package.ts` の `buildTree`(L307)が、build がソースとして消費する集合を確定する。(1)`core/<coreDirs[].src>` を `walk()` で列挙(L322-344)、(2)`harness/<name>/<harnessFiles[].src>` を個別コピー(L357-363)、(3)onboarding skeleton(L370-376)、(4)`core/memory/` を `emitMemory`/`emitMemorySeed`(L382-395)、(5)`emit()` プラグイン(codex のみ、L446-458)。harness ソースは**ディレクトリ全体を walk せず `harnessFiles` に列挙された src だけ**をコピーする — したがって `harness/<name>/` 配下の未列挙ファイルは build から完全に不可視になる。
- **source 側 unreferenced 検査は現状不在**: `checkHarness`(L554)の orphan 検出はすべて **dist 出力側**(committed dist vs 再ビルド dist)で働く(harness-dir orphan L574-582、dist 全域 orphan L605-628、#711 で追加)。`harness/<name>/` の authored ソースが manifest のどの行からも参照されない場合、それは dist に到達しないため dist orphan scan では検出できない。これが #735 が塞ごうとしているギャップ。
- **#737 = このギャップの実害例**: kiro CLI harness に7個の `.kiro.hook` ソースファイルが manifest 未参照のまま残存し(dist へ出荷されず)、しかも kiro manifest の `authoredExempt` に「dist/kiro には元々存在しない」ファイル種別を除外する vacuous な regex `/^hooks\/[^/]+\.kiro\.hook$/` があった。#737 は7ファイルを削除し vacuous exemption を除去、`t148` に「CLI harness ソースに `.kiro.hook` が0個」の再注入ガードを追加した(`tests/smoke/t148-kiro-file-structure.test.ts`)。詳細は code-quality-assessment.md・code-structure.md「packaging」節を参照。

## 実行メタデータ(前回: 260709-bug-zero-batch、履歴として保持)

- Date: 2026-07-09
- Intent: `260709-bug-zero-batch`
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-1`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit: `aff3b6671`(`amadeus/spaces/default/codekb/claude-leader/` の観測コミット、前回 intent `260709-framework-repair-batch` のスキャン)
- Observed commit: `a1c79dc12df38a8363524116eff9d877677a7224`
- Focus: 修理対象バグ6件 — #674(`amadeus-swarm.ts` finalize の merge-back/audit 分離)、#675(`amadeus-state.ts` reject の human-presence guard 欠落)、#676(`amadeus-bolt.ts` start + `amadeus-lib.ts` auditFilePath の bare fallback)、#677(`packages/setup/src/ports/http.ts` getJson の json() 未保護)、#678(`packages/setup/src/internal/tar-archive-extractor.ts` の PAX/GNU longname 状態)、#668(`amadeus-utility.ts`/`amadeus-lib.ts` の codekb-path `<repo>` セグメント導出)
- ベースにした codekb: `amadeus/spaces/default/codekb/claude-leader/`(2026-07-09、intent `260709-framework-repair-batch`、対象バグ #656/#657/#641/#661)

## 分析範囲

`git diff --name-status aff3b6671..HEAD` で143ファイルの差分を確認した(19コミット、うち大半は `origin/claude-leader` ブランチのマージ)。主な変更内容は次の通り。

- `modelOverride` → `model` へのエージェント frontmatter 改名(PR #669、114ファイル規模、`.claude`/`.codex`/`dist/*`/`packages/framework/core/agents/` の全複製箇所)。
- `amadeus/spaces/default/codekb/claude-leader/` の新設(前回 intent `260709-framework-repair-batch` のスキャン結果、9ファイル)。
- `amadeus/spaces/default/intents/260709-canonical-settings/`・`260709-framework-repair-batch/` の工程記録追加(ideation/requirements-analysis の memory・questions・requirements)。
- `amadeus/spaces/default/memory/team.md` への §13 学習事項の複数追記(human-presence interim 運用、auto-gate-approval、blocker-election 等の運用ノルム)。

この差分自体は当該 intent(bug-zero-batch)が対象とする6バグのコード領域(`amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts`/`amadeus-lib.ts`/`packages/setup/src/ports/http.ts`/`packages/setup/src/internal/tar-archive-extractor.ts`)に変更を加えていない。したがって6バグはこの差分区間の前後を通じて存在し続けている欠陥である。

重点スキャン対象は次の6ファイル/領域(すべて実コードを直接読解して確認)。

- `packages/framework/core/tools/amadeus-swarm.ts` L484-631(`handleFinalize`)— #674
- `packages/framework/core/tools/amadeus-state.ts` L1286-1487(`handleApprove`/`handleReject`)— #675
- `packages/framework/core/tools/amadeus-bolt.ts` L180-239(`start` の `--worktree` パス)+ `amadeus-lib.ts` L1246-1271(`stateFilePath`/`auditFilePath`)— #676
- `packages/setup/src/ports/http.ts` 全体(84行)— #677
- `packages/setup/src/internal/tar-archive-extractor.ts` 全体(228行)— #678
- `packages/framework/core/tools/amadeus-lib.ts` L495-524(`codekbRepoName`)+ `amadeus-utility.ts` L2690-2699(`codekb-path` ハンドラ)— #668

## 鮮度に関する注記

ベースライン `amadeus/spaces/default/codekb/claude-leader/`(2026-07-09、intent `260709-framework-repair-batch`)は #656/#657/#641/#661 という前回バッチの4バグを主眼に書かれており、当該 intent(bug-zero-batch)が対象とする6バグには一言も触れていない。当該スキャンはこの前提を次のように更新した。

- 対象バグ群を完全に入れ替えた(#656/#657/#641/#661 → #674/#675/#676/#677/#678/#668)。前回バッチの4件はこの codekb では扱わない。
- 前回バッチのうち #656(`Installation.detect` が `LegacyLayout` を呼ばない)は、`upgrade.ts:192` で `Installation.detect` の evidence を `LegacyLayout.isUnsupported` に渡す配線が確認でき、解消済みと判断した。#657(`bunx tsc` の無条件使用)は `amadeus-sensor-type-check.ts:157,174` の時点でも変更が確認できず、未修理のまま残存している。#641・#661 は本スキャンの重点対象外のため状態未確認。これらは当該 intent のスコープではないため、修理判断は行わず状態のみを記録する。
- `packages/framework/core/`・`packages/setup/` の全体構造(one-core-many-harnesses、functional-domain-modeling-ts スタイル)自体は前回スキャン時点から変更なし。

## 合成方針(Architect 想定)

Developer スキャン結果として、6アーティファクト構造(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment / reverse-engineering-timestamp の9ファイル)を diff-refresh 方式で更新した。前回バッチの4バグに関する記述は新しい6バグの記述に置き換え、全体構造・技術スタック・依存関係グラフのうち変更がない節(one-core-many-harnesses、Bun/TypeScript/Biome スタック、`release.yml` 一本化のバージョン運用)はベース(claude-leader 版)の記述をほぼ温存した。architecture.md に6バグそれぞれの相互作用図(シーケンス図)を新設し、原因コード位置・再現条件・修理時の波及範囲を code-structure.md・code-quality-assessment.md に集中して記述した。

## 更新した成果物

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `reverse-engineering-timestamp.md`

## 統合記録(AC-668-4、2026-07-09)

- **統合**: #668 修正(PR #693)マージ後、分裂していた4ディレクトリ(`amadeus`(2026-07-07 stale)/ `installer-distribution`(2026-07-08)/ `claude-leader`(2026-07-09)/ `claude-engineer-1`(2026-07-09))を本ディレクトリ `codekb/amadeus/` に一本化した
- **正の根拠**: スキャンの系譜は amadeus(7/7)→ installer-distribution(7/8、base 8510281ae)→ claude-leader(7/9、base aff3b6671)→ claude-engineer-1(7/9、base aff3b6671 の leader 版をベースに observed a1c79dc12)という差分リフレッシュの連鎖であり、最新の claude-engineer-1 版が累積 superset。本ディレクトリはその claude-engineer-1 版の git mv
- **包含チェック**: 4ディレクトリとも同一の9ファイル構成でファイル単位の欠落なし(削除分は git 履歴から復元可能)
- **以後**: `codekb-path` は #668 修正により安定名 `amadeus` を返す(このコミットで実測済み)ため、次回スキャンは本ディレクトリへの差分リフレッシュとなる

## source-unreferenced-check(intent 260710、履歴)で更新した成果物

packaging 入力集合と source-unreferenced ギャップに焦点を絞った diff-refresh。既存の bug 別ナラティブ節(#674〜#678/#668/#685/#670)は歴史的記録として温存し、上部に #735 の新規節を追記、#685(#729)/#670(#727)の解消済みバナーを各所に付す形で更新した。

- `architecture.md` — 「packaging 入力集合と source 側 unreferenced 検査」節を新設(build 入力の確定点・dist orphan scan の守備範囲・#735 のギャップ)。#685/#670 の解消済みバナーを追記。
- `code-structure.md` — 「packaging 構造(`scripts/package.ts` / harness manifests)」節を新設(`buildTree`/`checkHarness` の段構成、全 harness の `harnessFiles`/`authoredExempt` 目録)。#685/#670 解消済みバナー。
- `code-quality-assessment.md` — vacuous exemption アンチパターンと source-unreferenced ギャップを技術的負債として追記。#685/#670 解消済みバナー。
- `component-inventory.md` — `scripts/package.ts`/`scripts/manifest-types.ts`/harness manifests のコンポーネント表を追記。
- `api-documentation.md` — `scripts/package.ts`(write/`--check`)の CLI 契約を追記。#685/#670 解消済みバナー。
- `dependencies.md` — packaging 依存グラフ(core/harness → package.ts → dist の入力集合)と `fast-check` 依存追加を追記。
- `technology-stack.md` — `fast-check`(PBT、#722)、動的 test-size 計測(#732)、codecov 導入を追記。
- `business-overview.md` — 当該 intent の業務境界(source-unreferenced check)を追記。#685/#670 解消済みバナー。

## 前 intent(260709-gate-mechanics)で更新した成果物(履歴)

コード diff がないため全面リライトではなく、#685/#670 関連の新規節を追記する形の diff-refresh。

- `architecture.md` — 「#685」「#670」の相互作用図(シーケンス図)を新設。旧6バグの図は保持(#675 は解消済みと明記)。
- `code-structure.md` — gate resolution 系(`amadeus-state.ts`/`amadeus-lib.ts`)と `amadeus-worktree.ts` の該当関数表を追記。
- `component-inventory.md` — human-presence gate コンポーネント表・worktree ガードコンポーネント表を追記。
- `api-documentation.md` — `delegate-approval`/`reject` の現行契約と `amadeus-worktree create`/`bolt --worktree` の契約を追記。
- `code-quality-assessment.md` — #685・#670 のリスク評価節を追記、#675 を解消済みとして更新。
- `business-overview.md` — 当該 intent の業務境界(2バグ)を追記。
- `technology-stack.md`・`dependencies.md` — 変更なし(該当領域に新規依存・技術変更なし)、確認済みの旨のみ追記。

## Issue #857 差分スキャン（2026-07-23）

- Issue: [#857](https://github.com/amadeus-dlc/amadeus/issues/857)
- Base: `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`
- Observed: `abb5576d2fc162d69dd8ac8b87402e927609f279`
- Date: `2026-07-23`
- Focus: `handleDoctor` in-process seam and patch coverage

## 差分スキャン結果

`handleDoctor` は export 済みで、monkeypatch 型 in-process テスト6ファイル104ケースが成功し、LCOV 437/771行 hit を確認済みという入力事実を反映した。spawn 契約 t37/t83/t210 は41ケース成功、LCOV 1/771行 hit であり、spawn 盲点は継続する。本更新は既存 CodeKB を保持した差分追記で、対象9ファイルと `re-scans/260723-doctor-inprocess-seam.md` に限定した。

## 実行メタデータ（履歴: 260802-record-roundtrip-pbt）

- Date: `2026-08-02T16:39:04Z`
- Base commit: `47574fbabf274e11cb8e0b37bf35a0309a7b3d42`（前回 observed = 260802-scope-grid-face-sync。祖先性実測: `git merge-base --is-ancestor 47574fbab HEAD` exit 0）
- Observed commit: `9750f8aea0763eb10572b27b900c435de0146e86`（`fix(plugin): persist opt-in selection across harnesses (#2049)`、origin/main 系譜かつ HEAD 祖先 = `merge-base(HEAD, origin/main)`。`cid:reverse-engineering:c2-observed-mainline-commit` 準拠）
- Distance: `13 commits`（`git rev-list --count 47574fbab..9750f8aea`）
- 区間規模: `574 files changed, 51854 insertions(+), 2012 deletions(-)`（`git diff --shortstat 47574fbab..9750f8aea`）。大半は dist 7 面投影と metrics スナップショット。区間の主変更はいずれも患部外 — #2031 execution observability baseline（`execution-*` 新モジュール群 + audit へ `EXECUTION_EVENT_SET_COMMITTED` 追加、event types 79→80）、#2041 scope-grid face sync、#2044 glossary 単一所有化、#2049 plugin opt-in persist、#2053 PBT posture ノルム（`project.md` § Testing へ `cid:build-and-test:pbt-developer-testing-posture` を追加 — 本 intent の直接の上位規範）。
- Scope: `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard、Test Strategy: Comprehensive
- Focus: Issue #1980（クロスレビュー 2 名 CONFIRMED_WITH_REFINEMENTS 済み、対象 SHA `8e5dc6c4`）— 記録系 4 境界（mirror / state / audit / election）の write⇔read round-trip PBT + fail-closed PBT の導入と、読み側バリデータの一本化。中心機序は「発行側だけがバリデータを通り、消費側の読み戻しが素通りする」非対称で、`Election.parse` / `Ballot.parse` のプロダクション呼出が発行側 2 箇所（`amadeus-election.ts:310` open / `:433` vote）のみ、消費側が通る `Store.load`（`amadeus-election-store.ts:503-510`）は `readJson<T>`（`:71`）の `:80` `return ok(JSON.parse(text) as T);` を経るだけで `Election.parse` を再適用しない。実対象は **state / election の各 1 境界以上（新規）+ mirror / audit は既存被覆の外側のみ**。差分リフレッシュ: 直近かつ祖先である `47574fbab` を base とし、全 file:line を observed で再実測。患部 10 パスのうち区間内コミットは `amadeus-lib.ts`（1、#2031 の +1 行）と `amadeus-audit.ts`（1、#2031 の +5 行）のみで、残り 8 パスは 0（乖離は区間内の新規導入ではなく残存）。
- Scan mode: `cid:reverse-engineering:c1-xrev-scan-mode` — クロスレビュー 2 名の verdict を Developer scan の一次入力とし、conductor が observed で verbatim スポット再実測 + 患部区間 touch 判定を行って二重化。Architect が全 file:line を再解決して成果物へ転記。
- Updated artifacts: 実質更新 3 件 = `architecture.md`（4 境界の seam ペア表、読み側の硬さが 3 層に割れている機序、発行側のみがバリデータを通る非対称、round-trip と fail-closed の書き分けが必須である理由、state テキストフィールド層の fail-open / fail-closed 同居、core/tools 配置による dist 7 面投影の含意）、`code-structure.md`（患部 3 グループの配置、テスト側 10 パスの内訳、静的ガード挿入点と無検査キャスト候補母集団 8 箇所 / 5 ファイル、区間 touch 判定表、行シフト再解決表）、`code-quality-assessment.md`（既存 PBT 被覆分布、`.pbt.` 命名探索の罠、#1459 硬化が読み戻し経路を通らない残存欠陥、PBT 実装規約の現況と揺れ 2 件、静的ガードの品質要件、オラクル相殺リスク、投影・ゲートの品質コスト）。判断 1 行のみ 5 件 = `business-overview.md` / `api-documentation.md` / `component-inventory.md` / `technology-stack.md` / `dependencies.md`。加えて本ファイルと per-intent `re-scans/260802-record-roundtrip-pbt.md`。
- 現在マーカーの降格: 直前の現在断面 `260802-scope-grid-face-sync`（observed `47574fbab`）を全 8 成果物で履歴へ全文保存のまま降格した（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。降格後の各成果物の `、現在、` 出現数は 1 件（`grep -c '、現在、'` 実測、8 成果物すべて）。
- Per-intent record: `re-scans/260802-record-roundtrip-pbt.md`（scan mode 申告・患部 touch 判定表・引用再確認テーブル・4 境界 seam ペア表・既存 PBT 棚卸し・実対象の線引きを含む）。

## 実行メタデータ（履歴: 260813-election-multiq）

- Date: `2026-08-13`（Asia/Tokyo）
- Intent: `260813-election-multiq`
- Repository: `amadeus`（単一 repo）
- Scope / depth / project type: `self-feature` / Standard / Brownfield
- Issue: [#2813](https://github.com/amadeus-dlc/amadeus/issues/2813)
- Base commit: `854692fd7a11b124236b0427fe3d59e2fe6bf785`
- Observed commit: `c0f9edf27828def6fa3dbbbc4101d753b398e025`
- Distance: `33 commits`（`git rev-list --count <base>..<observed>`）
- Focus: election model/store/record/transport/CLI/skill/migration、関連 tests、`FormalElection` / model-map、`team.md` の現行 norm
- Result: Issue #2813 の本質は未実装。単問 cardinality が全層へ波及し、mixed result、held-only rerun、established preservation、legacy/new dual read の実装が必要。
- Norm freshness: commit `bd567fd1b78bbde8a524b2cc767bd176dfbfe95f` で旧 bundled `E-SRA-RAS13` / `election-cli-canonical` workaround は削除済み。現在は `team.md` `cid:requirements-analysis:always-elect` の「1選挙1質問」更新が残る。
- Updated artifacts: shared 9成果物と `re-scans/260813-election-multiq.md`。既存履歴節は削除・再整形せず、最新節を追記。
- Verification: read-only の git/rg/gh/line-count 計測のみ。テスト、build、coverage、TLC は未実行。

## 実行メタデータ（履歴: 260813-bolt-pr-attestation。**現在時制マーカーのみ更新**（`cid:reverse-engineering:c1`、260816-open-bug-batch-7 の差分リフレッシュ時。旧ラベル `最新` は 260813 時点の記述で、以後複数の intent が本ファイル上部に節を追加しているため陳腐化していた。本節の本文と当時の値は保存する））

- Date: `2026-08-14`（Asia/Tokyo）
- Intent: `260813-bolt-pr-attestation`
- Repository: `amadeus`（単一 repo）
- Scope / depth / project type: `self-fix` / Minimal / Brownfield
- Issue: [#2985](https://github.com/amadeus-dlc/amadeus/issues/2985)（Intent mirror: [#2989](https://github.com/amadeus-dlc/amadeus/issues/2989)）
- Base commit: `c0f9edf27828def6fa3dbbbc4101d753b398e025`
- Observed commit: `0fbbec42bb33d625bdb9d034789c0ff391df1287`（最新 `origin/main` lineage）
- Issue reproduction checkout: `cd225e6ea1c5834aaa79b3e68030213ba04c9340`（別断面。Observed の代用ではない）
- Focus: Delivery Planning Bolt cardinality、runtime DAG / worktree、PR provenance、attestation、report sensor、per-unit completion guard の合成境界
- Result: 複数 Unit を1 Delivery Bolt に束ねられるが、runtime と PR evidence は単一 Unit identity を要求する。`Delivery Bolt -> units[] -> one PR identity -> per-unit evidence` seam が欠落し、one-Bolt-one-PR と per-unit completion が両立しない。
- Scan mode: 通常の differential refresh。Issue reproduction checkout は停止症状の観測、成果物の主張と file:line は Observed で再解決した。
- Deviation: dirty worktree へ最新 trunk を merge していない。`git show` / `git diff` による read-only 照合だけを行い、成果物は Observed 断面の主張にした。
- Focused tests: Developer scan が6 filesを実行し、187 pass / 0 fail / 552 expect（Bun 1.3.13）。Architect synthesis は test / build / lint / typecheck を未実行。
- Updated artifacts: shared 9成果物と `re-scans/260813-bolt-pr-attestation.md`。直前 #2813 の current marker は本文と当時の行番号を保持したまま履歴へ降格した。

## 実行メタデータ（現在: 260820-fmc-drift-batch）

- Date: `2026-08-20`（UTC）
- Intent: `260820-fmc-drift-batch`
- Repository: `amadeus`（単一 repo、root `/Users/j5ik2o/worktrees/j5ik2o.github.com/amadeus-dlc/amadeus/enhance-1`）
- Scope / depth / project type: `self-fix` / Minimal / Brownfield
- Base commit: `c8c393bba927e4c00a8c6de9ef2da76068d04bfa`（**選定根拠**: `re-scans/` 中で HEAD の祖先である observed のうち**距離最小** = 260818-issue-3029-sensor-gate の observed。`git merge-base --is-ancestor c8c393bba927e4c00a8c6de9ef2da76068d04bfa HEAD` → **exit 0**、`git rev-list --count c8c393bba..HEAD` → **97**。対抗候補 `127be70c5`（260818-priority-bug-batch-4）も祖先だが距離 **98** で劣後）
- Observed commit: `e86fbe125c85ddcbe7264f3a9a9a2377a06136da`（`git rev-parse HEAD`。`git rev-parse origin/main` と**同一コミット**、drift 0）
- Distance: `97` commits
- 差分規模: 除外前 **566 files / +32638 −3949**、workflow exhaust 除外後 **176 files / +14920 −1380**（除外は `:(exclude,glob)amadeus/spaces/*/intents/**`、`elections/**`、`codekb/**`、`memory/**`、`metrics/**`。削減率 **54.29%**、算出式 `17718 / 32638`）
- Scan mode: **通常の差分リフレッシュ**（xrev differential 不採用。理由は per-intent record §1.1）
- Focus: `<record>/ideation/intent-capture/issue-evidence.md` 由来の 4 件 — [#3186](https://github.com/amadeus-dlc/amadeus/issues/3186)（語彙 drift 検出の腕）/ [#2289](https://github.com/amadeus-dlc/amadeus/issues/2289)（replace-by-name）/ [#2929](https://github.com/amadeus-dlc/amadeus/issues/2929)（IMPLEMENTATION_PATHS 拡張）/ [#3187](https://github.com/amadeus-dlc/amadeus/issues/3187)（advisory authoring-hold の退役）
- 中核知見: 4 件はいずれも observed で機構が実在する。#3186 は分類クラスと revise-model 強制規則が健在で**発火述語だけが欠落**（トークン census 全 0 hit / exit 1、対照は非ゼロ / exit 0）。#2289 は route が前提ゲートまで届きながら compose へ渡らない形で、**#3263 の `authoringProvenance` 必須化が新しい裁定点を作った**（draft 必須 / map optional / 実データ 1-of-4）。#2929 は validator / loader / sensor glob の**三面同時是正**が必須で、ローダー境界にはテスト 0 件。#3187 の退役面は Issue 完了条件より広く、**書き手 `subjects declare` が stage 契約 `:53` に配線され t450 が blocking pin している**。
- 区間でのスコープ縮小 2 点: #3262（terminal route receipt 永続化）と #3261（交差判定の document identity スコープ化）が着地したことで、#3186 の別起票候補とクロスレビューの追加論点 10 は**解消済み**。
- 行番号訂正 3 件（base 引用 → observed の再解決）: `tla-model-loader-internal.ts` の `loadVerifiedTlaSourcesInternal` 呼び出し側 `:498` → **`:528`** / `amadeus-sensor-model-completeness.ts` の export `updateModelMap` `:1000-1078` → **`:1121-1136`**（`:1000` は `performModelMapUpdate`、内部版は `:1082`）/ `tla-authoring.ts` の `defaultSubjectsPath` `:521` → **`:529-530`**
- 区間の最大変化: #1982 silent-success 3 ゲート（テスト基盤）、release パイプライン再構築（`release-land{,-domain}.ts` 新規 +525、`release-it` 依存の撤去）、election `terminate` verb、`amadeus-mirror-orphan.ts` 新規、github-pr-convergence の supersede / landed 改良、8 conductor 面の散文同期
- Verification: **読取専用**。git 状態変更・GitHub 読み書き・engine / state ツール実行はいずれもゼロ。テスト・build・coverage・TLC・lint・typecheck はすべて未実行（`bun -e` による metrics JSON および `plugin.json` / `model-map.json` の直読のみ）
- Updated artifacts: shared 9 成果物と `re-scans/260820-fmc-drift-batch.md`。既存の履歴節は削除・再整形せず、最新節を追記。直前の現在断面 `260818-priority-bug-batch-4`（7 面）と `260816-priority-bug-batch-3`（`technology-stack.md` 1 面）を履歴ラベルへ降格
- Per-intent record: `re-scans/260820-fmc-drift-batch.md`
