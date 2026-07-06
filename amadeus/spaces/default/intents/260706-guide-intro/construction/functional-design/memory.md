<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T08:30:00Z — 上流入力は inception/requirements-analysis/requirements.md。置き場所（docs/guide/）と番号付き命名はピア協議 5 回答全会一致で確定し、leader 条件（language-policy の適用範囲 1 行追記）を設計に含めた。units-generation SKIP のため unit 名は guide-intro とし、amadeus-state.md の Per unit を手動更新した。
- 2026-07-06T08:30:00Z — 設計段階で実測の先行採取を行った（installer 実実行・doctor・intent-birth）。導入直後の doctor 1 fail が初回 workflow の shell seed で解消する実挙動を発見し、Issue #573 として起案・起票済み。ガイドには正直な記載 + #573 の pending 注記を書く。
- 2026-07-06T08:30:00Z — 丸コピー禁止の構造的担保として「上流章の本文は執筆時に開かない」を設計に明記した（逐語一致の混入を検査以前に防ぐ）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
