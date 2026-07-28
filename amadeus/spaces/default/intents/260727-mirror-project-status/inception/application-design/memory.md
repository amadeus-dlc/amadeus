<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T06:25:00Z — 委任4件を ADR-1〜4 で裁定(内部ステップ/mirror-projects キー/projectSync サブオブジェクト/gateway 内 GraphQL)し、FR-9c を ADR-5(policy 純関数1定義)で機構化した。新モジュールはゼロ(台帳 churn 回避 — ADR-4)
- 2026-07-27T06:25:00Z — §12a iteration 1 の Major 2件(FakeGateway 棚卸し 3→4箇所+t280 型キャスト、NFR-3 式の自己矛盾)は reviewer の独立 grep が捕捉 — 棚卸しは毎回 grep 出力から作り直す規律(inventory-from-grep-each-time)の違反実例(RE 推定の複製を4ファイルへ伝播させていた)。record 全域 sweep で是正し iteration 2 READY

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
