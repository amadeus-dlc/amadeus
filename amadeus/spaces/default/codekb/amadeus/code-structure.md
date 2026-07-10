# コード構造

## packaging 構造(intent 260710、#735 の中核)

> 前回 intent の2バグは出荷済み(#685→#729、#670→#727)。下記は本 intent(source 側 unreferenced 検査)の重点構造。

### `scripts/package.ts` の段構成

`buildTree(m, outRoot, seedFrom)`(L307-460)が build の入力読み取りと dist 生成を一手に担う。段構成:

1. **core dirs 投影**(L322-344): `m.coreDirs` の各 `src` を `walk()` で全列挙し token 置換 + rules-rename してコピー。`frontmatterAdditions` の未ヒット検出付き(L345-351、typo ガード)。
2. **harness authored files コピー**(L357-363): `m.harnessFiles` の**列挙された `src` のみ**コピー。`projectRoot:true` は `dist/<name>/` 直下、それ以外は `<harnessDir>/` 内。
3. **onboarding**(L370-376)/ **memory tree emit**(L382-395)/ **compile**(L405-416)/ **harness.json/VERSION emit**(L425-431)/ **runner-gen**(L438-441)/ **emit プラグイン**(L446-458)。

`checkHarness(name)`(L554-634)は tmp に build して committed dist と byte-diff:

| pass | 行 | 検出 |
| --- | --- | --- |
| built → committed | L565-573 | `MISSING`/`DIFFERS` |
| committed → built(harness-dir) | L574-582 | `ORPHAN`(`authoredExempt` で除外可) |
| projectRoot harnessFiles | L586-592 | 外部 `MISSING`/`DIFFERS` |
| emit-owned(harness-dir 外) | L595-604 | `MISSING`/`DIFFERS` |
| dist 全域 orphan scan(#711) | L605-628 | 期待集合外の committed ファイルを `ORPHAN` |

CLI(L639-682): `--check` で `checkHarness`、それ以外で `writeHarness`。ターゲットは `discoverHarnessNames()`(L68-73、`harness/*/manifest.ts` の存在で発見)または明示名。`present` フィルタ(L668)は manifest を持つ harness のみビルド。

### harness manifest スキーマと全 harness 目録

契約は `scripts/manifest-types.ts` の `HarnessManifest`(L70-113): `coreDirs`/`harnessFiles`/`frontmatterAdditions?`/`onboarding?`/`rulesRename`/`authoredExempt`(L101、RegExp[])/`skipRunnerGen?`/`emit`。`authoredExempt` は「生成/コピー dir 内に置かれる authored ファイルを orphan scan から除外」する regex 群。

| harness | harnessDir | rulesRename | authoredExempt | emit / skipRunnerGen |
| --- | --- | --- | --- | --- |
| claude | `.claude` | `null` | `[]`(空) | emit `null` |
| codex | `.codex` | `amadeus-rules` | `[/^hooks\/amadeus-codex-[^/]+\.ts$/]` | emit あり / `skipRunnerGen:true` |
| kiro | `.kiro` | `steering` | `[/^agents\/[^/]+\.json$/, /^hooks\/amadeus-kiro-[^/]+\.ts$/]` | emit `null` |
| kiro-ide | `.kiro` | `steering` | `[/^agents\/[^/]+\.json$/, /^hooks\/amadeus-kiro-[^/]+\.ts$/, /^hooks\/[^/]+\.kiro\.hook$/]` | emit `null` |

`authoredExempt` は harness-dir subtree orphan pass(L579)でのみ消費される。**kiro と kiro-ide の差は `.kiro.hook` exemption の有無**: kiro-ide は `.kiro.hook` を `harnessFiles` で正規に出荷する(9個、L51-59)ため exemption が必要。kiro CLI は `.kiro.hook` を出荷しない(hooks は `agents/amadeus.json` から読む)ため、#737(`6f1d7ab2a`)で7個の stale ソースを削除し vacuous exemption `/^hooks\/[^/]+\.kiro\.hook$/` を除去した。

### 全 harness の authored ソース実態(manifest 参照状況)

`packages/framework/harness/<name>/` の実ファイルと manifest 参照の対応(#735 の「正当な未参照候補」= build 機構ファイル):

| harness | authored ソース | manifest 参照(出荷される) | build 機構(出荷されない、正当に未参照) |
| --- | --- | --- | --- |
| claude | 8ファイル | `SKILL.md`/`question-rendering.md`/`rules-amadeus.md`/`settings.json.example`/`settings.local.json.example`/`dot-gitignore` | `manifest.ts`/`onboarding.fills.ts` |
| codex | 7ファイル | `hooks/amadeus-codex-adapter.ts`/`dot-gitignore` + `SKILL.md`/`question-rendering.md`(emit 経由) | `manifest.ts`/`onboarding.fills.ts`/`emit.ts` |
| kiro | 13ファイル | `agents/*.json`(6)/`hooks/amadeus-kiro-adapter.ts`/`settings/cli.json`/`SKILL.md`/`question-rendering.md`/`dot-gitignore` | `manifest.ts`/`onboarding.fills.ts` |
| kiro-ide | 22ファイル | `agents/*.json`(6)/`hooks/amadeus-kiro-adapter.ts`/`hooks/*.kiro.hook`(9)/`settings/cli.json`/`SKILL.md`/`question-rendering.md`/`dot-gitignore` | `manifest.ts`/`onboarding.fills.ts` |

正当な未参照(build 機構: `manifest.ts`/`onboarding.fills.ts`/codex の `emit.ts`)は `package.ts` から `require()` で読まれるモジュールであり、dist へコピーされない設計。#735 の source-unreferenced check はこれらを誤検出しない除外設計を要する。現時点で全 harness に **manifest 参照も build 機構でもない未参照ソースは残っていない**(#737 で kiro の7個を除去済み。実測: `harness/kiro/hooks/` は `amadeus-kiro-adapter.ts` のみ)。

## 260709-gate-mechanics(前 intent、履歴)関連構造

| パス | 役割 | 本 intent との関係 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-state.ts` | ゲート解決(`approve`/`delegate-approval`/`reject`) | **#685 の対象**(`handleReject`/`handleDelegateApproval`。`handleDelegateRejection` は不在) |
| `packages/framework/core/tools/amadeus-lib.ts` | `humanActedSinceGate`/`verifyDelegatedApproval`/`GATE_RESOLUTION_EVENTS`/`auditShardDir` | **#685 の対象**(delegated-approval 検証機構。REJECT 対応の同型機構は不在) |
| `packages/framework/core/tools/amadeus-audit.ts` | `VALID_EVENT_TYPES`(`DELEGATED_APPROVAL`/`GATE_REJECTED` 含む) | **#685 の対象**(`DELEGATED_REJECTION` 相当のイベント型が不在) |
| `packages/framework/core/hooks/amadeus-mint-presence.ts` | `HUMAN_TURN` イベントの発行(UserPromptSubmit hook) | #685 の前提(このイベントのみが人間の存在を証明する) |
| `packages/framework/core/tools/amadeus-worktree.ts` | `assertNotSiblingWorktree`/`create`/`bolt --worktree` 経路 | **#670 の対象**(`assertNotSiblingWorktree`) |

### `amadeus-state.ts` の gate resolution ハンドラ構成(#685 関連、現状)

| ハンドラ | 行 | human-presence guard | 遠隔委任 |
| --- | --- | --- | --- |
| `handleApprove` | L1327- | `assertHumanPresentForGateResolution` 経由(あり) | `handleDelegateApproval` あり(#671、L1461-1541) |
| `handleReject` | L1548- | `assertHumanPresentForGateResolution` 経由(あり、#675 で追加済み) | **`handleDelegateRejection` 不在** |
| `handleDelegateApproval` | L1461-1541 | 発行元(leader)の `humanActedSinceGate` を要求 | — |

`assertHumanPresentForGateResolution`(L1301-1325)は `approve`/`reject` の共有ヘルパーで、両方が同一の3分岐(autonomous mode → suite off-switch → `humanActedSinceGate`)を通る。#671 で `handleDelegateApproval` が `DELEGATED_APPROVAL` audit イベントを対象(conductor)の intent record dir に発行し、対象側の `humanActedSinceGate`(`amadeus-lib.ts:1442-1478`)がこれを `verifyDelegatedApproval`(L1494-1519、issuer shard 内の実 `HUMAN_TURN` を検証)で確認できた場合のみ human act として扱う。REJECT 側にはこの一式(subcommand・audit event type・検証関数)がいずれも存在しない。

### `amadeus-worktree.ts` の `assertNotSiblingWorktree`(#670 関連)

`assertNotSiblingWorktree(repoCwd?)`(L112-132)は次の3ステップ。

1. `git rev-parse --show-toplevel`(repoCwd から実行)→ `canonicalise()` → `cwdTop`
2. `git rev-parse --git-common-dir` → `resolve(cwdTop, commonRaw)` → `dirname()` → `canonicalise()` → `mainCheckout`
3. `cwdTop !== mainCheckout` なら無条件に `error()`(プロセス終了)

呼び出し箇所: `create`(L204)、L277(別の create 隣接パス)、L512 近傍(`release`/`merge` 系、`amadeus-bolt.ts --worktree` から到達)。`list`(L586)は明示的にガードをスキップ(read-only のため)。git worktree 構造上、`--show-toplevel` は常にそのワークツリー自身を指し、`--git-common-dir` は常にメインチェックアウトの `.git/worktrees/<name>` を指すため、このガードは「repoCwd がいずれかのワークツリーである」ケースを設計上すべて拒否する — Bolt が自分で作る `.claude/worktrees/<dev>/` のネストしたワークツリーと、マルチワークツリーのチーム体制で人間/エージェントが個別に持つ長命な sibling ワークツリーを区別する分岐がない。

## トップレベル構造(前回 intent 260709-bug-zero-batch、履歴として保持。#675 は fix #675/#692 で解消済み)

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

## 次工程へ持ち越す設計候補

1. #674: merge-back 失敗を検知した時点で `results[]` の該当 unit を `"failed"` に書き換え、`emitUnitFailed`/`emitBoltFailed` を出すよう finalize のフェーズ順序を見直す。
2. #675: `handleReject` に `handleApprove` と同じ human-presence guard(または reject に適した緩和版)を追加する。reject を human-presence の対象外にする意図的な設計なのか欠陥なのかを requirements-analysis で確定する。
3. #676: `--worktree` の `start` が audit を発行する前に、intent/space が `recordDir` で解決可能であることを検証し、解決不能なら明示的に失敗させる(bare fallback に静かに落とさない)分岐を追加する。
4. #677: `getJson()` の `.json()` 呼び出しを try/catch で包み、パース失敗を `FetchError` に分類して `Result.err` を返すようにする。
5. #678: 実際に PAX/GNU ヘッダがチャンク境界を跨ぐ tar.gz を用意した回帰テストを作成し、現状の実装が正しいことを実証するか、実際に破綻する入力を特定する。
6. #668: `codekbRepoName()` の fallback を `basename(projectDir)` から、worktree を認識した実リポジトリ名の解決(例: `git rev-parse --show-toplevel` の親、または `.git` の `commondir` を辿る)に変更する。
