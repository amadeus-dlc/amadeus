# Performance Requirements — ts-arm

## 上流境界

`business-logic-model.md` のexhaustive universe / PBT、`business-rules.md` のfixed counts / deterministic order、`requirements.md` のFR-4/NFR-1、`technology-stack.md` のBun / fast-checkを前提とする。matrix schedulingとsuite medianはU7が所有する。

## Execution budgets

- core universeはexactly 5,760 cases、identity-validation universeはseparate exactly 160 casesとする。PBTはseed 20260720 / max 100 generated runsで、green経路はexactly 100 completed、failure経路はfirst failing `runIndex < 100`からcanonical shrinkを完走する。
- case順はcanonical tuple order、PBTはfrozen arbitrary / seed / path orderとし、parallel workerを使わない。
- 1 arm runはsuite残時間と120秒の小さい方をdeadlineとする。timeout時はprocess terminate 5秒、kill 5秒で閉じ、partial countをHARNESS_ERROR evidenceへ渡す。
- outputはU3のstdout / stderr各16 MiB、bundle total capを継承する。

## Operation and memory bounds

core predicate evaluation countは5,760×7 predicatesとする。identity validationは各cellで(1) precedenceに従うexpected outcome、(2) append delta、(3) ledger identity、(4) budget identityのclosed 4 predicatesを検証し、160×4 evaluationsとする。PBT greenはcompleted calls=100、failureはcompleted calls=`runIndex+1 <=100`と完全shrink / replay receiptを要求する。early success / sampling / duplicate tupleを禁止する。

universeはgeneratorで逐次供給し、全case objectをheapへ保持しない。retained dataはcurrent tuple、predicate result、first counterexample、aggregate countsに限定する。

## Acceptance

合否はcore keys 5,760、identity keys 160、identity evaluations 640、PBT greenならruns 100 / failureならfirst index + shrink + replay、duplicates / missing 0、workers 1、deadline延長0である。wall-clockはraw保存し、U7が同一scheduleで集約する。
