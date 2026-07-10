# リバースエンジニアリング実施記録

## 実行メタデータ(最新: 260710-mint-presence-vectors)

- Date: 2026-07-10
- Intent: `260710-mint-presence-vectors`(#755 — machine-injected-turn 分類器が `<task-notification>` 開頭のみを抑止し、teammate-message 注入ターン(agmsg/SendMessage inbox 配信、形式 D)が phantom HUMAN_TURN を鋳造して human-presence gate と #671 委任 provenance を汚染する)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-1`(branch `diag/683-codecov-project-numeric-target`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。フォーカス面のコード diff は**空**(base→observed でソース無変更)のため前回理解を温存し、e1/e6/e5 の 3 者食い違いを動的実測(隔離 temp プロジェクトでの合成 stdin 測定)+ 本番 Claude Code transcript の法医学的照合で確定した。base/observed の真実源は per-intent の `re-scans/260710-mint-presence-vectors.md`(共有本ファイルは鮮度ポインタでありベース点ではない)。
- Base commit: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(前回 observed = intent 260710-source-unreferenced-check)
- Observed commit: `fc5a34cf194aac05a4913e99eb7f9c4707d9d8e1`(現 HEAD 実測)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-mint-presence.ts`(分類器)・`amadeus-stop.ts` tier-3(`transcriptIsConversational`)・`amadeus-lib.ts` `humanActedSinceGate`・`amadeus-state.ts` 委任 grounding・`tests/unit/t203-mint-presence-classify.test.ts`
- 更新した成果物: `code-quality-assessment.md`(#755 観測節を追加)、`architecture.md`(注入分類カタログ非共有の構造事実を追補)、本ファイル(鮮度ポインタ)。他成果物は base→observed 無変更かつ本 intent 観測面と無関係のため温存(churn 回避、cid:practices-discovery:c2 相当)。

## 実行メタデータ(前回: 260710-source-unreferenced-check)

- Date: 2026-07-10
- Intent: `260710-source-unreferenced-chec`
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/735-source-unreferenced-check`, base `origin/main`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit(前回 codekb 観測コミット): `162553b99`(intent `260709-bug-zero-batch` の統合版、`codekb/amadeus/` 一本化後。前回 gate-mechanics スキャンもこのコミットを観測対象としており、実コード diff は0だった)
- Observed commit: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(現 HEAD、`origin/main` = #737 込みをマージ済み)
- 差分規模: `git log 162553b99..HEAD` は38コミット。本日の main マージ群(#711/#712/#713/#714/#715/#716、#721/#722/#724/#725/#726、#732、#727=#670修正、#729=#685修正、#737=#719修正 等)を含み、今回は前回2スキャン(bug-zero-batch/gate-mechanics)と異なり**実コードに差分がある**。
- Focus: Issue #735 が依存する理解面 — **packaging の入力集合と source 側 unreferenced 検査点**。`scripts/package.ts`(`checkHarness`/`buildTree`)、全 harness の `manifest.ts`(`harnessFiles`/`renames`/`authoredExempt`/`emit`)、#737(kiro CLI の stale `.kiro.hook` 削除 + vacuous exemption 除去)と #711(dist 全域 orphan scan)を重点読解。
- ベースにした codekb: `amadeus/spaces/default/codekb/amadeus/`(2026-07-09、intent `260709-gate-mechanics` 版)

## 再検証結果(本 intent の差分)

38コミットのうち、前回 codekb(gate-mechanics 版)の記述を陳腐化させる主要変更と、#735 の理解面に新規に加える読解結果を記録する。

### 前回 codekb を陳腐化させた変更(2バグとも出荷済みに)

- **#685 delegate-rejection は解消済み(#729)**: 前回 codekb は「REJECT 側に delegate-approval 相当の遠隔委任機構が存在しない」と記録していたが、`14d1146e0`「fix #685: add DELEGATED_REJECTION ... (#729)」がマージ済み。現在 `amadeus-state.ts` の subcommand dispatch(L262-263)に `delegate-rejection` → `handleDelegateRejection` があり、`amadeus-audit.ts` の `VALID_EVENT_TYPES`(L73)と presence/provenance の trusted-writer 集合(L755)に `DELEGATED_REJECTION` が追加された。`humanActedSinceGate` は「`DELEGATED_APPROVAL` は approve のみ、`DELEGATED_REJECTION` は reject のみを開く」verb-scoped presence に分離されている(`amadeus-state.ts` L1444 近傍のコメント)。architecture.md・code-structure.md・api-documentation.md 等の #685「不在」記述は歴史的記録であり、以後は「#685 は fix 済み」を前提にする。
- **#670 sibling-worktree guard は解消済み(#727)**: 前回 codekb は `assertNotSiblingWorktree` が sibling worktree を無条件拒否すると記録していたが、`20c2e9674`「fix #670: anchor amadeus-worktree write paths to the main checkout (#727)」がマージ済み。現在 `amadeus-worktree.ts` は無条件拒否をやめ、cwd を分類して write パスをメインチェックアウトへ**アンカー**する方式(戻り値 `{ cwdTop, mainCheckout }`、L116-123)。sibling dev worktree から呼んでも Bolt worktree はメインチェックアウトの sibling として作成/マージ/破棄される(冒頭コメント L12-13、分類コメント L133-137)。architecture.md・code-structure.md の #670「無条件拒否」記述は歴史的記録。

### #735 の理解面(新規読解)

- **build が読む「入力集合」の確定点**: `scripts/package.ts` の `buildTree`(L307)が、build がソースとして消費する集合を確定する。(1)`core/<coreDirs[].src>` を `walk()` で列挙(L322-344)、(2)`harness/<name>/<harnessFiles[].src>` を個別コピー(L357-363)、(3)onboarding skeleton(L370-376)、(4)`core/memory/` を `emitMemory`/`emitMemorySeed`(L382-395)、(5)`emit()` プラグイン(codex のみ、L446-458)。harness ソースは**ディレクトリ全体を walk せず `harnessFiles` に列挙された src だけ**をコピーする — したがって `harness/<name>/` 配下の未列挙ファイルは build から完全に不可視になる。
- **source 側 unreferenced 検査は現状不在**: `checkHarness`(L554)の orphan 検出はすべて **dist 出力側**(committed dist vs 再ビルド dist)で働く(harness-dir orphan L574-582、dist 全域 orphan L605-628、#711 で追加)。`harness/<name>/` の authored ソースが manifest のどの行からも参照されない場合、それは dist に到達しないため dist orphan scan では検出できない。これが #735 が塞ごうとしているギャップ。
- **#737 = このギャップの実害例**: kiro CLI harness に7個の `.kiro.hook` ソースファイルが manifest 未参照のまま残存し(dist へ出荷されず)、しかも kiro manifest の `authoredExempt` に「dist/kiro には元々存在しない」ファイル種別を除外する vacuous な regex `/^hooks\/[^/]+\.kiro\.hook$/` があった。#737 は7ファイルを削除し vacuous exemption を除去、`t148` に「CLI harness ソースに `.kiro.hook` が0個」の再注入ガードを追加した(`tests/smoke/t148-kiro-file-structure.test.ts`)。詳細は code-quality-assessment.md・code-structure.md「packaging」節を参照。

## 実行メタデータ(前回: 260709-bug-zero-batch、履歴として保持)

- Date: 2026-07-09
- Intent: `260709-bug-zero-batch`
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-1`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit: `aff3b6671`(`amadeus/spaces/default/codekb/claude-leader/` の観測コミット、前回 intent `260709-framework-repair-batch` のスキャン)
- Observed commit: `a1c79dc12df38a8363524116eff9d877677a7224`
- Focus: 修理対象バグ6件 — #674(`amadeus-swarm.ts` finalize の merge-back/audit 分離)、#675(`amadeus-state.ts` reject の human-presence guard 欠落)、#676(`amadeus-bolt.ts` start + `amadeus-lib.ts` auditFilePath の bare fallback)、#677(`packages/setup/src/ports/http.ts` getJson の json() 未保護)、#678(`packages/setup/src/internal/tar-archive-extractor.ts` の PAX/GNU longname 状態)、#668(`amadeus-utility.ts`/`amadeus-lib.ts` の codekb-path `<repo>` セグメント導出)
- ベースにした codekb: `amadeus/spaces/default/codekb/claude-leader/`(2026-07-09、intent `260709-framework-repair-batch`、対象バグ #656/#657/#641/#661)

## 分析範囲

`git diff --name-status aff3b6671..HEAD` で143ファイルの差分を確認した(19コミット、うち大半は `origin/claude-leader` ブランチのマージ)。主な変更内容は次の通り。

- `modelOverride` → `model` へのエージェント frontmatter 改名(PR #669、114ファイル規模、`.claude`/`.codex`/`dist/*`/`packages/framework/core/agents/` の全複製箇所)。
- `amadeus/spaces/default/codekb/claude-leader/` の新設(前回 intent `260709-framework-repair-batch` のスキャン結果、9ファイル)。
- `amadeus/spaces/default/intents/260709-canonical-settings/`・`260709-framework-repair-batch/` の工程記録追加(ideation/requirements-analysis の memory・questions・requirements)。
- `amadeus/spaces/default/memory/team.md` への §13 学習事項の複数追記(human-presence interim 運用、auto-gate-approval、blocker-election 等の運用ノルム)。

この差分自体は本 intent(bug-zero-batch)が対象とする6バグのコード領域(`amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts`/`amadeus-lib.ts`/`packages/setup/src/ports/http.ts`/`packages/setup/src/internal/tar-archive-extractor.ts`)に変更を加えていない。したがって6バグはこの差分区間の前後を通じて存在し続けている欠陥である。

重点スキャン対象は次の6ファイル/領域(すべて実コードを直接読解して確認)。

- `packages/framework/core/tools/amadeus-swarm.ts` L484-631(`handleFinalize`)— #674
- `packages/framework/core/tools/amadeus-state.ts` L1286-1487(`handleApprove`/`handleReject`)— #675
- `packages/framework/core/tools/amadeus-bolt.ts` L180-239(`start` の `--worktree` パス)+ `amadeus-lib.ts` L1246-1271(`stateFilePath`/`auditFilePath`)— #676
- `packages/setup/src/ports/http.ts` 全体(84行)— #677
- `packages/setup/src/internal/tar-archive-extractor.ts` 全体(228行)— #678
- `packages/framework/core/tools/amadeus-lib.ts` L495-524(`codekbRepoName`)+ `amadeus-utility.ts` L2690-2699(`codekb-path` ハンドラ)— #668

## 鮮度に関する注記

ベースライン `amadeus/spaces/default/codekb/claude-leader/`(2026-07-09、intent `260709-framework-repair-batch`)は #656/#657/#641/#661 という前回バッチの4バグを主眼に書かれており、本 intent が対象とする6バグには一言も触れていない。本スキャンはこの前提を次のように更新した。

- 対象バグ群を完全に入れ替えた(#656/#657/#641/#661 → #674/#675/#676/#677/#678/#668)。前回バッチの4件はこの codekb では扱わない。
- 前回バッチのうち #656(`Installation.detect` が `LegacyLayout` を呼ばない)は、`upgrade.ts:192` で `Installation.detect` の evidence を `LegacyLayout.isUnsupported` に渡す配線が確認でき、解消済みと判断した。#657(`bunx tsc` の無条件使用)は `amadeus-sensor-type-check.ts:157,174` の時点でも変更が確認できず、未修理のまま残存している。#641・#661 は本スキャンの重点対象外のため状態未確認。これらは本 intent のスコープではないため、修理判断は行わず状態のみを記録する。
- `packages/framework/core/`・`packages/setup/` の全体構造(one-core-many-harnesses、functional-domain-modeling-ts スタイル)自体は前回スキャン時点から変更なし。

## 合成方針(Architect 想定)

Developer スキャン結果として、6アーティファクト構造(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment / reverse-engineering-timestamp の9ファイル)を diff-refresh 方式で更新した。前回バッチの4バグに関する記述は新しい6バグの記述に置き換え、全体構造・技術スタック・依存関係グラフのうち変更がない節(one-core-many-harnesses、Bun/TypeScript/Biome スタック、`release.yml` 一本化のバージョン運用)はベース(claude-leader 版)の記述をほぼ温存した。architecture.md に6バグそれぞれの相互作用図(シーケンス図)を新設し、原因コード位置・再現条件・修理時の波及範囲を code-structure.md・code-quality-assessment.md に集中して記述した。

## 更新した成果物

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `reverse-engineering-timestamp.md`

## 統合記録(AC-668-4、2026-07-09)

- **統合**: #668 修正(PR #693)マージ後、分裂していた4ディレクトリ(`amadeus`(2026-07-07 stale)/ `installer-distribution`(2026-07-08)/ `claude-leader`(2026-07-09)/ `claude-engineer-1`(2026-07-09))を本ディレクトリ `codekb/amadeus/` に一本化した
- **正の根拠**: スキャンの系譜は amadeus(7/7)→ installer-distribution(7/8、base 8510281ae)→ claude-leader(7/9、base aff3b6671)→ claude-engineer-1(7/9、base aff3b6671 の leader 版をベースに observed a1c79dc12)という差分リフレッシュの連鎖であり、最新の claude-engineer-1 版が累積 superset。本ディレクトリはその claude-engineer-1 版の git mv
- **包含チェック**: 4ディレクトリとも同一の9ファイル構成でファイル単位の欠落なし(削除分は git 履歴から復元可能)
- **以後**: `codekb-path` は #668 修正により安定名 `amadeus` を返す(このコミットで実測済み)ため、次回スキャンは本ディレクトリへの差分リフレッシュとなる

## 本 intent(260710-source-unreferenced-check)で更新した成果物

packaging 入力集合と source-unreferenced ギャップに焦点を絞った diff-refresh。既存の bug 別ナラティブ節(#674〜#678/#668/#685/#670)は歴史的記録として温存し、上部に #735 の新規節を追記、#685(#729)/#670(#727)の解消済みバナーを各所に付す形で更新した。

- `architecture.md` — 「packaging 入力集合と source 側 unreferenced 検査」節を新設(build 入力の確定点・dist orphan scan の守備範囲・#735 のギャップ)。#685/#670 の解消済みバナーを追記。
- `code-structure.md` — 「packaging 構造(`scripts/package.ts` / harness manifests)」節を新設(`buildTree`/`checkHarness` の段構成、全 harness の `harnessFiles`/`authoredExempt` 目録)。#685/#670 解消済みバナー。
- `code-quality-assessment.md` — vacuous exemption アンチパターンと source-unreferenced ギャップを技術的負債として追記。#685/#670 解消済みバナー。
- `component-inventory.md` — `scripts/package.ts`/`scripts/manifest-types.ts`/harness manifests のコンポーネント表を追記。
- `api-documentation.md` — `scripts/package.ts`(write/`--check`)の CLI 契約を追記。#685/#670 解消済みバナー。
- `dependencies.md` — packaging 依存グラフ(core/harness → package.ts → dist の入力集合)と `fast-check` 依存追加を追記。
- `technology-stack.md` — `fast-check`(PBT、#722)、動的 test-size 計測(#732)、codecov 導入を追記。
- `business-overview.md` — 本 intent の業務境界(source-unreferenced check)を追記。#685/#670 解消済みバナー。

## 前 intent(260709-gate-mechanics)で更新した成果物(履歴)

コード diff がないため全面リライトではなく、#685/#670 関連の新規節を追記する形の diff-refresh。

- `architecture.md` — 「#685」「#670」の相互作用図(シーケンス図)を新設。旧6バグの図は保持(#675 は解消済みと明記)。
- `code-structure.md` — gate resolution 系(`amadeus-state.ts`/`amadeus-lib.ts`)と `amadeus-worktree.ts` の該当関数表を追記。
- `component-inventory.md` — human-presence gate コンポーネント表・worktree ガードコンポーネント表を追記。
- `api-documentation.md` — `delegate-approval`/`reject` の現行契約と `amadeus-worktree create`/`bolt --worktree` の契約を追記。
- `code-quality-assessment.md` — #685・#670 のリスク評価節を追記、#675 を解消済みとして更新。
- `business-overview.md` — 本 intent の業務境界(2バグ)を追記。
- `technology-stack.md`・`dependencies.md` — 変更なし(該当領域に新規依存・技術変更なし)、確認済みの旨のみ追記。
