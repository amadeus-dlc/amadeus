<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T00:05:00Z — B001+B002 は subagent が直列 TDD で実装し、conductor が eval 再実行・parity・変更範囲で独立検証した。O-1（戻り値の形）は { stage_slug, rule_learned, already_present, sensor_proposed, notes } で確定。activeIntent 解決不能時は loud fail（曖昧な marker で新たな衝突を生まないため）
- 2026-07-06T00:05:00Z — reviewer iteration 1 READY（non-blocking 1 件 = stage-protocol.md §13 の marker 形式記載が旧仕様）。契約文書の整合として本 Intent 内で更新し、parity の engineFileExceptions へ宣言を追加した

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
