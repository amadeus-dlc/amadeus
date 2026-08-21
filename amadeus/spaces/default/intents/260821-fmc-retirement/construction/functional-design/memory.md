<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-21T04:50:00Z — quality-repair(observe-quality → repair 裁定 sha256:5d30e8f1…)後の再レビュー READY(invocation 58545098-83fc-4d83-a4f8-f574fc89aaaa、iteration 3 相当、scope 逸脱ゼロ)を reviewer-runtime へ記録できなかった: (a) iteration 3 は directive の reviewer_max_iterations=2 を超過として拒否 (b) 同一 iteration 2 での再記録は「existing Review projection conflicts with the result」で拒否(iteration ごとの Review は不変)。つまり repair 経路(修復→同一チェック再実行)と reviewer-runtime の記録契約が構造的に噛み合わず、repair 後の正当な READY が durable 化できない。真実の記録は本 diary + 監査(quality observation)+ reviewer 出力で保持し、engine は verdict 存在を確認して gate:true を再発行した。framework Issue 起票候補(reviewer-runtime へ repair 由来の iteration 予算延長 or 同一 iteration の repair-re-run 記録形を追加)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
