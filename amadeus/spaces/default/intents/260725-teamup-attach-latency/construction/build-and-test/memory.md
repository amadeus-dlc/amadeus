<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T10:20Z — Test Strategy Minimal だが、本 intent は性能欠陥の修正そのものなので性能検証を主検証と位置づけた。ただし実時間90秒待機の重いテストは追加せず(Q2 裁定 A / NFR-3)、要件充足は t294 の決定的な適用可否判定で固定し、効果の実証は conductor による実 launch 計測(200.85s → 5.87s)で担保した(cid:build-and-test:wtfbt-c3)。
- 2026-07-25T10:20Z — security-test は戦略名で機械的に検査を足さず、実在する攻撃面へトレースして比例選定した(cid:build-and-test:c1 / c3)。本変更は認証情報・外部入力・権限境界に触れず、追加は case 分岐と echo のみ。依存追加なしのため repository 全体の依存監査は別判定として実施しない(cid:build-and-test:c1-doctor-seam)。
- 2026-07-25T10:20Z — 成果物名は engine directive の produces に従い build-test-results.md を正本とした(cid:build-and-test:c2-mirror-review-fixes — stage 本文の test-results.md 表記より directive を優先)。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T10:15Z — unit-test-instructions は「新規 unit テストを追加しない」方針を明記する形にした。検証対象が POSIX シェル関数で実 FS source を要するため、孤立モックの unit テストは対象の実挙動を観測しない(cid:build-and-test:wtfbt-c1 / cid:code-generation:fs-tests-integration-first)。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T10:25Z — --ci が報告した wall-clock drift 1件(t-codex-hooks-migration.test.ts、35.02s)は本コミットが触れていないファイルで、最終変更は #1212 の bf84cdfaf。project.md Forbidden(既存の赤を無視しない)に従い、修正はせず build-test-results.md へ明示的にフラグする形を選んだ。RESULT は PASS。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T10:25Z — 修正後の残余 5.87 秒の支配項は create_run の git worktree add 直列実行(実測 1.05 秒/個)。Q2 裁定 A により本 intent のスコープ外だが、別 Issue の起票がまだ未実施。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
