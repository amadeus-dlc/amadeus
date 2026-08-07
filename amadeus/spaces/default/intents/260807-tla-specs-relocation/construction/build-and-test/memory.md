<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-08T00:00:00Z — self-refactor scope では ci-pipeline 以降が SKIP のため build-and-test が construction 最終ステージ。phase_boundary を directive で受け、approve 前に verification/phase-check-construction.md を作成した
- 2026-08-08T00:00:00Z — 再現性検査(隔離2回ビルド)と coverage の両ゲートは CI を正の判定面とし(cid:code-generation:local-lcov-pre-push)、ローカルでは typecheck / lint / --ci / source-only / graph invariants を実行した

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-08T00:00:00Z — engine の formal_checks コマンドは逐語実行では ENVIRONMENT_UNAVAILABLE。`mise x java@temurin-26.0.1+8 -- ` を前置して再実行し NOT_DETECTED(相関3フラグは逐語維持。cid:requirements-analysis:java-home-mise-shim-override / Issue #2410)
- 2026-08-08T00:00:00Z — ローカル `--ci` の失敗3件は修復せず、未改変ベースとの分離 worktree 比較で ambient 起因と立証して申し送りにした(スコープ外)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-08T00:00:00Z — Comprehensive strategy だが性能試験は新設せず、NFR 不在を根拠として指示書へ明記した(cid:build-and-test:c4)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-08T00:00:00Z — `lookup next-stage` が引数 scope より active intent の runtime graph を優先解決する挙動は意図されたものか(本 intent スコープ外。Issue 化の要否は別途判断)
