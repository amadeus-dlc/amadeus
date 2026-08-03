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

## Interpretations
- 2026-08-02T17:38:52Z — ratchet allowlist の将来値(U1 着地後の縮小見込み 33→32)を検出述語の意味論から機械導出せずに断定し、reviewer の Major(自己矛盾指摘)を招いた; AST 述語は呼出し側の型引数に非依存で readJson 本体は不変のため縮小しない。台帳・ゲートの将来値は述語適用の机上トレースまたは実測でのみ書くべきという教訓。是正は4箇所+比率1件、iteration 2 で閉包確認 READY。
