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

- 2026-07-10 [Interpretation] minimal strategy(bugfix)につき新規テスト生成は t148 リグレッションガード(code-generation で実装済み)の再実測のみ。integration/performance/security の各 instructions は「生成しない根拠」を明文化して produces 契約を満たした(先行 bugfix intent 260709-t92 の慣行に整合)。
- 2026-07-10 [Deviation] 1回目の --ci が t90 フレークで FAIL → 赤の無視禁止ノルムに従いベースライン切り分け(単独 16 pass、再実行 PASS、PR CI green)の上で #741 として実測起票。本 intent スコープでの修正はしない(無関係領域)。
- 2026-07-10 [Interpretation] 検証は「マージ後の main を取り込んだツリー」で実測(merge commit 6f1d7ab2a)— Bolt PR マージ後にステージ最終検証を行う leader 指示の順序に整合。
