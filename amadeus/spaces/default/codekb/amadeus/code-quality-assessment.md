# コード品質評価

> 本ページ先頭の「本 intent(p3-cleanup-batch4)の観測面」節が最新 intent `260710-p3-cleanup-batch4`(#757 #758 #753 #739 #740 #784)の記録。続く core-repair-batch3 節(#746 ほか9件、2026-07-11)・複雑度ゲート導入節(intent 260710-complexity-gate)・ tools-dispatch-batch 節(#774 / #785 / #787 / #788 / #789)・ bughunt-fix-batch 節(#771/#773/#775/#776/#779)・swarm-worktree-batch 節(#738/#748/#746/#760)・learnings-audit-batch 節(#754 / #745 / #761)・mint-presence-vectors 節(#755)・packaging source-unreferenced 節(intent 260710、#735)・delegate-answer-consume 節(intent 260710、#736)・kiro-stale-hooks 節(#719 / P3 source hygiene)・dynamic-test-size 節(#699 / #684 Phase D)・t92-worktree-hermeticity 節(#709)・packaging-repair-batch 節(#701/#702 = PR #711/#712 解決済み)は前 intent の記録で、参照用に温存する。以降の「アーキテクチャ横断パターン」以下は `260709-bug-zero-batch`(#674〜#678/#668)の記録。
>
> **既知のハウスキーピング債(観測のみ)**: 本ページ以下および `architecture.md` / `business-overview.md` / `api-documentation.md` には過去 intent 由来の未リラベルな「本 intent(…)」マーカーが複数併存している(business-overview の `260710-source-unreferenced-check` / `260709-bug-zero-batch`、architecture 冒頭の source-unreferenced 記述など)。correction c3-relabel の趣旨に照らせば全て履歴ラベル化すべきだが、本 bugfix diff-refresh のスコープ外(非サージカルな大量 churn になる)。本スキャンでは更新対象ファイルの直近マーカーのみリラベルし、残債はここに明示する。

## 本 intent(p3-cleanup-batch4)の観測面 — P3 欠陥6件の横断分類(#757 #758 #753 #739 #740 #784)

現 HEAD(`58f3453ad`、base `da1611a9a` からの diff-refresh。焦点9ファイル中7ファイルは無変更、`amadeus-sensor-fire.ts`(#793)/`amadeus-state.ts`(#804)の2ファイルは行番号シフトのみで欠陥不変)で確定した、P3 バグ6件の現物照合。6件はいずれも**挙動欠陥であって構造変化を伴わず**、ファイル非交差(6ファイル群が互いに独立、バッチ3 および open PR #808/#809 とも交差ゼロ)。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。

6件を品質パターンで分類すると、いずれも「安全側の機構は既に在るが、その適用が片側・片系統に限られ、もう片方が素通りする」という**非対称欠陥**に収斂する(横断所見は §4 に詳述)。

### #757 — 正規化変数を計算しながら glob マッチだけ生パスを使う非対称(`packages/framework/core/hooks/amadeus-sensor-fire.ts`)

- **欠陥**: `:88` で `const filePathNorm = filePath.replace(/\\/g, "/")` を計算し、再帰ガード(`:90-91`)は正規化版を使うのに、センサー適用判定の `:194` `if (!glob.match(filePath)) continue` は**生 `filePath`** を渡す(`:193` `new Bun.Glob(entry.matches)`)。正規化済み値が同一スコープに在るのに glob だけ生パス、という計算成果の片側適用漏れ。
- **影響境界**: path セグメント型の manifest(`**/{amadeus-docs,intents}/**` 等)2種が Windows 区切りで取りこぼす。拡張子型2種は無害(macOS では区切りが `/` のため実害非再現=P3 根拠と整合)。
- **修理の型**: `:194` を `filePathNorm` に差し替える1語変更。修理時に「正規化済み変数があるのに生パス使用」の同型が hooks/tools 他所に無いか grep で確認する(Issue 明記)。
- **行番号**: 起票時 `:190/:191` → 現行 `:193/:194`(+3、#793 マージ由来。#793 は advisory hook の発火ゲート条件変更で glob マッチ対象には未介入)。

### #758 — mutating verb 列挙と真実源(state.ts switch)の乖離(`packages/framework/core/hooks/amadeus-stop.ts`)

- **欠陥**: stop-hook carve-out の判定 regex `:552` `/\b(approve|advance|finalize|complete-workflow|gate-start|checkbox|park|unpark|set|skip|reject|revise|resume)\b/` が、真実源である `amadeus-state.ts` の subcommand switch に実在する mutating verb 8件 — `delegate-approval`(:284)/`delegate-rejection`(:287)/`acknowledge-compaction`(:302)/`reuse-artifact`(:305)/`practices-event`(:311)/`practices-promote`(:314)/`fork`(:317)/`merge`(:320)— を**取りこぼす**(`\breject\b` は `delegate-rejection` に不一致 — e4 実測 2026-07-10)。列挙(手書き regex)と真実源(switch)を二重管理した結果の同期漏れ。
- **影響境界**: allow-only(session trap なし)・interactive 限定(tier-3 は autonomous では非発火、`:469` 以降のコメントと整合)。read-only verb(get/count/lookup)は正しく列挙外。
- **修理の型**: (A) 判定を read-only verb 列挙+それ以外は関与へ反転(`:490-491`/`:527` の fail-toward-engagement コメントと整合、追加 verb が安全側デフォルト)、または (B) 現列挙に7 verb 追加+state.ts switch との同期テスト強制。消費者は stop.ts 単一、verb 真実源は state.ts switch。同期テストを置くなら switch を canonical に読む形が望ましい。
- **行番号**: 起票時 `:551` → 現行 `:552`(+1)、switch は `:229-298` → 現行 `:254-320`(state.ts 全体が #804 マージで下方シフト、verb 集合は不変)。

### #753 — IDE/CLI 語彙不一致による dead seam(`packages/framework/harness/kiro-ide/hooks/`)

- **欠陥**: adapter `amadeus-kiro-adapter.ts` の log-subagent case(`:200` `if ((kiro.tool_name ?? "") !== "subagent") return null`)と state-sync case(`:184` `!== "todo_list"`)が CLI 語彙を単独ハードチェックする一方、登録 `.kiro.hook` は IDE 語彙で発火する(`amadeus-log-subagent.kiro.hook` の `"toolTypes":[".*invoke_sub_agent.*"]` は文字列 `"subagent"` に不一致、`amadeus-sync-statusline.kiro.hook` の `"toolTypes":["spec"]` は `"todo_list"` に不一致)。兄弟 `canonicalTool()`(`:131`)は write/shell 系で IDE/CLI 両語彙を受理する二重受理パターンを持つのに、この2 case だけ非対称に単一語彙 — その結果どちらの語彙の payload でも一方の面(登録 or 受理)で不一致が残り、seam が死ぬ。
- **影響境界**: 不整合は live payload の `tool_name` 実値に依らず成立(canonicalTool の二重受理欠如という非対称が根拠)。ただし実機 payload は未捕捉。
- **修理の型**: 2 case を canonicalTool の二重受理パターンへ揃える(log-subagent は subagent/invoke_sub_agent、state-sync は todo_list/spec)+ state-sync は spec 入力の shape マッピング追加。実機 payload 未捕捉のため「発火の実証テスト」が完成条件(Issue 明記)。
- **行番号**: Issue の `:200`/`:184` と現行一致(ずれなし)。

### #739 — stat/lstat の混同による dangling symlink クラッシュ(`scripts/promote-self.ts`)

- **欠陥**: `:146` `if (statSync(full).isDirectory()) yield* walk(full)` が `lstat` でなく **`statSync`** でエントリを stat するため、dangling symlink(リンク先欠落)で `statSync` が ENOENT を throw する。preserved 除外(`:155-157` `isPreserved`、`:192` の適用)は walk の**後段**でファイル単位に効くため、walk 内の stat クラッシュを防げない。`--check` 経路(`:207` `function check`)も orphanedFiles(`:184`)経由でクラッシュが伝播する。
- **影響境界**: preserved 配下の symlink 健全性にゲート成否が依存する(ゲートの緑がゲート対象でなく symlink 状態に依存)。
- **修理の型**: walk を lstat 化(symlink を stat しない)、または preserved サブツリーを走査段階で prune(`isPreserved` を walk 内へ前倒し)。check/apply 両経路が orphanedFiles 経由のため単一修正で両復旧。
- **行番号**: 起票時 `:145` → 現行 `:146`(+1)、その他は関数境界同型で近傍一致。

### #740 — shields.io エスケープの片側適用(`scripts/release-version-sync-plan.ts`)

- **欠陥**: `:30` の accept regex `/badge\/version-[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?-blue/` は prerelease サフィックスを受理するが、`:31` の replacement `(v) => \`badge/version-${v}-blue\`` は**生バージョン文字列を埋め込む**だけで、prerelease の `-` を shields.io 用に `--` エスケープしない。受理側(prerelease 許容)と生成側(エスケープ不履行)の非対称で、prerelease バッジが 404 になる。
- **影響境界**: `.github/workflows/release.yml:36` の `options: [patch, minor, major]`(prerelease 選択肢なし)により標準経路から prerelease 到達不能=P3 根拠と整合。
- **修理の型**: replacement 側で prerelease サフィックス内 `-` を `--` エスケープ + accept 側もエスケープ済み形を受理して冪等性を維持。plan.ts 単一 seam の局所変更(CLI `release-version-sync.ts:20` は plan から `planVersionSync, VERSION_SURFACES` を import する薄いエントリで独自 accept regex を持たない)。既存の版同期系テスト(t68)への波及確認が要る。
- **注**: Issue 本文は accept を `release-version-sync.ts:23` と表記するが実体は同 seam モジュール `release-version-sync-plan.ts:30`(1ファイル取り違え)。指す規則(accept/replacement の非対称)は plan.ts に実在。

### #784 — parse-don't-validate の非対称(`tests/gen-coverage-registry.ts`)

- **欠陥**: `:1243` `if (!existsSync(RATCHET_PATH))` は不在時に `RATCHET FAILED:` 整形診断を出すが、`:1250` `JSON.parse(readFileSync(RATCHET_PATH, "utf-8")) as RatchetDoc` は**検証なしの素 JSON.parse** で、malformed JSON は SyntaxError を無診断 throw、`:1253` `baseline.coveredByClass[c] ?? 0` は形状仮定アクセスで `{}` 入力時 TypeError。存在チェックだけ整形済みで parse/shape は未整形、という parse 経路の片側適用漏れ。兄弟 `tests/coverage-project-gate.ts` の `parseTotalsText`(`:89`、`:188` で `GATE FAILED [MALFORMED]` の整形診断+exit 1)が正の型で、同一リポ内で同種入力(壊れた JSON baseline)への処理が非対称。
- **影響境界**: fail-closed(exit 1)は維持され誤 green はない。欠陥は診断可読性に限局(機能破綻でも誤 green でもない)。
- **修理の型**: `coverage-project-gate.ts` の parseTotalsText と同型の parse-don't-validate を runCheck の ratchet 読み込みへ導入。env seam `AMADEUS_COVERAGE_RATCHET`(`:104-105`)が既にありテスト注入可能。
- **ラベル判定(Developer が再確認)**: 現ラベル **bug/P3/S4-MINOR/origin:bootstrap は変更不要**。bug(誤 green でないが無診断スタックトレース=診断品質欠陥)、P3(CI を止めるが回避可・正しさ/安全性の破綻でない)、S4-MINOR(兄弟非対称を現物裏取り、影響は診断可読性限局)、origin:bootstrap(導入コミット `5cfb16165`、intent record なし)いずれも妥当。
- **行番号**: 起票時 `:1250-1252` → 現行 `:1250/:1253`(+1 以内)。

## core-repair-batch3 の観測面 — read/write 非対称・prototype-chain 残余・非アトミック書き込み・時間依存テスト(#746 / #786 / #742 / #743 / #747 / #741 / #751 / #744 / #749 / #750)

現行 HEAD `58f3453ad` で確定(焦点コードは base `da1611a9a`→observed でいずれも無変更、10 Issue 全件現存。下記は現行コード直読の静的分析)。詳細な file:line 一次記録は当該 intent(260710-core-repair-batch3)の `inception/reverse-engineering/scan-notes.md`、横断整理と修理設計空間は architecture.md の同名節を参照。バッチ3は単一クラスに収斂しないが、品質観点では以下の4アンチパターン群に分類できる。

### read/write 非対称クラスタ(#746)

- **anchor 対応の片側適用**: `amadeus-lib.ts:1905-1907` の `worktreePath(projectDir, boltSlug)` は生 `join` で anchor 概念なし(読み手 `amadeus-swarm.ts:233`)。対して write 側 `amadeus-worktree.ts:316/403/621` は `worktreeBaseDir(…)`(`resolveMainCheckout` :155 / `worktreeBaseDir` :214)で anchor 対応済み。同一パスを組む2つの規則が read/write で食い違う。sibling セッション駆動時に write と read が別ディレクトリを指す。
- **生 read 消費者の広がり**: `amadeus-bolt.ts:653`・`amadeus-audit.ts:456/:570`・`amadeus-runtime.ts:1200/:1291`・`amadeus-state.ts:2600/:2754`(`flags["target-dir"] ?? worktreePath(pd, slug)`)・`amadeus-utility.ts:960/:1074` が同型の生呼び出し。修理は単一 anchor 規則へ統一(lib 昇格 or worktree_path 引き回し)。
- **凍結すべき不変条件**: worktree パスの導出規則は write/read で単一。sibling/anchored 環境でも読み手が書き手と同じ base を解決する。

### prototype-chain 残余サイト(#744、#788 の未完部分)

- `PHASE_NUMBERS`(`amadeus-lib.ts:86`、object literal)への生インデックスが3サイト現存: `amadeus-orchestrate.ts:2194`(`canonicalisePhase`)・`amadeus-jump.ts:176`・`amadeus-state.ts:2512`。`Object.hasOwn` ガードなしで `constructor`/`__proto__` が truthy な Object/proto を返し `!canonical` ガードすり抜け → `amadeus-lib.ts:4124` `phase.toLowerCase()` で TypeError crash。
- **バッチ D #788 との同根**: #788 は graph/runtime の dispatch 表に `resolveOwnHandler`(`Object.hasOwn`)を導入したが「lib 共有を避けてローカル保持」と明記。#744 は同一クラスの values 面で未対処。前例に倣うなら**各サイトへローカル own-key ガード適用**が整合し、これで U6 は lib を触らず U1(#746)との交差が消えて並行可能になる(設計含意は architecture.md 参照)。
- **将来顕在化型**: `input.toLowerCase()`(:2192)で全小文字 `constructor`/`__proto__` のみ漏れる稀な crash。exit code/audit を汚す前に弾く硬化が要る。

### 統合境界のエラー握りつぶし + 非アトミック書き込み(#742 / #743、2件連鎖)

- **#742**(err swallow): `packages/setup/src/domain/installation.ts:28-45` が `manifestIo.read` 結果を `:30` `type === "ok" && value !== null` でのみ分岐し **err をフォールスルー**(err と absent を同一視)→ `:44` `noneInstallation()` 誤案内。`manifest-io.ts:19-30` は absent→`ok(null)` / I/O・malformed→`err` を区別しているのに detect 戻り型 `Installation` に err チャネルが無く区別が消滅。「存在するが読めない/壊れている」が診断不能。
- **#743**(非アトミック write): `packages/setup/src/ports/fsops.ts:66` `writeText` の直接 `writeFile`(temp→rename なし。#773 traversal guard 改変で無変更)。`manifest-io.ts:33-38` の唯一の書き込み経路が使用。kill-mid-write の truncated JSON が **#742 がちょうど誤処理する入力を生成**する連鎖。
- **凍結すべき不変条件**: 統合境界(fs I/O)は err を握りつぶさず呼び出し元へ表面化。manifest 書き込みは POSIX アトミック(temp write → same-dir rename)。

### 時間依存・順序依存の脆さ(#741 / #747)

- **#741**(wallclock フレーク): `tests/integration/t90.test.ts:503` test 13 が `setTimeout(2000)` 2回 + `new Date().toISOString()` 秒精度比較で MEMORY_EMPTY Timestamp の前後関係を pin。並列負荷下でスケジューラ遅延が境界を不安定化 → 間欠 fail。**プロダクト(runtime compile 計数)側 vs テスト決定性欠如の切り分け未了**。
- **#747**(prerelease 順序無視、潜在): `internal/semver-factory.ts:15-21` `isLaterThan` が major/minor/patch のみ比較し prerelease を見ない(`:20` out of scope)。`upgrade.ts:42` が誤境界判定(`1.0.0-rc.1`→`1.0.0` が非 proceed)。リポに prerelease タグ非存在ゆえ潜在、発行時顕在化。**#774(バッチ D)が resolver exact 経路を書き換えたため #747 Issue の resolver:60-65 参照は stale だが、根本原因の semver-factory は無変更で現存**(architecture.md 参照)。

### レガシー定数への stale 参照(#751)

- `amadeus-codex-adapter.ts:193/198` の SESSION_ENDED reconcile が `amadeus-docs`(= `FLAT_MIGRATION_ROOT`、`amadeus-lib.ts:850` のマイグレーション専用レガシー定数)を参照 → 現行レイアウトで `:198` early-return 常真、reconcile 常時不発。正準は `hooksHealthDir()`(`amadeus-lib.ts:2120`)。`:59` の `stateFilePath` import が reconcile 未使用(mint 側のみ使用)= 内部不整合の証左。実害は codex SESSION_ENDED の監査欠落(観測性のみ)。

### 生 NUL バイト混入(#786、検証規律への実害)

- `amadeus-learnings.ts:571` emitKey に生 NUL(python 実測: blob 内1個、offset 22828)。in-memory Set 専用(`:574`/`:603`)で永続化されず bun/tsc 受理 → **ランタイム無害・grep binary 誤判定で検証規律に実害**。全7コピーへ dist:check バイト一致で伝播。導入 PR #780。修理は可視区切りへ、挙動不変。

### テスト面(現状カバレッジと欠落 — いずれも「落ちる実証」対象)

- **#746**: sibling/anchored 環境で read が write と同じ base を解決することを pin する回帰(生 read が別ディレクトリを指す現状を再現)。
- **#744**: `canonicalisePhase("constructor")` 等が null を返し crash しないことを pin。
- **#749**: single で construction 先頭ステージが determinate gate を emit(現状 `GATE_UNRESOLVED` 詰みを再現)。**#750**: Kiro latch ターン一致時の素 `next --new-intent` が birth に至ることを pin。
- **#742**: 破損 manifest 存在時に absent と区別して表面化。**#743**: kill-mid-write シミュレーションで truncated JSON が残らない。**#747**: prerelease タグ fixture で正しい proceed/downgrade 判定。
- **#741**: wallclock 依存の除去(決定化)。**#751**: 現行レイアウトで reconcile が発火し SESSION_ENDED を emit。**#786**: emitKey に NUL バイト不在(byte 走査)。


## 複雑度ゲート導入(intent 260710-complexity-gate、2026-07-10)

現行 HEAD からの diff-refresh(フォーカス5面)で確定した、複雑度分布の実測とゲート計画。出典: lizard 実測 + scan-notes + initiative-brief。

### 複雑度分布の実測(lizard、2026-07-10)

- **総関数数 1,093**(lizard が計測した全関数)。うち **CCN(cyclomatic complexity number)> 15 が 42 関数**、CCN 30+ が 12 関数(バグの原因所在分析でバグ多発ファイルに集中)。最大は `blockBoltSlug` の **CCN 65**。
- この 42 関数を baseline として grandfather(現存の高複雑度を許容)し、新規の閾値超過とラチェット悪化のみを赤にする fail-closed 方式。

### 複雑度ゲート導入計画(2層ゲート)

- **方式(確定)**: Biome `noExcessiveCognitiveComplexity`(warn 層)+ lizard CCN の baseline ラチェット(block 層)の2層。
- **閾値**: 初期 CCN 15 で block(E-CX1 Q1=C)。将来の 10 への段階降下は分布改善後にノルム選挙で判断する Issue を起票(受け入れ基準に含む)。
- **Biome スコープ拡大**: biome check の対象へ `packages/framework/core` + `scripts` を追加(E-CX1 Q2=A)。既存6指摘の機械的修正を同一 PR に含む。
- **CI 配置**: 既存 `check` ジョブに lizard ステップを追加(pip 固定インストール、typecheck/lint 直後、E-CX1 Q3=A)。
- **落ちる実証**: NEW_VIOLATION / RATCHET_REGRESSION / fail-closed 各系の注入テスト(team.md Mandated「落ちる実証」)。ゲート実装は `tests/coverage-project-gate.ts`(#762)の正準テンプレート(env seam・parse-don't-validate・fail-closed FailReason・`--check`/`--update`)を踏襲する(architecture.md / code-structure.md 参照)。
- **業務根拠**: バグの原因所在分析(2026-07-10)で実装逸脱・非対称実装が上位原因であり、その温床の高複雑度関数がバグ多発ファイルに集中。人手レビューに頼らない決定的ラチェットで悪化を構造的に止める。
- **残余リスク**: baseline キー(path+name)のリネーム摩擦(R2、頻発時は関数 fingerprint キーへ移行 Issue 化)、lizard の TS 新構文計測ゆらぎ(R1、計測補正で対応、誤検知の握りつぶしはしない)、CI の Python 供給変化(R3、バージョン固定・最悪時 vendoring)。



## mint-presence-vectors(履歴)の観測面 — #755 機械注入ターン分類器の単一プレフィックス欠陥

現行 HEAD(`fc5a34cf1`、base `584262c1a` からの diff-refresh。フォーカス面のコード diff は空で、下記はすべて現行コード直読 + 当該 intent(mint-presence-vectors)の動的/法医学的実測に基づく)で確定した、human-presence 分類器の注入ターン取りこぼしの観測。base/observed の真実源は `re-scans/260710-mint-presence-vectors.md`。

## tools-dispatch-batch の観測面 — caller 供給パラメータの照合欠落と dispatch/prune の非対称(#774 / #785 / #787 / #788 / #789)

現行 HEAD で確定(焦点5ファイルは base→observed でコード diff 空。`amadeus-runtime.ts` のみ #781 で改変されたが dispatch site を含む hunk は無し。下記は現行コード直読の静的分析)。詳細な file:line 一次記録は intent `260710-tools-dispatch-batch`(2026-07-10)の `inception/reverse-engineering/scan-notes.md`、横断整理は architecture.md の同名節を参照。5欠陥は「caller 供給の遷移/ディスパッチ/ページング境界パラメータを、enum・SKIP・存在チェックのみで受理し、index・方向・prototype-own・全件走査の照合をしない」同一クラスで、いずれも導出版(権威経路)が併存しながら実経路がそれを迂回する。

### #787 / #789 — caller 供給遷移パラメータの照合欠落(方向盲目)

- **#787**(`amadeus-jump.ts` handleExecute `:220-`): `direction = flags.direction`(`:228`)を enum メンバーシップのみ(`:229-235`)で受理し target/current の index 関係を再検証しない。同ハンドラ内 scope 側は再検証あり(`:250`/`:256`)=**非対称**。権威版は `handleResolve`(`:173-180`)が direction を index から導出。resolve を迂回した `--target <過去> --direction forward` で後退なのに前進 skip 副作用(`:289-311`)が走る。
- **#789**(`amadeus-state.ts` advance): 2 引数 `nextSlug`(`:1006-1007`)を `nextAction === "SKIP"` 拒否のみ(`:1010-1018`)で受理し隣接性・index を見ない。省略時は `nextInScopeStage`(`:1019-1028`)で導出=権威。さらに `crossesPhaseBoundary`(`:1077`)が **方向を見ない** phase 不一致判定で、別 phase の nextSlug を渡すと後退/横断でも `PHASE_COMPLETED`/`PHASE_VERIFIED`/`PHASE_STARTED`(`:1103-1126`)を鋳造。→ 誤方向の phase 境界イベントが emit されうる(虚偽の phase 進行)。
- **凍結すべき不変条件**: 遷移パラメータは caller 供給値を enum/SKIP チェックだけで信頼せず、resolve と同じく index から導出/照合し、phase 境界判定は方向(前進のみ)を条件に含める。

### #788 — 生 object-index dispatch の prototype-chain 露出(検証機構外の関数実行)

- `amadeus-graph.ts:1901` `COMMANDS[cmd]`(定義 `:1670`)/ `amadeus-runtime.ts:1453` `SUBCOMMANDS[cmd]`(定義 `:1412`)がユーザー供給 `cmd` をブラケット index するため prototype chain を辿る。`cmd === "constructor"`/`"toString"`/`"hasOwnProperty"` 等で Object.prototype の truthy 関数が返り `if (!handler)` ガード(graph `:1902`/runtime `:1454`)を通過して呼び出す(graph `:1910`/runtime `:1459`)。
- **全 tools 中この2サイトのみ**が生 object-index 方式で、他はすべて switch(prototype 汚染に無縁)。防御候補 `Object.hasOwn` / `Object.create(null)` / switch 化は未適用。#744 既知の `PHASE_NUMBERS[…]` 生 index(orchestrate/jump/state)は同型だがバッチ D スコープ外。
- **将来顕在化型**: 現状は不正 subcommand 名で稀に非ハンドラ関数を呼ぶ将来リスク。exit code/audit を汚す前に弾く硬化が要る。

### #785 — runner-gen write/check の走査源非対称(修復不能な赤ドリフト)

- `handleWrite` の prune(`:295-300`)は `loadGraph()` 現存ノードのみ走査 → graph から消えた slug の orphan runner dir は反復対象外で **write では永久に到達不能**。`handleCheck`(`:343-365`)は FS 走査 `onDiskRunnerSlugs()`(`:324-336`)− `compiledSet` で orphan を正しく検出・flag(`:361`)し、修復案内(`:363`)が `write` を指すが、その write は当該 orphan を消せない → **ドリフトガードが赤のまま解消できない詰み**。
- **state/checkbox 乖離型**: 検出条件(FS 実在 − compiled)と修復条件(graph 現存)が非対称で、ガードが指す修復手段が検出対象を満たせない。走査源を FS 側へ揃えるのが修理方向(決定は requirements)。

### #774 — setup version resolver のページング欠落(無言の版取りこぼし)

- `resolver.ts` の URL(`:13-14`)に `per_page` 無し(既定30件)、`fetchNames`(`:22-37`)が単発 getJson で Link 追従なし、`resolveVersion`(`:57-79`)の exact/latest とも単一ページ制約を継承。ポート `http.ts` の `getJson`(`:9-12`/`:23-33`)が **JSON body のみ返しヘッダ非露出**でページング実装が不能。BR-F09(`:12`、1 resolve ≤2 API call)が全件走査より優先され、**版数が30超で新版を無言に発見できない**(notFound 誤失敗 / 最新取りこぼし)。
- **無言偽成功型 + 設計緊張**: 誤って notFound/取りこぼしを返す点が静かな正しさ破綻。BR-F09 制約と全件走査要件の緊張が争点で、修理は「上限維持のページング再定義」か「上限緩和」かを requirements で確定する必要がある。

### テスト面(現状カバレッジと欠落)

- いずれも「落ちる実証」対象。#787/#789 は resolve/導出版と execute/2 引数版の**方向取り違え**を突く回帰(過去 stage を forward 指定 → 副作用差)が要る。#788 は `cmd="constructor"` 等で prototype 関数が呼ばれない(未知コマンドとして拒否される)ことを pin。#785 は graph から消えた slug の orphan dir を注入し `check` 赤 →(修理後)`write` が消せることを実証。#774 は31件超の tags/releases fixture で目標版を発見できることを実証。既存テストにこれらの負の実証は不在(scan-notes 実測)。

## learnings-audit-batch の観測面 — §13 learnings の persist 判定と runtime 集計窓(#754 / #745 / #761)

現行 HEAD で確定(両焦点ファイル `amadeus-learnings.ts` / `amadeus-runtime.ts` は最終変更 `0801d2100`=2026-07-07、base→observed でコード diff 空。下記は現行コード直読の静的分析)。詳細な真理値表とデータフローは architecture.md の同名2節を参照。

### #754 / #745 — persist dedup 判定マトリクスの2穴(同根)

- **共通根**: `handlePersist`(`amadeus-learnings.ts:411-608`)の `withAuditLock` ボディで、重複判定入力 `hasRow` が `:431` の**静的 audit スナップショット**由来(ループ内 `appendAuditEntryUnlocked` `:492` で再読込されない)、かつ `priorAuditRow`(`:348-358`)が `(Stage, Candidate-ID)` のみ照合し **Destination を無視**、加えて `hasLine`(`:476`)が per-file 累積で cross-file を見ない。
- **#754**(同一 file・cid 衝突): 真理値 `hasRow=F, hasLine=T` で行書き込みスキップ(`:483`)+ RULE_LEARNED emit(`:491`)→ audit 行のみ増え practice 行が伴わない row/line 不一致。
- **#745**(別 file・同一 cid): project→team の順で同一 cid を振ると両者 `hasRow=F`(snapshot が先行 emit を見ない)・`hasLine=F`(別 file)で **RULE_LEARNED 二重 emit**。
- **凍結すべき不変条件**: 1 `(Stage, Candidate-ID)` につき RULE_LEARNED は最大1行、かつ audit 行があれば必ず対応 practice 行が存在。
- **テスト欠落**: t99 は異なる cid の2 emit(Case 1)と同一 selection 再実行の直列化(Case 5)を pin するのみで、同一 cid の複数宛先(#745)/ cid 衝突(#754)は未カバー。t112 は sensor guard 専用。

### #761 — per-unit stage の learnings 集計が常に 0

- **欠陥**: instance-bearing(construction・window 内 STATE_FORKED distinct slug ≥2)parent stage の `learnings_captured` が `:739` で `countLearnings` 再計算されず、rollup が置いた `{0,0}`(approved 時)固定のまま。実際に RULE_LEARNED 行があっても数えない。
- **窓終端のデータフロー**: rollup(`:375`)が親 STAGE_COMPLETED を `completed_at` に置くが、BoltInstance populator が `:551` で `null` 上書きし、以後スキーマ(`:83-105`)に保持先がない。
- **e6 訂正の妥当性**: RULE_LEARNED は親ゲート承認時(最終 STATE_MERGED = `parentEnd` より後)に emit されるため、窓終端を `parentEnd` にすると `countLearnings` の `ev.timestamp >= windowEnd`(`:693`)で全除外され 0 のまま。よって窓終端は**親 STAGE_COMPLETED or null(open)**が正。`maxInstanceCompletedAt`(`:1034`)は parentEnd 同値で流用不可。

## mint-presence-vectors の観測面(前 intent、履歴)— #755 機械注入ターン分類器の単一プレフィックス欠陥

現行 HEAD(`fc5a34cf1`、base `584262c1a` からの diff-refresh。フォーカス面のコード diff は空で、下記はすべて現行コード直読 + 当該 intent(mint-presence-vectors)の動的/法医学的実測に基づく)で確定した、human-presence 分類器の注入ターン取りこぼしの観測。base/observed の真実源は `re-scans/260710-mint-presence-vectors.md`。

### #755-O1 — mint 分類器が単一プレフィックス startsWith しか見ず、teammate-message(形式 D)を素通しさせる(確定ベクタ)

- **単一プレフィックス判定**: `packages/framework/core/hooks/amadeus-mint-presence.ts` は `MACHINE_INJECTED_PROMPT_PREFIX = "<task-notification>"`(`:47`)を唯一の抑止シグネチャとし、`isMachineInjectedTurn()`(`:51-66`)は `prompt.startsWith(MACHINE_INJECTED_PROMPT_PREFIX)`(`:62`)だけで機械注入を判定する。先頭バイト一致のみのため、`<task-notification>` 以外の開頭を持つ全注入ターンが素通りして `appendAuditEntry("HUMAN_TURN", {}, projectDir)`(`:71`)で phantom HUMAN_TURN を鋳造する。
- **確定ベクタ = 形式 D(teammate-message)**: agmsg/SendMessage の inbox 配信は user-role ターンとして `Another Claude session sent a message:` 開頭で届き、`<task-notification>` プレフィックスに一致しないため無条件に鋳造される。本番 amadeus transcript 2 セッションで計 **18 件**の実注入を確認(worktree-engineer3=11、worktree-engineer2=7)。これが #755 の実害源。
- **形式 A(裸 `<task-notification>`)は正しく抑止**: 本番 monitor 注入は **439/439 が裸の形式 A** で配信され、startsWith が正しく弾く(t203:90-94 の pin と一致)。
- **形式 B(`[SYSTEM NOTIFICATION - NOT USER INPUT]` 前置き)は合成でのみ鋳造・本番非該当**: 合成 stdin では preamble により startsWith が失敗し鋳造する(測定 HUMAN_TURN=1)が、当該前置き文字列は amadeus 本番 transcript に **0/439 で不在**・レポジトリコードにも不在(grep ヒットは #755 バグ記述のみ)の外来ハーネス artifact。e1(「B も鋳造」)は合成ペイロード限定で真、本番の注入形式は裸 A のため非該当。争点は e6(確定ベクタは D)が正。

### #755-O2 — stop.ts tier-3(`transcriptIsConversational`)が同カタログを共有せず、A も D も素通り(同根・露出大)

- **tier-3 の無防備**: `packages/framework/core/hooks/amadeus-stop.ts` の `transcriptIsConversational()`(`:581-737`)は終端ターンの会話性で tier-3 会話カーブアウト可否を決めるが、user-role ターンの除外ヘルパ `isInjectedHookFeedback()`(`:568-`)は `"Stop hook feedback:"` 系の自己注入しか弾かない。task-notification(A)も teammate-message(D)も除外対象に無く、両形式とも `humanPrompt=true` として「直近の genuine human prompt」に採用される(`:721-728`)。
- **mint より露出が大きい**: mint は少なくとも startsWith で形式 A を弾くが、tier-3 には marker チェックが**皆無**で A・D の双方が素通りする。終端が注入ターンで後続 engine call が無い場合(`:731-736`)、`isConversationalStop`(`:753`)が機械注入 ping を人間チャットと誤認し会話カーブアウトを付与しうる。#755 と**同根**(注入ターンを人間ターンと誤認)であり、修正時は mint hook と共通の注入カタログを共有すべき。

### #755-O3 — HUMAN_TURN 消費系への波及と t203 のカバレッジ欠落

- **presence gate**: `humanActedSinceGate(projectDir, verb?)`(`amadeus-lib.ts:1507-1546`、判定 `:1544` `lastHuman > lastResolution`)は phantom HUMAN_TURN が gate 後に鋳造されると true に転じ、無人でゲート解決が通る。消費点は `assertHumanPresentForGateResolution`(`amadeus-state.ts:1456`)。
- **委任 provenance 汚染(#671)**: `handleDelegateApproval` は DELEGATED_APPROVAL を自 shard の最新 HUMAN_TURN timestamp で grounding する(`amadeus-state.ts:1645`、`handleDelegateRejection` は `:1715`)。形式 D 由来の phantom HUMAN_TURN がこの grounding を満たし、`verifyDelegatedProvenance` が on-disk 実在(ただし phantom)の HUMAN_TURN を根拠に委任を受理する。これが #755 が「#671 委任 provenance を汚染」と述べる経路。CLI minting guard(`amadeus-audit.ts:753/768`)は模倣鋳造を拒むが、UserPromptSubmit hook 自身の in-process 鋳造は正規経路のため、分類漏れ鋳造はこの guard を通り抜ける。
- **t203 の形式 D テスト不在**: `tests/unit/t203-mint-presence-classify.test.ts` は現状 form A 抑止のみを pin し、`grep "Another Claude session" tests/` はヒット 0。#755 修正は t203 に form D の RED→GREEN ケース追加を要する。
- **修正方針への含意(所見のみ、修正はスコープ外)**: 分類は単一 marker の startsWith では不十分で、実注入形式のカタログ(最低でも `<task-notification>`(A)と `Another Claude session sent a message:`(D))を網羅し、mint hook と stop.ts tier-3 で共有すべき。

## packaging の source 側 unreferenced 検査ギャップ(intent 260710、#735)

> 前回 intent の2バグは出荷済み: **#685→#729**(`DELEGATED_REJECTION` 追加)、**#670→#727**(worktree write パスのアンカー化)。以下の #685/#670 節は歴史的記録。

### 技術的負債: build 入力の source 側に未参照検出がない

| リスク | 影響 | 注記 |
| --- | --- | --- |
| **#735**: `harness/<name>/` の manifest 未参照ソースが build 不可視のまま残存しても何も鳴らない | 中(dead source の蓄積、意図せぬ「出荷したつもり」の欠落) | `checkHarness` の orphan scan(`package.ts` L574-628)はすべて**出力側**(committed dist vs 再ビルド dist)で働く。harness ソースは `harnessFiles` に列挙された `src` のみコピーされる(L357-363)ため、未列挙ソースは dist に到達せず出力側検査に載らない。source 側に「全 authored ファイルが manifest から参照されているか(または既知の build 機構ファイルか)」を照合する検査が存在しない |
| **vacuous exemption アンチパターン(#719/#737 の実害)** | 中(検証劇場: 存在しないものを除外する「文書のふりをした」regex) | kiro CLI manifest の `authoredExempt` に `/^hooks\/[^/]+\.kiro\.hook$/` があったが、kiro CLI は `.kiro.hook` を dist へ一切出荷しない(hooks は `agents/amadeus.json` 経由)ため、この regex は**何にもマッチしない vacuous な除外**だった。一方で同名のソース7個が `harness/kiro/hooks/` に manifest 未参照のまま滞留していた。exemption が「未参照ソースの存在を正当化しているかのように」読めてしまう点が負債。#737 は7ソース削除 + exemption 除去 + `t148` 再注入ガード追加で是正 |

### #735 修理時の設計上の注意

1. source-unreferenced check は **build 機構ファイル**(`manifest.ts`/`onboarding.fills.ts`/codex の `emit.ts` — いずれも `package.ts` が `require()` で読み dist へコピーしないモジュール)を誤検出しない除外設計を要する。この3種は「正当に未参照(=出荷されない)」なソース。
2. 検査は「dist 全域 orphan scan(#711)」の source 側対称物として位置づけると一貫する: 出力側は「期待出力集合に属さない committed dist ファイル」を鳴らし、source 側は「manifest 参照集合にも build 機構集合にも属さない authored ソース」を鳴らす。
3. team.md Mandated の「落ちる実証」に従い、未参照ソースを注入して検査が赤くなることを実証してから完成扱いにする(#737 が `t148` で `.kiro.hook` 注入 → 赤、除去 → 緑を実証した先例に倣う)。

## 260709-gate-mechanics(前 intent、履歴)対象2バグの評価

## delegate-answer-consume intent(260710、#736)の観測面 — 委任発行 grounding の QUESTION_ANSWERED 先食い

現行 HEAD(`5e9040cda`)の実コードを直接読解して確定した、委任機構の presence 境界の観測(欠陥候補と検証ギャップ)。差分ベース `24197d755`→`5e9040cda` の実体は **#685(verb-scoped provenance + `DELEGATED_REJECTION`)** の実装で、フォーカス3ファイル(`amadeus-lib.ts`/`amadeus-state.ts`/`amadeus-audit.ts`)はいずれも base→HEAD 間で改変済み。`amadeus-log.ts`(QUESTION_ANSWERED emit 側)は無変更。

### #736-O1 — 委任発行 grounding が verb 無しで QUESTION_ANSWERED に先食いされる(最重要・仮説/根本原因候補)

- **境界イベント集合に QUESTION_ANSWERED が含まれる**: `GATE_RESOLUTION_EVENTS = new Set(["GATE_APPROVED", "GATE_REJECTED", "QUESTION_ANSWERED"])`(`amadeus-lib.ts:1506`)。QUESTION_ANSWERED は非-human の **resolution 境界**として扱われる。
- **`humanActedSinceGate` のセマンティクス**: `humanActedSinceGate(projectDir, verb?)`(`amadeus-lib.ts:1507-1546`)は「直前の resolution より後に human 行為があるか」を返す(`return lastHuman > lastResolution && lastHuman !== -1`、`:1544`)。ledger 空は fail-open で `true`(`:1512`)。委任イベントは verb でスコープされ、`DELEGATED_APPROVAL` は `verb !== "reject"`、`DELEGATED_REJECTION` は `verb !== "approve"` のときだけ `verifyDelegatedProvenance` で検証される(`:1519-1524`)。
- **[仮説/根本原因候補]** 委任**発行**側の grounding gate は **verb 無し** `humanActedSinceGate(pd)` を呼ぶ: `handleDelegateApproval`(`amadeus-state.ts:1625`)と `handleDelegateRejection`(`amadeus-state.ts:1719`)の両方。リーダー ledger 上で `HUMAN_TURN → (interview 応答) QUESTION_ANSWERED` の順になると、`lastResolution(QUESTION_ANSWERED) > lastHuman` となり `false` を返し、**委任発行を誤って拒否**する。すなわち interview 応答の QUESTION_ANSWERED が delegate 発行の human presence を「先食い」する。これが #736 の機構(発行側での消費)と整合する。
- **verb スコープでは解けない直交性**: QUESTION_ANSWERED は委任 type ではなく `GATE_RESOLUTION_EVENTS` の resolution 要素であるため、`humanActedSinceGate` の `verb` 引数の分岐(`:1519-1524`)の影響を受けない。#685 の verb-scoped 足場は既に完成しているが(下記 O3)、**#736 は verb スコープと直交**する。→ 修正は境界イベント集合の定義、または answer/delegate 経路の境界セマンティクスに触れる可能性が高い。確定方式は functional-design 以降に委ねる。

### #736-O2 — 回帰テスト未整備・t188 の 1-answer/turn 契約との両立が要件

- **交差ケース不在(実測)**: `tests/unit/t112-delegated-approval.test.ts` に対する `grep QUESTION_ANSWERED` はヒット 0。委任発行側で「HUMAN_TURN 後に QUESTION_ANSWERED があると発行が誤拒否される」#736 の回帰テストは**現存しない**。t112 が pin するのは verifyDelegatedProvenance の grounding 証明・`humanActedSinceGate` の委任 approve gate・#685 の verb 壁(DELEGATED_APPROVAL は reject gate を開けない/逆も)・delegate-rejection writer 発行ゲート・CLI minting guard で、QUESTION_ANSWERED×委任 の交差は含まれない。→ 修正では新規テスト追加が必要。
- **両立要件(1-answer/turn 契約)**: `tests/unit/t188-human-presence-gate.test.ts:325-348` の handleAnswer twin が「HUMAN_TURN 有りで 1 answer commit → 同 turn 2 回目は QUESTION_ANSWERED が新境界となり refuse」を pin している。これは #736 が問題視する「QUESTION_ANSWERED が境界を進める」挙動を answer 経路で**意図的に固定**した契約。→ #736 の修正は、answer 経路の consume-once 契約(1 human turn = 1 answer、`amadeus-log.ts:122-125` コメント)を壊さずに、delegate 発行経路が同じ QUESTION_ANSWERED に先食いされない設計を要する。両経路のトレードオフが functional-design の要点。

### #736-O3 — #685 verb-scoped provenance 足場は既実装・dist 同期義務

- **verb 足場は完成済み**: `amadeus-lib.ts:1519-1524`(verb 分岐)、`amadeus-state.ts:1443-1456`(`assertHumanPresentForGateResolution` が approve/reject へ verb forward、`:1456` `humanActedSinceGate(pd, verb)`)、`amadeus-audit.ts` の `DELEGATED_REJECTION` 定義、`audit-format.md` / `docs/reference/12-state-machine.md` のレジストリ行。修正方式 B(verb-scoped）に乗せる基盤は整備済み。
- **dist 同期義務**: フォーカス3ファイル(lib/state/audit)は生成コピーを `.claude/tools/`・`.codex/tools/` の両方に持つ(全6コピー)。core 改変時は `bun scripts/package.ts` + `bun run dist:check`、`bun run promote:self` + `bun run promote:self:check`、`bun run typecheck` / `bun run lint`(Biome)、audit event を触るなら `t28-audit-event-sync`(2ファイル間 taxonomy sync)を green 維持し、**core+dist+self-install を同一コミットで揃える**(team.md Mandated)。

## kiro-stale-hooks(intent、履歴)の確認済み欠陥 — #719(P3 / source hygiene)

現行 HEAD(`e1a07fada`、base `24197d755` からの diff-refresh)の実コードを直読して file:line を確定した、drift-guard の2層マスキング欠陥1件。Developer(スキャン)→ Architect(合成)の2サブエージェント直列で実施(cid:reverse-engineering:c3)。base→HEAD 差分13ファイルは本フォーカス面(kiro ハーネスの hook 出荷経路・orphan 検査機構)に非関与(監査エスケープ #204/#205・テストサイズ動的計測系)のため、下記はすべて現行コード直読による。base/observed の真実源は `re-scans/260710-kiro-stale-hooks.md`。

### #719 — Kiro CLI の unshipped な stale `.kiro.hook` を drift-guard が検出できない(2層マスキング)

- **欠陥の本体(dead な source)**: `packages/framework/harness/kiro/hooks/` に 7 件の `.kiro.hook`(audit-logger / log-subagent / runtime-compile / session-end / session-start / stop / sync-statusline)が source に残存するが、kiro CLI はこれらを**出荷も登録もしない**。出荷は `manifest.ts` が hooks 由来を adapter 1 件(`{ src: "hooks/amadeus-kiro-adapter.ts", ... }`、`:55`)のみ列挙し `.kiro.hook` を harnessFiles に1件も含めない。登録は `agents/amadeus.json` の `hooks` オブジェクト経由で全 seam が `amadeus-kiro-adapter.ts` を叩く(`.kiro.hook` は登録経路にも不在)。→ 7 件は出荷・登録とも完全に冗長。うち `amadeus-session-end.kiro.hook` のみ command が `bun .kiro/hooks/amadeus-session-end.ts`(adapter 非経由)で内容ドリフトしており(CLI/IDE 分離前の残骸)、他 6 件は kiro-ide 版と同内容。
- **1層目(主因)= source 側 orphan 検査機構の不在**: `scripts/package.ts` の `checkHarness(name)`(`:554-633`)は committed dist ツリー(`dist/<name>/`)と tmp build 出力のみを walk し、**source(`harness/<name>/`)を走査する経路が存在しない**。built→committed(MISSING/DIFFERS `:565-573`)、harness-dir subtree orphan(committed→built、authoredExempt 消費 `:579` / ORPHAN 判定 `:580`)、whole-tree orphan(`:605-628`、ORPHAN 判定 `:626`)のいずれも dist 側しか見ない。kiro CLI は `.kiro.hook` を dist に投影しない(`dist/kiro/.kiro/hooks/` の `.kiro.hook` は 0 件)ため、source の 7 件はどの walk にも載らず `bun run dist:check` は exit 0 で通過し、stale を一切検出できない。
- **2層目(補助的マスク)= 空振り authoredExempt regex**: `packages/framework/harness/kiro/manifest.ts:81` の `authoredExempt` 第3 regex `/^hooks\/[^/]+\.kiro\.hook$/` は「全 `.kiro.hook` を orphan 免除」するが、kiro CLI は `.kiro.hook` を 0 件出荷するため守る実体が無い純粋なマスク。万一 stale な `.kiro.hook` が dist に混入しても orphan 検査を素通りさせる第二の網として働く(コメント `:76-80` は regex1/2 の正当化のみで regex3 の根拠を記述しない)。対照的に `harness/kiro-ide/manifest.ts` は `.kiro.hook` を 9 件正当出荷(`:51-59`)し、同一 3 regex の authoredExempt(`:96`)は出荷対象という文脈で防御的に妥当。
- **同型性(#701 との関係)**: 本欠陥は下記 #701(orphan スキャンの dist ルート盲点)と同種の drift-guard 穴。#701 が「dist ツリー内の検査対象集合の穴」だったのに対し、#719 は「そもそも source 側を検査する機構が無い」という一段上流の穴で、2層目の空振り exemption がそれを補助的に隠す二段構え。#701 の whole-tree 化(`:605-628`)は dist 側の穴を塞いだが、source 側の未参照ファイルは依然どの検査にも当たらない。
- **テスト影響(削除の安全性)**: `tests/smoke/t148-kiro-file-structure.test.ts` は SHIPPED `dist/kiro` ツリーのみ(`hooks` の `.ts` ≥10 件を数える)、`tests/unit/t147-kiro-hook-adapter.test.ts` は `dist/kiro/.kiro/hooks/amadeus-kiro-adapter.ts` を subprocess 起動する。どちらも source の `.kiro.hook` を参照しない。リポ全体 grep でも source `harness/kiro/hooks/*.kiro.hook` を直接参照するテスト/スクリプトは皆無。→ 7 件の stale source `.kiro.hook` 削除は t147/t148 を含む既存テストを破壊しない(`bun test t148 t147` が exit 0 / 23 pass を実測)。
- **修正境界の候補**: (a) source の 7 `.kiro.hook` を削除して dead を排す、(b) kiro CLI manifest の authoredExempt regex3(空振りマスク)を除去して 2 層目を閉じる、(c) source 側 manifest 未参照ファイルを検出する検査機構を `checkHarness` に追加して 1 層目を塞ぐ。設計判断は requirements-analysis で確定。「落ちる実証」は source に stale `.kiro.hook` を残したまま検査が赤くなること(1 層目を塞ぐ場合)で担保する。


## dynamic-test-size(intent、履歴)の観測面 — #684 Phase D 実装への含意

現行 HEAD(`24197d755`)の実コードを直接読解して確定した、テストランナーの per-file 計測・永続化ライフサイクルの観測(欠陥ではなく、#699「継続的動的計測」実装が土台にすべき既存機構と欠落点)。差分5ファイル(`bun.lock`/`package.json`/`tests/helpers/arbitraries/semver.ts`[A]/`tests/integration/t92.test.ts`/`tests/unit/setup-semver.pbt.test.ts`[A]、#721/#722 由来)はフォーカス面に非関与のため、下記はすべて base 時点から不変の現行コードの読解。

### #699-O1 — wall-clock は既に測れているが、永続化経路が存在しない(最重要)

- **計測は既存**: 各テストファイルは `runBunTestFile()`(`tests/run-tests.ts:685-797`)で1ファイル=1子プロセス実行され、`const start = Date.now()`(`:724`)を張り、`meta.duration === "0"` のときのみ `(Date.now()-start)/1000`(`:762`、秒 float 文字列)で補填する。基本値は JUnit XML root の `<testsuites time>`(`tests/lib/bun-junit-to-meta.ts:182` `attrStr(root,"time")`、`:151-154` `sanitizeDuration`)= **bun 1.2.22 で唯一実 wall-clock を持つ属性**(内側 `<testsuite time>` は全て "0"、同ファイル L28-29/L40-41 が検証記録)。`.meta` は6行 `NAME/STATUS/TESTS/FAILED/DURATION/RC`(`writeMeta` `:369-391`、`renderMeta` `bun-junit-to-meta.ts:287-296`)で **DURATION フィールドを既に持つ**。
- **永続化は不在**: `aggregateTierResults()`(`:417-431`)が全 `.meta` を `parseMeta` で読んだ直後、`:430` `for (const meta of metas) rmSync(meta, ...)` で**全削除**する。非 verbose 実行では `logDir` 自体が `mkdtempSync(TMPDIR)` の一時ディレクトリで実行後に丸ごと削除される(`cleanupLogDir`、`:275-277`・`:1113`)。→ duration が生き残る先は (a) メモリ上の `resultRows[].duration`、(b) `--verbose` 時のみの `summary.txt`(`writeVerboseSummary` `:950-985`、`${row.duration}s` `:973`)の**2箇所のみ**。**JSON/レジストリ形式の duration 永続化は現状ゼロ**(全走査で確認)。→ **#699 は削除される `.meta`/揮発 `resultRows` とは別の新規永続化経路(JSON アーティファクト等)を新設する必要がある。**

### #699-O2 — 動的計測を重ねる際の合流点と隔離契約

- **`printSizeMatrix` は静的分類のみで duration 非消費**: `:895-948` は `SCRIPT_DIR` を `walk()` 再帰走査し各 `.test.ts` を `readFileSync` → `classifyTestSize(src).size`(`:921`)で分類するだけで、実行時 wall-clock/`.meta` に一切触れない。→ **既存 size マトリクスは動的 duration の自然な合流点にならない**。#699 の動的値は別経路で積む設計になる。
- **`SizeClassification` 出力形状は後方安定契約**: `tests/lib/test-size.ts:42-45`(`{ size; signals }`)+ L10-14 のコメントが「Phase D (#699) layers true dynamic observation on top; the classifier's output shape stays stable so the drift guard and runner report keep working」と明言。→ **#699 は分類器の出力形状を壊さず"重ねる"のが前提**。size 軸は `small|medium|large`(`:23`)、順序は `SIZE_ORDER`(`:28`)が唯一の定義。
- **exit-code 隔離パターンは既存**: size 報告は `printSummary()` 内 `try { printSizeMatrix(); } catch {}`(`:882-886`、コメント `:880-881`「Observability only — MUST NOT affect the process exit code」)で完全隔離済み。t112(`tests/integration/t112.serial.test.ts`)が「exit == failed-FILE 数」不変条件を固定するため、**#699 が SUMMARY に動的計測を足すなら同じ try/catch 隔離が必須**。

### #699-O3 — t112 copy リスト伝播とレジストリ直交(実装制約)

- **t112 copy リスト制約(明確な破壊条件)**: `t112.serial.test.ts` は scratch tree に実ランナーをコピーして実駆動する(`copyFileSync` `:91-94`)。コピー対象は `run-tests.sh`/`run-tests.ts`/`lib/bun-junit-to-meta.ts`/`lib/test-size.ts`(`REAL_SIZE` `:52`、コメント `:49-52`「run-tests.ts also imports lib/test-size.ts ... the copied runner fails to load without it」)。→ **#699 で run-tests.ts が新たに static import するモジュール(動的計測モジュール等)を追加したら、この copy リスト(`:91-94`)にも同時追加しないと scratch runner がロード不能で t112 が壊れる**。`REAL_SIZE` と同じパターン必須。
- **coverage registry は size/duration と直交**: `tests/gen-coverage-registry.ts` は `// covers:` ヘッダ join を軸とし、`size|duration|meta|classifyTestSize` への参照を一切持たない(全走査で確認、ヒットは `Set.size` 等のみ)。→ **#699 が size/duration を registry 化するなら既存 `covers:` 機構への相乗りは自明でなく、別 JSON アーティファクト新設が現実的**。

### #699-O4 — CI 配線と動的バックエンドの環境制約

- **CI は Linux 確定・size 専用アーティファクト未設置**: `.github/workflows/ci.yml` の `check` ジョブは `runs-on: ubuntu-latest`(`:22`)、`coverage` ジョブは `actions/upload-artifact@v4` で `coverage/lcov.info`+`coverage/html` を upload 済み(`:75-84`、retention 14日)。→ **size/duration 専用のアーティファクト upload は現状無い**(ci.yml 全読で確認)。#699 が動的計測レポートを CI に残すなら、この既存 upload-artifact パターンが合流先。
- **動的バックエンドの OS 制約**: macOS の DTrace は SIP-blocked、Bun test preload も非発火(`test-size.ts:11-12` が既存判断として記録)= Phase A が静的である根拠。#699 の動的バックエンド選定はこの制約を継承し、GitHub hosted runner(ubuntu-latest、非特権/sudo 制限)での strace/eBPF 実行可否は要検証。

## t92-worktree-hermeticity(intent、履歴)の確認済み欠陥

現行 HEAD(`be205cfca`)の実コードを直接読解して file:line を確定した、tsc 解決の非ヘルメチシティ欠陥1件。

### #709 — t92 test 44 が install 済 node_modules へのシンボリックリンクを前提し、worktree の install 状態で exit code がドリフトする

- **原因1(exit-code そのまま伝播の設計)**: ステータスゲート `packages/framework/core/tools/amadeus-sensor-type-check.ts:368` の `if (status !== null && status !== 0 && allErrors.length === 0) process.exit(status)` は、`allErrors` 空(TS18003「No inputs were found」等、`PRIMARY_RE` 不一致で line:col を持たない)かつ tsc 非 0 のとき tsc の生 exit code をそのまま伝播する。この code は TS のバージョン/`--incremental` 有無で 2 か 1 に揺れる。
- **原因2(環境依存 launcher)**: `resolveTscLauncher(tsconfigDir)`(`:182-201`)は起点 dir から上方向に `node_modules/.bin/tsc` を探索し、`existsSync`(`:192`)がシンボリックリンク追従で判定するため、リンク先欠落(未 `bun install`)だと false。ツリー上端まで無ければ `bunx tsc`(`:200`)へフォールバックし、グローバルキャッシュの別バージョン TS(観測 7.x)が走る。原因1と原因2の組合せが #709 の非対称の根本 — pinned tsc(typescript ^6 + `--incremental`)は exit 2、bunx フォールバックは exit 1。
- **バグの核心(test 44 の非ヘルメチシティ)**: `tests/integration/t92.test.ts` test 44(`:1160-1189`)は唯一 exit code(=2)を厳密ピンし、`:1180` の `symlinkSync(REPO_ROOT/node_modules, proj/sub/node_modules)` が**リポジトリの node_modules が install 済である前提**に立つ。未 install の worktree ではリンクが壊れ → bunx → exit 1 → `Note` が `script-error: exit-2` を満たさず**失敗**する。これが #709 の非ヘルメチシティ本体で、テストの緑がテスト対象ではなく worktree の install 状態に依存する。
- **堅牢な対照テスト(要修正外)**: test 45(`:1206-1234`)は node_modules シンボリックリンクなし・`allErrors` 非空(other.ts の実型エラー)でゲート不発火のため exit code ドリフトに非依存。test 12/16(`:557-567`, `:666-668`)は pass/fail 件数のみ検証で exit code 非依存。`tests/unit/t202-sensor-type-check-tsc-launcher.test.ts` は `resolveTscLauncher` の純関数テストで自前 temp ツリーを組み(`:37-101`)リポジトリ node_modules に非依存。tsc 解決を持つのは t92・t202 のみで、脆弱なのは t92 test 44 単独。
- **修正境界の候補**: test 44 の install 済 node_modules 前提を、worktree の install 状態に依存しない形(install 有無を前提しない skip ガード、または launcher を明示注入して exit code 依存を除去)へ。requirements で確定。「落ちる実証」は未 install 相当環境での再現で担保する。

## packaging-repair-batch(intent、履歴)の確認済み欠陥 — PR #711/#712 で解決済み

> **解決状態(260709-t92-worktree-hermeticity スキャンで確認)**: 下記 #701/#702 はいずれも `22e3eb5aa..be205cfca` 区間で PR #711(#701)/ #712(#702)としてマージされ**解決済み**。以下の記述は当時の欠陥分析として参照用に温存する。

現行 HEAD(`22e3eb5aa`)の実コードを直接読解して file:line を確定した、2件の(当時)確認済み欠陥。両者ともリリース/配布パイプラインの整合性を静かに破る型であり、既存の正のテスト(下記「既存の品質ゲート」参照)では検出されなかった。

### #701 — `scripts/package.ts --check` の orphan スキャンが dist ルート平坦面を見ない盲点

- **原因1(orphan ルート集合のハードコード)**: harness 外 orphan スキャンが walk するサブツリーは `for (const sub of [".agents", "amadeus"])`(`scripts/package.ts:611`)の2件のみ。dist ルート直下(`dist/<name>/` の非 `<harnessDir>/`・非 `.agents/`・非 `amadeus/` ファイル)はどの walk 対象にも入らない。
- **原因2(projectRoot diff の片方向性)**: projectRoot な harness ファイルの明示 diff(`:586-592`)は `MISSING`/`DIFFERS`(built→committed 方向)のみを検査し、committed→built の orphan 方向を検査しない。
- **バグの核心**: (a) `<harnessDir>/` 配下でない、(b) `.agents/`/`amadeus/` 配下でない、(c) 現行 manifest が宣言する projectRoot 出力でない — の3条件を満たす stale ファイル(典型: manifest から削除/改名された旧 `AGENTS.md`/`CLAUDE.md`/onboarding の旧コピー)が `dist/<name>/` に居座っても、`--check` はどのスキャンにも当たらず exit 0 で通過する。drift ガードとしての保証に穴がある。
- **テスト状況**: `tests/integration/t145-packaging-parity.test.ts:46-69` は `--check` の exit 0 と `[claude] --check: OK` を主張する**正の drift ガードのみ**。dist ルート直下に stale orphan を注入して `--check` が赤くなることを実証する負のテストは存在しない(team.md「落ちる実証」規範の対象)。

### #702 — `scripts/release-version-sync.ts` の prerelease バッジが前進不能・half-applied

- **原因(正規表現の非対称)**: version 受理正規表現(`:22` `/^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/`)は prerelease サフィックスを受理するが、README バッジ正規表現(`:53-54` `/badge\/version-[0-9]+\.[0-9]+\.[0-9]+-blue/`)は `X.Y.Z` の直後に即 `-blue` を要求し prerelease を許さない。受理側と patch 側が非対称。
- **バグの核心1(前進不能)**: prerelease 版へ bump するとバッジは `version-1.2.3-rc.1-blue` になり、次回実行時 `:54` の正規表現が一致せず `patchFile` が `:37-40` で `console.error` → `process.exit(1)`。以後どの版へも進めなくなる。
- **バグの核心2(half-applied / 冪等性破綻)**: `patchFile` は version.ts を先(`:47-51`)にディスクへ書き込んだ後に、バッジ patchFile が `:39` で exit 1 する。→ version.ts は前進済み・バッジは据え置きの半適用。再実行では version.ts は既に目標値(`changedVersionTs=false`)だがバッジは依然一致せず、再び exit 1 に張り付く。
- **リリース配線上の影響**: `release-version-sync.ts` は `packages/setup/.release-it.json` の `hooks.after:bump` 経由でのみ起動する(`release.yml` の workflow_dispatch 一本運用)。この盲点は1ボタンリリースを prerelease 到達時点で停止させる。
- **テスト状況**: `tests/unit/t68-version-changelog-sync.test.ts` は release-version-sync.ts を**実行しない静的検査**で、バッジ正規表現も非 prerelease 前提(`:81`)。#702 は未カバーで、修正時は t68 の正規表現も同時更新が必要。

## 品質改善(この差分区間 `a1c79dc12..22e3eb5aa` で観測)

- **PR #703 テスト hermeticity 修正(class-B 14ファイル)**: `tests/` 配下のユニット/インテグレーションテストで、共有状態・実行順序依存を排する hermeticity 修正が入った。テストスイートの決定性が向上している。
- **test-size ドリフトガードの新設**: `tests/lib/test-size.ts`(共有ヘルパー)+ `tests/unit/t-test-size-drift.test.ts`(ガードテスト)が追加され、テストファイルの規模ドリフトを検知する新しい品質ゲートが導入された。これは前述 #701/#702 のような「正のテストのみで負の実証を欠く」ギャップとは別軸の、テスト資産自体の健全性を守る仕組み。

## 既存の品質ゲート(変更なし)

- `dist:check`、`promote:self:check`、`.github/workflows/ci.yml`(typecheck → lint → dist:check → promote:self:check → tests)は変更なし。
- 6件のバグは、どれも既存テストが「合成 evidence」または「正常系」のみをカバーしており、実際に問題になる境界条件(merge 失敗、ガード欠落、audit の bare fallback、不正 JSON、chunk 分割、worktree 実行)を突く既存テストは確認できなかった(#674〜#678、#668 いずれも)。

## 強み

- `amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts` は audit-first の設計思想(状態変更前に audit emit、または audit emit 後に state write)が徹底されており、#674/#675/#676 の修理はこの既存パターンに沿って局所化できる構造になっている。
- `packages/setup/src/ports/http.ts`・`internal/tar-archive-extractor.ts` は Result 型でエラーを表現する規律が徹底されており、#677 の修理(`try/catch` 追加)はこの既存パターンへの単純な合流で完結する。
- `amadeus-lib.ts` の record-dir/repo-name 解決系は1箇所に集約されているため、#676/#668 の修理は同じファイルの2つの関数に閉じた変更で済む見込み。

## アーキテクチャ横断パターン(6バグの構造的共通性)

個別の欠陥コード位置は code-structure.md に記録済みだが、6件を並べると5つの構造パターンに整理できる。修理時はパターン単位で「同型の欠陥が他にもないか」を確認する価値がある。

1. **監査と実行結果の分離(#674)**: `handleFinalize`(`amadeus-swarm.ts:484-631`)は「exit code / envelope の `merge_failures`」と「`results[]` → audit trail(`emitUnitConverged`/`emitUnitFailed`)」という2つの真実源を持ち、`results[]` を再検証フェーズ(L551-553)で確定してから merge-back フェーズ(L588-599)を走らせるため、後者の失敗が前者に反映されない。原因は「2つの経路が別変数に書かれる設計」自体ではなく、「片方の経路が確定した後にもう片方が更新される順序」にある。
2. **ガードの非対称(#675)**: `handleApprove`(L1286-1379)と `handleReject`(L1430-1487)は `withAuditLock`/`validateSlugInState` という共通骨格を持つ姉妹ハンドラだが、`isAutonomousMode`/`humanPresenceGuardDisabled`/`humanActedSinceGate` という3関数の呼び出しが片方(approve)にのみ配線されている。ガード機構自体は健全で、もう一方の呼び出し口への配線が単に存在しない、という「配線漏れ」型の欠陥。
3. **識別子・パス導出の安定性欠如(#676・#668)**: `auditFilePath`(`amadeus-lib.ts:1267-1270`)と `codekbRepoName`(`amadeus-lib.ts:501-504`)はどちらも「唯一解が求まらないときに、より低精度な識別子へ黙って差し替える」フォールバックを持つ(`recordDir` が null → space-root 直下、`intentRepos` が0/2+件 → `basename(projectDir)`)。フォールバック自体の存在は妥当な設計判断だが、発火がログや戻り値に一切現れないため、呼び出し元は精度の低い識別子で処理を続けていることに気づけない。`stateFilePath`(L1255-1259)も同型のフォールバックを共有しており、#676 の修理範囲を検討する際にはこの姉妹関数への影響有無も確認対象になる(code-quality-assessment 修理時の安全要件 #3 に既述)。
4. **ポート境界での例外漏れ(#677)**: `Http` 型(`http.ts:9-12`)は `Promise<Result<unknown, FetchError>>` を全経路の契約として宣言しているが、`fetchChecked()` の try/catch は Response の取得までしか覆っておらず、その後に `getJson()` 自身が行う `.json()` の await(L27)は契約の外に置かれている。Result 型で境界を守る規律(強みの節に既述)は「境界に入る最初の非同期呼び出し」にだけ適用され、「境界内で追加される2番目の非同期呼び出し」には再適用されていない。
5. **ストリーム状態機械の chunk 境界未検証(#678)**: `extractTarGz` の `carry`/`pendingLongName`/`current`(L36-38)は `for await` ループの外側で宣言されたクロージャ変数であり、chunk をまたいで状態が保持される設計自体は静的スキャン上は妥当に見える。他の4パターンとは異なり、これは「欠陥が実測で確認された」パターンではなく「欠陥の有無が実測でしか確認できない」パターン — 修理着手前に、まず合成 fixture による実証(安全と確認できるなら codekb にその旨を明記、破綻するなら修理)が必要という点で扱いが分岐する。

パターン1・2・3は「機構は存在するが、2つの経路/2つの呼び出し口/2つの姉妹関数のうち片方にしか正しく適用されていない」という同じ形をしており、修理は既存機構への「もう片方への配線」で完結する見込みが高い(bugfix スコープの小規模修正という前提と整合する)。パターン4は既存規律の再適用漏れ、パターン5は検証負債であり、この2件は「直す」前に「本当に直すべきか/どう直すべきか」を requirements-analysis で先に確定する必要がある(既存の「移行しない選択肢の評価」節と整合)。

## リスクと技術的負債

| リスク | 影響 | 注記 |
| --- | --- | --- |
| **#674**: merge-back 失敗が audit/`results[]` に反映されない | 高(監査ログの正確性、conductor の後続判断を誤らせる) | `merge_failures`/exit code だけを見る呼び出し元は正しく検知できるが、`units[].status` や audit trail だけを見る消費者は誤認する。二重の真実源(exit code 経路と audit 経路)が食い違う構造そのものが負債 |
| **#675**: `reject` に human-presence guard が無い | 高(ゲートの公正性、approve/reject の非対称性) | 誰が呼んでも無条件に `revising` へ遷移できる。悪意の有無に関わらず、自動化スクリプトの誤操作でも人間の意思決定を経ずにゲートが後退しうる |
| **#676**: `auditFilePath`/`stateFilePath` の bare fallback が静かに発火する | 中〜高(audit trail の欠落、デバッグ困難性) | 呼び出し元にエラー・警告が一切出ないため、intent 解決失敗という異常状態が正常系のように見える。`error-classification` の観点では「回復不能なはずのエラーを黙って握りつぶす」パターンに該当しうる |
| **#677**: `getJson()` の `.json()` が未保護 | 中(信頼性、原因不明のクラッシュ) | GitHub API のレスポンスボディが期待通りでない場合、`Result` 契約を破って未処理の Promise rejection になる。呼び出し元のエラーハンドリングが `Result` のみを想定していれば、そこで例外が素通りする |
| **#678**: PAX/GNU longname の chunk 跨ぎが実測未検証 | 中(配布物の展開失敗、サイレントな破損の可能性) | 静的スキャンでは明確な破綻は確認できなかったが、実際の chunk 境界での動作は未実証。「検証しないまま安全と断定する」ことも「検証しないまま欠陥と断定する」こともproject.md の evidence-discipline 是正事項に反する |
| **#668**: `codekbRepoName` の fallback が worktree 名を使う | 中(codekb 出力先の非決定性) | 「決定的な per-repo ディレクトリ」という契約(`codekb-path` のコメント)に反する。本スキャン自体がこの fallback の実例(`codekb/claude-engineer-1/`) |

## 修理時の安全要件

1. **#674**: merge-back フェーズの結果を `results[]` に反映してから audit emission フェーズを走らせる順序に変更する。exit code 契約(L630)は変更しない。修理後、意図的に `complete --merge` を失敗させる(例: 競合するブランチ状態を用意する)テストで、`emitUnitFailed`/`emitBoltFailed` が発火し `emitUnitConverged` が発火しないことを実証する(team.md Mandated の「落ちる実証」原則)。
2. **#675**: `handleReject` にガードを追加するかどうかは意図的な設計判断を要する(reject は「人間が却下した」ことを示す操作であり、approve と同じ厳格さを求めるべきかは要件次第)。requirements-analysis で明示的に決定し、ADR 相当の根拠を残す。
3. **#676**: `recordDir` が `null` を返すケースを bare fallback で握り潰さず、`--worktree` の `start` からは明示的に失敗させる(またはログに警告を出す)分岐を追加する。既存の `stateFilePath` の同型 fallback(L1255-1259)への影響有無も確認する。
4. **#677**: `getJson()` の `.json()` 呼び出しを try/catch で包み、`FetchError.classify` 相当のエラー分類を追加する。不正 JSON を返す fixture でユニットテストを追加し、`Result.err` が返ることを実証する。
5. **#678**: PAX/GNU longname ヘッダが2つの `chunk` に分割される、または longname ヘッダとその本体ヘッダが別 chunk に分かれる合成 fixture を用意し、`extractTarGz` が正しく展開できるかを実測する。破綻するなら修理し、破綻しないなら「検証済みで安全」と codekb/テストに明記する。
6. **#668**: `codekbRepoName` の fallback を worktree 対応にする(例: `git rev-parse --show-toplevel` で実体リポジトリのルートを取得し、その `basename` を使う、または `.git` ファイルの `commondir`/`worktrees/<name>` パスから親リポジトリ名を逆算する)。複数 worktree(`claude-engineer-1`、`claude-engineer-2` 等)から同一リポジトリ名が解決されることをテストで実証する。

## 移行しない選択肢の評価

6件とも既存機能の欠陥修理であり、「修理しない」選択肢は intent の目的そのものを満たさない。ただし #675(reject のガード追加)と #678(実測検証)は、修理範囲が「バグである」という前提そのものの検証を要する点で他の4件と性質が異なり、requirements-analysis で先に「これは本当に欠陥か」を確定すべきである。

---

## 既知の欠陥 — integrity-batch(intent `260709-integrity-batch`、履歴)の修理対象4件

> 上記の6バグ(#674/#675/#676/#677/#678/#668)は前回 intent `260709-bug-zero-batch` のスキャン記述であり、integrity-batch のスコープ外。本節が当時の diff-refresh(`a1c79dc12..162553b99`)で焦点化した4件。いずれも当該区間の焦点コードに未着手で残存する欠陥であり、#707・#708 は今回区間で入った前提機構(#693 origin 由来 repo 名 / #671 delegate provenance)の隣接領域として顕在化した。file:line は self-install ツリー(`.claude/`)を実測面として引用する — 修正は source of truth の `packages/framework/core/` を編集し dist/self-install へ伝播させる(team.md Mandated)。

### #708 human-presence 偽陽性(P1、検証機構の正しさ)

- **mint 側(無条件 mint・stdin 未読)**: `.claude/hooks/amadeus-mint-presence.ts:23-31` — `resolveProjectDirFromHook(import.meta.url)` → `existsSync(stateFilePath(...))` なら **無条件に** `appendAuditEntry("HUMAN_TURN", {}, projectDir)`。冒頭コメント L12-13 が「Presence-only: the prompt text is irrelevant, so stdin is not read.」と明言し、UserPromptSubmit を発火させた入力が人間の生タイプか機械注入(Stop-hook フィードバック / task-notification)かを区別する情報を取得しない。これが偽陽性の直接原因。
- **gate 側(mint を消費する判定)**: `.claude/tools/amadeus-lib.ts:1442-1479` `humanActedSinceGate` は `HUMAN_TURN`(および検証済み `DELEGATED_APPROVAL`)とゲート解決イベントを時系列比較し `lastHuman > lastResolution` で true を返す(空台帳は fail-open で true、L1444)。委任承認 provenance `verifyDelegatedApproval`(L1480以降、#671)は健全だが、偽の `HUMAN_TURN` が mint 側で湧くと `isHumanTurn` 経路(L1451)で無条件カウントされ、provenance を経ずゲートが開く。消費点は `amadeus-state.ts:1311`(approve/reject 共通ヘルパー)と `amadeus-state.ts:1479`(delegate-approval)。
- **修正の型(既存様式)**: `amadeus-audit-logger.ts:29-44` / `amadeus-session-start.ts:86-96` が `isTTY` ガード → `Bun.stdin.text()` → `JSON.parse` → `isClaudeCodeHookInput`(`amadeus-lib.ts:2049-2051`)→ fail-open(`process.exit(0)`)の定型を確立済み。hook 入力型 `ClaudeCodeHookInput`(`amadeus-lib.ts:2029-2047`)は既に `source?` / `prompt?` を宣言済み(フィールド追加不要)。ただし**型に在る≠ランタイムで来る**。`source` は SessionStart 固有(session-start.ts が読む)で、UserPromptSubmit に判別材料が来る保証はない — 実 UserPromptSubmit stdin JSON の実機キャプチャが必須(code-generation 段)。判別材料が無ければ #708 提案(b)「gate は delegate provenance を正道とし、ローカル単独 HUMAN_TURN を信頼しない」が現実的な緩和方向。fail-open 契約(mint 失敗が人間のターンをブロックしない)は維持必須。

### #705 sdk-drive calibration のランナー管理外・doctor ドリフト(P2、検証機構の正しさ)

- **doctor 期待値ドリフト**: `tests/harness/sdk-drive.calibration.test.ts:55-72` が既知回答 doctor 文字列をピン留めするが、`DOCTOR_DOCS_LABEL = "amadeus-docs/ directory exists"`(L72)は現行 doctor 出力に存在しない(CONFIRMED)。現行 `amadeus-utility.ts:628` は `label: \`workspace shell ready (${harnessDir()}/ + amadeus/spaces/default/memory/)\`` を出力し、旧文字列は現れない。よって calibration 2 は依存導入後も失敗する。コメント L61-66 が指す `utility.ts:396` の旧行自体もドリフト。
- **ランナー管理外**: `tests/run-tests.ts:31` の `type Level = "smoke" | "unit" | "integration" | "e2e"`、`levelFiles(level)`(L577-587)は `join(SCRIPT_DIR, level)` 直下のみ列挙。`tests/harness/` はどの Level にも属さず、substrate skip(`shouldSkipForClaude`、L485-489)も掛からない(CONFIRMED)。ad hoc 実行時のみ走り、通常 CI では tier 外。`tests/gen-coverage-registry.ts`(L675以降)のカバレッジウォークは `tests/harness/` を静的集計するが、これは**実行**ではなく substrate ゲートとは別系統。
- 修正はテスト側の期待値更新 + ランナー登録方針の決定(#705 提案 A/B)。team.md/project.md の「検証劇場 Forbidden」(偽の trust anchor)の趣旨に直結し、「落ちる実証」が要求される。

### #707 codekb 並行リフレッシュ衝突(P2、共有ストアの一貫性)

- **前提機構(#693)**: `.claude/tools/amadeus-lib.ts:556-565` `codekbRepoName` は recorded repos が1件ならその名、0件なら `originRepoSlug(projectDir)`(L560)、解決不能時 `basename(projectDir)`。#693 で origin remote 由来に統一され、全 worktree/clone が同一 `codekb/amadeus/` を指す = #707 の前提。関連: `codekbDir`(L530-533)、`originRepoSlug`(L571-580)。
- **単一 timestamp 構造(構造的原因)**: ステージ定義 `.claude/amadeus-common/stages/inception/reverse-engineering.md` の L5 `condition:`(「Always rerun for freshness」= 常時リフレッシュ前提)、L36 `outputs:`(`codekb/<repo>/` の**9固定ファイル・単一ディレクトリ**)、L110(`reverse-engineering-timestamp.md` は freshness marker、**単一ファイル**)。timestamp は per-intent の base/observed を分離して持てず、並行リフレッシュで base/observed が互いに上書きされる。現行 `codekb/amadeus/reverse-engineering-timestamp.md` の実形式も単一 intent の単一スキャン点を前提とし、複数 intent の並行 base/observed 欄が無い。
- 修正方向 C(timestamp を per-intent 記録化、本文 last-writer-wins 明文化)を採るなら、このファイル構造とステージ定義 L110/L36 の両方に規約追記が要る。**本 timestamp 更新自体がこの緊張(自己言及)の当事者** — last-writer-wins 前提で書く必要がある。

### #706 delivery knowledge の tree 外参照(P3、共有参照の一貫性)

- **破損参照**: `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md:3` — 「Use this alongside `product-guide.md` when leading execution plan creation.」だが、delivery-agent の宣言済みロードパス(`amadeus-delivery-agent.md:71-77`)は自分の `knowledge/amadeus-delivery-agent/` と `amadeus-shared/` のみで product-agent ディレクトリを読まない。
- **実配置**: `knowledge/amadeus-delivery-agent/` は `mob-programming-guide.md` / `team-topologies.md` / `workflow-planning-guide.md` の3ファイルのみで **`product-guide.md` は不在**。`product-guide.md` は `knowledge/amadeus-product-agent/product-guide.md` に存在(core / `.claude` / `.codex` / `dist/{claude,codex,kiro,kiro-ide}` の7箇所に伝播済み)。
- **伝播構造**: 破損参照は既に `.claude/knowledge/.../workflow-planning-guide.md:3` と `dist/claude/` 複製にも伝播済み。L3 は当該 diff 区間で未変更(L55 のみ #672 で編集)= 恒久的な既存欠陥。修正は core を直し `bun scripts/package.ts` + `bun run promote:self` で全ツリー再同期(`dist:check`/`promote:self:check` を同一コミット)。修正方向は (a) 参照文言の削除/修正、(b) `product-guide.md` を delivery ディレクトリにコピー(重複負債・NEVER 二重実装ノルムと緊張)、(c) delivery-agent のロードパスに product-agent knowledge を追加 — 設計判断は requirements-analysis へ。

### 構造的共通性(4バグの分類)

- **検証機構の正しさ系(#705・#708)**: どちらも「偽の信頼を生む機構」= team.md/project.md の「検証劇場 Forbidden」の趣旨に直結。修正時は「落ちる実証」(失敗ケース注入で赤くなること)が team.md Mandated で要求される。
- **共有ストア/参照の一貫性系(#706・#707)**: #693(origin 由来 repo 名)後の単一 codekb ストアという新しい共有面で、並行書き込み(#707)と tree 外参照(#706)が顕在化。
