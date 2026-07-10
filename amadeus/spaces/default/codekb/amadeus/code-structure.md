# コード構造

## 差分リフレッシュ(260709-packaging-repair-batch)

本 intent の2バグの正本ファイルと、差分区間 `a1c79dc12..22e3eb5aa` の構造的差分。

| パス | 役割 | 本 intent との関係 |
| --- | --- | --- |
| `scripts/package.ts` | `dist/<name>/` の生成・検査(`buildTree`/`writeHarness`/`checkHarness`) | **#701 の対象**。`checkHarness`(L554-624)の orphan スキャンルート集合 `[".agents","amadeus"]`(L611)が dist ルート平坦面を含まない。clean-sweep(`writeHarness` L521-549)も harness dir と `dist/<name>/amadeus/` の2つのみを掃く |
| `scripts/release-version-sync.ts` | version 面3点(version.ts / README バッジ / setup package.json)の同期 | **#702 の対象**。`patchFile`(L34-45)、version.ts patch(L47-51)→ badge patch(L53-54)の適用順、version 受理正規表現(L22) |

**tests/ 層の目録更新(hermeticity 再編 + 新規)**:

- 新規(A): `tests/lib/test-size.ts`(テストサイズ計測の共有ヘルパー、`tests/lib/` 配下)、`tests/unit/t-test-size-drift.test.ts`(サイズドリフトガード)、`tests/unit/setup-http.test.ts`、`tests/unit/t112-delegated-approval.test.ts`、`tests/unit/t202-hook-project-dir-worktree-marker.test.ts`、`tests/unit/t202-sensor-type-check-tsc-launcher.test.ts`。
- 再編(M): PR #703 により `tests/unit/`・`tests/integration/`・`tests/e2e/` の多数ファイルで hermeticity(共有状態・実行順序依存の排除)修正。`tests/run-tests.ts`・`tests/lib/setup-*-fixture.ts`・coverage レジストリ(`.coverage-ratchet.json`/`.coverage-registry.json`)も追随更新。
- テスト層構成(smoke / unit / integration / e2e の4層 + `tests/lib/` 共有)自体は不変。
- 新規(A、`9a2f5c72..24197d755` = `260709-dynamic-test-size` スキャンで確認、#721/#722 由来): `tests/helpers/arbitraries/semver.ts`(PBT 用 arbitrary ヘルパー、**新規ディレクトリ `tests/helpers/arbitraries/`**)、`tests/unit/setup-semver.pbt.test.ts`(fast-check ベース PBT 単体テスト、ヘッダ `// covers: domain:setup-semver` / `// size: small`)。テストランナー・size 分類ロジックには非関与(#699 フォーカス面への影響なし)。`tests/integration/t92.test.ts` は #709 対応で test 44 に skip ガードを追加(M)。

## トップレベル構造

`packages/` は `framework` と `setup` の2パッケージ構成のまま。トップレベル構造自体に変更はない。

| パス | 役割 | 本 intent との関係 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-swarm.ts` | swarm 収束・merge-back オーケストレーション | **#674 の対象**(`handleFinalize`) |
| `packages/framework/core/tools/amadeus-state.ts` | ステージ状態遷移(approve/reject/revise/advance) | **#675 の対象**(`handleApprove`/`handleReject`) |
| `packages/framework/core/tools/amadeus-bolt.ts` | Bolt ライフサイクル(start/complete/release-merge) | **#676 の対象**(`start --worktree`) |
| `packages/framework/core/tools/amadeus-lib.ts` | 共有ライブラリ(audit path、record dir、codekb repo 名解決) | **#676・#668 の対象**(`auditFilePath`、`codekbRepoName`) |
| `packages/framework/core/tools/amadeus-utility.ts` | `/amadeus` ユーティリティハンドラ群(`codekb-path` 等) | **#668 の対象**(`codekb-path` ハンドラ) |
| `packages/setup/src/ports/http.ts` | GitHub API/アーカイブ取得の HTTP ポート | **#677 の対象**(`getJson`) |
| `packages/setup/src/internal/tar-archive-extractor.ts` | tar.gz ストリーミング展開 | **#678 の対象**(`extractTarGz`) |

## `amadeus-swarm.ts` の finalize 内部構成(#674 の対象)

`handleFinalize()`(`amadeus-swarm.ts:484-631`)は3段構成。

1. **再検証フェーズ**(L531-582): claimed unit を `verdictFor()` で再検証し、`results[]` に最終ステータス(`converged`/`failed`)を確定する。ここで `genuine[]`(merge 対象の unit 名リスト)も確定する。
2. **merge-back フェーズ**(L588-599): `genuine` を昇順ソートし、unit ごとに `amadeus-bolt.ts release-merge` → `complete --merge` を直列実行する。失敗は `mergeFailures[]` に積むのみで、`results[]` は再訪しない。
3. **audit emission フェーズ**(L603-614): `results[]` を単純に走査し、`status === "converged"` なら `emitUnitConverged`、それ以外は `emitUnitFailed` + `emitBoltFailed` を出す。merge-back フェーズの結果はこの走査に反映されない。

`envelope`(L620-626)の `merge_failures` フィールドと `exit code 2`(L630)だけが merge 失敗を外部に伝える経路であり、audit trail(`emitUnitConverged`/`emitUnitFailed`)と `results[]` そのものは merge 失敗を知らない。

## `amadeus-state.ts` の gate ハンドラ構成(#675 の対象)

| ハンドラ | 行 | human-presence guard |
| --- | --- | --- |
| `handleApprove` | L1286-1379 | あり(L1321-1337: `isAutonomousMode` → `humanPresenceGuardDisabled` → `humanActedSinceGate`) |
| `handleReject` | L1430-1487 | **なし** |
| `handleRevise` | L1490- | (未確認、本スキャン対象外) |

`handleApprove` と `handleReject` はどちらも `withAuditLock(pd, () => { ... })` で state file の read-modify-write を保護し、`validateSlugInState` で遷移前状態を検証する構造は共通している。ガードの有無だけが非対称。

## `amadeus-bolt.ts` start と `amadeus-lib.ts` の audit path 解決(#676 の対象)

`start`(`amadeus-bolt.ts:196-220`)の `--worktree` パスは次の順で処理する。

1. state ファイルの shape 検証(L199-205、`readStateFile` が例外を投げたら `failJson`)
2. `emitAudit(pd, "BOLT_STARTED", fields, flags.intent, flags.space)`(L220)

`emitAudit` は内部で `auditFilePath(projectDir, intent, space)`(`amadeus-lib.ts:1267-1270`)を呼び、これが `recordDir(projectDir, intent, space)` の解決結果に応じて書き込み先を決める。`recordDir` が `null` を返すケース(L1269 の分岐)では `spaceRecordRoot(projectDir, space)/audit/<shard>` という bare な場所に書き込まれる。この関数自体は `stateFilePath`(L1255-1259)と同じ fallback パターンを共有しており、両者とも「intent が解決できないとき、intent 固有 record dir の外側に書く」という設計になっている。

## `packages/setup/src/ports/http.ts` の Result 境界(#677 の対象)

`Http` 型(L9-12)は `getJson`/`downloadArchive` の両方を `Promise<Result<..., FetchError>>` として宣言している。`fetchChecked()`(L46-59)は自身の try/catch でネットワークエラー・非 2xx ステータスを `FetchError` に正しく分類する。しかし `getJson()`(L23-28)自身は関数全体を try/catch していない。`downloadArchive()`(L30-38)も同様に `fetchChecked` の外で `response.body` の null チェックのみを行っており、`.json()` のような例外を投げる可能性のある処理は含まれないため `downloadArchive` 側にはこの欠陥はない。欠陥は `getJson` の `.json()` 呼び出し(L27)一箇所に限定される。

## `tar-archive-extractor.ts` の状態機械構成(#678 の対象)

`extractTarGz()`(L33-148)は次の変数をクロージャで共有する状態機械。

| 変数 | 役割 | スコープ |
| --- | --- | --- |
| `carry` | 直前チャンクからの持ち越しバイト列 | `for await` ループの外側で宣言(L36)、chunk ごとに `Buffer.concat` で拡張(L43) |
| `pendingLongName` | PAX(`x`)/GNU(`L`)ヘッダから読んだ次エントリの長いファイル名 | 同上(L37)、`drain()` 内で set/consume |
| `current` | 書き込み中のファイルエントリ(`path`/`remaining`/`chunks`) | 同上(L38) |

`drain(final)`(L54-148)は `carry.length < BLOCK_SIZE` などデータ不足時に `null` を返して次チャンク待ちに戻る設計(L64-65, L82-85, L98-100, L109-112)であり、これ自体は chunk 境界を跨ぐ設計として妥当に見える。#678 として持ち越すべき論点は、この状態機械が実際の `git archive`/codeload 出力(長いパス名を持つファイルが PAX/GNU ヘッダと本体ヘッダの間でチャンク分割される具体的な入力)に対して実測でも正しく動くかどうかであり、静的スキャンだけでは確定できない。

## 差分リフレッシュで反映した構造(integrity-batch、`a1c79dc12..162553b99`)

前回スキャン以降の構造変化と、今回4バグ(#705/#706/#707/#708)の焦点ファイルを追記する。

### codekb ストア構造(#707 の対象)

| パス | 役割 | 本 intent との関係 |
| --- | --- | --- |
| `.claude/tools/amadeus-lib.ts` `codekbRepoName`(L556-565)/ `codekbDir`(L530-533)/ `originRepoSlug`(L571-580) | codekb ディレクトリ名を origin remote 由来で解決(#693 で統一) | #707 の前提。`codekb/claude-leader/`・`codekb/claude-engineer-1/` は削除され `codekb/amadeus/` 単一化 |
| `.claude/amadeus-common/stages/inception/reverse-engineering.md`(L5 condition / L36 outputs / L110 timestamp) | RE ステージ定義。常時リフレッシュ・9固定ファイル・**単一** timestamp marker | **#707 の直接対象**(単一 timestamp で並行 base/observed を表現できない) |

### テストハーネス構造(#705 の対象)

| パス | 役割 | 本 intent との関係 |
| --- | --- | --- |
| `tests/run-tests.ts`(L31 `Level`、L577-587 `levelFiles`、L485-489 `shouldSkipForClaude`) | tier discovery(smoke/unit/integration/e2e 各ディレクトリ直下のみ)と substrate skip | #705 の構造的根拠(`tests/harness/` はどの Level にも属さず discovery/skip の外) |
| `tests/harness/sdk-drive.calibration.test.ts`(L55-72) | doctor 既知回答文字列のピン留め | **#705 の直接対象**(L72 `DOCTOR_DOCS_LABEL` が現行 doctor 出力とドリフト、かつランナー管理外) |
| `.claude/tools/amadeus-utility.ts`(L628 doctor workspace チェック) | doctor が出力する現行ワークスペース文言(`workspace shell ready ...`) | #705 の期待値ドリフトの対向(旧 `amadeus-docs/ directory exists` は不在) |

### knowledge 配布構造(#706 の対象)

| パス | 役割 | 本 intent との関係 |
| --- | --- | --- |
| `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md`(L3) | delivery-agent の実行計画ガイド | **#706 の直接対象**(不在の `product-guide.md` を tree 外参照。core→dist→self-install の全複製に伝播済み) |
| `packages/framework/core/agents/amadeus-delivery-agent.md`(L71-77) | delivery-agent の knowledge ロードパス宣言 | #706 の根拠(自分の dir と `amadeus-shared/` のみ読み、product-agent dir は読まない) |
| `packages/framework/core/hooks/amadeus-mint-presence.ts`(L12-13, L23-31) | UserPromptSubmit で `HUMAN_TURN` を無条件 mint(stdin 未読) | **#708 の直接対象**(mint 側)。参照様式は `amadeus-audit-logger.ts:29-44` / `amadeus-session-start.ts:86-96` |

## 次工程へ持ち越す設計候補

1. #674: merge-back 失敗を検知した時点で `results[]` の該当 unit を `"failed"` に書き換え、`emitUnitFailed`/`emitBoltFailed` を出すよう finalize のフェーズ順序を見直す。
2. #675: `handleReject` に `handleApprove` と同じ human-presence guard(または reject に適した緩和版)を追加する。reject を human-presence の対象外にする意図的な設計なのか欠陥なのかを requirements-analysis で確定する。
3. #676: `--worktree` の `start` が audit を発行する前に、intent/space が `recordDir` で解決可能であることを検証し、解決不能なら明示的に失敗させる(bare fallback に静かに落とさない)分岐を追加する。
4. #677: `getJson()` の `.json()` 呼び出しを try/catch で包み、パース失敗を `FetchError` に分類して `Result.err` を返すようにする。
5. #678: 実際に PAX/GNU ヘッダがチャンク境界を跨ぐ tar.gz を用意した回帰テストを作成し、現状の実装が正しいことを実証するか、実際に破綻する入力を特定する。
6. #668: `codekbRepoName()` の fallback を `basename(projectDir)` から、worktree を認識した実リポジトリ名の解決(例: `git rev-parse --show-toplevel` の親、または `.git` の `commondir` を辿る)に変更する。

## Coverage CI 経路(260710-codecov-project-gate の対象)

> 出典: `.github/workflows/ci.yml`・`codecov.yml`・`tests/run-tests.ts`・`tests/gen-coverage-registry.ts`・`tests/.coverage-ratchet.json`(2026-07-10, HEAD 98089faf 実測)。本 intent はこの経路へ「Codecov 非依存の自前 project ゲート」を追加する。

### CI ジョブ DAG(`.github/workflows/ci.yml`)

| ジョブ | 行 | 役割 | カバレッジ関与 |
| --- | --- | --- | --- |
| `check` | :20-58 | typecheck・lint・dist:check・promote:self:check・`test:ci` | なし |
| `coverage` | :60-103 | `needs: [check]`。`bun run coverage:ci`(:82)で lcov 生成、`coverage/lcov.info` と `coverage/html` を artifact 化(:84-93)し Codecov へ OIDC 送信(:95-103、`fail_ci_if_error: true`) | **本 intent の入力元** |
| `codecov-status` | :105-200 | `needs: [coverage]`, `if: always()`。`github-script`(:117)で外部 status を polling: `requiredChecks` 組立(:132-138、#717 が触る箇所)、`waitForCheck()` 最大60回×10秒(:144-178)、check-run/combined-status 両経路探索(:180-200) | Codecov status 待ち。**自前ゲートは polling 不要** |
| `ci-success` | :202-225 | `needs: [check, coverage, codecov-status]`, `if: always()`。`require_result()`(:213-220)が各 `needs.<job>.result` を `success` と厳格比較、集約対象は3ジョブ(:222-224) | 集約ゲート |

### 総カバレッジ% 算出箇所(`tests/run-tests.ts`)

- per-file LCOV 生成: `bun test --coverage --coverage-reporter=lcov` を個別実行し `coverage/.parts/<safe-name>/` へ出力(:753-776)。
- 結合 → 正規化 → 書き出し: `combineCoverageReports()`(:641-660)→ `normalizeCoverageReport()`(:503-563)→ `coverage/lcov.info`。正規化は harness 生成パス(`.claude/`・`.codex/`・`dist/*/.{claude,codex,kiro}/`)を `packages/framework/core/` へ再マップ(:488-501)。
- 正規化後レコード: `SF` / `FNF` / `FNH` / `DA:<line>,<count>` / `LF`(=DA 行数, :557)/ `LH`(=count>0 の DA 行数, :558)/ `end_of_record`(:546-561)。
- **総% は既に算出済み**: `writeCoverageHtml()`(:597-599, :627)が `totalHits/totalLines` から `Total line coverage: {pct}% ({totalHits}/{totalLines})` を HTML へ出力。ただし機械可読(stdout/JSON)な emit 経路は現状なし(:627 が唯一)。

### ラチェット機構(`tests/gen-coverage-registry.ts` + `tests/.coverage-ratchet.json`)

- ベースライン: `tests/.coverage-ratchet.json`(クラス別 covered ユニット**件数**、%ではない)。path は `AMADEUS_COVERAGE_RATCHET` env で上書き可(:104-105)。
- 単調 fail-closed 判定: `runCheck()`(:1242-1266)が各クラスで `now < base` を検知して `ok=false`(増やせるが黙って減らせない)。
- 更新: `writeAll()`(:1275-1278)が `--check` なし実行で registry+ratchet を再生成。人間がレビュー付きコミットで更新(:1259-1262 が手順案内)。
- `--check` 実行契約: drift・空クラス・cross-check・ratchet を検査し失敗時 `process.exit(1)`(:1283-1290)。CI 直接ステップは無く、`tests/unit/gen-coverage-registry.test.ts` が `spawnSync`(:152, :267, :279)で **temp tree** に対し落ちる実証を行う。
- **自前 project ゲートのベースライン運用テンプレート**: リポ内コミット済みファイル + 単調 fail-closed + env 差し替えでの落ちる実証、という同型が既に確立。
