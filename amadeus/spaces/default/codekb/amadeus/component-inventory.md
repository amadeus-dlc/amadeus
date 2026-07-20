# コンポーネント棚卸し

## upstream-sync-230 コンポーネント（2026-07-20、現在）

| コンポーネント | 責務 | upstream-sync での役割 |
|---|---|---|
| Core tools（30 CLI） | state、graph、routing、swarm、learnings | D1/D2/D3/D6 の機械契約 |
| Core hooks（11） | session、human turn、stop、sensor、status | compose freshness、Kiro context、plugin compose 発火 |
| Agent personas（14） | stage 別の役割境界 | reviewer date/persona/read-scope 契約 |
| Stage definitions（32） | phase/stage graph の正本 | schema extension、bundle、required sections |
| Sensors（5） | artifact の決定的検査 | plugin/stage 投影の完全性 |
| Harness adapters（69 files / 6面） | ホスト固有起動・payload・設定 | upstream 4面の変更を6面へ ADAPT |
| `scripts/package.ts` | manifest discovery、clean sweep、drift guard | plugin source の6面 projection オーナー |
| `scripts/promote-self.ts` | リポ内 self-install | closed-list 4面の投影オーナー |
| `packages/setup` | 独立配布 CLI（101 exports） | 新規 runtime dependency を追加しない |
| Tests（461 files） | unit/integration/e2e/smoke | 24項目の regression と ported tests |
| Docs | guide/reference/harness engineering | plugin/schema/compose 契約を同期 |

plugin は source component、`dist/plugins` cache、host projection の3コンポーネントに分け、manifest、dist clean-sweep、harness projection で所有権を分離する。

> 以下は過去 intent の履歴。

## Codex hooks／agmsg 競合コンポーネント（intent 260718-hooks-config-conflict、2026-07-18、履歴）

| コンポーネント | 現行責務 | Issue #770 との関係 |
| --- | --- | --- |
| Codex `HOOK_WIRING`／`emitHooksJson` | 9個の Amadeus command を `hooks.json.example` へ生成（`emit.ts:25-54,291-298`） | tracked canonical の正本 |
| `.codex/hooks.json` | Codex discovery／trust が読む active config | tracked activation copy と mutable runtime state の競合点 |
| `scripts/promote-self.ts` | Claude／Codex／Cursor／OpenCode self-install、local config preserve（`:37-43,84-97,207-299`） | `.codex/hooks.json` を戻さず dirty を保持 |
| agmsg `type.conf` | `hooks_file=.codex/hooks.json`（`:18-22`） | 同一 active path を runtime state に指定 |
| agmsg `delivery.sh`／`hooks-json.sh` | agmsg group の strip／add と SQLite JSON1 compact rewrite | absolute skill／clone path と monitor entry を書き込む直接 writer |
| agmsg `codex-shim.sh`／`codex-monitor.sh` | mode status 読取、app-server／bridge 起動、起動ごとの `set monitor` | Codex 再起動後 delivery を成立させる再書換え経路 |
| `scripts/run-codex.sh`／`scripts/team-up.sh` | shim 起動と Codex member ごとの monitor 再設定 | repository 側の再起動 acceptance boundary |
| `t150`／`t227`／harness fixture | example の hook roster／trust／active copy を検査 | clean fixture で実 monitor 登録後の Git-clean 回帰は未保有 |

恒久案は active file の untrack／ignore、または tracked static dispatcher + ignored sidecar の二案が `【裁定待ち】`。既存9 command と restart delivery の保持を同時に検証する。

## swarm driver 関連コンポーネント（intent 260713-swarm-driver-migration、2026-07-13、履歴）

