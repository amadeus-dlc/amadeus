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
- 2026-07-06T02:08:00Z — Interpretation: #538 候補 1 の実現形に設計制約を明示した（配布エンジンに repo 固有パスを直書きしない → package.json の lint:check script 検出の汎用機構を候補に）。Issue 候補 1 の字義（lints/check.ts ラップ）そのままでは .agents/rules の「開発用スクリプトを skill の実行時参照にしない」と衝突するため、要求段階で制約として固定し具体方式は設計へ送った。
- 2026-07-06T02:15:00Z — Interpretation: reviewer NOT-READY（iteration 1/2）の 2 件を反映。B1 = AC Row 3 へ FR-4.2 追記。B2 = FR-3.3 は reviewer 提示の選択肢 (b) を採用し、functional-design への明示委任（#528 未 merge のため要求段階で eval 仕様を固定できない根拠つき）+ AC Row 6 として設計 gate での確定を条件化。
- 2026-07-06T02:20:00Z — Interpretation: reviewer iteration 2/2 で READY（B1/B2 解消、新規矛盾なし）。全面 rename の全員周知を受け、FR-1.2 の許可リストはデータ駆動で設計し rename Intent の支援資産にする方針を leader へ申告済み。
- 2026-07-06T02:25:00Z — Deviation: 「functional-design へ委任」の記述を「code-generation-plan.md（bugfix scope の設計確定地点）へ委任」に record 訂正した。bugfix scope の 7 ステージに functional-design が存在しないことを engine の次 directive で確認したため（gate 承認済み内容の意味は不変で、確定地点の実在化のみ。code-generation gate で確認を受ける）。
