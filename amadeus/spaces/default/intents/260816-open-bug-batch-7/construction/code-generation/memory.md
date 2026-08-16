<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-16T17:30:00Z — multi-unit(units-generation EXECUTE)での per-unit PR 作成定型を確立: (1) bolt-plan.md の Units 行は `- **Units:** `+backtick slug の機械可読形式が必須(delivery projection parser 契約) (2) bolt worktree へ active-space/active-intent カーソルを複製し worktree 側で `amadeus-runtime compile` を実行して Delivery Bolt authority projection を生成 (3) record checkpoint を bolt ブランチへ同梱 commit してから pr-convergence create(--bolt は見出し由来の番号)(4) minted report + audit shard を conductor record へ還流 — §12a scope は report 実在を要求するため create がレビュー前提
- 2026-08-16T17:30:00Z — 3 unit を並行 builder(worktree 分離・c2 逐語)で実装し、逸脱は全件申告 + 梯子裁定(E-AD-6C190CAF / 22BD77EC / 5DD8BB00 / 528D74AF)で処理。§12a は 3 unit とも iteration 1 READY
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-16T17:30:00Z — 起票候補 2 件(完了時にユーザーへ提示): (1) git-drift センサーの PostToolUse 非発火仮説(amadeus-sensor-fire.ts:225 の matches 早期 continue — sen クロスレビュー reviewer-2 の未検証仮説) (2) DIST_FACES(dist 投影軸)に pi 不在の既存ギャップ(E-AD-5DD8BB00 で据え置き確認)
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
