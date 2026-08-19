<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z - placeholder -->
- 2026-08-19T09:30:00Z — 直前の適用性 outcome が終端 `non-target` のため、ステージ本文 Step 1 に従い outcome は `NOT_APPLICABLE` とし TLC を起動しなかった; 全4モデルの網羅探索は本ステージの判定としてではなく、build-and-test 時の advisory hold(`never-run`)を実測で解消するために別途実行済み

## Deviations
<!-- example: 2026-05-29T10:14:32Z - placeholder -->
- 2026-08-19T09:55:00Z — stale な Workflow Completion 準備を前進 revert で解消した(state のみ、audit は無改変); まずサポート経路の有無を実測 — `grep -n "Workflow Completion" packages/framework/core/tools/amadeus-orchestrate.ts packages/framework/core/tools/amadeus-state.ts` は amadeus-state.ts:3473(complete-workflow が status を completed にする箇所)の1件のみ、`grep -rn "prepareWorkflowCompletion" packages/framework/core/tools/*.ts` は定義(amadeus-workflow-completion.ts:88)と単一呼出(amadeus-state.ts:4517、approve の deferWorkflowCompletion 分岐)のみで、消去・再準備・revert の verb は**存在しない**。したがって `cid:build-and-test:bt-workflow-completion-substance-gate` の前進 revert を state CLI の strict writer(`amadeus-state.ts set`)で実施した。BEFORE(逐語) `- **Workflow Completion Instance**: terminal:build-and-test` / `- **Workflow Completion Stage**: build-and-test` / `- **Workflow Completion Status**: pending`、AFTER(逐語)は同3フィールドが空値。`workflowCompletionPreparation`(amadeus-workflow-completion.ts:61-68)は instance と stage の両方が空なら null を返す契約なので、これで準備なしの状態に戻る。機構ギャップは Issue #3249 へコメントで追記
- 2026-08-19T09:30:00Z — 本ステージの実行順が本来の graph 順序とずれた; recompose 後の順序は build-and-test(3.6)→ tla-authoring(3.7)→ **pr-convergence(3.8)→ formal-model-check(3.9)** であり、formal-model-check が最終 in-scope ステージである。tla-authoring 完了後にカーソルが pr-convergence へ進んだところを formal-model-check へ forward jump したため pr-convergence が `[S]` になり、`checkbox pr-convergence=pending` で戻した。
- 2026-08-19T09:35:00Z — 順序違反は approve の時点で顕在化した; 最終ステージの approve は completion の準備を試み、stale な `terminal:build-and-test` と衝突して 逐語『Workflow completion is already prepared for build-and-test at terminal:build-and-test』で拒否された。`jump execute --target pr-convergence --direction backward` で順序を戻し(`stages_reset: ["formal-model-check"]`)、本ステージは pending へ戻した。本ファイルと `model-check-verdict.md` の内容は順序と独立に成立しているため破棄せず残す — pr-convergence 完了後に再度ゲートを開いて承認する

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z - placeholder -->
- 2026-08-19T09:30:00Z — `plugin-activation record` は本ステージの `NOT_APPLICABLE` 判定を根拠にではなく、先行して実施した全4モデルの完走検査を根拠に実行した; `cid:formal-model-check:fmc-no-activation-record-on-not-applicable` が禁じるのは検査を起動せずに記録する形であり、実検査に裏打ちされた記録はその禁止に触れない

## Open questions
<!-- example: 2026-05-29T10:14:32Z - placeholder -->
- 2026-08-19T09:30:00Z — stale な `Workflow Completion Instance: terminal:build-and-test` が残っており `next` が「build-and-test は最終 in-scope ステージではない」と拒否し続ける; recompose でステージが増えた結果、準備済み completion が対象外になったため。pr-convergence 完了後に `terminal:pr-convergence` で準備し直す必要があり、`prepareWorkflowCompletion` は別 stage の準備が残っていると throw するので、この stale フィールドの解消手順が要る(Issue #3249 の同族)
