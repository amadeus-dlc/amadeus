<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-30T11:53:06Z — snapshot 公開の完了を PR 作成や auto-merge 登録ではなく landed 状態で定義した; 非同期 merge の登録成功を収束成功へ昇格させず、5分以内に未収束なら理由付き失敗とする。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-30T11:53:06Z — live GitHub E2E と実時間5分待機を要件検証から外した; Comprehensive 戦略は維持しつつ、fake `gh` と短縮可能な polling seam で同じ状態遷移・期限・権限契約を決定的に検証する。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
