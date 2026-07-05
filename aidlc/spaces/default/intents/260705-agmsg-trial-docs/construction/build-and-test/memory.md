<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T15:25:00Z — Testing Posture 規約に従い、Minimal 戦略でも produces 7 件を全件生成した。不適用のテスト instruction（integration / performance / security とコード単体テスト）は空ファイルにせず、適用判断と根拠を記す簡潔な文書にした。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-05T15:30:00Z — §13 learnings の surface ツールは「stage not found in runtime-graph.json」で実行できない（code-generation の STAGE_SKIPPED 後、build-and-test の gate 未開始のため runtime graph に entry がない）。§13 は advisory であり、本 diary の候補は gate 報告に含めて leader へ送る（persist は人間不在方針により既定でスキップ）。
- 2026-07-05T15:25:00Z — validator 初回 fail（reverse-engineering の record 内 produces 不在 9 件）を、前例 260705-codekb-refresh と同じ参照台帳 stub（正本 codekb/amadeus/ への参照 + 採用根拠）の追加で解消した。エンジンの produces 検査は codekb root を glob して通過させる一方、validator は record 内の実ファイルを要求する。この seam 差は codekb 採用方式（既存 codekb の再利用）を取る Intent で毎回発生するため、後続 Issue 候補（validator か エンジンの片寄せ）として申し送る。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-05T15:25:00Z — docs 系 refactor における code-generation の workspace_requires ガード衝突（本 Intent で 2 例目）は leader が Issue 化した: https://github.com/amadeus-dlc/amadeus/issues/499（codekbRepoName の worktree 名漏れは https://github.com/amadeus-dlc/amadeus/issues/498）。codekb 採用時の validator seam 差（エンジン glob と record 内検査の不一致）は 3 件目の候補として Intent 完了報告で leader へ申し送る。
