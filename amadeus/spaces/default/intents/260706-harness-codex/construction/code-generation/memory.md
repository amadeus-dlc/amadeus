<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T07:00:00Z — mode: subagent に対し conductor 直接処理とした（Maintainer 裁量許可。設計・写像・provenance の文脈保持が subagent 委譲より確実で、#541 の純正性検証は fresh clone の独立実測で担保）。
- 2026-07-06T07:00:00Z — rename-leftovers の新 scanRoot が provenance.md の旧名トークンを実検出 → allow 準拠表現へ修正。FR-6.5 の追加が「検出器が実際に機能する」ことの RED→GREEN 実証を兼ねた。
- 2026-07-06T07:00:00Z — allowlist.json の編集で json.dump 再整形（455 行 diff）をしかけたが、Surgical Changes 違反として即時 revert し外科的 1 行挿入へやり直した（diff は +1 行のみ）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
