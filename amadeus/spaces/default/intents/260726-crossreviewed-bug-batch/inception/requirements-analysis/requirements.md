# Requirements — 260726-crossreviewed-bug-batch

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md。追加で実消費: code-quality-assessment.md(Intent 分析節の欠陥クラス分類の依拠元)

測定 ref: 本書の file:line・件数はすべて observed `1673c4332`(reverse-engineering/scan-notes.md の実測)からの転記。

## 承認系譜

- 起点(ユーザー指示 2026-07-26): クロスレビュー 2/2 成立済みのオープン bug を優先感度順に修正するバッチ intent。scope `amadeus-bugfix`、常任グラント ON(grant `dd44927f` 発行済み)。
- 対象の確定(leader 実測 + ユーザー承認): クロスレビュー成立7件 = #1489 #1457 #1377 #1459 #1462 #1458 #1388。未成立の #1498 #1496 は対象外。
- 裁定3件(ユーザー、AskUserQuestion 2026-07-26 — questions ファイル Q1-Q3 に転記済み): (1) #1388 は本バッチから**除外**し実測コメントのみ投稿(クローズ判断はユーザー) (2) #1458 は reportDelivery 配線(CLI 契約不変) (3) #1489 は中央値ベース判定を主、noise floor 調整は実測で併用判断。

## Intent 分析

