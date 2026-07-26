<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-26T08:20:00Z — 上流入力(code-generation-plan.md / code-summary.md)を検証対象定義として消費。初回 --ci 赤2種の帰属: ci.yml ベースライン = 自変更由来(fixture 更新で閉包)、wall-clock drift 2件 = 既存・非交差・負荷起因(単独再実測+再実行 PASS で確定 — local-ci-red-assertion-verbatim)
- 2026-07-26T08:20:00Z — verdict は条件付き READY: AC-6(マージ後 main run 観測)を未検証面として明示引き継ぎ(verdict-names-unverified-facets)。diary への upstream-coverage 発火は conductor の glob 過大(produces 外)による誤射 — 対象を produces に限定する
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
