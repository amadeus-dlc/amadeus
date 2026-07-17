<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-16T15:40:00Z — E-OC1 0問判定(申告 15:34Z 頃 → leader 承認 15:35:35Z)— NFR-req 5面確定済みで機構選択の余地なし
- 2026-07-16T15:40:00Z — AC-6e テストの設計を「一時 dir の worktree レイアウト構築+in-process assert」で固定 — spawn 盲点(bun-coverage-spawn-blindspot)を設計時点で回避
- 2026-07-16T15:40:00Z — 保証は層別に記述(nfr-design:c4 — 一枚岩の全称命題を避ける)。将来条件チェックリストの正本は FR-4 AC-4b に置き複製しない(canonical 1定義)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-16T15:40:00Z — parse の Set 化等の微最適化は不採用(AC-1e 追加ロジック禁止が優先 — 性能面の必要も PR-1 で不存在)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