| コンポーネント | 現行責務 | driver migration との関係 |
| --- | --- | --- |
| `amadeus-orchestrate.ts` `tryEmitSwarm` 系 | autonomous Construction、runtime graph、未完了 batch、walking-skeleton から eligibility を判定 | driver-neutral。#841 の batch 再提示は最初の未完了 batch 選択により解消済み |
| `amadeus-directive.ts` | `invoke-swarm` の schema／parse | `{kind, units, repo?}` のみ。選択結果・能力証跡なし |
| Claude `skills/amadeus/SKILL.md` | live `Task` fan-out、旧変数1で Dynamic `Workflow`、retry loop | Agent Teams／Ultra Code の明示 driver adapter と capability proof は未実装 |
| Codex `skills/amadeus/SKILL.md` | Unit ごとの `codex exec` floor、stdin close、resume | Codex Ultra の明示選択／native multi-agent proof は未実装。現行で唯一の別 AI CLI process fan-out |
| Kiro CLI／IDE `skills/amadeus/SKILL.md` | live native `subagent` 一括 fan-out | driver selector と native trace classifier は未実装 |
| `amadeus-swarm.ts` | `prepare`／`check`／`finalize`、worktree／Bolt、anti-tamper、merge、監査 | stateless referee。AI dispatcher ではない。driver 型は degrade 記録用の旧2値のみ |
| `amadeus-worktree.ts`／`amadeus-bolt.ts` | Unit 隔離と Bolt lifecycle | 全 driver が再利用すべき共通収束境界 |
| `audit-format.md` と swarm emitter | swarm 6イベント | selected driver、capability evidence、native trace correlation が不足 |
| 6 harness の `onboarding.fills.ts` と Codex `emit.ts` | 導入条件、利用者設定、生成設定 | selector、experimental flag、Ultra／trust／probe の契約追加面 |
| `scripts/package.ts` | 6 harness の build、drift／whole-tree orphan／source-unreferenced 検査 | source scan と root orphan blind spot は解消済み。driver 正本の全配布同期を担う |
| `scripts/promote-self.ts` | Claude／Codex／Cursor／OpenCode の project-local self-install | Kiro／Kiro IDE は対象外。4 harness 正本変更時の同期境界 |
| `t135-invoke-swarm`／`t134-swarm-referee` | eligibility と referee の決定的検証 | live AI worker は起動しないため native proof にはならない |
| Codex exec journey／Kiro ACP journey／Claude live journey | opt-in live transport seam | 4 driver の2 Unit以上 live proof へ再利用可能だが専用 classifier は未実装 |

> 以下は過去 intent の棚卸し。#735 の source-side scan と #701 の dist-root orphan は現行 `scripts/package.ts:692-725` で解消済みであり、旧表の「現存」記述は修正前の履歴を表す。

## docs/harness 修理コンポーネント(intent 260711-docs-repair-batch9、フォーカス5欠陥)

