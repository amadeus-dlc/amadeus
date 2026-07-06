<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T09:20:00Z — 要求は成果（一本化・決定論生成・手編集検出・tooling pass）のレベルに留め、build.ts の実現形・core/ の細部配置・検査の実装形は functional-design（refactor scope の設計確定地点）へ委ねた。Phase 1 の 6 問は確定済みとして再協議しない。
- 2026-07-06T09:20:00Z — FR-4（#543 統合）は engineer2 進行中のため「接続点の設計は必須、実装は merge 状況で functional-design が確定」という条件つき FR にした（検討中注記）。意味的接触として並行運用ポリシーどおり申し送る。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T09:20:00Z — restructure を 1 Bolt に閉じる制約は、レビュー可能性（PR が巨大化）と引き換えだが、#526/#553 の実例（分割すると中間状態で検査が壊れる）とディスパッチ順序制約に従った。等価性検証（sha256 全数）が巨大 diff のレビュー代替になる。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-06T09:20:00Z — solo window の時期（engineer4 #557 / engineer2 #543 の merge 状況依存）。Construction 着手前に leader へ要求する。
