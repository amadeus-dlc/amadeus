<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T10:12:30Z — [autonomy-statusline] autonomySegment の配置を component-methods.md §C14 の statusline 内関数から amadeus-lib.ts へ精密化(cid:code-generation:seam-placement-measured-module の執行、questions D1 に申告)。読み取り関数も extractField(statusline ローカル・非 export)→ getField(amadeus-lib.ts:4845)へ精密化(§12a it.2 FOLLOW-UP の申告追補)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T10:12:30Z — [autonomy-statusline] §12a iteration 1 BLOCKER: 初稿が C14 の返り値ドメイン(bare mode 名)と連結様式(呼び出し側 if 付き ` @` 前置)を無申告で変えていた — 3成果物+questions を C14 逐語契約へ整合是正し iteration 2 READY。教訓: 上流の verbatim シグネチャコメント(// "" | "semi" | ...)は返り値ドメインの契約であり、表示形と混同しない

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
