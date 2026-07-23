# Performance Requirements — lifecycle-transaction

`business-logic-model`、`business-rules`、`requirements`、`technology-stack`に基づくlocal CLI transactionの性能契約。

## Targets

- 10,000 audit rows・10,000 registry entriesで、lock取得後のarchive/unarchive p95 ≤ 500ms。
- audit→registry→cursorの3-step recovery p95 ≤ 750ms。
- 既存`.github/workflows/ci.yml`のubuntu-latest x64 check job（標準4 vCPU / 16GiB class）の`bun run test:ci`へbenchmarkを登録する。runner class不一致は性能合否を出さずfail-closed。
- fixtureを一度読んでwarm cache化し、warm-up 10回後に独立child process 100回を実行する。100回すべてがcorrectness成功しなければ性能集計前にfailする。wall-clockを昇順に並べnearest-rankの95番目をp95とする。
- fixture bytes/SHA-256、Bun lockfile version、runner image、CPU modelをartifactへ記録する。
- lock待ち時間は他process依存のため別計測とし、transaction処理予算へ含めない。

## Resource constraints

全shard scan、registry scan、journal validationはO(n)。追加RSS peak p95 ≤ 96MiB。各operation childを`/usr/bin/time -v`で測ったMaximum resident set sizeから、同じmodule loadだけのnoop child peakを差し引く。operation/noopを交互に100組、新processで実行し、差分のnearest-rank p95を集計する。明示GCへ依存しない。新しいcache、daemon、databaseを追加しない。

## Recovery benchmark fixture

750ms対象はactive cursorを持つarchiveの`FFF` journalで、audit・registry・cursorの全3 durable stepを前進させ、最終的にaudit一件、status=`archived`、cursor未選択、journal削除をassertする。archive non-activeとunarchiveはcursor no-opを含むcorrectness fixtureとして別測定し、各p95 ≤ 750msとする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:01:59Z
- **Iteration:** 1
- **Scope decision:** none

forward recovery/securityは整合するが、測定条件、lock contention、typecheck、recovery fixture、observabilityが不足。

### Findings

- BLOCKER — benchmark環境・100件全成功・p95契約を固定。
- MAJOR — peak RSS測定を固定。
- MAJOR — local lock concurrency/timeout/fairnessを定義。
- MAJOR — typecheck bootstrapを定義。
- MAJOR — 3-step recovery fixtureと最終assertionを固定。
- MINOR — observability/N/Aとtyped fatal diagnosticを明示。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:06:24Z
- **Iteration:** 2
- **Scope decision:** none

前回6指摘は解消された。benchmarkは既存CI runner、100件全correctness成功、nearest-rank p95、fixture provenanceまで固定され、RSSも独立processのMaximum RSS差分として測定可能である。local lockは8-process envelope、約5秒timeout、不変条件、starvation試験が定義された。FFFから全3 durable stepを進める最悪回復fixture、typecheck bootstrap、fatal journalのlocal observabilityも上流transaction/recovery契約と整合し、追加の設計判断なしで実装できる。

### Findings

- RESOLVED — benchmark実行面、runner class、warm cache、100回全成功、nearest-rank p95、fixture/Bun/runner provenanceが確定した。
- RESOLVED — peak RSSはoperation/noop childを交互に100組実行し、/usr/bin/time -vのMaximum RSS差分p95として測定する。
- RESOLVED — local concurrencyは同一workspace 8 process、50回×100ms retry、timeout時の全永続面不変、8-process fixtureでstarvation 0として閉じた。
- RESOLVED — CIはbun install --frozen-lockfile後、両tsconfigを対象とする共通bun run typecheckを実行し、RE時のexit 127と分離した。
- RESOLVED — 750ms recoveryはactive cursorを持つarchiveのFFF journalからaudit、registry、cursorを前進させ、audit一件・archived・cursor未選択・journal削除まで検証する。
- RESOLVED — 常駐monitoring等をN/Aとし、typed fatal diagnosticへjournal path、operationId、intent、期待値、観測値、手動調査要否を出すlocal observabilityを定義した。
