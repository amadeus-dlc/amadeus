<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T06:02:00Z — intent-statement、feasibility-assessment、constraint-register と設計確定（Q1〜Q6）でスコープ大枠が決着済みのため、境界細部 2 問（独自 skill への付与可否、harness/codex の Phase 1 中身）だけを questions とし、自己判断（理由付き）で確定した。gate の人間承認で確定する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-06T06:02:00Z — CONDITIONAL stage を skip した後の正規手順: amadeus-state.ts skip だけでは Current Stage が前進せず、learnings surface と report が fail する。skip 後は set（Current Stage / Next Stage）+ 次 stage の checkbox in-progress が必要だった（feasibility で実測）。engine 側の skip 経路整備は runtime-graph 追記漏れ Issue（leader 起案予定）と関連する可能性がある。
