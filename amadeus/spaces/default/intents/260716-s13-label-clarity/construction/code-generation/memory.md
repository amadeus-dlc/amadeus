<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-16T03:54:38Z — walking-skeleton stance = scope-dependent(bugfix はセレモニースキップ)。単一 unit(fix-609)を worktree 隔離 builder で実装 — PR #1055、全ゲート exit 0、落ちる実証(削除注入 RED→復元 GREEN)を builder+stage reviewer の2段で実測
- 2026-07-16T03:54:38Z — stage reviewer(architecture)= READY、Minor 1件(base-advance 記録の欠落 — reviewer が実 3-way merge で無リスクを実測済み)→ code-summary へ追記済み。Issue #609 の再現は LLM レンダリング挙動につき決定的再適用不能 — 受け入れ条件 AC1 の prose 実読判定で代替(reviewer 実施)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
