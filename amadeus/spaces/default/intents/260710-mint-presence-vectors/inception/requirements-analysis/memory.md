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

- 2026-07-10 [Interpretation] 選挙 Q1/Q2/Q3 = 全問 A(4票)。既決化: 4 marker カタログ+先頭 N バイト検出、tier-3 込み共有定数、過去 shard 不改変。
- 2026-07-10 [Deviation] product-lead レビュー iteration 1 は NOT-READY(blocker: marker #2 の出典不在 — 選挙質問の起草時に私が出典なしで記載した推測が選挙で追認されていた)。是正: conductor セッション transcript を実測し D 形式 3/3 が <teammate-message を offset 39 に含むことを確認、出典として requirements に記載(カタログ構成は不変のため再選挙不要と判断、レビュアーも既決事項の扱いとして適切と確認)。iteration 2 で READY。
- 2026-07-10 [Interpretation] 副産物: 当セッション transcript でも task-notification は 0/22 で B 形式不在(裸 A 配信)— RE の決着を第3セッションで追認。会話ビューの前置きはレンダリング層付加であり hook 可視層に無いことの傍証。
- 2026-07-10 [Open question] §13 候補: 「選挙の選択肢本文に実測出典のない具体値・識別子を書かない(推測がそのまま採択される)」— leader へ提示。
