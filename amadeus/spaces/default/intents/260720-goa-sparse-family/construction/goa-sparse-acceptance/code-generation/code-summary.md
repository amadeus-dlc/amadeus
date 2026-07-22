# Code Summary — goa-sparse-acceptance

上流裁定 E-GSFFD1〜3、E-GSFNR1、E-GSFND1、E-GSFND13 と承認済み計画 checkpoint `8102b368c` に従い、GoA sparse 受理、複節 E-code の計測・選挙ID受理、forward scanner の決定論的検証 seam を実装した。実装 commit は `5ede46557`。Issue #1313 の blocker 修正 PR #1314 着地後、merge commit `aed4ef8f7` で最新 main `44ec1481b6c` へ再接地して最終検証した。

## 実装結果

- `packages/framework/core/tools/amadeus-norm-metrics.ts`: `scanGoaHeads(text)` を production と同一の `RegExp.exec` forward loop として export し、ordered offsets と実 `execCalls` を返す。`extractGoaRecords(text)` は次 head・改行・provenance 境界で候補を分離し、不正 body を修復せず parser へ渡す。
- 同ファイルの `parseGoaLine` は、先頭 token が有効な `cN` / `CN` の場合だけ sparse 形式へ分岐する。segment ごとの8-bin vector、全体集計、case-preserving label、ASCII case-fold 重複拒否、bin 範囲・昇順・重複・空 segment・不正 token の atomic failure を実装した。canonical 形式の既存返却形は不変。
- 同ファイルの occurrence matcher `ECODE_RE` を非 anchored 複節形へ拡張した。validator の whole-value accepted language とは共有せず、valid-prefix scan と whole-value reject の境界をテストで固定した。
- `scripts/amadeus-election-record.ts`: `GoaLineCode.parse` を anchored 複節形へ拡張し、単節の圧縮形を引き続き受理する。`scripts/amadeus-election.ts` は `handleOpen` の期待形式メッセージだけを同期した。
- source 正本から package generator で dist 6面と self-install 4面を再生成した。生成物の手編集、新規 dependency・環境変数・service・schema・API・UI・deployment artifact、新規 test file / test configuration はない。
- `renderGoaLine`、election store/timeline、hold-resolution、`rulingText`、e2 #1267 の関数領域は変更していない。対象2 script の実 diff hunk は validator の説明・regex と `handleOpen` のエラー文言だけである。

## Test-first 証跡

| 断面 | コマンド / 結果 |
|---|---|
| falling proof | 基点 `8102b368c` で対象4 test fileを実行し exit 1。12 pass / 4 fail / module export error 3。未実装の `ECODE_RE`・`scanGoaHeads`・`extractGoaRecords` と自然形 `E-SDE-CG4` の拒否を確認 |
| green targeted | unit / integration / CLI / E2E の対象5 file: exit 0、89 pass / 0 fail / 443 assertions |
| scanner shape | N=1/2/4 で H=1/2/4、offset厳密単調=true、`execCalls`=2/3/5=`H+1` |
| 実 memory corpus | 実行時再帰走査: 7 files、heads=28、records=28、accepted=12、rejected=16。旧/new E-code occurrence は 259/259 |

## 完了検証

| 検証 | 実測結果 |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0。repo 既存の complexity warning は advisory のまま |
| `bun run dist:check` | exit 0、6 harness 全て同期 |
| `bun run promote:self:check` | exit 0 |
| `bun run coverage:ci` | exit 0、391 files / 5544 assertions / failed 0 |
| patch coverage | PASS、measured 71 / covered 71 / allowlisted 0 / uncovered 0 |
| targeted 5 files | exit 0、89 pass / 443 assertions / failed 0 |
| final-state sensors | linter 8件 + type-check 8件 = 16/16 `SENSOR_PASSED`。answer-evidence対象 `*-questions.md` 候補0件 |
| implementation-scope `git diff --check` | exit 0。runtime hook が append した audit shard の既存書式行は対象外 |
| conflict marker | 変更対象で `<<<<<<<` / `=======` / `>>>>>>>` は0件 |

## Architecture review

- Iteration 1: NOT-READY(Critical 0 / Major 1 / Minor 1)。同一行でprovenance境界の後方に次headがある場合、次headの存在だけで末尾`/`を除去して空segmentを無音修復する複合境界を検出。またcanonical-onlyのstale commentと行番号引用を検出した。
- 是正: newline/comment/paren/next head/EOFの最小offsetから実終端理由を1つ選び、末尾`/`除去をその理由がnext headの場合だけに限定した。`) prose` / `<!-- cid:x --> prose`の後方に次headがある2ケースを追加し、両方を`sparse/empty-segment`へ固定。stale commentと行番号引用を更新した。
- 是正後: targeted 89/0/443、coverage:ci・test:ci 391 files/5539 assertions/0、patch 71/71、dist/self同期、typecheck/lintを再実測した。

## Blocker 着地後の増分検証

- PR #1314 (`44ec1481b6c`) は `tests/integration/t199-generated-prefix-contract.test.ts` のみを変更し、本 intent の production / validator / scanner 関数へ非交差。現行9 offenderを閉じ、一般 authored source本文と evidence path の負例を維持する。
- 再接地後の最終値は targeted 89/0/443、coverage:ci 391 files/5544 assertions/0、project coverage 71.7891%、patch 71/71、dist/self同期、typecheck/lint exit 0。`t199` は 8 pass / 35 assertions。

## 逸脱

なし。設計変更、e2 #1267 との関数交差、非変更面への実装差分、test configuration 追加はいずれも発生していない。runtime hook による自 audit shard の append は実装成果物ではなく、conductor 管轄の record として温存した。
