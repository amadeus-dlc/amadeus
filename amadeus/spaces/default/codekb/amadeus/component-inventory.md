# コンポーネント棚卸し

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

## `@amadeus-dlc/setup` ドメイン型 seam(#697 PBT 対象、2026-07-09 追記)

| コンポーネント | file:line | 責務 | PBT 上の性質 |
| --- | --- | --- | --- |
| `packages/setup/src/domain/semver.ts` `SemVer`(`parse`/`latestStableOf`) | `:19-28` / `:30-37` | semver パース・stable 最大選択 | 純関数。roundtrip / "v" 正規化冪等 |
| `packages/setup/src/internal/semver-factory.ts`(`isLaterThan` 他) | `:15-27` | 比較律の実体 | 純。**prerelease 非全順序**(全順序は stable に閉じる) |
| `packages/setup/src/domain/version-spec.ts` `VersionSpec` | `:11-21` | `latest`/`exact` 版指定 | 純。`exact` は `SemVer.parse` 委譲不変 |
| `packages/setup/src/domain/manifest.ts` `ManifestFiles`/`Manifest` | `:28-37` / `:77-92` / `:125-187` | manifest 構築・重複検出・JSON roundtrip | 純。重複 path 不変条件 / build↔parse roundtrip |
| `packages/setup/src/domain/plan.ts` 純判定 seam(`classify`/`classifyAction`/`toPlanAction`) | `:227-233` / `:162-168` / `:209-218` | パス分類・アクション決定・Disposition 写像 | 純だが **現状 private**。export 方式を functional-design で確定要 |
| `packages/setup/src/domain/plan.ts` FS 依存(`walkFiles`/`md5OfFileSync`/`buildEntries`/`buildUpgradeEntries`) | `:235-249` / `:256-270` / `:145` / `:181` | FS 走査・md5・エントリ構築 | FS を掴む。medium のまま(in-process 化しない) |
| `packages/framework/core/tools/amadeus-audit.ts` 監査エスケープ(`appendAuditEntry` 内インライン) | `:287-298`(核 `:295`) | 改行→`\n` エスケープ(監査ブロック偽造防止) | 純だが未 export。純関数化には core 編集→dist 再生成+promote:self 同一コミット必須(波及大、Bolt 粒度判断) |

## test-size / PBT 支援コンポーネント(#700 / #688、2026-07-09 追記)

| コンポーネント | file:line | 責務 | 本 intent との関係 |
| --- | --- | --- | --- |
| `tests/lib/test-size.ts`(`classifyTestSize`/`parseSizeAnnotation`/`SIZE_ORDER`) | `:49-62` / `:74-86` / `:28` | test size の静的分類・注釈読取・順序定義 | Small band 計測の単一ソースオブトゥルース |
| `tests/run-tests.ts` `printSizeMatrix` | `:891-947` | scope×size 行列・annotated 集計(非ゲート) | Small band 進捗の可視化 |
| `tests/unit/t-test-size-drift.test.ts` | — | 宣言<計測のときのみ失敗するドリフトガード | 新規 Small テスト追加時の契約 |
| `tests/unit/{setup-semver,setup-manifest}.test.ts`(`// size: small`) | 各 `:2` | 既存 Small ユニット | PBT を追記するだけ(in-process 化の距離ゼロ) |
| `tests/unit/setup-plan.test.ts`(注釈なし・実 FS) | `:10`/`:29-37` | plan 統合テスト | 派生 medium。seam 抽出後に別 Small ファイルを追加、既存 FS 統合は medium で残す |
| `fast-check`(未導入) | `package.json:28-34` に不在 | PBT ランナー | **devDependency として追加**(新設 package でないため package 別 CI 配線ルール対象外)。lint スコープ `tests/ packages/setup/`(`:18`)内に PBT を置けば既存配線で足りる |

## 品質コンポーネント(既存)

| コンポーネント | 責務 | 依存先 | 本 intent との関係 |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | CI(typecheck → lint → dist:check → promote:self:check → tests) | root package scripts | 6件の修理後もグリーンを維持する必要がある |
| `packages/setup/tests/setup-*.test.ts`(11ファイル) | `packages/setup` のユニットテスト | 各モジュール | #677/#678 のリグレッションテストをここに追加 |
| `tests/` 配下の framework テスト群 | `amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts`/`amadeus-lib.ts` のテスト | 各ツール | #674/#675/#676/#668 のリグレッションテストをここに追加 |
