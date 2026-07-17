<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-16T12:14:00Z — 機構誤引用の4段伝播(一次記録、e4 留保対応): RE Architect 合成 (b) が amadeus-lib.ts:114-116 コメントを「harness.json が権威」と誤要約 → Q1 選択肢本文 → e2 留保文言 → FR-6 AC-6a へ伝播。RA reviewer iteration 1 の M-1(独立照合)で捕捉。是正列: conductor 再実測で確定(:110-116/:130-138 = script-path derivation が権威、harness.json は rulesSubdir 経路 :165-175 の別事項)→ leader 経由で留保保持者 e2 の趣旨等価確認(12:11:25Z、現物再実測付き)→ FR-6/questions/scan-notes(Developer 面1台帳含む同根3箇所)を訂正、誤記の intent record 全域 grep 0 を確認。裁定 B 自体は不変。既決ノルムの実演: mechanism-cite-verify(違反の発生)/enumeration-reverify 3段目(捕捉)/fix-diff-independent-reverify+same-root-inventory(是正)/citation-reservation-preservation(留保の等価確認経路)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
