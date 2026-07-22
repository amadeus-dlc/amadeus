<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-22T11:33:00Z — Q3 で提示した「macOS前提維持」推奨をユーザーが却下: GitHub ランナー自体が隔離環境であり sandbox-exec は CI に不要。CI は Linux + Docker イメージ(digest固定)へ方針確定 — 実験構成の惰性で CI 要件を過大評価した推奨は誤りだった
- 2026-07-22T11:33:00Z — Q2(JDKメジャーピン)は Docker 経路確定後「ローカル実行+イメージ選定要件」へ適用面を再解釈(整合注記として質問ファイルに記録)
- 2026-07-22T11:33:00Z — 前intent RAID の引き継ぎは作業ツリー再実測で未解消ゼロと確認(cid:feasibility:c2 準拠)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
