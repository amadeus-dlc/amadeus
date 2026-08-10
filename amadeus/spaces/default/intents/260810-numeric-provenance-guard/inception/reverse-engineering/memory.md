<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-10T09:05:00Z — xrev differential scan mode を適用(クロスレビュー2件成立済み・verdict が検証 SHA c909b6130 明記): レビュー verdict を Developer scan の一次入力とし、conductor が verbatim スポット再実測(REQUIRED_FIELDS / intentDateFromPath / NFR_DESIGN_STANDARD_BUDGET / t 最大番号 = 全一致)で二重化; review..observed 実 diff は sensor 正本に非交差(テスト面 t514 等のみ)のため sensor 系引用は現行断面で有効
- 2026-08-10T09:05:00Z — scan = read-only Explore、synthesis = architect(書込 codekb 限定)の直列2段(c3/c4 準拠); 完了判定はディスク実在+内容 grep(c3-disk-evidence-completion)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-10T09:05:00Z — UNMEASURED 3件を requirements/sweep 段へ引き継ぐ: (a) .claude/sensors/ と core manifest の8バイト差の原因 (b) measurement ref 様式のコーパス内出現率 (c) 数値主張の corpus 内出現分布(閾値導出に必須)
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
