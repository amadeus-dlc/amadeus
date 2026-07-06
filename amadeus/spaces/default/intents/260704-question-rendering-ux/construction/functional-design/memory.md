<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-04T17:50:00Z — mode 選択 4 択の Codex への畳みは「3 択 + custom（Chat は custom 経由）」を採用（設計 Q1=A）。2 呼び出し分割は既存 4 択との対応が崩れるため不採用。
- 2026-07-04T17:50:00Z — harness 中立規則の置き場は正準 annex（question-rendering.md）に確定（設計 Q2=A）。Codex annex は参照 + 差分のみ。conductor SKILL.md は変更しない設計にし、harness routing は annex 内の routing 行が担う。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-07-04T17:50:00Z — frontend-components.md を「対象外記録」ではなくインタラクションフロー設計として使用。本 Intent の主対象が質問 UI そのものであるため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
