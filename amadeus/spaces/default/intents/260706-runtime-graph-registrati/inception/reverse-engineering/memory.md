<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T06:52:00Z — codekb は前回更新（9dd93f50）からの delta = PR #559 のみ。挙動変更 3 点（complete-workflow の末尾 skip 整合 + next の none 解決、hooks 完了ガード、validator の codekb 直接解決）を api-documentation.md と architecture.md へ外科的に追記した。
- 2026-07-06T06:52:00Z — #548（B002）が merge 済みのため、record への reference-stub 9 件は作成しない。validator の共有 codekb 直接解決で pass することを本 Intent で実測する（B002 の dogfooding）。

- 2026-07-06T06:58:00Z — RE 中に #558 の根本原因を code-structure 実測で特定した。`amadeus-runtime-compile.ts`（PostToolUse hook）の command filter regex が `.claude/.kiro/.codex/tools/` の path だけを match し、AMADEUS.md が正準とする `.agents/amadeus/tools/` 経由の transition コマンド（orchestrate report、state verb）を早期 exit で素通しする。birth 直後の 4 entry が登録されるのは、print directive が `.claude/tools/amadeus-utility.ts intent-birth` を名指しし、その呼び出しだけ regex に match するため。requirements-analysis で FR 化する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
