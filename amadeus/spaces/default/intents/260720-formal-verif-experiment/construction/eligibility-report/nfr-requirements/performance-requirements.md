# Performance Requirements — eligibility-report

## 上流境界

`business-logic-model.md` のstaged evaluation / report、`business-rules.md` のhard eligibility / Pareto / trace、`requirements.md` のFR-6/FR-9、`technology-stack.md` のBun / TypeScriptを前提とする。arm execution、matrix生成、raw cost計測を再実行しない。

## Evaluation bounds

- inputは1 revisionの2 arms、96または72 cells、cost tuples最大2、reversal conditionsは正本件数だけに閉じる。
- structural verification、eligibility、Alloy miss collection、trace index buildはcell / row数に線形とする。Paretoは両arm適格時のexactly 3 axes / 1 comparisonである。
- raw bundle bytesをheapへ複製せず、identity / summary rowをstreamする。retained entriesはmatrix rows + trace rows + reversal mappings以下とする。
- command開始からtrusted publish acknowledgementまでのsuccess総deadlineを390秒とする。evaluator、renderer、trace verifierは各120秒、trusted publisherのstaging再hash / flush / directory sync / atomic rename / parent sync / ackは30秒を上限とし、各phaseへ`min(phase cap, total remaining)`を渡す。任意phaseのtimeout時はreportをpublishせず、failure cleanupは別途30秒以内にstagingをquarantineする。

## Output capacity

canonical JSONは16 MiB、Markdownは16 MiB、trace indexはmatrix / cost / decision / reversal rows合計256 entriesを上限とする。超過時はpartial reportを成功扱いせず`REPORT_CAPACITY_EXCEEDED`を返す。

## Acceptance

fixturesは72 / 96 rows、both eligible / one eligible / both ineligible / failure、3-axis dominance / trade-off、Alloy miss、正本reversal mappings、各phase deadline-1 / exact / +1を含む。合否はraw execution calls 0、matrix visits<=2×cells、Pareto comparisons<=1、weighted score0、success ack<=390秒、publish phase<=30秒、timeout後publish0、published output各<=16 MiBである。
