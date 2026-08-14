<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-13T11:38:55Z — Application service は既存の短命 CLI orchestration を指し、外部・常駐 service の新設を意味しない。Issue #2813 は filesystem と process 内同期 call で完結する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-13T11:38:55Z — AWS service mapping と UI component specification は作成しない。AWS resource と GUI は要件で明示的に out of scope のため、CLI directive の利用体験だけを設計した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-13T11:38:55Z — 全面 event sourcing ではなく immutable tally run と current snapshot を併用する。established result の監査証拠を追加しつつ、既存の current tally read path を段階移行できる。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
