<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T08:40:00Z — ディスパッチの「(1) fix 文言変更」は、fail のままの文言変更ではなく「2 状態分離（エンジン dir 不在 = fail + 実行可能誘導、memory 未 seed = advisory pass）」として設計した。根拠: (a) doctor 自身の hook heartbeats 検査が fresh-install を advisory pass にする先例を持つ、(b) fail のままだと installer smoke が doctor 出力の文字列 parse に依存する脆い結合になる、(c) ディスパッチは「実装形は設計で確定」と委任している。
- 2026-07-06T08:40:00Z — 再現実測を隔離 workspace で完了（導入 → doctor 1 fail + dist/ 文言 → birth → fail 0。Issue 記載と一致）。
- 2026-07-06T08:40:00Z — FR-1.1 の fix 文言は installer 再実行へ誘導する。dist/ は配布物に存在せず、エンジン dir 不在 = 導入不完全の正しい回復手段は installer の再実行（冪等）だから。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T08:40:00Z — 導入直後の doctor を exit 0 にする設計は「CI で shell 未 seed を検知したい」ケースと引き換えだが、shell 未 seed は初回 birth で必ず解消される一過性状態であり、検知価値より新規利用者の誤誘導コストが大きいと判断（Issue の趣旨）。advisory label で可視性は維持する。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
