# ビジネス概要

## 目的

Amadeus は AI-DLC ワークフローを複数の AI harness(Claude、Codex、Kiro CLI、Kiro IDE)に配布するための framework リポジトリである。前々回 intent `260708-installer-distribution` で `packages/setup`(`@amadeus-dlc/setup`)が完成し、前回 intent `260709-framework-repair-batch` で4件のバグ(#656/#657/#641/#661)の修理対象が特定された。本 intent `260709-bug-zero-batch` はさらに新しく見つかったバグ6件(#674〜#678、#668)をまとめて修理するバッチである。前回バッチの4件とは対象コード領域が異なる、独立したバグ群である。

## 現在の業務境界

配布フローの三層構造(`packages/framework/core/`、`packages/framework/harness/<name>/`、root `dist/<name>/`)と独立配布パッケージ `packages/setup/` は変更しない。この intent はその内側で発見された6件の具体的な欠陥を修理する。

## この intent が対象とする業務境界(バグ6件)

- **#674 amadeus-swarm.ts finalize の merge-back 失敗が results/audit に反映されない**: `handleFinalize()`(`packages/framework/core/tools/amadeus-swarm.ts:484-631`)は、まず claimed unit を再検証して `results` 配列に `status: "converged"` を確定させ(L551-553)、その後に merge-back ループ(L588-599)で `amadeus-bolt.ts complete --merge` を実行する。merge が失敗しても `mergeFailures` にだけ記録され、既に確定済みの `results` エントリは書き換わらない。結果として `emitUnitConverged`(L604-605)が実行され、失敗した merge であっても audit trail 上は「converged」として記録される。
- **#675 amadeus-state.ts reject に human-presence guard が無い**: `handleApprove()`(`amadeus-state.ts:1286-1379`)は L1316-1337 で human-presence guard(autonomous mode / suite-wide off-switch / `humanActedSinceGate` チェック)を実装しているが、`handleReject()`(`amadeus-state.ts:1430-1487`)には同等のガードが一切存在しない。approve は「ゲートに人間が実際に反応したこと」を強制するが、reject は誰(または何)が呼んでも無条件に通る非対称な実装になっている。
- **#676 amadeus-bolt.ts start --worktree の audit shard 迷子**: `start`(`amadeus-bolt.ts:196-220`)は `--worktree` パスで `emitAudit(pd, "BOLT_STARTED", fields, flags.intent, flags.space)` を呼ぶ(L220)。この呼び出しは内部で `auditFilePath()`(`amadeus-lib.ts:1267-1270`)を経由するが、`recordDir(pd, intent, space)` が解決できない(intent がまだ resolve できない/存在しない)場合、`auditFilePath` は L1269 の bare fallback(`spaceRecordRoot` 直下の `audit/<shard>`)に落ちる。intent 固有の record dir 外に BOLT_STARTED が書かれ、後で intent の audit trail を読む側(`audit/*.md` glob)から見失われる。
- **#677 packages/setup/src/ports/http.ts getJson の json() が未保護**: `getJson()`(`http.ts:23-28`)は `fetchChecked()` のエラーを Result 型で受け取るが、成功後の `checked.value.json()`(L27)は `fetchChecked` の try/catch の外で await されている。GitHub API が 200 を返しつつ body が不正 JSON の場合、`json()` の reject が `Result.err` に変換されず、呼び出し元まで未処理の Promise rejection として伝播する。
- **#678 packages/setup/src/internal/tar-archive-extractor.ts の PAX/GNU longname 状態喪失**: `extractTarGz()`(`tar-archive-extractor.ts:36-148`)は `pendingLongName`(モジュール内のローカル変数、L37)を使って PAX(`x`)/GNU longname(`L`)ヘッダの値をチャンク境界を越えて保持する設計だが、`drain()` はネットワークチャンク単位で呼ばれる非同期ジェネレータの内側にあり、chunk 跨ぎで `pendingLongName` の値そのものは保持される(クロージャ変数のため状態は生きている)ものの、PAX/GNU ヘッダとその後続のファイルエントリヘッダが異なる `drain()` 呼び出し(異なる chunk)に分かれて到着した場合の境界処理を実測で確認する必要がある(次工程での検証対象)。
- **#668 amadeus-utility.ts / amadeus-lib.ts の codekb-path `<repo>` セグメント導出**: `codekbRepoName()`(`amadeus-lib.ts:501-504`)は `intentRepos()` が複数または0件のリポジトリを返した場合、`basename(projectDir)` にフォールバックする。worktree で作業している場合 `projectDir` はワークツリーのディレクトリ名(例: `claude-engineer-1`)であり、実際のリポジトリ名(例: `amadeus`)と一致しない。`codekb-path` コマンド(`amadeus-utility.ts:2690-2699`)はこの `codekbRepoName()` を経由するため、worktree からの実行では `<repo>` セグメントがワークツリー名になり、複数の worktree(`claude-engineer-1`、`claude-engineer-2` 等)がそれぞれ別の codekb ディレクトリを持つことになる。

## 現状の制約・未整備事項

- 6件とも未修正(コード上に修理の痕跡なし)。今回のスキャンで全件の実在を確認した。
- 前回バッチの対象だった #656/#657/#641/#661 のうち、#656(`LegacyLayout.isUnsupported` の呼び出し配線)は `upgrade.ts:192` で `Installation.detect` の evidence を消費する形で解消済みと確認できた。#657(`bunx tsc` の無条件使用、`amadeus-sensor-type-check.ts:157,174`)は本スキャン時点でも未修理のまま残存している。#641・#661 の状態は本スキャンの重点対象外のため未確認。
- 本 intent はこれら旧バッチのバグの修理を担わない。スコープは #674/#675/#676/#677/#678/#668 の6件のみ。

## 成功条件

この stage の成果は実装ではなく、後続 stage(requirements-analysis 等)が依拠する CodeKB 更新である。成功条件は次の通り。

- 6件のバグそれぞれの再現条件・原因コード位置を、テスト可能な形で後続 stage へ引き継いでいる。
- 各バグの修理が波及する箇所(audit shard 読み手、CLI 契約、テスト)を棚卸ししている。
- `bugfix` スコープの test posture(既存スイートのグリーン維持 + 各バグへのリグレッションテスト追加)に沿った修理範囲の見積りができる状態にする。
