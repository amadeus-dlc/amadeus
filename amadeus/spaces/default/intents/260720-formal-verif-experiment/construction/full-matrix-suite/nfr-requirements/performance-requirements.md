# Performance Requirements — full-matrix-suite

## 上流境界

`business-logic-model.md` の12-entry schedule / cost measurement、`business-rules.md` のsuite deadline / median、`requirements.md` のFR-4/FR-5、`technology-stack.md` のBun / Gitを前提とする。eligibility / Pareto / reportはU8が所有する。

## Benchmark budget

- scheduleはwarmup 2 + measured 10のexactly 12 suite entriesとする。complete suiteの120秒deadlineはsuite startから最終cell atomic publishまでを含み、120秒後にpublishされたsuiteをcompleteにしない。追加30秒は120秒到達後のterminate / kill最大10秒とpartial evidence flush / `INCOMPLETE` terminal確定最大20秒だけに使う。orchestration wall timeはcomplete suite 120秒、timeout suite 150秒、全12 suitesがcompleteなら1,440秒、全てtimeoutでも1,800秒以下とする。
- D-COUNT 7は96 cells、D-COUNT 5は72 cellsで、suite内subjectと全scheduleをserial実行する。同時arm / suite / cell processは1である。
- timerはsuite startから最終cell atomic publishまでとし、one-time U4/U6 runtime preparationはtimer外raw costへ分離する。
- 5 measured complete durationsだけをsortしindex 2をmedianとする。warmup、partial、timeoutをmedianへ含めない。

## Resource controls

各cellはU3 bundle / output caps、T/S process deadline、network / filesystem sandboxを継承する。revision開始前にexpected 96または72 bundlesのworst-case store budgetと1 GiB reserveをexclusive reservationする。

resource controllerはrevision-scoped exclusive host / cpuset leaseを取得し、固定2 logical CPUs、memory limit 2 GiB、active benchmark process 1をOS-levelに強制する。provider / host / CPU model / core IDs / memory limit / OS / architecture / runner classを`ResourcePolicyIdentity`へ固定し、T/Sへ同じidentityを渡す。

各suite前後にlease owner、cpuset内process list、CPU / memory counters、throttling / pressure、host clock sourceをmachine receiptへ保存する。unknown background process、lease / cpuset / limit drift、telemetry欠損はtyped incompleteとし、比較値を生成しない。強制providerが利用不能ならbenchmarkを開始しない。

## Acceptance

合否はschedule entries 12、cell keys 96/72、active process 1、complete時final publish<=120秒、timeout後cleanup / INCOMPLETE確定<=30秒、suite wall<=150秒、total<=1,800秒、resource policy drift 0、measured complete count=5/arm、median source exactly 1/armである。120秒超過suiteのcomplete数は0とする。3対2position biasをrawに残し、補正値を生成しない。
