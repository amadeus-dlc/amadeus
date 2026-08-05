<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T08:49:16Z — U3(plugin-packaging-e2e、kind: packaging)は produces_kinds により FD 適用成果物 0 件 — engine が gate:true を emit し N/A placeholder は生成しない(c1-engine-produces-all-five の設計どおりの正常系。unitCovered :3465 の names.length===0 → covered はこのケースでは意図された挙動)
- 2026-08-05T08:49:16Z — U2 で classifyThread の bot 不在スレッド境界を humanOnly 分離として設計確定(reviewer BLOCKER 起点 — Issue 述語の対象が bot 指摘であることから導出)。U1 で AD シグネチャの申告付き精密化(StageFrontmatterDocument への拡張 — バイト保存の技術的必然)を実施

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T08:49:16Z — U2 の §12a iteration 1 が reviewer のセッションリミット到達で verdict 未確立のまま失敗 — 同一 invocationId/iteration で新 subagent を再ディスパッチして回収(complete-review の replay 拒否は verdict 未記録のため非該当)。U1/U2 とも iteration 2 で READY

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
