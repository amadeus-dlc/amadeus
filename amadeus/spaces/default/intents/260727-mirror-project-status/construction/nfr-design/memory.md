<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T10:58:37Z — nfr-design 全5ユニット完了。u1: it.1 READY(Minor 1 = reliability-requirements への装飾帰属 → 受理前是正)。u2: it.1 READY(指摘 0 — 起草後の総当たりで参照ゼロ3箇所を reviewer 前に自己是正)。u3: it.1 READY(Minor 1 = FakeGateway の consumes 外言及 → 非固有名詞化)。u4: it.1 READY(指摘 0)。u5: it.1 READY(指摘 0)。全ユニットでセンサー全 PASSED。NFR 段の新ノルム(consumes 外シンボル排除)適用により全ユニット iteration 1 で READY。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
