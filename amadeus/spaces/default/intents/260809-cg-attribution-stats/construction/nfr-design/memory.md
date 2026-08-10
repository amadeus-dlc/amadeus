<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-10T00:55:41Z — NFR Requirements が意図的に省略された場合、Requirements Analysis の識別子を NFR Design の addressing ID として再利用しない; 各設計判断では宣言済み NFR requirement を `Missing` と明記し、`requirements.md` の行参照は文脈証拠としてのみ扱った。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-10T00:55:41Z — `self-feature` は NFR Requirements を SKIP し NFR Design を EXECUTE するため、NFR Design の「NFR Requirements が skipped なら skip」という条件を適用しなかった; エンジン directive の `consumes_absent.expected=true` と scope 定義を優先した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-10T00:55:41Z — one-shot read-only CLI と純粋ライブラリには service 運用機構を追加しない; auth/TLS、circuit breaker、autoscaling、cache、queue を明示的に非該当とし、process/module の failure boundary と決定論的 data contract で NFR を担保した。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-10T00:55:41Z — `nfr-budget` が `consumes_absent.expected=true` を考慮せず、意図的に NFR Requirements を省略した全 NFR Design 成果物へ `missing-nfr-ids` を返す不整合を修正する。
