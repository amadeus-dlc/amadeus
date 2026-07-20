# Code Generation Plan — goa-sparse-acceptance

上流入力: `requirements.md`、`unit-of-work.md`、`unit-of-work-story-map.md`、Functional Design 3成果物、NFR Design 5成果物。Test Strategy は `amadeus-state.md` の Comprehensive を適用する。

## 変更境界

- 正本変更: `packages/framework/core/tools/amadeus-norm-metrics.ts`、`scripts/amadeus-election-record.ts`、`scripts/amadeus-election.ts`。
- test変更: `tests/unit/t-norm-metrics.test.ts`、`tests/integration/t-norm-metrics.test.ts`、`tests/unit/t238-election-record.test.ts` と、CLI入口の既存integration test。必要なら既存test内へ追加し、新規test fileは同責務の既存置場がない場合だけ作る。
- 生成物: core正本変更後に package generator で dist 6面+self-installを再生成する。生成物を手編集しない。
- 非変更: `renderGoaLine`、election store/timeline、hold-resolution/rulingText、database/network/UI/deployment。e2 #1267との関数単位非交差を維持する。

## 実装手順

- [ ] **Step 1 — falling proof とtest契約を先に固定する。** `t-norm-metrics`へ canonical非退行、sparse happy path、case保存/case-fold重複、4 stable error prefix、bin範囲/順序/重複、空segment、不正token、複数head/終端境界を加える。`N=1/2/4`で `scanGoaHeads` のoffset厳密単調・head比例・`execCalls=H+1`をassertし、実memory corpus integrationではhead数・抽出数・parse分類を別assertする。`t238`へ複節/圧縮/負境界と、同一`E-ABC-`/`E-ABC-x`でscanner valid-prefix match対validator whole-value rejectの対照を置く。変更前に起票時症状が赤になることをSHA付きで保存する。対応: 全4ジャーニー、FR-1〜FR-4、BR-1〜BR-10。
- [ ] **Step 2 — pure scanner/extractor とsparse parserを実装する。** `scanGoaHeads(text)`をexportし、productionと同一のforward loopからordered offsetsと実`execCalls`を返す。`extractGoaRecords(text)`は次head/改行/provenance境界で候補を切り、不正bodyを温存する。`parseGoaLine`は最初の有効`cN`/`CN` tokenだけでsparseへ分岐し、segment別8-bin vectorとoptional `segments`を生成する。重複labelはASCII case-foldで拒否し、どのsegmentの不正も全体`ParseFailure`にする。対応: §13 persist文の書き手、週次蒸留利用者、FR-1、BR-1〜BR-8、E-GSFFD1〜3、E-GSFND1。
- [ ] **Step 3 — E-code occurrence matcherを複節全長へ拡張する。** `ECODE_RE`を非anchored `\bE-[A-Z0-9]+(?:-[A-Z0-9]+)*`へ変更し、旧/new regexの同一corpus occurrence count不変、`E-SDE-CG4`全長match、`countMatches`集計不変をtestで閉じる。validatorとaccepted languageを共有扱いしない。対応: 週次蒸留利用者、FR-3、BR-10、E-GSFND13。
- [ ] **Step 4 — election ID validatorとCLI説明を同期する。** `GoaLineCode.parse`をanchored複節形へ拡張し、旧圧縮形pinを温存する。`handleOpen`は検証委譲を変えず期待形式文言だけを同期し、CLI integrationで自然形成功・小文字/空節/先頭末尾hyphen/非文字列のloud拒否とexit codeを確認する。`renderGoaLine`とe2 #1267領域のdiffは0にする。対応: 選挙CLI利用者、FR-2、BR-9/BR-11。
- [ ] **Step 5 — test/configurationと配布物を同期する。** 既存Bun test runner、coverage registry、lint/typecheck設定を使用し、新規test fileを作った場合だけregistryを再生成する。core正本からdist 6面+self-installをgeneratorで再生成し、`dist:check`と`promote:self:check`でbyte同期を確認する。新規dependency、環境変数、service、schema、API、UI、deployment artifactは追加しない。対応: レビュアー/CI、FR-4、BR-12。
- [ ] **Step 6 — 完了検証と記録を確定する。** targeted unit/integration/CLI、typecheck、lint、全CIを実行し、lcovで追加行未cover 0を確認する。memory corpusの母数は実行時に機械導出し固定値をハードコードしない。変更ファイル、test件数、coverage、計画逸脱、falling proofとgreenの各SHAを`code-summary.md`へ実測値だけで記録し、全checkboxを完了へ更新する。対応: 全4ジャーニー、FR-4、report-final-values-only。

## Test configuration

既存のBun test harnessとcoverage registryを再利用する。test設定ファイルの新設・変更は不要見込みであり、実装で前提が崩れた場合は変更前に逸脱停止する。Comprehensive戦略としてpure unit、実FS integration、CLI E2E相当の3層をすべて実行し、各変更componentの正負・境界・非退行を最低10ケース相当で被覆する。

## Plan approval

本計画は承認後にsubagentへ全文を渡し、各Stepを順番に実行してcheckboxを更新する。設計判断の変更、e2 #1267との関数交差、非変更面へのdiff、test configuration追加が必要になった場合は実装前に停止して裁定へ戻す。
