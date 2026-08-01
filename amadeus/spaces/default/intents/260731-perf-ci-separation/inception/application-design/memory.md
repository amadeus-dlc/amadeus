<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-31T10:17:36Z — OQ-1〜OQ-6 を design で全解決(ADR-1〜6)。OQ-2 は describe 構造の grep 実測で per-test 分割方式を確定 — whole-file 移設は純 perf 2ファイルのみ
- 2026-07-31T10:17:36Z — ADR-3 の timeout 250_000 は #1835 クロスレビュー22断面分布からの導出(式・出典を実装コメント契約に含めた); derived-value-shows-formula
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-31T10:26:25Z — iteration 1 で AC-6(棚卸し表の design 実在)を実装 Bolt へ先送りした無申告逸脱を reviewer が捕捉 — grep を design 段で即実行して是正(逸脱は成立前に回収)。FR-3d 対照表・NFR-2 導出も同 iteration で是正
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-31T10:17:36Z — bt-timeout-verification-shape のタイミングシーム化は不採用: 本件は実 spawn の実時間性能が被験体でありシーム化は計測対象を消す(ADR-3 Alternatives に明文)。perf tier 移設が PR blocking 面の構造解であるため
- 2026-07-31T10:17:36Z — metrics-maintenance の GitHub App token は perf.yml へ移植しない(書込なし・既定 GITHUB_TOKEN で足りる — citation-semantics-check の意図的相違を component-methods C-3 に明記)
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
