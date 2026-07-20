# Application Design — 設計判断(260720-formal-verif-experiment)

> **対話モード**: Guide me。ユーザーの継続命令に従い、未決の設計判断はteam electionへ付議する。
> **E-OC1判定**: Q1はコスト比較の統計的安定性、Q2はTLCの検出完全性と実行上限、Q3は実験コードと証跡の所有境界を変えるため選挙必須。裁定前は成果物を確定しない。
> **裁定受領**: E-FVEAD1〜3 は全件A(3-0)、GoA favor3 / against0、留保0、verify成功・recorded。裁定通知 2026-07-20T08:13:03Z。

上流入力: `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

## Q1: CI benchmark profile

両armのCI時間は奇数回の本測定中央値とし、warmupを除外することがRequirements Analysisで既決。小さすぎる反復数はrunner揺らぎに弱く、大きすぎる値は1日規模の実験を圧迫する。

- A. Balanced: `BENCHMARK_RUNS=5`、`BENCHMARK_WARMUPS=1`、`BENCHMARK_TIMEOUT_SECONDS=120`
- B. Fast: `BENCHMARK_RUNS=3`、`BENCHMARK_WARMUPS=1`、`BENCHMARK_TIMEOUT_SECONDS=60`
- C. Stable: `BENCHMARK_RUNS=7`、`BENCHMARK_WARMUPS=2`、`BENCHMARK_TIMEOUT_SECONDS=180`
- D. Adaptive: 3回から開始し分散が閾値を超えた場合だけ5回へ増やす
- E. CI時間は比較せず、LOCと実装経過時間だけをPareto軸にする
- X. Other (please specify)

[Answer]: A(E-FVEAD1。`BENCHMARK_RUNS=5`、`BENCHMARK_WARMUPS=1`、`BENCHMARK_TIMEOUT_SECONDS=120`。3-0、GoA favor3 / against0、留保0、recorded / verified)

## Q2: TLC bounded exploration profile

対象は小さな選挙状態機械だが、検査範囲を曖昧にするとarm間比較を再現できない。深さだけを切ると未探索状態を成功と誤認し得るため、有限domainを先に固定して完全探索する案を推奨する。

- A. Exhaustive-small: voter 3、choice 3、各voterのinitial submission最大1、amend最大1、hold最大1、`TLC_WORKERS=1`、有限状態空間を完走。120秒超過は`HARNESS_ERROR`
- B. Exhaustive-minimal: voter 2、choice 2、initial/amend/hold各最大1、`TLC_WORKERS=1`、有限状態空間を完走
- C. Depth-bounded: voter 3、choice 3、`TLC_MAX_DEPTH=20`で停止し、未探索状態を許容する
- D. Two-profile: Bを全matrixへ適用し、#1252 skeletonだけAも追加する
- E. TLC boundはConstruction中の初回実測後に変更可能とする
- X. Other (please specify)

[Answer]: A(E-FVEAD2。voter 3、choice 3、initial submission最大1、amend最大1、hold最大1、`TLC_WORKERS=1`で有限状態空間を完全探索し、120秒超過は`HARNESS_ERROR`。3-0、GoA favor3 / against0、留保0、recorded / verified)

## Q3: 実験コード・fixture・raw evidenceの所有境界

勝者armは本採用初版として読める必要がある一方、注入branchやraw benchmarkはintent固有であり、production経路へ混ぜない必要がある。

- A. Split ownership: 再利用可能なrunner / arm / schema / fixture manifestはrepo-local `scripts/`・`tests/`、注入patch・freeze provenance・raw results・reportは本intent recordへ置く
- B. Record-only: runner / armを含む全実験資産を本intent recordへ置く
- C. Repository-only: raw resultsとreportもrepo-rootの`tests/`配下へ置く
- D. CI-only evidence: code / fixtureだけcommitし、raw resultsはCI artifact保持期間だけ残す
- E. Separate package: 新規workspace packageとしてarmとrunnerをまとめる
- X. Other (please specify)

[Answer]: A(E-FVEAD3。再利用可能なrunner / arm / schema / fixture manifestはrepo-local `scripts/`・`tests/`、注入patch・freeze provenance・raw results・reportは本intent record。3-0、GoA favor3 / against0、留保0、recorded / verified)
