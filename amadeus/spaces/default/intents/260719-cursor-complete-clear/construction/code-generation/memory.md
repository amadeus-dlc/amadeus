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

- [2026-07-19T20:52Z] Interpretation: units-generation SKIP の degrade スコープにつき成果物は construction/fix-1248-cursor-clear/code-generation/ の unit dir 様式(degrade-scope-unit-dir-layout)。plan が設計代替(advisory 文言・unknown 挙動を plan で確定 — E-CCCRA 裁定の design 委譲範囲内)。
- [2026-07-19T20:52Z] Interpretation: deslop はハーネス外スキルのため、architecture-reviewer の明示 slop 走査(不要コメント・過剰防御・any・ネスト観点、verdict §6)で同目的・同検証水準を充足(agents-skills-usage)。
- [2026-07-19T20:52Z] Tradeoff: workspace_requires は経路 (b) Bolt Refs=fix-1248-cursor-clear(slug 形)+非 doc ソース実在ブランチで充足 — 過剰ミラー回避(mirror-merge-before-approve 追補)。
- [2026-07-19T20:52Z] Interpretation: builder の初回 CI 赤4件は全て自変更起因を assertion 実文で帰属確定(local-ci-red-assertion-verbatim 適用)。t51 helper のカーソル前提追随は FR-1a 作用の必然的帰結として申告済み(無申告逸脱なし)。
- [2026-07-19T20:52Z] Open question: e4 レビュー非ブロッキング所見 — post-complete の fork delta 遅着 merge(audit-merge 経路)も status ゲートで抑止される。現裁定の意図どおり(complete 後のシャード封鎖)だが、遅着 worktree merge の運用が将来必要になれば #1248 系の followup Issue で扱う。
