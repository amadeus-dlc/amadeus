<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-24T16:06:13Z — requirements 未解決事項(WATCHER_RESEND_MAX を 2→1 にするか vs ループ構造撤去)は「既定値のみ 2→1、ループ構造は保持」を選択; NFR-2(90秒接地)と NFR-1b(再送1回での回復力)を満たしつつ env タイミングシームを保つため
- 2026-07-24T16:06:13Z — unit-dir 名を `fix-1449-watcher-timeout` に確定; degrade スコープの artifact guard は construction/<unit>/code-generation/ を glob 解決する(producesDirsForStage :1159)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-24T16:06:13Z — directive.mode=subagent だが本ステージ本体をインラインで実行(conductor が developer 帽子を着用); 二度パークした session-instability を避けるための HOW 選択で、subagent-utilization(小作業はインライン可)の範囲。要件・設計からの逸脱ではない。独立性は §12a レビュー(amadeus-architecture-reviewer-agent の別コンテキスト Task)で担保(自己レビュー回避)
- 2026-07-24T16:06:13Z — Step 1(中核修正)は wip コミット 9b851c5ae(RA承認済み)で先行適用済み・HEAD 内; 本ステージでは残作業(テスト・落ちる実証・dist同期・検証・成果物)を完遂

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-24T16:06:13Z — 純単発(1ラウンド=90秒)でなく1回再送(2ラウンド=180秒)を採用; worst-case 短縮と #1384 回復力保持のトレードオフで、選挙 E-WTFRA1=C の複数留保(e3/e5/e2)が支持した中庸

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
