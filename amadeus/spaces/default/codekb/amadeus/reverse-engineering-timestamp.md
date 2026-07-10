# リバースエンジニアリング実施記録

## 実行メタデータ(最新: 260710-core-repair-batch3)

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
