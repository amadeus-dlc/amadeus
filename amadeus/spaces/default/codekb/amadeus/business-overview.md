# ビジネス概要

## 260722-teamup-prompt-race の業務境界（2026-07-22、現在）

bugfix / Minimal（observed `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`、距離101）。利用者価値は team 起動（`scripts/team-up.sh`）の信頼性回復に限定する。[Issue #1384](https://github.com/amadeus-dlc/amadeus/issues/1384): claude メンバーの初期プロンプト `/agmsg mode monitor` が TUI 起動レースで消失し watcher（agmsg monitor）が起動しない不具合（再現率 5/6）を、起動後の readiness 検証・再送で修復する。フレームワーク中核（core/harness の投影・配布契約）には非交差で、業務ドメイン境界は変化しない。詳細は `re-scans/260722-teamup-prompt-race.md`。

> 以下は過去 intent の履歴。

## 260720-upstream-sync-230 の業務境界（2026-07-20、履歴）

Amadeus は、単一の AI-DLC core を6ハーネス（Claude Code、Codex、Cursor、Kiro CLI、Kiro IDE、OpenCode）へ決定的に投影する brownfield フレームワークである。本 intent は、承認済みの upstream `awslabs/aidlc-workflows` v2.2.0→v2.3.0 同期計画を実装可能な要件・設計へ落とすため、24件の ADOPT/ADAPT 項目を現行コード `545e69c836d46f7bec2fa351c8e668026eb5fad5` で再照合した差分リフレッシュである。

利用者価値は、既存ワークフローの正しさを回復しつつ、プラグインを「非アクティブなら現行 core とバイト同一、アクティブなら明示的な compose・投影・テスト契約として働く」拡張点として追加することにある。対象は次の8業務ドメインで、すべて Must として承認済みである。

| ドメイン | 項目数 | 現在の意味 |
|---|---:|---|
| D1 エンジン正しさ | 6 | DAG 自己修復、ゲート回復、help/compose/recompose の fail-closed 化 |
| D2 エンジン機能 | 4 | Unit kind、major iteration、cost preview、次ステージ名の公開 |
| D3 workspace 検出 | 2 | nested root と submodule を advisory として検出 |
| D4 ハーネス統合 | 3 | `execPath`、Kiro IDE context、project-dir quote を6面へ適応 |
| D5 reviewer 品質 | 2 | 日付・persona と bounded read scope を明文化 |
| D6 プラグイン | 5 | schema→packager→compose→reference plugin→docs の最小閉路 |
| D7 テスト | 1 | upstream 由来シナリオを現行 Bun テストへ再著作 |
| D8 文書 | 1 | 採用した公開契約だけを利用者・開発者文書へ同期 |

Developer scan の現状判定は MISSING 19、PARTIAL 4、EQUIVALENT 候補 1（測定 ref: `a326f47bc..545e69c8`、24項目の file:line 照合）である。明確な縮小候補は D1-3 `swarm-batch-advance` のみで、D2-10 `gate-next-stage-naming` は state/audit 内部情報があるだけで directive 契約としては未完成である。最大の新規価値かつ最大の実装ブロックは D6 プラグイン機構であり、schema と Unit kind の共有 blast radius、6ハーネス投影、source/dist/self-install の所有権分離を同時に満たす必要がある。

成功条件は、(1) 24項目を MISSING/PARTIAL/EQUIVALENT の実測から再確定する、(2) `packages/framework/core/` と `packages/framework/harness/{name}/` を正本として6ハーネスの生成物を同期する、(3) `bun scripts/package.ts --check` と `bun scripts/promote-self.ts --check --no-build` を維持する、(4) 採用項目ごとの回帰テストと docs を同じ着地単位へ含める、である。SKIP 6件（既存 EQUIVALENT 3件、生成物・フォーク固有3件）は履歴境界として維持する。

> 以下は過去 intent の業務境界であり、今回の current marker ではない。

## 260713-swarm-driver-migration の業務境界（2026-07-13、履歴）

Amadeus の Construction では、依存関係を持つ複数 Unit を同一バッチで実装し、Unit ごとの隔離 worktree と決定的な収束判定を組み合わせる。現行の公開スイッチ `AMADEUS_USE_SWARM` は boolean だが、実際の実行方式は Claude Code の `Task`／Dynamic `Workflow`、Codex の Unit ごとの `codex exec`、Kiro の native `subagent` とハーネスごとに異なる。この差を利用者が明示・検証できる共通 driver 契約は、観測コミット `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5` 時点では未実装である。

今回の intent は、Construction の multi-Unit `invoke-swarm` に限って `AMADEUS_SWARM_DRIVER` を公開契約とし、次の利用者価値を成立させるための brownfield 変更である。

- `auto` はハーネス能力と task topology から決定的に driver を選び、fallback を画面と監査の両方へ残す。
- 明示 driver は利用不能なら実行開始前に hard error とし、別方式で成功扱いしない。
- Claude Code Agent Teams、Claude Ultra Code、Codex Ultra、Kiro subagent を、2 Unit 以上の native 実行証跡と既存 referee の収束結果で検証する。
- `AMADEUS_USE_SWARM` は 0.1.x の警告付き互換に閉じ、0.2.0 での削除は後続 Issue とする。

対象外は、通常の `run-stage`／対話 conductor／Responses API Multi-agent／custom driver SDK／新しい credentialed CI job である。engine の eligibility、Unit worktree、Bolt、保護 spec、`prepare`／`check`／`finalize` の収束境界は維持し、driver 選択と native 実行証跡をその外側へ追加する。

> 以下は過去 intent の業務境界を履歴として温存したもの。`260710-source-unreferenced-check` の source-side 検査ギャップは、現行 `scripts/package.ts:711-725` で解消済みである。

## 260710-source-unreferenced-check(intent、履歴)の業務境界

`bugfix` スコープの intent。packaging(`scripts/package.ts` + harness manifests)の **source 側 unreferenced 検査**(Issue #735)を対象とする。既存の drift guard(`dist:check`)は「committed dist に混入した stale ファイル(出力側 orphan)」を検出するが、「`harness/<name>/` に置かれた authored ソースが manifest のどの行からも参照されず build に不可視のまま滞留する(source 側 unreferenced)」ことを検出しない。#719/#737 でこのギャップの実害(kiro CLI harness の7個の stale `.kiro.hook` が vacuous exemption に隠れて滞留)が顕在化しており、当該 intent はその一般的な検査機構を検討した。

> **前回 intent の2バグは出荷済み**: **#685 delegate-rejection は #729** で解消(`DELEGATED_REJECTION` イベント + `delegate-rejection` subcommand を追加、agent-team topology でリモート conductor がゲートを拒否可能に)、**#670 sibling-worktree guard は #727** で解消(worktree write パスをメインチェックアウトへアンカーし、sibling dev worktree からの `create`/`bolt --worktree` を許容)。以下の「260709-gate-mechanics」節は歴史的記録。

## 260709-gate-mechanics(前 intent、履歴)の業務境界

前回バッチ(`260709-bug-zero-batch`)完了後の新しい bugfix intent。既存 2 バグに絞ったバッチであり、対象コード領域は前回バッチと重複しない(前回対象の `amadeus-swarm.ts`/`packages/setup/` 系ではなく、gate 解決・worktree 実行系)。

- **#685 delegate-rejection**: human-presence gate の REJECT パスに、agent-team topology でリモートの conductor がゲートを拒否するための遠隔委任機構がない。#671 で APPROVE 側にのみ追加された `delegate-approval`(issuer の実 `HUMAN_TURN` を根拠に検証する仕組み)と対称な仕組みを REJECT 側に追加する必要がある。`DELEGATED_APPROVAL` イベントを REJECT 目的に転用すると意味論が破綻するため、新規の delegated-rejection イベント種別を要する。
- **#670 sibling-worktree guard**: `assertNotSiblingWorktree`(`packages/framework/core/tools/amadeus-worktree.ts`)が、マルチワークツリーのチーム体制で sibling worktree から `amadeus-worktree create`/`bolt --worktree` を実行するケースをすべて拒否してしまい、この運用形態での Bolt worktree モード利用をブロックしている。

## 目的

Amadeus は AI-DLC ワークフローを複数の AI harness(Claude、Codex、Kiro CLI、Kiro IDE)に配布するための framework リポジトリである。前々回 intent `260708-installer-distribution` で `packages/setup`(`@amadeus-dlc/setup`)が完成し、前回 intent `260709-framework-repair-batch` で4件のバグ(#656/#657/#641/#661)の修理対象が特定された。intent `260709-bug-zero-batch` はさらに新しく見つかったバグ6件(#674〜#678、#668)をまとめて修理するバッチである。前回バッチの4件とは対象コード領域が異なる、独立したバグ群である。

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

- 6件とも未修正(コード上に修理の痕跡なし)。bug-zero-batch のスキャンで全件の実在を確認した。
- 前回バッチの対象だった #656/#657/#641/#661 のうち、#656(`LegacyLayout.isUnsupported` の呼び出し配線)は `upgrade.ts:192` で `Installation.detect` の evidence を消費する形で解消済みと確認できた。#657(`bunx tsc` の無条件使用、`amadeus-sensor-type-check.ts:157,174`)は本スキャン時点でも未修理のまま残存している。#641・#661 の状態は本スキャンの重点対象外のため未確認。
- bug-zero-batch はこれら旧バッチのバグの修理を担わない。スコープは #674/#675/#676/#677/#678/#668 の6件のみ。

## 成功条件

この stage の成果は実装ではなく、後続 stage(requirements-analysis 等)が依拠する CodeKB 更新である。成功条件は次の通り。

- 6件のバグそれぞれの再現条件・原因コード位置を、テスト可能な形で後続 stage へ引き継いでいる。
- 各バグの修理が波及する箇所(audit shard 読み手、CLI 契約、テスト)を棚卸ししている。
- `bugfix` スコープの test posture(既存スイートのグリーン維持 + 各バグへのリグレッションテスト追加)に沿った修理範囲の見積りができる状態にする。
