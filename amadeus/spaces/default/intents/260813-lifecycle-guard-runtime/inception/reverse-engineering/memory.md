<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-14T00:00:00Z — Issue #2771 はクロスレビュー2名 CONFIRMED_WITH_REFINEMENTS 済み(run xrev-2771-20260813131430, target-sha 10dbac595)のため xrev differential scan を採用。base は re-scans/ 中で最新の observed `854692fd7`(HEAD 祖先を merge-base --is-ancestor exit 0 で実測、35 commits / 233 files)、observed は HEAD `89532174c`(= origin/main)。currency 判定(review..observed 交差の空)は Developer scan 内で実測させる
- 2026-08-14T00:00:00Z — ユーザーは enhancement Issue に対し scope self-fix を明示指定した。project.md の Scope Overrides では新機能は self-feature だが、明示指定はユーザー専権の裁定と解し self-fix で続行(明示入力 > 既定)。ワークフローは 10 stages / Minimal depth で解決された

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-14T00:30:00Z — Issue の checkpoint 列挙(Intent生成/Stage完了/Phase遷移/Workflow完了)は実測 15 verb + jump + batch gate + swarm retry の部分集合。requirements で checkpoint 全体像の確定が必要
- 2026-08-14T00:30:00Z — G7(blocking sensor fail-closed)と G9(sensor 実行の fail-open 真理値表)の方向衝突: Issue の「移行前後で判定結果不変」AC と「fail-closed」AC がここで両立しない。requirements で裁定が必要
- 2026-08-14T00:30:00Z — 2 層構造(CLI ツール層 + harness hook 層 G30/G40): 単一 Runtime の射程に hook 層を含めるかは設計の主要論点