目的は個別修正の寄せ集めではなく、**検証・記録機構の信頼性回復**である。codekb の code-quality-assessment.md が示すとおり、6件中3件は「検証・監査が嘘をつく」クラス(#1457 検証劇場、#1377 監査シャードの不変量破壊、#1459 tally 汚染)、2件は「fail-open な境界」クラス(#1462 スキーマ契約破り、#1458 配信記録の無音欠落)、1件は「ゲートの偽赤」クラス(#1489 — 全 PR の CI を確率的に塞ぐパイプライン阻害)。architecture.md の非対称パターン対応表(fallback vs fail-closed、statSync 無ガード vs existsSync ガード)が示す同型構造の解消が本質。

## 機能要件(修正対象6件、着手順 = 優先キュー)

各 FR の患部 file:line は scan-notes.md(observed `1673c4332`)からの転記。verbatim 断片は scan-notes に既録のため参照で足りる。

### FR-1: #1489 benchmark 分散ゲートの偽赤解消(P2/S3、パイプライン阻害につき最優先)

- 患部: `scripts/mirror-distribution-benchmark-aggregate.ts:33-35`(`maximum / minimum > 2 && absoluteSpread > noiseFloor`)、noise floor = `p95BudgetMs × 0.005 = 10ms`(:20 の定数から再計算、2,000ms 予算時)。
- 要件: 分散判定を**中央値ベース**(単一 replica スパイクに壊れない統計量)へ変更する。noise floor の調整は両側実測の結果からのみ併用する(裁定 Q3=D)。
- 受け入れ基準(両側実測、cid:code-generation:comparative-gate-injection-sizing):
  - (a) 偽赤側: #1489 記載の実測系列(単一 replica スパイク — 例: PR #1487 の 1030/396/271ms 級)を fixture 化し、新判定で **赤にならない** ことをテスト固定
  - (b) 検出力側: 全 replica が一様に劣化する真の退行系列を fixture 化し、新判定で **赤になる** ことをテスト固定。注入量は実測 delta からの機械計算で決める
  - (c) 既存消費テスト `tests/integration/t292-mirror-distribution-performance.integration.test.ts` green
- 配布増幅: なし(`git ls-files` 実測 0 コピー — repo ローカル CI スクリプト)。

### FR-2: #1457 election-verify の自己相関解消(P2/S3)

- 患部: `amadeus-election.ts:503` が `verifySelf(resolved.length, resolved, freq, timeline)` と同一配列由来の引数を渡し、`amadeus-election-record.ts:193`(ballot-count)/`:196`(freq-mismatch)の2分岐が恒久 false。
- 要件: doc コメント(`amadeus-election-record.ts:182-185` — "recomputes from the ballots rather than comparing the record to itself")が明言する設計へ実装を回復する。`ledgerCount` は **ledger.json の実件数**、比較対象の freq は **record.md に保存された値** 等、独立ソース由来の引数へ配線し直す。
- 受け入れ基準: (a) ledger と materialized 集合を意図的に乖離させた fixture で ballot-count 分岐が**赤になる**(落ちる実証) (b) 保存 freq を改竄した fixture で freq-mismatch 分岐が赤になる (c) 既存 `t238-election-record.test.ts` / `t236-election-loop.integration.test.ts` green。
- 検証劇場 Forbidden の解消そのもの — 修正後の verify verb は実行結果由来の検証になること。

### FR-3: #1377 audit シャードのベアルート書込封鎖(P2/S3)

- 患部: `amadeus-lib.ts:3326-3328` `auditFilePath` が intent 未解決時に `intents/audit/` へフォールバック、`amadeus-audit.ts:258-262` `ensureAuditFile` が無ガードで再帰 mkdir。
- 要件: `auditShardDir`(`amadeus-lib.ts:4126-4131`、fail-closed で null)と**対称**に、`auditFilePath` 系の intent 未解決フォールバックを封鎖し loud failure にする(cid:requirements-analysis:symmetric-pair-review)。コード内不変量 "no amadeus-state.md / no audit/ ever lives directly in the bare intents root"(`amadeus-log.ts:20-33` verbatim)への回復。
- 同根棚卸し(cid:code-generation:same-root-inventory): `stateFilePath:3313-3316` の同型フォールバックを実装時に棚卸しし、同一 PR で安全に閉じられるなら閉じる。壊す消費者がいる場合は Issue 化して分離(無音の挙動拡張はしない)。
- 受け入れ基準: (a) intent 未解決状態での audit emit(`RULE_LEARNED` 経路 = `amadeus-learnings.ts:624` 付近を含む)が修正前は `intents/audit/` を生成することを再現し(落ちる実証の前提再現)、修正後は loud に失敗して当該パスが**生成されない**ことをテスト固定 (b) 正常系(intent 解決済み)の audit emit は不変 (c) `t07-audit-fork-merge` / `t54-workflow-audit-completeness` green。
- 想定外の grant 失効等を fatal 経路へ流さない既存 Forbidden と整合させる(loud failure の種別は既存エラー分類に従う)。

### FR-4: #1459 Election.parse の fail-closed 化(P3/S3)

- 患部: `amadeus-election-model.ts:62`(`parseChoices` 型のみ検査)、`:81-82`(voters には `.length === 0` 検査があるが choices 側に無い非対称)、汚染経路 `:449`(重複 internalNo が choiceCounts を複製)→ `:456`(全会一致が誤 tie hold)。
- 要件: `Election.parse` を parse-don't-validate で fail-closed 化 — (a) choices 空配列 reject (b) internalNo 重複 reject (c) voter 重複 reject。
- 受け入れ基準: 3欠落それぞれの fixture で parse が reject されることを赤→緑で固定。tally 側 `t244` 系テストで全会一致が hold にならないことを確認。新エラー種別を足す場合は CLI `open` 消費側と `t260`/`t262` への波及を grep 棚卸し。

### FR-5: #1462 plugin 列挙の PluginStageError 契約回復(P3/S4)

- 患部: `amadeus-graph.ts:1823-1824`(`readdirSync().filter((n) => statSync(...).isDirectory())` — statSync が symlink を follow し dangling で raw ENOENT throw)。try/catch(`:1837`)はファイル単位ループ内側で列挙フィルタを覆わない。直後の `:1828` は `existsSync` ガードあり(非対称)。
- 要件: plugin 名レベルの列挙フィルタも `:1828` と対称のガードを持ち、dangling symlink を安全に skip するか `amadeus.plugin-stage-error.v1` スキーマの typed エラーで報告する(raw ENOENT を伝播させない)。
- 受け入れ基準: dangling symlink fixture(`tests/fixtures/plugins/` 配下、cid:code-generation:bun-readfilesync-dir-platform-divergence 追補どおり symlinkSync による注入 — 不在パス ENOENT では列挙に載らず到達不能)で修正前 raw throw を再現し、修正後の挙動をテスト固定。既存 `t-formal-verif-plugin-stage-discovery` / `t-plugin-stage-discovery-performance` green。

### FR-6: #1458 reportDelivery の配線(P3/S4)

- 患部: 既定 transport `amadeus-election.ts:582`(`a.transport ?? "subagent"`)→ subagent transport は `directive` を返す(`amadeus-election-transport.ts:173`)ため `:326` の `delivered` 限定 booking に入らず distributed イベント未記録。`reportDelivery`(`:183` 定義)は本体コードからの呼出 0 件(grep 全6 hit 実測、消費者はテストのみ)。
- 要件(裁定 Q2=A): 設計コメント(`amadeus-election-transport.ts:165-167` — "lets reportDelivery mint the record after the conductor reports completion")どおり、`handleReport` の distributed 遷移へ `reportDelivery` を配線する。CLI 契約(既定 subagent transport)は不変。
- 受け入れ基準: (a) 既定 transport で open→notify→report→tally の一巡を回し、record.md タイムラインに配信イベントが**現れない**ことを赤テストで固定してから配線(落ちる実証) (b) 配線後に distributed イベントが記録される (c) `t239`/`t240`/`t236`/`t237` green、dead export 解消(本体からの実呼出 ≥1 を grep で確認)。

### FR-7: #1388 の除外処理(裁定 Q1=A)

- 要件: 本バッチのスコープから除外し、Issue #1388 へ実測根拠をコメント投稿する — (a) 患部の `scripts/team-up.sh` → `packages/framework/core/tools/team-up.sh` 移動・配布対象化(記載パス・行番号の失効) (b) codex 検証除外が FR-6 既決である verbatim(`team-up.sh:1098-1099`)と現行行番号 (c) クローズ判断はユーザーに委ねる旨。ラベル・状態は変更しない。

## 非機能要件

- NFR-1(配布同期): FR-2〜FR-6 は配布正本(`packages/framework/core/tools/`、各10コピー = dist 6 + self-install 4)を触るため、同一変更で `bun scripts/package.ts` + `bun run promote:self` を実行し `bun run dist:check` / `bun run promote:self:check` green を必須とする。FR-1 は配布対象外。
- NFR-2(回帰基準): 各修正はまず元 Issue の再現を赤テストで固定してから修正する(regression-first)。PR レビューは Issue 起票時の再現手順 verbatim 再適用で閉包を実証(cid:requirements-analysis:fix-review-replays-origin-repro)。
- NFR-3(ゲート維持): `bun run typecheck`、`bun run lint`、`bash tests/run-tests.sh --ci`、coverage ratchet / patch gate、complexity gate を全 PR で green。push 前にローカル lcov で diff 追加行未カバー 0 を実測(cid:code-generation:local-lcov-pre-push)。
- NFR-4(テスト配置): 実 FS を触るテストは integration 層へ(cid:code-generation:fs-tests-integration-first)。unit は純関数層に限る。

## 制約

- 修正 PR は Issue 単位を基本とし、1 PR に無関係修正を束ねない。工程記録はチェックポイントコミットで分離。
- **ファイル交差**: FR-2(#1457)と FR-6(#1458)は両方 `amadeus-election.ts` を触る — 着手前にファイル単位の非交差を実 diff で判定し、交差するなら直列化(cid:code-generation:c6)。FR-4(#1459、election-model)は非交差。
- 要求されていない後方互換レイヤー・フォールバック分岐を追加しない(org.md Forbidden)。#1377 は逆にフォールバックの**削除**が要件。
- マージは全て人間承認(no-AI-merge)。常任グラントはステージゲートのみでフェーズ境界・マージには及ばない。

## 前提

- クロスレビューは main `1c43438df` 時点、現存確認は observed `1673c4332` で再実測済み(区間で対象無修正を diff 確認)。
- #1377 の発現機序(worktree の active-intent カーソル不在 → record prefix 空解決)は observed のコードと整合するが決定的再現は未実施 — FR-3 実装時の再現を要件化済み(仮説を実測へ昇格させてから修正)。

## Out of scope

- #1388 の修正(裁定 Q1=A で除外。コメント投稿のみ FR-7)。
- #1498 / #1496(クロスレビュー未成立 — 起票時のバッチ編入前提を満たさない)。
- #1458 の subagent 既定廃止案(裁定 Q2=A で不採用 — 仕様変更のため)。
- election サブシステムの一般リファクタ、benchmark 基盤の再設計。

## Open questions(後続ステージへ)

- FR-2/FR-6 の `amadeus-election.ts` 交差の解消方式(直列化 or 関数単位非交差の実測)— code-generation の着手前判定。
- FR-3 の `stateFilePath` 同根を同一 PR に含めるか — 消費者棚卸しの結果で実装時判断(無理なら Issue 化)。
- FR-1 の中央値ベース統計量の具体形(max/median 比 等)— 実測系列 fixture に対する検出力で決める。
