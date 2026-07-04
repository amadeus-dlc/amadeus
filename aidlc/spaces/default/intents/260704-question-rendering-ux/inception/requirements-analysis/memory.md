<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-04T17:35:00Z — 3 Issue（#448/#449/#450）を 1 Intent に統合。同一 annex 群と同一 skill への変更で promote 単位が重なるため（Issue #449/#450 の依存節で予告済みの判断）。
- 2026-07-04T17:35:00Z — Q1 で「表示=会話言語、機械可読記録=正準英語ラベル」を全 structured question に適用と確定。gate 承認だけ英語に残す案は #448 受け入れ条件に反するため不採用。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-04T17:35:00Z — presence フック（amadeus-mint-presence.ts）が $CLAUDE_PROJECT_DIR 基準で発火し、worktree セッションの HUMAN_TURN が main checkout 側の別 Intent の audit に積まれる。本セッションでは worktree 側フックの手動実行でミラーして続行。別 Issue 候補。
- 2026-07-04T17:35:00Z — request_user_input は experimental flag（config.toml [tools]）で既定 off。annex のフォールバック書式が事実上の主経路になる環境が多い可能性がある。
