# Performance Requirements — tla-invalid-timestamp-skeleton

## 上流境界

`business-logic-model.md` のCompositionHead / 2-run / CI flow、`business-rules.md` の120秒deadlineとstop-on-failure、`requirements.md` のFR-8、`technology-stack.md` のBun / Git / Javaを前提とする。full matrix benchmarkとmedianは所有しない。

## Execution budgets

- local attemptsはexactly 2をserial実行し、各TLC processは120秒以下とする。CI artifactもattempt keys `{1,2}`のexactly 2 rowsを要求する。
- #1252 materializationとCompositionHead commit作成はrevision開始時に1回だけ行う。各local run前とCI checkout後は同じcommitのHEAD / tree / cleanをread-only再検証し、run timerへ混入させずpreparation raw durationとして別記録する。
- process stdout / stderr、bundle cap、terminate / killはU3/U4のclosed値を継承する。deadlineやcapをskeletonだけ緩和しない。
- first local failure、2 run semantic mismatch、CI failure後は後続fan-out command 0件とする。

CI jobはworkflow `timeout-minutes: 10`、status pollは5秒間隔 / 最大120回とする。provider metadataはconnect 10秒 / body 30秒、artifact downloadはconnect 10秒 / body 120秒を上限とし、同一run IDへのtransport retryは各operation最大2回（初回を含め計3 attempts）に閉じる。別runへの自動retryを禁止する。

## Capacity and acceptance

1 skeleton revisionはfixture alias #1252、CompositionHead 1、local bundles 2、CI rows 2、summary 1に閉じる。retryは同一revisionへattemptを追加せず、新revision identityで全2 attemptsをやり直す。

合否はlocal spawn=2、CI rows=2、各TLC deadline<=120秒、CI poll<=120、metadata/artifact attempt<=3、all verdict DETECTED、counterexample identity 1種類、CompositionHead identity 1種類、failure後fan-out 0とする。wall-clockはraw保存し、arm比較値へ含めない。