現行 HEAD `13598b752`(base `b845478bb`、59コミット diff-refresh)で確定したフォーカス5欠陥の正本コンポーネント。出典は本 intent の `inception/reverse-engineering/scan-notes.md`(全 file:line 実測)。localize 3面(#812/#824 + question-rendering.md 同根)+ ヘッダ契約1面(#680)は区間内無変更、restart-loss 2面(#885/#886)は #880/#869 の行番号シフトのみで欠陥現存。

| コンポーネント | 責務 | 欠陥/関係 |
| --- | --- | --- |
| `harness/kiro-ide/skills/amadeus/SKILL.md` | kiro-ide ハーネスの orchestrator スキル定義 | **#812**(kiro CLI 版と byte-identical = localize 未実施。`:14` `Kiro CLI harness` 見出し / `:84` `kiro-cli chat` CLI 固有 caveat) |
| `harness/kiro-ide/skills/amadeus/question-rendering.md` | 構造化質問レンダリング annex | **#812 同根未カバー候補**(kiro と byte-identical。`:1`/`:11` に `Kiro CLI` 表記2箇所) |
| `harness/kiro-ide/onboarding.fills.ts` | AGENTS.md への onboarding fill(`manifest.ts:93` 経由 `dist/kiro-ide/AGENTS.md` へ出力) | **#824**(2箇所のみ localize 済、7箇所に kiro CLI 表記残存 + `:26` guide_pointer が `kiro-cli.md` 誤指し。dist 伝播済み) |
| `core/tools/amadeus-sensor-type-check.ts` | type-check sensor(`tsc --noEmit` 起動) | **#680**(`:4-5` self-contained ヘッダ主張と `:89` `sensorsDir` from `./amadeus-lib.ts` の矛盾) |
| `core/tools/amadeus-lib.ts` `worktreePath`(`:2099`)/`validateBoltSlug`(`:2580`)/`BOLT_SLUG_REGEX`(`:2430`) | worktree slug の補間と検証 | **#885 の主対象**(`normalizeWorktreeSlug` 喪失で slug 境界一本化なし。大文字混じり slug を reject。batch8 #850 gap2 と lib.ts 交差) |
| `core/tools/amadeus-worktree.ts` `validateSlug`(`:195`)/`SLUG_RE`(`:39`)・`core/tools/amadeus-state.ts` `validateSlug`(`:250`)/`SLUG_RE`(`:248`) | 各ツールの slug 検証(個別実装) | **#885**(旧系譜の同一チョークポイント一本化が喪失、各所で個別 reject) |
| `core/tools/amadeus-state.ts` 境界完了4経路(handleAdvance `:1104` / handleFinalize `:1333` / handleCompleteWorkflow `:1428` / handleApprove `:1670`)+ flip 本体(`setPhaseProgress` `:101` / `markPhaseVerified` `:114`) | phase 境界の PHASE_VERIFIED / roll-up 遷移 | **#886 の主対象**(`verifyPhaseCheckArtifact` precondition 不在。#880 `c4304edf4` が flip のみ再構築) |
| `core/tools/amadeus-jump.ts` / `core/tools/amadeus-orchestrate.ts`(per-phase VERIFIED/SKIPPED) | jump 経路の phase 境界遷移 | **#886**(#869 `aac1869e4` で再構築、phase-check ゲート 0件) |

## packaging コンポーネント(intent 260710、#735 関連)

> **履歴・解決済み**: `checkHarness` は現在 `readSources` と harness source tree を照合し、未参照 source を `UNREFERENCED in source` として報告する（`scripts/package.ts:711-725`）。

| コンポーネント | 責務 | 依存先 | #735 との関係 |
| --- | --- | --- | --- |
| `scripts/package.ts` `buildTree` | build 入力集合の確定と dist 生成(core walk / harnessFiles コピー / onboarding / memory / emit) | `manifest-types.ts`、各 `harness/<name>/manifest.ts`、`core/`、`harness/<name>/` | **build が読む入力集合の確定点**(L307)。未列挙 harness ソースは不可視 |
| `scripts/package.ts` `checkHarness` | committed dist と再ビルドの byte-diff + orphan scan | `buildTree`、`walk` | orphan 検出は**出力側のみ**(L554)。source 側 unreferenced は守備範囲外(#735 のギャップ) |
| `scripts/package.ts` `discoverHarnessNames` | `harness/*/manifest.ts` の存在で harness を発見 | `harness/` dir | 1 manifest = 1 harness(L68) |
| `scripts/manifest-types.ts` `HarnessManifest` | harness 投影ルールの型契約(`coreDirs`/`harnessFiles`/`authoredExempt`/`emit` 等) | — | `authoredExempt`(L101)が orphan scan の除外集合。source 側検査の設計対象 |
| `packages/framework/harness/{claude,codex,kiro,kiro-ide}/manifest.ts` | 各 harness の投影データ | `manifest-types.ts` | `harnessFiles`(出荷対象)と `authoredExempt`(除外)が「参照集合」を定義 |
| `packages/framework/harness/<name>/{manifest,onboarding.fills,emit}.ts` | build 機構(`require()` で読まれ dist 非コピー) | — | **正当に未参照**なソース。source-unreferenced check の誤検出除外対象 |
| `tests/smoke/t148-kiro-file-structure.test.ts` | kiro dist 構造の smoke。#719 再注入ガード(CLI harness ソースに `.kiro.hook` 0個) | `dist/kiro`、`harness/kiro` | #737 の落ちる実証を固定するテスト先例 |

## 260709-gate-mechanics(前 intent、履歴)関連コンポーネント

## 差分リフレッシュ(260709-packaging-repair-batch)

> **履歴・解決済み**: #701 の dist root blind spot は whole-tree orphan scan（`scripts/package.ts:692-709`）で解消済み。

packaging-repair-batch(intent 260709-packaging-repair-batch、履歴)の2バグの正本コンポーネント(下表)と、差分区間 `a1c79dc12..22e3eb5aa` で変更のあったコンポーネント。

| コンポーネント | 責務 | バグ/変更との関係 |
| --- | --- | --- |
| `scripts/package.ts` `checkHarness` | `dist/<name>/` の drift 検査(`--check`) | **#701 の直接対象**(orphan スキャンルート `[".agents","amadeus"]` ハードコード `:611`、projectRoot diff 片方向 `:586-592`)。この差分区間では未変更の既存欠陥 |
| `scripts/release-version-sync.ts` | version.ts/README バッジ/`packages/setup/package.json` の同期(`.release-it.json` の after:bump 経由) | **#702 の直接対象**(version 受理 `:22` とバッジ `:53-54` の非対称)。未変更の既存欠陥 |
| `packages/framework/core/tools/{amadeus-audit,amadeus-bolt,amadeus-lib,amadeus-sensor-type-check,amadeus-state,amadeus-swarm}.ts` | audit / Bolt / 共有ライブラリ / type-check sensor / 状態遷移 / swarm | 全 M。delegated-approval provenance、sensor-type-check の tsc launcher 化、hook project-dir/worktree marker 解決を反映 |
| `packages/setup/src/{ports/http,internal/tar-archive-extractor,domain/installation}.ts` | HTTP ポート / tar 展開 / インストール判定 | M(独立 npm 配布経路) |
| `tests/lib/test-size.ts` + `tests/unit/t-test-size-drift.test.ts` | テストサイズドリフトガード | 新規(A)。品質ゲート追加 |
| `tests/unit/{setup-http,t112-delegated-approval,t202-hook-project-dir-worktree-marker,t202-sensor-type-check-tsc-launcher}.test.ts` | 上記コアツール変更のリグレッションテスト | 新規(A) |
| `tests/`(class-B 14ファイル、PR #703) | hermeticity 修正済みユニット/インテグレーションテスト | M |

## Framework コンポーネント(既存、安定)

| コンポーネント | 責務 | 依存先 | 対象 intent との関係 |
| --- | --- | --- | --- |
| `packages/framework/core/` | AI-DLC engine source, tools, templates, stage 定義 | 各種 scripts・manifest | #674/#675/#676/#668 の正本を含む |
| `packages/framework/harness/<name>/` | harness ごとの配布 source | `scripts/manifest-types.ts` | 直接の修理対象なし |
| `scripts/package.ts` | `dist/<name>` の生成と検査 | `packages/framework/core`, `packages/framework/harness` | 6件すべての修理伝播経路(正本修正後に必須) |
| `scripts/promote-self.ts` | self-install と drift check | root `dist/{claude,codex,cursor,opencode}` | 同上 |

## swarm/gate コンポーネント(#674・#675 の対象)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-swarm.ts` `handleFinalize` | claimed unit の再検証、merge-back、audit 発行 | `amadeus-bolt.ts`(`release-merge`/`complete --merge`)、`emitUnitConverged`/`emitUnitFailed` | **#674 の直接対象** |
| `packages/framework/core/tools/amadeus-state.ts` `handleApprove` | ゲート承認、human-presence guard、advance への delegate | `isAutonomousMode`/`humanPresenceGuardDisabled`/`humanActedSinceGate`(`amadeus-lib.ts`) | ガードの実装例(#675 との非対称比較対象) |
| `packages/framework/core/tools/amadeus-state.ts` `handleReject` | ゲート却下、Revision Count 増分 | `validateSlugInState`、`withAuditLock` | **#675 の直接対象**(ガード欠落) |

## bolt/audit コンポーネント(#676・#668 の対象)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-bolt.ts` `handleStart` | Bolt/worktree 起動、`BOLT_STARTED` audit 発行 | `emitAudit`、`readStateFile` | **#676 の直接対象**(呼び出し元) |
| `packages/framework/core/tools/amadeus-lib.ts` `auditFilePath` | intent/space から audit shard パスを解決 | `recordDir`、`spaceRecordRoot`、`auditShardName` | **#676 の直接対象**(bare fallback の発生源) |
| `packages/framework/core/tools/amadeus-lib.ts` `codekbRepoName` | per-repo codekb ディレクトリ名の解決 | `intentRepos`、`basename` | **#668 の直接対象** |
| `packages/framework/core/tools/amadeus-utility.ts` `codekb-path` ハンドラ | `codekb-path` CLI コマンドの実装 | `codekbRepoName` | #668 の呼び出し元 |

## `@amadeus-dlc/setup` コンポーネント(#677・#678 の対象)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/setup/src/ports/http.ts` `createHttp`(`getJson`/`downloadArchive`) | GitHub API/アーカイブ取得のポート実装 | `fetchChecked`、`fetchFollowingAllowedHosts` | **#677 の直接対象**(`getJson`) |
| `packages/setup/src/internal/tar-archive-extractor.ts` `extractTarGz` | tar.gz のストリーミング展開、PAX/GNU longname 処理 | `TmpWrite` port、`node:zlib` | **#678 の直接対象** |
| `packages/setup/src/modules/fetcher.ts`(想定、直接読解対象外) | `Http` ポートの呼び出し元、リトライ制御 | `ports/http.ts` | #677 の間接的影響範囲(要確認) |

## presence/gate コンポーネント(#708 の対象、integrity-batch)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/framework/core/hooks/amadeus-mint-presence.ts`(L23-31) | UserPromptSubmit で `HUMAN_TURN` を audit へ mint(stdin 未読・無条件) | `resolveProjectDirFromHook`、`appendAuditEntry`、`stateFilePath` | **#708 の直接対象**(mint 側・偽陽性の発生源) |
| `packages/framework/core/tools/amadeus-lib.ts` `humanActedSinceGate`(L1442-1479)/ `verifyDelegatedApproval`(L1480-) | 監査台帳から人間関与を判定。委任承認 provenance(#671)の物理照合 | audit シャード、`isHumanTurn`(L1451) | **#708 の対象**(gate 側・偽 `HUMAN_TURN` を無条件カウント) |
| `packages/framework/core/tools/amadeus-lib.ts` `ClaudeCodeHookInput`(L2029-2047)/ `isClaudeCodeHookInput`(L2049-2051) | hook 入力 JSON の型と型ガード。`source?`/`prompt?` を既宣言 | `isPlainObject` | #708 修正の型基盤(フィールド追加不要、ただし型在≠ランタイム到来) |
| `packages/framework/core/hooks/amadeus-audit-logger.ts`(L29-44)/ `amadeus-session-start.ts`(L86-96) | stdin parse の canonical パターン(`isTTY`→`Bun.stdin.text()`→`JSON.parse`→型ガード→fail-open) | `ClaudeCodeHookInput` | #708 修正の参照実装(mint-presence を寄せる型) |

## codekb 永続化コンポーネント(#707 の対象、integrity-batch)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-lib.ts` `codekbRepoName`(L556-565) | codekb ディレクトリ名を origin remote 由来で解決(#693 統一) | `intentRepos`、`originRepoSlug`、`basename` | **#707 の前提機構**(全 worktree が同一 `codekb/amadeus/` を指す) |
| `.claude/amadeus-common/stages/inception/reverse-engineering.md`(L5/L36/L110) | RE ステージ定義。常時リフレッシュ・9固定ファイル・単一 timestamp marker | — | **#707 の直接対象**(単一 timestamp が並行 base/observed を表現不能) |

## テストハーネスコンポーネント(#705 の対象、integrity-batch)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `tests/harness/sdk-drive.calibration.test.ts`(L55-72) | doctor 既知回答文字列のピン留め検証 | `driveAidlc`、doctor ハンドラ | **#705 の直接対象**(L72 期待値ドリフト + ランナー管理外) |
| `tests/run-tests.ts`(L31/L577-587/L485-489) | tier discovery と substrate skip | `Level` ディレクトリ列挙 | #705 の構造的根拠(`tests/harness/` は tier 外) |
| `packages/framework/core/tools/amadeus-utility.ts`(L628 doctor) | doctor のワークスペースチェック出力(`workspace shell ready ...`) | `harnessDir` | #705 の期待値対向(旧文言不在) |

## knowledge 配布コンポーネント(#706 の対象、integrity-batch)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md`(L3) | delivery 実行計画ガイド。不在 `product-guide.md` を tree 外参照 | — | **#706 の直接対象**(core→dist→self-install 全複製に伝播) |
| `packages/framework/core/agents/amadeus-delivery-agent.md`(L71-77) | delivery-agent の knowledge ロードパス宣言 | 自 dir + `amadeus-shared/` のみ | #706 の根拠(product-agent dir は読まない) |
| `packages/framework/core/knowledge/amadeus-product-agent/product-guide.md` | 実在する product ガイド(参照先の正しい所在) | — | #706 修正方向の判断材料(7箇所に伝播済み) |

## 品質コンポーネント(既存)

| コンポーネント | 責務 | 依存先 | 対象 intent との関係 |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | CI(typecheck → lint → dist:check → promote:self:check → tests) | root package scripts | 6件の修理後もグリーンを維持する必要がある |
| `packages/setup/tests/setup-*.test.ts`(11ファイル) | `packages/setup` のユニットテスト | 各モジュール | #677/#678 のリグレッションテストをここに追加 |
| `tests/` 配下の framework テスト群 | `amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts`/`amadeus-lib.ts` のテスト | 各ツール | #674/#675/#676/#668 のリグレッションテストをここに追加 |

## Coverage / ゲートコンポーネント(260710-codecov-project-gate の対象)

> 出典: `.github/workflows/ci.yml`・`codecov.yml`・`tests/run-tests.ts`・`tests/gen-coverage-registry.ts`(2026-07-10, HEAD 98089faf 実測)。詳細は code-structure.md 「Coverage CI 経路」節を参照。

| コンポーネント | 責務 | 依存先 | 対象 intent との関係 |
| --- | --- | --- | --- |
| `ci.yml` `coverage` ジョブ(:60-103) | `coverage:ci` で lcov 生成・artifact 化・Codecov 送信 | `tests/run-tests.ts`, `package.json` scripts | 自前 project ゲートの lcov 供給元。ゲートを本ジョブ内ステップ(B)にするか独立ジョブ(A)にするかは設計判断 |
| `ci.yml` `codecov-status` ジョブ(:105-200) | Codecov 外部 status を polling(patch 待ち役割は #687 で稼働) | Codecov, `github-script` | 自前ゲートは非依存(polling 不要)。#717 が `requiredChecks` を触るが codecov-project-gate が supersede 対象 |
| `ci.yml` `ci-success` ジョブ(:202-225) | `require_result()` で3ジョブ result を集約ゲート | check/coverage/codecov-status | 自前ゲートを配線する先(needs 追加 or coverage ジョブ result 経由) |
| `tests/run-tests.ts`(coverage 経路) | LCOV 生成・正規化・総%算出(`totalHits/totalLines` :597-599) | bun test | 総%の機械可読 emit 追加候補(乖離ゼロで再利用可) |
| `tests/gen-coverage-registry.ts` + `tests/.coverage-ratchet.json` | ラチェット(件数ベースの単調 fail-closed、env 差し替え可) | `tests/unit/gen-coverage-registry.test.ts` | ベースライン運用の設計テンプレート(リポ内ファイル + 単調 fail-closed + 落ちる実証) |
| `codecov.yml` | `fixes`(6)・`ignore`(8)・`status.project`/`status.patch` 定義 | Codecov | 母集団定義(ignore 模倣可否)と `status.project` ブロック残置/削除の判断材料 |
