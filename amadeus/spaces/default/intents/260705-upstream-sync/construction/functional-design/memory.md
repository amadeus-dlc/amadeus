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
- 2026-07-05T23:55:00Z — Interpretation: units-generation SKIP のため unit 名を Intent slug と同じ upstream-sync に定めた（前例 e10f8294 の record 整合規約に従い、gate 承認後に aidlc-state.md の Per unit を手動更新する）。
- 2026-07-05T23:55:00Z — Interpretation: R008 の共存規約は「composed scope = 暫定 entry、継続採用は frontmatter への正式化、未正式化の間は compile 側が退避・復元」とし、エンジン非改変（運用規約のみ）で解決した。上流 persona の compile 禁止は composer 直後の一時的指示として両立する。
- 2026-07-05T23:55:00Z — Tradeoff: bolt-plan を作らない単一 unit 直列手順を選択（delivery-planning SKIP、refactor scope の前例に整合）。分割の必要が出たら halt-and-ask で人間確認する（construction.md の Bolt 切り直し手順）。
- 2026-07-06T00:10:00Z — Interpretation: reviewer READY（iteration 1/2、実測 8 項目の検証つき）。非ブロッキング 2 件を反映（SKILL.md 挿入位置の明示、parity-map 配列の rebase 時 union 注記）。
