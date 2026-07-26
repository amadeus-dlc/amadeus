# 再スキャン記録 — 260726-metrics-visualization（metrics スナップショットの可視化）

上流入力（consumes 全数）: 本 intent の reverse-engineering ステージ Step 2（Developer スキャン結果）

- Developer スキャン結果 — 区間サマリ（2実装系統 + metrics スナップショット2件）、metrics サブシステム現況（`scripts/metrics-*.ts` 3モジュールの file:line、ci.yml `metrics-snapshot` job、テスト8ファイル、`metrics/*.json` 件数）、可視化への含意（再利用 seam / 挿入点3案 / HTML 先例 / 未整備面）を引き継いだ。**file:line・件数はすべて本 Step 3 で observed `1c43438df` に対してスポット再実測し、不一致は下記「上流主張の再実測と訂正」に記録した。**

## メタ

| 項目 | 値 |
| --- | --- |
| Date | `2026-07-26` |
| Base commit | `11f1ad61f5ea4942332da5bd6e3e433c44aa4cab`（前 intent `260725-worktree-ref-fixes` の observed） |
| Observed commit | `1c43438df0348fed63c5fe88af46c9417258d4e0`（= 現 HEAD、`git rev-parse HEAD` 実測。ブランチ `main`） |
| 祖先性 / 距離 | `git merge-base --is-ancestor 11f1ad61f 1c43438df` exit **0** / `git rev-list --count 11f1ad61f..1c43438df` = **5** |
| 区間規模 | **452 files changed, 68457 insertions(+), 2792 deletions(-)** |
| Scope | `amadeus-feature`、Depth Standard、Brownfield、単一 repo `amadeus` |
| 方式 | 差分リフレッシュ（cid:reverse-engineering:c1）。フルスキャン不実施 |
| 測定 ref | 全 file:line・件数は observed `1c43438df` の実ファイル直読、および `git diff --numstat` / `grep -n` / `grep -c` / `ls \| wc -l` / `git ls-files` 出力からの転記 |

## Focus

`metrics/` スナップショットの可視化機能。本 scan の主眼は (1) 既存 metrics サブシステムの現況把握 (2) 再利用可能な seam の同定 (3) 可視化の挿入点と、それぞれが壊しうる既存契約の特定 (4) 既習様式（HTML 生成・テスト配置・依存方針）の抽出 の4点。

## 区間サマリ

`git log --oneline 11f1ad61f..1c43438df` 全5件:

