# コンポーネント棚卸し

## 差分リフレッシュ(260709-packaging-repair-batch)

本 intent の2バグの正本コンポーネント(下表)と、差分区間 `a1c79dc12..22e3eb5aa` で変更のあったコンポーネント。

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

| コンポーネント | 責務 | 依存先 | 本 intent との関係 |
| --- | --- | --- | --- |
| `packages/framework/core/` | AI-DLC engine source, tools, templates, stage 定義 | 各種 scripts・manifest | #674/#675/#676/#668 の正本を含む |
| `packages/framework/harness/<name>/` | harness ごとの配布 source | `scripts/manifest-types.ts` | 直接の修理対象なし |
| `scripts/package.ts` | `dist/<name>` の生成と検査 | `packages/framework/core`, `packages/framework/harness` | 6件すべての修理伝播経路(正本修正後に必須) |
| `scripts/promote-self.ts` | self-install と drift check | root `dist/claude`, `dist/codex` | 同上 |

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

| コンポーネント | 責務 | 依存先 | 本 intent との関係 |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | CI(typecheck → lint → dist:check → promote:self:check → tests) | root package scripts | 6件の修理後もグリーンを維持する必要がある |
| `packages/setup/tests/setup-*.test.ts`(11ファイル) | `packages/setup` のユニットテスト | 各モジュール | #677/#678 のリグレッションテストをここに追加 |
| `tests/` 配下の framework テスト群 | `amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts`/`amadeus-lib.ts` のテスト | 各ツール | #674/#675/#676/#668 のリグレッションテストをここに追加 |
