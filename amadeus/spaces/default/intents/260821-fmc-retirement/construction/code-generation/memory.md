<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-21T08:00:00Z — Project Coverage Gate の相対条件赤(高被覆コード削除の混合効果)はユーザー裁定 A でゲート拡張(retained basis)により対処。waiver/policy 緩和は ADR-4 却下クラスとして不採用
- 2026-08-21T08:00:00Z — 新判定でも残る赤(−0.1741pp)は退役テストが駆動していたコア分岐 182 行の被覆喪失と実測帰属。AC「ゲート green」の充足手段として公開 seam 経由の回復テスト 4 本+合成 fixture を追加(設計逸脱ではなく AC 充足の完遂と裁定)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-21T08:00:00Z — 実施主体の切替: ユーザー指示(実 HUMAN_TURN「メインエージェントでタスクを実施しろ」)により、最終検証・commit・push・create 再 mint・record 回収を builder 委譲から conductor 直接実施へ変更。builder は途中で kill
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-21T08:00:00Z — §12a レビューを CI round 4 完了前に並行ディスパッチ(CI 赤なら増分再レビューのコストを許容し、critical path を短縮)
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
