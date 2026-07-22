上流入力(consumes 全数): (chore スコープにより設計ステージは SKIP — 要件は Issue #1199 直参照)

# code-summary: state CLI の `--intent` / `--space` セレクタ追加(Issue #1199)

## 概要

state CLI 正本 `packages/framework/core/tools/amadeus-state.ts` の active-intent 限定 verb `get` / `set` / `checkbox` / `count` に、fork/merge 系と同型の `--intent <record-dirname>` / `--space <name>` セレクタを追加した。非 active intent の record を、カーソル一時切替を伴わずに in-place で読み書きできる(#1170 同族ハザードの封鎖)。

- **既定挙動バイト同一**: セレクタ無指定時は `resolvedIntent=undefined` に解決し、従来どおり active cursor の state file を対象・sentinel ロックバケットを使用(state file バイト・ロックバケットとも従来同一。t145 lock-concurrency green で実証)。
- **fail-closed**: 不在 intent/space は `readStateFile` が throw → `main()` の try/catch → `error()` → exit 1。無言フォールバックなし。
- **監査帰属**: `set`/`checkbox` はエラー時のみ `ERROR_LOGGED` を出す(成功時は state-machine event に乗らず無出力)。fork/merge と同じく `lockIntent`/`lockSpace` を per-intent lock 前に設定し、`ERROR_LOGGED` を**対象 intent のシャード**へ帰属させる(active シャードを汚染しない)。
- **重複実装なし**: セレクタ解決は既存 `activeIntent` / `readStateFile` / `writeStateFile` / `withAuditLock` / `emitError` の per-intent 経路を流用。位置引数から `--intent`/`--space` を取り出す小ヘルパー `extractIntentSelector` と、fork の解決規則を切り出した `resolveSelectedIntent` のみ新設。

## 設計上の判断(レビュー観点)

- `set`/`checkbox` の**無指定既定**を per-intent バケットへ変えない(sentinel を維持)。全 verb 中 fork/merge 以外は sentinel ロックのため、既定を per-intent にすると同一 active intent 上の並行 `set`+`approve` が別バケット化して直列化が崩れる(lost-update regression)。`resolveSelectedIntent` は無指定時 `undefined` を返し、この regression を回避する。
- `get`/`count` は read-only でロックを持たないため `lockIntent` を設定しない(要件の監査帰属は `set`/`checkbox` に限定。不在 intent の ERROR_LOGGED は対象シャードが存在しないため active/sentinel でよい — 最小変更)。
- `handleGet`/`handleCheckbox`/`handleCount` を coverage seam のため `export` 化。`amadeus-state.ts` は `tests/gen-coverage-registry.ts:559-562` の `enumerateExportedFunctions`(`amadeus-lib.ts`/`amadeus-graph.ts` のみ走査)の対象外のため coverage-registry の関数ユニットは増えない。
- 既存様式踏襲: arrow body の非追加インデント様式・`handleSet` の no-closures 規律(complexity baseline ordinal 保護)を保存。`extractIntentSelector` は plain `for` ループ(CCN < 15、baseline 不要)。

## 変更ファイル

### 実装(正本)
- `packages/framework/core/tools/amadeus-state.ts`
  - `extractIntentSelector`(新規 export、位置引数から `--intent`/`--space` を全トークン一致で抽出)
  - `resolveSelectedIntent`(新規、無指定→undefined / 指定→`activeIntent(pd, space, intent) ?? undefined`)
  - `handleGet`(export 化 + セレクタ解決 + `readStateFile(pd, resolvedIntent, space)`)
  - `handleSet`(セレクタ解決 + `lockIntent`/`lockSpace` 設定 + try/finally クリア + read/write/lock に `resolvedIntent`/`space` をスレッド + operand を `rest` から取得)
  - `handleCheckbox`(export 化 + `handleSet` と同型)
  - `handleCount`(export 化 + セレクタ解決 + `readStateFile` スレッド)

### 生成物(`bun scripts/package.ts` / `bun run promote:self` で再生成)
- `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**/amadeus-state.ts`(全ハーネス dist)
- セルフインストールツリー(`.claude/tools/amadeus-state.ts` 等)

### テスト
- `tests/integration/t256-state-intent-selector.test.ts`(新規、16 テスト)
  - `extractIntentSelector` 単体(抽出・rest 保持・`=`/`--` 含む value 保存・位置自由・値なし末尾トークン)
  - (b) 無指定既定が active intent 対象(set/get/count、byte 確認)
  - (a) `--intent` で非 active intent へ round-trip、active record byte 不変(set/checkbox)
  - (c) 不在 intent/space の loud エラー(spawn で exit 1 契約を実証、set/checkbox/get/count)
  - (e) `get`/`count` が対象 intent の値を読む(A と distinct)
  - (d) `set --intent B` のエラー `ERROR_LOGGED` が B のシャードに載り A のシャードは無汚染(spawn)、成功時は両シャード無出力

### 生成物同期(coverage registry)
- `tests/.coverage-registry.json`(t256 の `covers:` 反映で再生成。ratchet 不変=既存 t17 で被覆済みの subcommand に coveredBy を追記)

## 落ちる実証(#1170 封鎖の teeth)

`handleSet` の `lockIntent = resolvedIntent` を `lockIntent = undefined` に一時注入 → dist 再生成 → t256 (d) が red(B シャードが空 = ERROR_LOGGED が active/sentinel 経由で A へ流れる)を実測後、注入を revert し dist 再生成 → green を確認(注入は未コミット)。

## 検証コマンドと実測 exit code

| # | コマンド | exit code |
|---|---|---|
| 1 | `bun scripts/package.ts` | 0 |
| 2 | `bun run promote:self` | 0 |
| 3 | `bun run typecheck` | 0 |
| 4 | `bun run lint` | 0(既存の非ブロッキング complexity warning のみ) |
| 5 | `bun run dist:check` | 0 |
| 6 | `bun run promote:self:check` | 0 |
| 7 | `bun test tests/integration/t256-state-intent-selector.test.ts` | 0(16 pass) |
| 8 | `bun test`(t224 / t145 / t17 / t76 / t248 / t247) | 0(163 pass) |
| 9 | `bun tests/gen-coverage-registry.ts --check` | 0(fresh, ratchet held) |
| 10 | `bun tests/complexity-gate.ts --check` | 0 |
| 11 | `bun run coverage:ci`(full)| 0(suite は下記の既存ベースライン失敗 t199 のみ赤。詳細は「既存ベースライン」節)|
| 12 | `bun tests/coverage-patch-gate.ts --check` | 0(PASS: measured added lines 63 / covered 63 / uncovered 0)|
| 13 | `bun tests/coverage-project-gate.ts --check` | 0(current 79.1109% / baseline 40.9395%)|

## 既存ベースライン(本変更と無関係)

- `tests/integration/t199-generated-prefix-contract.test.ts` が `README.md` / `README.ja.md` に `aidlc-` を含む点で赤。本 intent は README を一切変更しておらず、README 内容は origin/main とバイト同一(`git show origin/main:README.md | grep -c aidlc-` = 1、working tree も 1)。よって verdict は origin/main と同一の既存ベースライン失敗であり本変更の影響外。leader へ Issue 化を回付する。
- full `coverage:ci` の size-annotation ドリフト警告(`t-codex-hooks-migration` / `t225-...` の declared=medium measured=large)は実行機の wall-clock 由来で本変更と無関係。

追加行の未カバー 0 は、正規化 lcov(t256 の dist import が runner により canonical パスへ正規化)と `git diff --unified=0 origin/main...HEAD` を突き合わせて確認。新規 amadeus-state.ts 行のうち被覆されない DA:0 は当初 `extractIntentSelector` の複数行 return 型注釈(runtime-erased)3行のみで、これを 1 行へ collapse して除去(spawn-blindspot-two-step (i) リファクタ優先)。collapse による -4 行シフトで stale 化した `handleSetConstructionIteration` の allowlist ピン 3 件(dispatch / usage-error / mutation-before-reject)を同 PR で再ピン(cid:allowlist-line-pin-stale 準拠)。NOMEAS(コメント・ブレース・空行)は patch gate の母集団外。

## コミット

- ブランチ: `bolt/state-intent-selector`(このブランチの HEAD コミットに全変更を集約。SHA は最終報告に記載)
