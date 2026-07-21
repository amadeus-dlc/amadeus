# Performance Design — ts-arm

## 上流と budgets

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。core=5,760、identity=160、PBT=100、workers=1、run<=120秒に閉じる。

## StreamingUniverseExecutor

mixed-radix iteratorはindexからtupleを逐次生成し、round-trip key、rolling hash、axis histogramを更新する。retained dataはcurrent tuple、7 predicate results、first counterexample、closed aggregate countsだけで、全case arrayを作らない。identity matrixは別iterator/coverage proofで160×4 evaluationsを行う。

PBTはseed=20260720/numRuns=100/canonical orderを固定する。greenは100完了、failureはfirst indexからshrink/replay完了までを同deadlineで実行し、途中成功を許さない。suite remainingと120秒の小さい方からevidence reserveを差し引き、timeout partial countsをHARNESS_ERRORにする。

## Acceptance

core keys=5,760、identity=160/evaluations=640、PBT green=100またはfailure index+shrink+replay、missing/duplicate=0、workers=1、deadline延長=0を検査する。

