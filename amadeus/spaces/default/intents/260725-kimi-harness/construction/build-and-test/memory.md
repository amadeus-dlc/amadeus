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

- 2026-07-26T07:55:00Z — Interpretations: Test Strategy は Comprehensive(state 実測)。performance は NFR に負荷要件がないため「対象なし」を反証可能な形で宣言し、security は4領域(config 保護・adapter 入力・doctor 読み取り・隔離)を既存テストに trace した
- 2026-07-26T07:55:00Z — Tradeoffs: フル CI ベースライン(run-tests.sh --ci)は B5/B6 で延期し本ステージで実行(BR-3 の範囲確定)

- 2026-07-26T08:26:00Z — Interpretations: 初回ベースラインの3失敗は全て本変更由来(サイズ配置・SKILL 集合・prefix allowlist)で即修正。修正の粒度は既存ゲートの流儀に合わせた
- 2026-07-26T08:26:00Z — Interpretations: 残存1失敗は単独実行で green の既存フレーク(team-up watcher timing)と切り分け、conditional readiness として隠さず提示。Issue 起票はゲートで判断を仰ぐ
