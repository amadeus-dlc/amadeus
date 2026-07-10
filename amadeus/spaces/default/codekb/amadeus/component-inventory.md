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

## 品質コンポーネント(既存)

| コンポーネント | 責務 | 依存先 | 本 intent との関係 |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | CI(typecheck → lint → dist:check → promote:self:check → tests) | root package scripts | 6件の修理後もグリーンを維持する必要がある |
| `packages/setup/tests/setup-*.test.ts`(11ファイル) | `packages/setup` のユニットテスト | 各モジュール | #677/#678 のリグレッションテストをここに追加 |
| `tests/` 配下の framework テスト群 | `amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts`/`amadeus-lib.ts` のテスト | 各ツール | #674/#675/#676/#668 のリグレッションテストをここに追加 |

## Coverage / ゲートコンポーネント(260710-codecov-project-gate の対象)

> 出典: `.github/workflows/ci.yml`・`codecov.yml`・`tests/run-tests.ts`・`tests/gen-coverage-registry.ts`(2026-07-10, HEAD 98089faf 実測)。詳細は code-structure.md 「Coverage CI 経路」節を参照。

| コンポーネント | 責務 | 依存先 | 本 intent との関係 |
| --- | --- | --- | --- |
| `ci.yml` `coverage` ジョブ(:60-103) | `coverage:ci` で lcov 生成・artifact 化・Codecov 送信 | `tests/run-tests.ts`, `package.json` scripts | 自前 project ゲートの lcov 供給元。ゲートを本ジョブ内ステップ(B)にするか独立ジョブ(A)にするかは設計判断 |
| `ci.yml` `codecov-status` ジョブ(:105-200) | Codecov 外部 status を polling(patch 待ち役割は #687 で稼働) | Codecov, `github-script` | 自前ゲートは非依存(polling 不要)。#717 が `requiredChecks` を触るが本 intent が supersede 対象 |
| `ci.yml` `ci-success` ジョブ(:202-225) | `require_result()` で3ジョブ result を集約ゲート | check/coverage/codecov-status | 自前ゲートを配線する先(needs 追加 or coverage ジョブ result 経由) |
| `tests/run-tests.ts`(coverage 経路) | LCOV 生成・正規化・総%算出(`totalHits/totalLines` :597-599) | bun test | 総%の機械可読 emit 追加候補(乖離ゼロで再利用可) |
| `tests/gen-coverage-registry.ts` + `tests/.coverage-ratchet.json` | ラチェット(件数ベースの単調 fail-closed、env 差し替え可) | `tests/unit/gen-coverage-registry.test.ts` | ベースライン運用の設計テンプレート(リポ内ファイル + 単調 fail-closed + 落ちる実証) |
| `codecov.yml` | `fixes`(6)・`ignore`(8)・`status.project`/`status.patch` 定義 | Codecov | 母集団定義(ignore 模倣可否)と `status.project` ブロック残置/削除の判断材料 |
