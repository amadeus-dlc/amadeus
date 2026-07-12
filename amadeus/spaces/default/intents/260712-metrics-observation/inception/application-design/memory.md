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

- 2026-07-12T06:12:00Z — Interpretation: 新規面を最小化(実質 CLI 1ファイル+run-tests seam+CI job)し、再利用棚卸しを components.md 冒頭に明記(inception ガードレールの規模正当化)。D2(再実行しない)が CI 時間非増の要、D3(ci.yml job 追加)は needs 連携の単純さで独立 workflow を退けた — いずれも代替案2つ以上を ADR に記録。
- 2026-07-12T06:12:00Z — Tradeoff: ローカル手動 --write は「直近 --ci 出力を読む」ため、出力不在時に coverage/tests collector が fault になる — これは FR-4 の loud fail 契約どおりで、silent skip より正(挙動は interaction-spec に整合)。
