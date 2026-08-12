<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-09T13:37:08Z — Issue #2695 の完了条件1〜10と CAP-01〜10を全てMustとして扱い、既存eventで閉じる観測可能区間・帰属不能残余・3形式完全性までスコープを縮小しなかった; scope-document.md と intent-backlog.md の明示契約に従った
- 2026-08-09T13:37:08Z — `--stage` は attribution target の選択であり、既存の全stage duration統計をfilterしないと解釈した; 完了条件9の後方互換を守るため
- 2026-08-09T13:37:08Z — runtime graph のcontainment/latest-winsはsnapshot用の別意味論と解釈し、attributionはraw normalized journalと明示event identityから再構成する; Issueがwindow containment推定を禁止するため

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-09T13:37:08Z — preflightではorigin/mainをfetchして差分確認したが、dirtyなlifecycle recordを保持したworktreeへmerge/rebaseしなかった; HEAD..origin/mainでCodeKBと患部stage-statsが無変更と確認でき、他者のworkflow変更を壊さないため

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-09T13:37:08Z — canonical journal dedupとlifecycle identity duplicateを二段階に分けた; wire duplicateを無視すると二重計上し、逆に全duplicateをdedupするとmissing instrumentation診断を隠すため
- 2026-08-09T13:37:08Z — measured populationを修正せずattribution eligibilityを別層にした; zero-net/FIFO曖昧窓をfail-closedにしながら既存stage statsを退行させないため
- 2026-08-09T13:37:08Z — candidate familyを採用可能なSensorだけへ縮めず、全familyを理由付きinventoryに残した; 現行計装の不足を測ること自体がIssueの価値であるため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-09T13:37:08Z — execution decoderのsilent skipとunit-pool decoderのthrow/dedupを、report用の統一rejection vocabularyへどう写すかは後続application/functional designで確定する
- 2026-08-09T13:37:08Z — Construction開始前にorigin/mainへ再接地し、line evidence、test採番、real-corpus移動値、3形式byte sizeを再測定する
