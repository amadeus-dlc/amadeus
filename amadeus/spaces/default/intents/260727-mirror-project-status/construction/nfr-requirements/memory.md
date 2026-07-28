<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T09:25:55Z — nfr-requirements 全5ユニット完了。u1: it.2 READY(30s/1MiB の named constant 未引用 Major → runner.ts:29 実装直読へ是正)。u2: it.2 READY(consumes 外シンボル無引用断定 Major 3件 → consumes 実在記述へ接地是正)。u3: it.2 READY(domain-entities 無引用断定2件+FR-8a/8b 受入条件取り違え → 是正)。u4: it.2 READY(受入条件12 への NFR-3 数値誤帰属 → 分離是正)。u5: it.1 READY(指摘 0)。全ユニットでセンサー全 PASSED、E-SRCNRS13 の総当たり実参照チェックを reviewer 前に毎回実施。
- 2026-07-27T09:25:55Z — 反復欠陥クラスの観察: NFR 編纂で「宣言 consumes に無い実装シンボル・数値の無引用断定」が u1/u2/u3 の3連続で reviewer Major になった(constants-from-code / mechanism-cite-verify の NFR 面)。u4 以降は起草時に consumes 外シンボルを排除して抑制。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
