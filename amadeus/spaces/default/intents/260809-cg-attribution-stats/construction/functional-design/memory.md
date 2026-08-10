<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-10T00:06:51Z — Unit別reviewerへ渡すFunctional Design成果物は、sibling Unitの同stage成果物へ依存せず、そのUnitの公開境界を自己完結して記述する。review scopeはcurrent Unitと宣言済み上流成果物に閉じるため、隣接Unitだけに置いたcontractは検証不能になる。
- 2026-08-10T00:06:51Z — Event Set検証の実行順とprimary rejection reasonの優先順位は分離する。安全に検証可能なfindingを先に全収集し、その後closed precedenceを一度だけ適用することで、先着エラーに診断結果が左右されない。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-10T00:06:51Z — partial reportの再現性を優先し、attribution referenceへscan scopeとunreadable shard countを明示的に保持する。legacy global referenceとの重複は増えるが、各rendererが同じ帰属母集団を単独で説明・照合できる。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
