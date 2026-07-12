# Components — metrics-observation

> 規模の正当化(inception ガードレール): 新規は実質2ファイル+既存1ファイルへの seam 追加+workflow job 1つ。既存インフラの再利用棚卸し: lizard 経路(complexity-gate)・lcov 正規化(coverage-normalize)・サイズ分類器(test-size)・coverage-totals.json 様式・release.yml 権限前例 — 新規機構の導入はアトミック writer のみ。

| # | コンポーネント | 新規/既存 | 責務 |
|---|---|---|---|
| C1 | `scripts/metrics-snapshot.ts`(CLI 本体) | 新規 | verbs(--write/--check/引数なし usage)、collector 実行のオーケストレーション、verdict 出力 |
| C2 | collector 群(C1 内のモジュール構造) | 新規(薄いラッパ) | 6 collector — ccn(runLizard 再利用)/ coverage(coverage-totals.json 読み)/ loc / tests(tests-totals.json 読み)/ test_pyramid(test-size 分類器)/ dist_size |
| C3 | snapshot writer(C1 内) | 新規 | スキーマ組み立て(schema_version/captured_at/commit)+ temp→rename アトミック書き込み(FR-4) |
| C4 | run-tests seam(`tests/run-tests.ts` への追加) | 既存拡張 | `tests-totals.json` 書き出し(Q1=A — writeCoverageTotalsJson :610 の対称、printSummary 経路) |
| C5 | CI job(`ci.yml` への `metrics-snapshot` job 追加) | 既存拡張 | main push 時のみ発火、coverage job の成果物を needs 連携で受領、snapshot 生成→コミット→push(job 単位 permissions: contents: write) |