| コミット | 内容 | 系統 |
| --- | --- | --- |
| `bbd74a942` | chore(metrics): record snapshot（[PR #1490](https://github.com/amadeus-dlc/amadeus/pull/1490)）| C |
| `77d871d57` | feat(grants): standing delegation grants を solo mode で利用可能にする（[PR #1483](https://github.com/amadeus-dlc/amadeus/pull/1483)）| A |
| `272f4bd58` | chore(metrics): record snapshot（[PR #1491](https://github.com/amadeus-dlc/amadeus/pull/1491)）| C |
| `e12259ba7` | fix(hooks,tests): worktree セッションのパス／ref 解決ファミリを修正（[PR #1493](https://github.com/amadeus-dlc/amadeus/pull/1493)、#1482 / #1481 / #1455、refs #1492）| B |
| `1c43438df` | Merge branch 'main' | — |

正本の変更（`git diff --numstat` 実測）:

- **系統 A（PR #1483）**: 新規 `packages/framework/core/tools/amadeus-grant-authorization.ts` **+876**、新規 `packages/framework/core/tools/amadeus-presence-reservation.ts` **+512**、`amadeus-state.ts` **+467 −73**、`amadeus-lib.ts` **+202 −29**、`amadeus-orchestrate.ts` **+184 −4**、`amadeus-directive.ts` **+127 −41**
- **系統 B（PR #1493）**: `packages/framework/core/hooks/` の**全11フック**が同型変更。`amadeus-lib.ts` に `HookStdin` `:4773` / `hookPayloadCwd` `:4779` / `readHookStdin` `:4794` を新設し、`resolveProjectDirFromHook` `:269` へ第2引数 `payloadCwd?: string | null` を追加
- **系統 C**: `metrics/*.json` の追加のみ（コード変更なし）

**本 intent の重点である metrics サブシステムは区間内で完全に無変更**: `git diff --name-only 11f1ad61f 1c43438df -- scripts/ .github/` の出力は **0 行**。

## 重点領域の実測要約 — metrics サブシステム

### 3層パイプライン（合計 550 行）

| モジュール | 行数 | 役割 | 妥当性定義 |
| --- | --- | --- | --- |
| `scripts/metrics-snapshot.ts` | 185 | writer | `finite()` `:26-29`、16KB 上限 `:150` |
| `scripts/metrics-timeseries.ts` | 236 | reader | `parseSnapshot` `:50`（7段 fail-closed）|
| `scripts/metrics-retention.ts` | 129 | pruner | `parseSnapshot` を `:17` で import（private parser なし）|

`metrics-retention.ts:6-9` が「writer, reader, and pruner agree on what a valid snapshot is」を明文で契約している。

### reader の「書かない」契約

`metrics-timeseries.ts:3-4` verbatim:

> `:3` `// Prints per-collector timelines as plain-text tables. Never writes: this`
> `:4` `// module must not import any fs write API (AC-1c; grep-checkable).`

### 再利用 seam（export 一覧）

型5件: `CollectorEntry` `:20` / `Snapshot` `:25` / `ParseOutcome` `:32` / `NonEmpty` `:36` / `CollectorResolution` `:38`。
関数10件: `parseSnapshot` `:50` / `assertNonEmpty` `:81` / `buildSeries` `:87` / `discoverCollectors` `:95` / `unionValueKeys` `:103` / `resolveCollector` `:113` / `renderDigest` `:131` / `renderCollectorTable` `:151` / `parseArgs` `:171` / `main` `:188`。
非 export 2件: `formatValue` `:117-119` / `renderTable` `:121`。

### 型の緩さと可変キー

`:18-19` により `values` の個値は `unknown` のまま。`metrics-snapshot.ts:102` が `test_pyramid` のキーを `${tier}_${size}` で動的合成する（実データ 11 キー）ため、可視化は `unionValueKeys` `:103` の利用が必須。

### CI 配線

`.github/workflows/ci.yml:398` の `metrics-snapshot` job。`ci-success` 集約外（`:396-397` に意図の明文）、concurrency `metrics-snapshot-main` / `cancel-in-progress: false`、`paths-ignore: metrics/**` `:12-13`。ステップは snapshot `--write` `:446` → retention `--apply` `:449` → `git add -A metrics/` `:461` → `gh pr create` `:470` → `gh pr merge --auto --squash --delete-branch` `:475`。**`main` 直 push ではない**。

### データ

`metrics/*.json` = **123 件**（保持上限 `METRICS_RETENTION_KEEP_LAST = 360`、`metrics-retention.ts:25` の 1/3 弱）。最新は `metrics/2026-07-25T23-15-54-977Z-77d871d574c4.json`。

### テスト（8ファイル）

unit 5（t221-core 6 / t221-cli 7 / t221-collectors 2 / t230-timeseries 17 / t231-retention 9）+ integration 3（t221 9 / t230 9 / t231 10）。integration は `AMADEUS_METRICS_ROOT` seam 経由。

## 可視化への含意

| 論点 | 実測に基づく所見 |
| --- | --- |
| 挿入点 | `metrics-timeseries.ts` への `--html` 追加は `:3-4` の AC-1c 契約に正面抵触。新規 `scripts/metrics-visualize.ts` が `metrics-retention.ts` と同型（reader を import する書き手）で契約を壊さない |
| CI 位置 | `retention --apply` `:449` の後・`git add -A metrics/` `:461` の前。`metrics/` 配下への出力は commit に自動で乗るが、`paths-ignore: metrics/**` `:12-13` と retention の `*.json` フィルタ `:45` への影響を要設計 |
| 描画整形 | `formatValue` `:117-119` が非 export。export 昇格か同等関数の新設が設計判断点（後者は妥当性定義の二重化にあたる）|
| 欠測・非数値 | `values: unknown` により `NaN` が座標へ流れ込むと SVG が無音で壊れるクラスの欠陥を作りうる。扱いの明示的判断が要る |
| 可変キー | `unionValueKeys` `:103` を使わないと系列が無音で1本欠落する。fixture に「キー集合が変化するスナップショット列」を含めないと検出できない |
| HTML 様式 | repo 唯一の先例は `tests/run-tests.ts:573` `writeCoverageHtml`（テンプレートリテラル直書き + `coverageHtmlEscape` `:526` + 生成物の読み返し assert、`t05:582`）。チャートライブラリ前例 0 件 → **inline SVG が既習様式の延長** |
| 依存 | **追加ゼロが既習様式と整合**。`package.json` の全 **15** scripts エントリ中 metrics 系 **0**、`scripts/metrics-*.ts` の `amadeus-lib` import も各 **0** |
| ドキュメント | `grep -rl 'metrics-snapshot\|metrics-timeseries\|metrics-retention' docs/` = **0 ファイル**。日英ペアの新規ドキュメントが要る |
| 区間の影響 | 系統 A / B はいずれも metrics サブシステムと依存を持たない（import 実測 0）。可視化の設計前提に影響しない |

## 上流主張の再実測と訂正

| # | 上流スキャンの記述 | 本 scan の実測 | 判定 |
| --- | --- | --- | --- |
| 1 | `resolveProjectDirFromHook` は `amadeus-lib.ts:247`（前 intent codekb の値）| **`:269`**（`grep -n` 実測）| **訂正**。PR #1483 / #1493 による +22 行シフト（cid:reverse-engineering:upstream-cite-reresolve-on-shift）|
| 2 | `package.json` scripts は全 **16** エントリ | 全 **15** エントリ（うち metrics 系 0 は一致）| **訂正** |
| 3 | 正本 diff: `amadeus-state.ts` +540 / `orchestrate` +188 / `directive` +168 / `lib` +160 | numstat 実測 **+467 −73** / **+184 −4** / **+127 −41** / **+202 −29** | **訂正**。本 codekb は numstat 値を採用 |
| 4 | snapshot collectors の定義域 `:71-110` | **`:72-110`**（`grep -n 'name: "'` 実測で最初の collector は `:72`）| **訂正** |
| 5 | covers マーカーの registry は `tests/.coverage-registry.json` | 同ファイルの `grep -c 'harness-instrument'` = **0**。metrics を含む文字列は `amadeus-norm-metrics` 系3件のみ（別サブシステム）| **訂正**。covers マーカーはテストファイル1行目の自己申告に留まり registry 登録なし |
| 6 | （既存 codekb 履歴節）`scripts/amadeus-mirror.ts` を repo ローカル層の前例として引用 | `scripts/amadeus-mirror.ts` は**存在しない**。mirror 系は `packages/framework/core/tools/amadeus-mirror-*.ts`（配布 `.claude/tools/`）| **失効**。同層の実在例は `scripts/amadeus-election-migrate.ts` / `scripts/distribution-transaction.ts` / `scripts/formal-verif/*.ts` |
| 7 | metrics サブシステムは区間内で無変更 | `git diff --name-only 11f1ad61f 1c43438df -- scripts/ .github/` = **0 行** | **一致（追認）** |
| 8 | `metrics/*.json` = 123 件、`METRICS_RETENTION_KEEP_LAST = 360` `:25` | `ls metrics/*.json \| wc -l` = **123**、`grep -n` で `:25` を確認 | **一致（追認）** |
| 9 | `scripts/metrics-*.ts` は `amadeus-lib` を import しない | `grep -c 'amadeus-lib' scripts/metrics-*.ts` = 各 **0** | **一致（追認）** |
| 10 | ci.yml の主要行（`:446` / `:449` / `:461` / `:470` / `:475` / `:12-13` / `:398`）| `grep -n` で全数一致 | **一致（追認）** |

## センサー不適用と代替検証

RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わない。**

代替検証として以下2点を実施した。

1. **H2 構成の機械確認**: 更新した全成果物（本ファイルを含む10件）に `grep -c '^## '` を実行し、いずれも **2 以上**であることを確認した。結果は本 intent の最終報告に表として記載。
2. **上流入力参照の直接検証**: Developer スキャン結果が主張する file:line・件数を observed `1c43438df` に対してスポット再実測し、10項目中 4項目の訂正と1件の失効引用を検出した（上表参照）。訂正はすべて更新成果物本文へ反映済みで、失効引用（#6）は `dependencies.md` に明示の注記として記録した。

## Delivery boundary

本 scan は **codekb 9成果物 + 本 re-scan 記録**の更新のみを成果物とする。実装コード・intent record・memory・`intents.json`・生成配布物・state・audit・commit・PR 操作はいずれも未実施。可視化機能の方式（挿入点の確定、出力形式、`formatValue` の扱い、CI 配線、ドキュメント面）は後続の requirements-analysis 以降で裁定する。
