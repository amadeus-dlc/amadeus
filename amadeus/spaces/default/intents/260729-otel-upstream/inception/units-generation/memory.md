<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-29T07:38:17Z — U3 の DAG 上の依存は U1 のみとした。reader-first は実装順序の制約（2.8 で U3 を U4 より先に序列）であり、DAG のエッジ（U3←U4 等）ではないと解釈
- 2026-07-29T07:38:17Z — user-stories SKIP のため story-map は要件→Unit 写像で代替（ステージ prose の coverage verification の趣旨を維持）

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-29T07:38:17Z — 設問から実装順序・優先度を除外（ステージ注記どおり 2.8 の領域）。設問は境界戦略・粒度・skeleton 範囲の3問に限定

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-29T07:38:17Z — U7 を L としつつ分割しなかった。call site 移行は互換 Adapter 経由の機械的作業が中心で、分割すると Adapter 境界の整合コストが増えるため
- 2026-07-29T07:38:17Z — U9/U10 を U2-U8 と同一 Phase 群にせず独立 Unit とした。B-01 のみに依存し全期間で並行可能なため（backlog の備考どおり）

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-29T07:38:17Z — delivery-planning で Bolt 序列（risk-first: U1 → 依存順）と並行バッチ構成（builder 最大4の team.md 制約内）を決める
