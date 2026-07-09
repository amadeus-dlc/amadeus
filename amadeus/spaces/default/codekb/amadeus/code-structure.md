# コード構造

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

## packages/setup ドメイン seam(#697 PBT 対象、2026-07-09 追記)

`packages/setup/src/domain/` は class-free / type+コンパニオン namespace / ブランド型+スマートコンストラクタ / 判別ユニオン Result スタイル。PBT の第一候補は spawn/FS ゼロの純関数群。

| ファイル / 関数 | file:line | 純度 | PBT 上の留意点 |
| --- | --- | --- | --- |
| `semver.ts` `SEMVER_PATTERN` / `SemVer.parse` / `SemVer.latestStableOf` | `:16` / `:19-28` / `:30-37` | 純(FS/spawn なし) | `latestStableOf` は prerelease 除外(BR-F02) |
| `internal/semver-factory.ts` `isLaterThan` / `equals` / `isStable` / `format` | `:15-21` / `:22-24` / `:12-14` / `:25-27` | 純 | **`isLaterThan` は同 major.minor.patch で prerelease 順序を比較しない**(`:20` コメント「out of scope」)= prerelease 違いの2値は互いに `false`(同順位)。全順序プロパティは stable 集合に閉じる必要あり |
| `version-spec.ts` `VersionSpec.latest/exact` / `admits` / `describe` | `:11-21` / 型 `:5-9` | 純 | `exact(raw)` の成否は `SemVer.parse(raw)` に委譲(委譲不変)。`admits` の詳細は `version-spec-factory.ts`(未読)で確認要 |
| `manifest.ts` `ManifestFiles.fromEntries` / `dispositionFor` / `Manifest.build` / `parseManifestJson` / `toJSON` | `:28-37` / `:23-26` / `:77-92` / `:125-187` / 型 `:53-61` | 純(FS/spawn なし) | roundtrip(`build().toJSON()`→`parse` が同値)と重複 path 不変条件(`Set` 走査 `:31-34` で `duplicatePath`)。`dispositionFor` は FR-008 Tell-Don't-Ask(owned→overwrite / shared は md5 一致で overwrite・不一致で backup / user-preserved→preserve) |

### `plan.ts` — FS 依存本体と純判定 seam の分離(#697)

`plan.ts` は FS を掴む(`node:fs` を `:2` で 6 API import):`walkFiles`(`:235-249`、`readdirSync`/`statSync`)、`md5OfFileSync`(`:256-270`、`openSync`/`readSync`/`closeSync`)、`buildEntries`(`:145`)/`buildUpgradeEntries`(`:181`、`existsSync`)。

一方、**純判定 seam は現状すべて private(未 export)**:

| 関数 | file:line | シグネチャ | 純度 |
| --- | --- | --- | --- |
| `classify` | `:227-233` | `(relPath) → FileClass`(`amadeus-` 前置→owned / セグメントに `memory`→user-preserved / 他→shared) | 純(文字列のみ) |
| `classifyAction` | `:162-168` | `(exists, force, cls) → PlanAction`(install 側 add/conflict/update/skip/backup) | 純(bool/bool/enum) |
| `toPlanAction` | `:209-218` | `(disposition) → PlanAction`(upgrade 側 Disposition→PlanAction 写像、BR-U10) | 純(判別ユニオン) |

3関数はプリミティブ/enum/判別ユニオンのみを取り FS も this も掴まない。seam を export(`Plan` sub-namespace か `plan-classify.ts` 併置)すれば in-process Small テストが可能。**export 方式は functional-design で確定要**(ドメイン公開面を汚さないか)。FS を伴う関数は medium のまま。

## #700 / #696 test-size 土台(2026-07-09 追記)

- 分類器 `tests/lib/test-size.ts`(単一ソースオブトゥルース):`classifyTestSize`(`:49-62`、静的シグナル proxy `SIGNAL_PATTERNS:35-40` = network→large / spawn・filesystem・timer→medium。コメント除去後に正規表現)、`parseSizeAnnotation`(`:74-86`、先頭 ~40 行の `// size:` ヘッダ読取)、`SIZE_ORDER:28`(small<medium<large)。Phase A は動的観測でなく静的近似(`:9-14`)。
- レポート `tests/run-tests.ts` `printSizeMatrix`(`:891-947`):scope×size 行列 + `size-annotated files: N/total`。**非ゲート**(`:894`)。
- ドリフトガード `tests/unit/t-test-size-drift.test.ts`:契約は「**宣言 size < 計測 size のときのみ CI 失敗**」(`test-size.ts:17-21`)。注釈=約束、分類器=検査。宣言≥計測は許容(annotated 28 と derived small 23 の食い違いは正常)。
- coverage の帰結(`run-tests.ts` は各ファイルを別プロセス spawn し LCOV 結合、`:734`/`:748-750` 付近):テストがさらに subprocess を spawn すると、その subprocess 内のドメインロジックは**非計測**。純関数を in-process 直 import すれば instrument 対象プロセス内で実行され coverage に計上される。→ plan.ts seam の export は Small band 育成と coverage 計上の両方に効く。

## 次工程へ持ち越す設計候補

1. #674: merge-back 失敗を検知した時点で `results[]` の該当 unit を `"failed"` に書き換え、`emitUnitFailed`/`emitBoltFailed` を出すよう finalize のフェーズ順序を見直す。
2. #675: `handleReject` に `handleApprove` と同じ human-presence guard(または reject に適した緩和版)を追加する。reject を human-presence の対象外にする意図的な設計なのか欠陥なのかを requirements-analysis で確定する。
3. #676: `--worktree` の `start` が audit を発行する前に、intent/space が `recordDir` で解決可能であることを検証し、解決不能なら明示的に失敗させる(bare fallback に静かに落とさない)分岐を追加する。
4. #677: `getJson()` の `.json()` 呼び出しを try/catch で包み、パース失敗を `FetchError` に分類して `Result.err` を返すようにする。
5. #678: 実際に PAX/GNU ヘッダがチャンク境界を跨ぐ tar.gz を用意した回帰テストを作成し、現状の実装が正しいことを実証するか、実際に破綻する入力を特定する。
6. #668: `codekbRepoName()` の fallback を `basename(projectDir)` から、worktree を認識した実リポジトリ名の解決(例: `git rev-parse --show-toplevel` の親、または `.git` の `commondir` を辿る)に変更する。
