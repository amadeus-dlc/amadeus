<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-25T07:40:00Z — Interpretations: Step 2 の4エージェント並列スキャンは同日 RE codekb に代替(c1)。質問は差分ギャップの Walking Skeleton 1問のみ
- 2026-07-25T07:40:00Z — Deviations: team-practices.md は部分ドラフト(Walking Skeleton のみ)で promote し、他4セクションは live 温存(c2)。discovered-rules.md は両セクション完全な空(c3-empty-rules-format)
- 2026-07-25T07:40:00Z — Deviations: required-sections 初回 FAILED(H2 不足)を捕捉し「## 概要」節を追加して再発火 PASSED。questions ファイルを後追い作成し answer-evidence の正当な対象を確保
- 2026-07-25T07:40:00Z — Tradeoffs: §13 surface を gate 後に実行(affirmation gate がステージの承認ゲートを兼ねる構造のため)

- 2026-07-25T07:41:00Z — Deviations: §13 surface はステージ前進後のため slug mismatch で実行不可。affirmation gate と承認ゲートが同一の構造上、§13 は promote 前に済ませるべきだった(運用メモとして記録)
