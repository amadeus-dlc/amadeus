<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-27T16:14:00Z — ADR-1 初版の縮退案(runner-gen の path 由来判定)が実行不能(GraphStage に path 不在)と reviewer iteration 1 が捕捉 → 縮退先を CompositionRecord.ownedPaths 由来識別へ書き換え、ownedPaths 引用(:557,706,1079)は是正直後に自分で grep 再実測(fix-diff-independent-reverify)。citation-semantics-check の実例 — 自成果物が引用する codekb 記述との矛盾を reviewer の独立照合が検出
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-27T16:14:00Z — 条件付き READY(it.1)を受理せず是正+iteration 2 閉包確認を選択; Major が設計正しさ(実装者が字面どおり進むと詰まる)に触れるため、予算内の追加 iteration が安価と判断
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
